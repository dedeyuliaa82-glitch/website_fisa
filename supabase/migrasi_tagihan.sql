-- =============================================================
-- FISA: TAGIHAN BULANAN OTOMATIS + DUKUNGAN CICILAN
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- MODEL BISNIS:
--   1. Admin mengatur tarif per tingkatan di pengaturan_biaya.
--   2. Fungsi buat_tagihan_bulanan() membuat satu baris tagihan
--      untuk SETIAP santri sesuai tingkatan & acuan biaya.
--   3. Tagihan itu dibaca aplikasi mobile milik orang tua.
--   4. Orang tua boleh membayar bertahap (cicilan) -> transaksi.
--   5. Admin hanya mencatat pembayaran TUNAI & BERAS FISIK.
--   6. total_dibayar & status tagihan dihitung otomatis oleh
--      trigger dari transaksi berstatus 'disetujui'.
--
-- CATATAN PENTING:
--   * Status tagihan: belum_bayar | sebagian | lunas | dibatalkan
--   * Nilai pelunasan sebuah transaksi =
--       - metode 'beras_fisik' -> nominal_beras (nilai beras)
--       - metode lain          -> total_bayar    (uang diterima)
--     Jadi beras fisik tetap mengurangi tagihan, tetapi TIDAK
--     dihitung sebagai uang masuk di laporan.
--   * Index ux_transaksi_lunas_per_bulan DIHAPUS karena hanya
--     mengizinkan satu transaksi lunas per bulan (menghalangi
--     cicilan). Penggantinya: trigger anti-lebih-bayar.
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABEL TAGIHAN
-- -------------------------------------------------------------
create table if not exists public.tagihan (
  id                  uuid primary key default gen_random_uuid(),
  id_santri           uuid not null references public.santri(id) on delete cascade,
  bulan_tahun         text not null,                     -- 'YYYY-MM'
  tingkatan           text not null,                     -- snapshot saat tagihan dibuat
  nominal_spp         numeric not null default 0,
  nominal_uang_makan  numeric not null default 0,
  nominal_syahriah    numeric not null default 0,
  nominal_beras       numeric not null default 0,
  total_tagihan       numeric not null default 0,
  total_dibayar       numeric not null default 0,
  jatuh_tempo         date,
  status              text not null default 'belum_bayar',
  dibuat_oleh         uuid,
  dibuat_pada         timestamptz not null default now(),
  diperbarui_pada     timestamptz not null default now(),
  constraint tagihan_santri_bulan_unik unique (id_santri, bulan_tahun),
  constraint tagihan_status_check
    check (status in ('belum_bayar', 'sebagian', 'lunas', 'dibatalkan'))
);

create index if not exists idx_tagihan_bulan
  on public.tagihan (bulan_tahun, status);
create index if not exists idx_tagihan_santri
  on public.tagihan (id_santri);

-- -------------------------------------------------------------
-- 2. HITUNG TOTAL & STATUS TAGIHAN (BEFORE INSERT/UPDATE)
-- -------------------------------------------------------------
create or replace function public.tagihan_sebelum_simpan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_tagihan :=
      coalesce(new.nominal_spp, 0)
    + coalesce(new.nominal_uang_makan, 0)
    + coalesce(new.nominal_syahriah, 0)
    + coalesce(new.nominal_beras, 0);
  new.total_dibayar := coalesce(new.total_dibayar, 0);

  -- 'dibatalkan' adalah keputusan manual admin, jangan ditimpa
  if new.status is distinct from 'dibatalkan' then
    if new.total_tagihan <= 0 then
      new.status := 'belum_bayar';
    elsif new.total_dibayar <= 0.5 then
      new.status := 'belum_bayar';
    elsif new.total_dibayar + 0.5 < new.total_tagihan then
      new.status := 'sebagian';
    else
      new.status := 'lunas';
    end if;
  end if;

  new.diperbarui_pada := now();
  return new;
end;
$$;

drop trigger if exists trg_tagihan_sebelum_simpan on public.tagihan;
create trigger trg_tagihan_sebelum_simpan
  before insert or update on public.tagihan
  for each row execute function public.tagihan_sebelum_simpan();

-- -------------------------------------------------------------
-- 3. PASTIKAN TAGIHAN ADA (dipakai trigger transaksi & mobile)
-- -------------------------------------------------------------
create or replace function public.pastikan_tagihan(p_santri uuid, p_bulan text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id        uuid;
  v_tingkatan text;
  v_luar      boolean;
  v_spp       numeric;
  v_makan     numeric;
  v_syahriah  numeric;
  v_beras     numeric;
begin
  select id into v_id
    from public.tagihan
   where id_santri = p_santri and bulan_tahun = p_bulan;
  if v_id is not null then
    return v_id;
  end if;

  select tingkatan, coalesce(luar_kota, false)
    into v_tingkatan, v_luar
    from public.santri
   where id = p_santri;
  if v_tingkatan is null then
    return null;   -- santri tidak ada
  end if;

  select
    case lower(v_tingkatan)
      when 'smp' then spp_smp
      when 'smk' then spp_smk
      else 0                                   -- Takhosus: tanpa SPP
    end,
    case when lower(v_tingkatan) = 'takhosus' then 0 else uang_makan end,
    syahriah,
    case
      when lower(v_tingkatan) = 'takhosus' then 0   -- Takhosus: tanpa beras
      when v_luar then harga_beras_10kg
      else 0
    end
  into v_spp, v_makan, v_syahriah, v_beras
  from public.pengaturan_biaya
  limit 1;

  insert into public.tagihan (
    id_santri, bulan_tahun, tingkatan,
    nominal_spp, nominal_uang_makan, nominal_syahriah, nominal_beras
  ) values (
    p_santri, p_bulan, v_tingkatan,
    coalesce(v_spp, 0),
    coalesce(v_makan, 0),
    coalesce(v_syahriah, 0),
    case when v_luar then coalesce(v_beras, 0) else 0 end
  )
  on conflict (id_santri, bulan_tahun) do nothing;

  select id into v_id
    from public.tagihan
   where id_santri = p_santri and bulan_tahun = p_bulan;
  return v_id;
end;
$$;

-- -------------------------------------------------------------
-- 4. SINKRONISASI total_dibayar DARI TRANSAKSI
-- -------------------------------------------------------------
create or replace function public.hitung_ulang_tagihan(p_santri uuid, p_bulan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bayar numeric;
  v_total numeric;
begin
  select coalesce(sum(
           case when t.metode_pembayaran = 'beras_fisik'
                then coalesce(t.nominal_beras, 0)
                else coalesce(t.total_bayar, 0)
           end), 0)
    into v_bayar
    from public.transaksi t
   where t.id_santri = p_santri
     and t.bulan_tahun = p_bulan
     and t.status = 'disetujui';

  select total_tagihan into v_total
    from public.tagihan
   where id_santri = p_santri and bulan_tahun = p_bulan;

  if v_total is not null and v_total > 0 and v_bayar > v_total + 0.5 then
    raise exception 'Pembayaran melebihi tagihan: total tagihan %, total dibayar %.',
      v_total, v_bayar
      using errcode = 'check_violation';
  end if;

  update public.tagihan
     set total_dibayar = v_bayar
   where id_santri = p_santri and bulan_tahun = p_bulan;
end;
$$;

-- Trigger pada transaksi: buat tagihan bila belum ada, lalu hitung ulang
create or replace function public.transaksi_pastikan_tagihan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pastikan_tagihan(new.id_santri, new.bulan_tahun);
  return new;
end;
$$;

drop trigger if exists trg_transaksi_pastikan_tagihan on public.transaksi;
create trigger trg_transaksi_pastikan_tagihan
  before insert on public.transaksi
  for each row execute function public.transaksi_pastikan_tagihan();

create or replace function public.transaksi_sinkron_tagihan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.hitung_ulang_tagihan(old.id_santri, old.bulan_tahun);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.hitung_ulang_tagihan(new.id_santri, new.bulan_tahun);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_transaksi_sinkron_tagihan on public.transaksi;
create trigger trg_transaksi_sinkron_tagihan
  after insert or update or delete on public.transaksi
  for each row execute function public.transaksi_sinkron_tagihan();

-- -------------------------------------------------------------
-- 5. BUAT TAGIHAN BULANAN UNTUK SEMUA SANTRI
-- -------------------------------------------------------------
create or replace function public.buat_tagihan_bulanan(
  p_bulan text,
  p_jatuh_tempo date default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jumlah integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membuat tagihan.';
  end if;

  if p_bulan !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'Format bulan harus YYYY-MM, contoh 2026-10.';
  end if;

  insert into public.tagihan (
    id_santri, bulan_tahun, tingkatan,
    nominal_spp, nominal_uang_makan, nominal_syahriah, nominal_beras,
    jatuh_tempo, dibuat_oleh
  )
  select
    s.id,
    p_bulan,
    s.tingkatan,
    case lower(s.tingkatan)
      when 'smp' then b.spp_smp
      when 'smk' then b.spp_smk
      else 0                                -- Takhosus: tanpa SPP
    end,
    case when lower(s.tingkatan) = 'takhosus' then 0 else b.uang_makan end,
    b.syahriah,
    case
      when lower(s.tingkatan) = 'takhosus' then 0   -- Takhosus: tanpa beras
      when coalesce(s.luar_kota, false) then b.harga_beras_10kg
      else 0
    end,
    coalesce(p_jatuh_tempo, (p_bulan || '-10')::date),
    auth.uid()
  from public.santri s
  cross join lateral (
    select * from public.pengaturan_biaya limit 1
  ) b
  where not exists (
    select 1 from public.tagihan t
     where t.id_santri = s.id
       and t.bulan_tahun = p_bulan
  );

  get diagnostics v_jumlah = row_count;

  -- Bila pembayaran sudah tercatat sebelum tagihan dibuat, isi total_dibayar.
  update public.tagihan tg
     set total_dibayar = coalesce((
       select sum(
         case when t.metode_pembayaran = 'beras_fisik'
              then coalesce(t.nominal_beras, 0)
              else coalesce(t.total_bayar, 0) end)
         from public.transaksi t
        where t.id_santri = tg.id_santri
          and t.bulan_tahun = tg.bulan_tahun
          and t.status = 'disetujui'
     ), 0)
   where tg.bulan_tahun = p_bulan;

  return v_jumlah;
end;
$$;

grant execute on function public.buat_tagihan_bulanan(text, date) to authenticated;

-- -------------------------------------------------------------
-- 6. CICILAN: hapus kunci "hanya satu lunas per bulan"
-- -------------------------------------------------------------
-- Index ini dibuat oleh migrasi_cagar_ganda.sql. Selama ada,
-- orang tua TIDAK BISA mencicil lebih dari satu kali per bulan.
drop index if exists public.ux_transaksi_lunas_per_bulan;

-- -------------------------------------------------------------
-- 7. RLS TAGIHAN
-- -------------------------------------------------------------
alter table public.tagihan enable row level security;

drop policy if exists "admin kelola tagihan" on public.tagihan;
create policy "admin kelola tagihan"
  on public.tagihan for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Wali hanya melihat tagihan anaknya sendiri
drop policy if exists "wali baca tagihan" on public.tagihan;
create policy "wali baca tagihan"
  on public.tagihan for select to authenticated
  using (
    id_santri in (
      select id from public.santri where id_orang_tua = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 8. VERIFIKASI
-- -------------------------------------------------------------
-- Tabel & trigger:
--   select tgname from pg_trigger where tgrelid = 'public.tagihan'::regclass;
--
-- Coba buat tagihan bulan ini untuk semua santri:
--   select public.buat_tagihan_bulanan('2026-10', null);
--
-- Lihat ringkasan:
--   select status, count(*), sum(total_tagihan), sum(total_dibayar)
--     from public.tagihan where bulan_tahun = '2026-10' group by 1;
--
-- Pastikan index lama sudah hilang (harus 0 baris):
--   select indexname from pg_indexes
--    where tablename = 'transaksi'
--      and indexname = 'ux_transaksi_lunas_per_bulan';
