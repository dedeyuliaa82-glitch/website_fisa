-- =============================================================
-- FISA: tabel rekening bank pesantren
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Setelah migrasi ini:
--   - Admin website mengelola rekening di menu "Pengaturan Rekening".
--   - Aplikasi mobile wali hanya bisa MELIHAT rekening yang aktif
--     (is_active = true). Wali tidak bisa menambah/mengubah/menghapus.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. TABEL REKENING
-- -------------------------------------------------------------
create table if not exists public.rekening_pesantren (
  id uuid primary key default gen_random_uuid(),
  nama_bank text not null,
  nomor_rekening text not null,
  atas_nama text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.rekening_pesantren is
  'Daftar rekening bank pesantren untuk transfer wali santri.';
comment on column public.rekening_pesantren.is_active is
  'true = tampil di aplikasi mobile wali; false = disembunyikan.';

-- Bila tabel sudah ada dari versi sebelumnya, pastikan aturan tetap terpasang.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'rekening_nomor_format'
       and conrelid = 'public.rekening_pesantren'::regclass
  ) then
    alter table public.rekening_pesantren
      add constraint rekening_nomor_format
      check (nomor_rekening ~ '^[0-9]{6,20}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'rekening_nama_bank_isi'
       and conrelid = 'public.rekening_pesantren'::regclass
  ) then
    alter table public.rekening_pesantren
      add constraint rekening_nama_bank_isi
      check (length(btrim(nama_bank)) between 2 and 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'rekening_atas_nama_isi'
       and conrelid = 'public.rekening_pesantren'::regclass
  ) then
    alter table public.rekening_pesantren
      add constraint rekening_atas_nama_isi
      check (length(btrim(atas_nama)) between 2 and 120) not valid;
  end if;
end;
$$;

-- Satu nomor rekening tidak boleh didaftarkan dua kali untuk bank yang sama.
create unique index if not exists ux_rekening_bank_nomor
  on public.rekening_pesantren (lower(btrim(nama_bank)), nomor_rekening);

-- Mempercepat pembacaan daftar rekening aktif oleh aplikasi mobile.
create index if not exists ix_rekening_aktif
  on public.rekening_pesantren (created_at)
  where is_active;

-- -------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- -------------------------------------------------------------
alter table public.rekening_pesantren enable row level security;

-- Admin: bebas membaca, menambah, mengubah, dan menghapus.
drop policy if exists "admin kelola rekening" on public.rekening_pesantren;
create policy "admin kelola rekening"
  on public.rekening_pesantren
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Wali / pengguna mobile: hanya boleh MELIHAT rekening yang aktif.
drop policy if exists "wali baca rekening aktif" on public.rekening_pesantren;
create policy "wali baca rekening aktif"
  on public.rekening_pesantren
  for select
  to authenticated
  using (is_active = true);

-- Tidak ada policy insert/update/delete untuk wali:
-- percobaan mengubah data akan ditolak RLS.

grant select on public.rekening_pesantren to authenticated;
grant insert, update, delete on public.rekening_pesantren to authenticated;

-- -------------------------------------------------------------
-- 3. CONTOH DATA (opsional, buka komentar lalu Run)
-- -------------------------------------------------------------
-- insert into public.rekening_pesantren (nama_bank, nomor_rekening, atas_nama, is_active)
-- values ('Bank Syariah Indonesia (BSI)', '7123456789', 'Yayasan Pesantren FISA', true);

-- -------------------------------------------------------------
-- 4. VERIFIKASI
-- -------------------------------------------------------------
-- select id, nama_bank, nomor_rekening, atas_nama, is_active, created_at
--   from public.rekening_pesantren
--  order by created_at;

-- select policyname, cmd, qual, with_check
--   from pg_policies
--  where schemaname = 'public'
--    and tablename = 'rekening_pesantren';
