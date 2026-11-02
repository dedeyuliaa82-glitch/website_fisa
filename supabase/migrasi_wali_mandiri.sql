-- =============================================================
-- FISA: input wali tanpa UUID / tanpa akun login
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Sebelum migrasi ini, tabel profil.id terikat ke auth.users(id)
-- sehingga admin harus menyalin UUID dari menu Authentication
-- setiap kali menambah wali. Setelah migrasi ini, admin cukup
-- mengisi nama & nomor telepon wali di halaman Data Wali.
--
-- Wali yang memang punya akun aplikasi mobile TIDAK terpengaruh:
-- id profilnya tetap sama dengan id user di Authentication, jadi
-- login & policy "id_orang_tua = auth.uid()" tetap berjalan.
-- =============================================================

-- 1. Lepas foreign key profil.id -> auth.users (jika ada)
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = to_regclass('public.profil')
       and contype = 'f'
       and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.profil drop constraint %I', c.conname);
    raise notice 'Foreign key % dilepas.', c.conname;
  end loop;
end;
$$;

-- 2. Id profil dibuat otomatis bila tidak diisi
alter table public.profil
  alter column id set default gen_random_uuid();

-- 3. Pastikan admin boleh menambah / mengubah / menghapus wali
drop policy if exists "admin kelola profil" on public.profil;
create policy "admin kelola profil"
  on public.profil for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------
-- 4. Verifikasi (jalankan manual, harus 0 baris FK ke auth.users)
-- -------------------------------------------------------------
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conrelid = 'public.profil'::regclass
--    and contype = 'f';
--
-- select column_default
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name = 'profil'
--    and column_name = 'id';
