-- =============================================================
-- FISA: tabel USERS untuk login website & mobile
-- (tanpa Supabase Authentication)
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Setelah migrasi ini:
--   - Login website  : username/email + password -> /api/auth/login
--   - Login mobile   : POST /api/auth/login -> token JWT
--   - Tidak ada lagi akun di Authentication Supabase.
--
-- PENTING: isi SUPABASE_JWT_SECRET di .env.local website
-- (Supabase -> Project Settings -> API -> JWT Settings).
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. TABEL USERS
-- -------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  id_profil uuid not null unique references public.profil(id) on delete cascade,
  username text not null,
  email text,
  password_hash text not null,
  peran text not null default 'orang_tua' check (peran in ('admin', 'orang_tua')),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz
);

create unique index if not exists ux_users_username
  on public.users (lower(username));
create unique index if not exists ux_users_email
  on public.users (lower(email))
  where email is not null;

alter table public.users enable row level security;

-- Admin boleh membaca daftar akun (tanpa mengubah langsung).
drop policy if exists "admin baca users" on public.users;
create policy "admin baca users"
  on public.users for select to authenticated
  using (public.is_admin());

-- Tidak ada policy insert/update/delete:
-- semua perubahan lewat fungsi di bawah (security definer).

-- -------------------------------------------------------------
-- 2. LOGIN: verifikasi username/email + password
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
     and (
       lower(u.username) = lower(trim(p_username))
       or lower(coalesce(u.email, '')) = lower(trim(p_username))
     )
   limit 1;

  if v.id is null then
    return;
  end if;

  if v.password_hash is null
     or v.password_hash <> crypt(p_password, v.password_hash) then
    return;
  end if;

  return query
    select v.id, v.id_profil, v.username,
           coalesce(p.nama_lengkap, v.username), v.peran
      from public.profil p
     where p.id = v.id_profil;
end;
$$;

revoke all on function public.login_user(text, text) from public;
grant execute on function public.login_user(text, text) to anon, authenticated;

-- -------------------------------------------------------------
-- 3. ADMIN: atur akun login wali
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
  v_id uuid;
  v_username text := lower(trim(p_username));
  v_peran text;
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

  -- Peran akun mengikuti peran profil agar is_admin() tetap konsisten.
  select peran into v_peran from public.profil where id = p_id_profil;
  if v_peran is null then
    raise exception 'Profil dengan id tersebut tidak ditemukan.';
  end if;
  if p_peran is not null and p_peran <> v_peran then
    raise exception 'Peran akun (%) harus sama dengan peran profil (%).', p_peran, v_peran;
  end if;

  select id into v_id from public.users where id_profil = p_id_profil;

  if v_id is null then
    if coalesce(p_password, '') = '' then
      raise exception 'Password wajib diisi untuk akun baru.';
    end if;
    if length(p_password) < 6 then
      raise exception 'Password minimal 6 karakter.';
    end if;
    insert into public.users (id_profil, username, email, password_hash, peran)
    values (
      p_id_profil, v_username, nullif(lower(trim(p_email)), ''),
      crypt(p_password, gen_salt('bf')), v_peran
    )
    returning id into v_id;
  else
    update public.users
       set username = v_username,
           email = nullif(lower(trim(p_email)), ''),
           peran = v_peran,
           password_hash = case
             when coalesce(p_password, '') <> '' then crypt(p_password, gen_salt('bf'))
             else password_hash
           end,
           diperbarui_pada = now()
     where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.admin_simpan_akun(uuid, text, text, text, text) from public;
grant execute on function public.admin_simpan_akun(uuid, text, text, text, text) to authenticated;

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
  delete from public.users where id_profil = p_id_profil;
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
     where u.id_profil = p_id_profil
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
    select u.id, u.id_profil, u.username, u.email, u.peran, u.aktif
      from public.users u
     order by u.username;
end;
$$;

revoke all on function public.admin_daftar_akun() from public;
grant execute on function public.admin_daftar_akun() to authenticated;

-- -------------------------------------------------------------
-- 4. BOOTSTRAP: buat akun admin pertama
-- Jalankan sekali dari SQL Editor (bukan dari aplikasi).
-- Ganti 'admin' dan 'GANTI-PASSWORD' sesuai kebutuhan.
-- -------------------------------------------------------------
create or replace function public.buat_akun_awal(
  p_id_profil uuid,
  p_username text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.users) then
    raise exception 'Akun sudah ada. Tambah/ubah akun lewat menu admin website.';
  end if;
  if coalesce(trim(p_username), '') = '' then
    raise exception 'Username wajib diisi.';
  end if;
  if length(p_password) < 6 then
    raise exception 'Password minimal 6 karakter.';
  end if;
  if not exists (
    select 1 from public.profil
     where id = p_id_profil and peran = 'admin'
  ) then
    raise exception 'Profil admin tidak ditemukan untuk id tersebut.';
  end if;
  insert into public.users (id_profil, username, password_hash, peran)
  values (
    p_id_profil, lower(trim(p_username)),
    crypt(p_password, gen_salt('bf')), 'admin'
  );
end;
$$;

-- Contoh pemakaian (buka komentar, ganti password, lalu Run):
-- select public.buat_akun_awal(
--   (select id from public.profil where peran = 'admin' order by dibuat_pada limit 1),
--   'admin',
--   'GANTI-PASSWORD'
-- );

-- -------------------------------------------------------------
-- 5. Verifikasi
-- -------------------------------------------------------------
-- select id_profil, username, peran, aktif from public.users;
