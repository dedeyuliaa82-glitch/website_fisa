-- =============================================================
-- FISA: gabungkan tabel profil ke tabel users
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Kondisi: tabel public.profil sudah dihapus.
-- Setelah migrasi ini:
--   - users menyimpan data admin & wali (nama, email, telepon, peran).
--   - Login website/mobile memakai username/email + password di users.
--   - santri.id_orang_tua menunjuk ke users.id (auth.uid() = users.id).
--   - is_admin() membaca users, bukan profil.
--
-- Aman dijalankan berulang kali (idempotent).
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. TABEL USERS (dibuat bila belum ada)
-- -------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text,
  email text,
  password_hash text,
  nama_lengkap text,
  nomor_telepon text,
  peran text not null default 'orang_tua' check (peran in ('admin', 'orang_tua')),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz
);

-- Kolom data wali (dulu ada di tabel profil).
alter table public.users add column if not exists nama_lengkap text;
alter table public.users add column if not exists nomor_telepon text;
alter table public.users add column if not exists email text;

-- Wali boleh ada tanpa akun login -> username & password_hash boleh kosong.
alter table public.users alter column username drop not null;
alter table public.users alter column password_hash drop not null;

-- Lepas foreign key users.id_profil -> profil (bila masih ada).
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.users'::regclass
       and contype = 'f'
       and confrelid = coalesce(to_regclass('public.profil'), 'pg_class'::regclass)
  loop
    execute format('alter table public.users drop constraint %I', c.conname);
    raise notice 'Foreign key % dilepas.', c.conname;
  end loop;
end;
$$;

create unique index if not exists ux_users_username
  on public.users (lower(username));
create unique index if not exists ux_users_email
  on public.users (lower(email))
  where email is not null;

-- -------------------------------------------------------------
-- 2. SALIN DATA DARI PROFIL (bila tabelnya masih ada)
-- -------------------------------------------------------------
do $$
begin
  if to_regclass('public.profil') is not null
     and exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'users' and column_name = 'id_profil'
     ) then
    execute $q$
      update public.users u
         set nama_lengkap   = coalesce(u.nama_lengkap, p.nama_lengkap),
             nomor_telepon  = coalesce(u.nomor_telepon, p.nomor_telepon),
             peran          = coalesce(u.peran, p.peran)
        from public.profil p
       where u.id_profil = p.id
    $q$;
  end if;
end;
$$;

-- -------------------------------------------------------------
-- 3. SANTRI: id_orang_tua -> users.id
-- -------------------------------------------------------------
do $$
declare
  c record;
begin
  if to_regclass('public.santri') is null then
    return;
  end if;

  -- Lepas foreign key lama ke profil (bila masih ada).
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.santri'::regclass
       and contype = 'f'
       and confrelid = coalesce(to_regclass('public.profil'), 'pg_class'::regclass)
  loop
    execute format('alter table public.santri drop constraint %I', c.conname);
  end loop;

  -- Ganti id profil lama dengan id users yang bersangkutan (bila kolomnya ada).
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'users' and column_name = 'id_profil'
  ) then
    execute $q$
      update public.santri s
         set id_orang_tua = u.id
        from public.users u
       where u.id_profil is not null
         and s.id_orang_tua = u.id_profil
    $q$;
  end if;

  -- Rapikan relasi ke users: hanya boleh ada SATU foreign key, kalau tidak
  -- PostgREST menolak embed `users(...)` dengan error PGRST201 (ambiguous).
  if exists (
    select 1 from pg_constraint
     where conname = 'santri_id_orang_tua_fkey'
       and conrelid = 'public.santri'::regclass
  ) then
    alter table public.santri drop constraint if exists santri_orang_tua_fkey_users;
  elsif not exists (
    select 1 from pg_constraint
     where conname = 'santri_orang_tua_fkey_users'
       and conrelid = 'public.santri'::regclass
  ) then
    alter table public.santri
      add constraint santri_id_orang_tua_fkey
      foreign key (id_orang_tua) references public.users(id)
      on delete set null not valid;
  end if;
end;
$$;

-- -------------------------------------------------------------
-- 4. is_admin() membaca users
-- -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
     where id = auth.uid()
       and peran = 'admin'
       and aktif
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- -------------------------------------------------------------
-- 5. LOGIN: verifikasi username/email + password
-- -------------------------------------------------------------
create or replace function public.login_user(p_username text, p_password text)
returns table (
  id uuid,
  id_profil uuid,
  username text,
  nama_lengkap text,
  peran text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v public.users;
begin
  select u.* into v
    from public.users u
   where u.aktif
     and u.username is not null
     and (
       lower(u.username) = lower(trim(p_username))
       or lower(coalesce(u.email, '')) = lower(trim(p_username))
     )
   limit 1;

  if v.id is null then
    return;
  end if;

  begin
    if v.password_hash is null
       or v.password_hash <> crypt(p_password, v.password_hash) then
      return;
    end if;
  exception when others then
    -- Hash lama yang bukan bcrypt (mis. teks biasa) -> tolak, jangan loloskan.
    return;
  end;

  return query
    select v.id, v.id, v.username,
           coalesce(v.nama_lengkap, v.username), v.peran;
end;
$$;

revoke all on function public.login_user(text, text) from public;
grant execute on function public.login_user(text, text) to anon, authenticated;

-- -------------------------------------------------------------
-- 6. ADMIN: atur akun login wali
--    p_id_profil sekarang berarti users.id (nama parameter dipertahankan
--    agar kode website tidak perlu diubah).
-- -------------------------------------------------------------
create or replace function public.admin_simpan_akun(
  p_id_profil uuid,
  p_username text,
  p_password text default null,
  p_peran text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_peran text;
  v_username text := lower(trim(p_username));
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengatur akun login.';
  end if;
  if coalesce(v_username, '') = '' then
    raise exception 'Username wajib diisi.';
  end if;
  if length(v_username) < 3 then
    raise exception 'Username minimal 3 karakter.';
  end if;
  if v_username !~ '^[a-z0-9._@-]+$' then
    raise exception 'Username hanya boleh huruf, angka, titik, garis bawah, strip, atau @.';
  end if;

  select peran into v_peran from public.users where id = p_id_profil;
  if v_peran is null then
    raise exception 'Data wali dengan id tersebut tidak ditemukan.';
  end if;
  if p_peran is not null and p_peran <> v_peran then
    raise exception 'Peran akun (%) harus sama dengan peran wali (%).', p_peran, v_peran;
  end if;

  if exists (
    select 1 from public.users
     where id <> p_id_profil and lower(username) = v_username
  ) then
    raise exception 'Username "%" sudah dipakai akun lain.', v_username;
  end if;

  update public.users
     set username = v_username,
         email = nullif(lower(trim(p_email)), ''),
         password_hash = case
           when coalesce(p_password, '') <> '' then crypt(p_password, gen_salt('bf'))
           else password_hash
         end,
         diperbarui_pada = now()
   where id = p_id_profil;

  return p_id_profil;
end;
$$;

revoke all on function public.admin_simpan_akun(uuid, text, text, text, text) from public;
grant execute on function public.admin_simpan_akun(uuid, text, text, text, text) to authenticated;

-- Hapus akun login, tetapi data wali tetap ada.
create or replace function public.admin_hapus_akun(p_id_profil uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menghapus akun login.';
  end if;
  update public.users
     set username = null,
         password_hash = null,
         diperbarui_pada = now()
   where id = p_id_profil;
end;
$$;

revoke all on function public.admin_hapus_akun(uuid) from public;
grant execute on function public.admin_hapus_akun(uuid) to authenticated;

create or replace function public.admin_akun_profil(p_id_profil uuid)
returns table (id uuid, username text, email text, peran text, aktif boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh melihat akun login.';
  end if;
  return query
    select u.id, u.username, u.email, u.peran, u.aktif
      from public.users u
     where u.id = p_id_profil
       and u.username is not null
     limit 1;
end;
$$;

revoke all on function public.admin_akun_profil(uuid) from public;
grant execute on function public.admin_akun_profil(uuid) to authenticated;

create or replace function public.admin_daftar_akun()
returns table (id uuid, id_profil uuid, username text, email text, peran text, aktif boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh melihat akun login.';
  end if;
  return query
    select u.id, u.id as id_profil, u.username, u.email, u.peran, u.aktif
      from public.users u
     where u.username is not null
     order by u.username;
end;
$$;

revoke all on function public.admin_daftar_akun() from public;
grant execute on function public.admin_daftar_akun() to authenticated;

-- -------------------------------------------------------------
-- 7. BOOTSTRAP: buat / reset akun admin pertama
-- Jalankan sekali dari SQL Editor (bukan dari aplikasi).
-- -------------------------------------------------------------
create or replace function public.buat_admin_awal(
  p_username text,
  p_password text,
  p_nama text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_username text := lower(trim(p_username));
begin
  if coalesce(v_username, '') = '' then
    raise exception 'Username wajib diisi.';
  end if;
  if length(p_password) < 6 then
    raise exception 'Password minimal 6 karakter.';
  end if;

  select id into v_id from public.users
   where lower(username) = v_username
   limit 1;

  if v_id is null then
    insert into public.users (username, password_hash, peran, nama_lengkap, aktif)
    values (
      v_username, crypt(p_password, gen_salt('bf')), 'admin',
      coalesce(nullif(trim(p_nama), ''), v_username), true
    )
    returning id into v_id;
  else
    update public.users
       set password_hash = crypt(p_password, gen_salt('bf')),
           peran = 'admin',
           aktif = true,
           nama_lengkap = coalesce(nama_lengkap, nullif(trim(p_nama), ''), v_username),
           diperbarui_pada = now()
     where id = v_id;
  end if;

  return v_id;
end;
$$;

-- Sengaja hanya bisa dijalankan dari SQL Editor (bukan dari aplikasi).
revoke all on function public.buat_admin_awal(text, text, text) from public;

-- Fungsi lama yang masih bergantung pada tabel profil.
drop function if exists public.buat_akun_awal(uuid, text, text);

-- -------------------------------------------------------------
-- 8. ROW LEVEL SECURITY tabel users
-- -------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "admin baca users" on public.users;
create policy "admin baca users"
  on public.users for select to authenticated
  using (public.is_admin());

drop policy if exists "admin kelola users" on public.users;
create policy "admin kelola users"
  on public.users for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.users to authenticated;

-- Muat ulang cache skema PostgREST agar embed `users(...)` langsung dikenali.
notify pgrst, 'reload schema';

-- -------------------------------------------------------------
-- 9. VERIFIKASI (jalankan manual bila perlu)
-- -------------------------------------------------------------
-- select id, username, nama_lengkap, peran, aktif from public.users order by peran, username;
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.santri'::regclass and contype = 'f';

-- -------------------------------------------------------------
-- 10. BUAT AKUN ADMIN (buka komentar, ganti password, lalu Run)
-- -------------------------------------------------------------
-- select public.buat_admin_awal('admin', 'GANTI-PASSWORD', 'Admin Pesantren');
