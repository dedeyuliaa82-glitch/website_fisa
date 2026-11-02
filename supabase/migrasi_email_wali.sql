-- =============================================================
-- FISA: kolom email pada profil wali
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Menyimpan alamat email wali di tabel public.profil
-- (form Tambah/Edit Wali di website admin).
-- =============================================================

alter table public.profil
  add column if not exists email text;

-- Normalisasi kosong -> NULL
update public.profil
   set email = nullif(lower(trim(email)), '')
 where email is not null;

comment on column public.profil.email is 'Alamat email wali/orang tua (opsional).';
