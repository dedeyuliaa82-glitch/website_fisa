-- =============================================================
-- FISA: ATURAN TAKHOSUS — HANYA BAYAR SYAHRIAH
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- ATURAN:
--   Santri tingkatan 'takhosus' hanya ditagih SYAHRIAH.
--   SPP, uang makan, dan beras = 0.
--   Begitu syahriah dibayar, tagihan otomatis LUNAS.
--
-- File ini IDEMPOTEN — aman dijalankan berkali-kali, dan aman
-- dijalankan setelah supabase/migrasi_tagihan.sql.
-- =============================================================

-- -------------------------------------------------------------
-- 1. pastikan_tagihan(): buat tagihan saat pembayaran masuk
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
    return null;
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
      when lower(v_tingkatan) = 'takhosus' then 0
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
    coalesce(v_beras, 0)
  )
  on conflict (id_santri, bulan_tahun) do nothing;

  select id into v_id
    from public.tagihan
   where id_santri = p_santri and bulan_tahun = p_bulan;
  return v_id;
end;
$$;

-- -------------------------------------------------------------
-- 2. buat_tagihan_bulanan(): tagihan untuk semua santri
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
      when lower(s.tingkatan) = 'takhosus' then 0
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
-- 3. PERBAIKI TAGIHAN TAKHOSUS YANG SUDAH TERLANJUR DIBUAT
--    SPP / uang makan / beras dinolkan, lalu total & status
--    dihitung ulang otomatis oleh trigger tagihan.
-- -------------------------------------------------------------
update public.tagihan
   set nominal_spp = 0,
       nominal_uang_makan = 0,
       nominal_beras = 0
 where lower(tingkatan) = 'takhosus'
   and (
     coalesce(nominal_spp, 0) <> 0
     or coalesce(nominal_uang_makan, 0) <> 0
     or coalesce(nominal_beras, 0) <> 0
   );

-- -------------------------------------------------------------
-- 4. VERIFIKASI
-- -------------------------------------------------------------
-- Semua tagihan takhosus hanya boleh punya syahriah (baris ini
-- harus 0 baris):
-- select id, bulan_tahun, nominal_spp, nominal_uang_makan,
--        nominal_syahriah, nominal_beras, total_tagihan, status
--   from public.tagihan
--  where lower(tingkatan) = 'takhosus'
--    and (nominal_spp > 0 or nominal_uang_makan > 0 or nominal_beras > 0);
