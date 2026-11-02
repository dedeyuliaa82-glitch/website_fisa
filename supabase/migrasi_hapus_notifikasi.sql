-- =============================================================
-- FISA: HAPUS tabel NOTIFIKASI
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Menu "Pesan & Pengingat" sudah dihapus dari website admin,
-- jadi tabel notifikasi beserta index & policy-nya ikut dihapus.
--
-- PERHATIAN: semua pesan lama akan hilang permanen. Fitur pesan
-- di aplikasi mobile juga tidak akan berfungsi lagi.
-- =============================================================

drop table if exists public.notifikasi cascade;

-- -------------------------------------------------------------
-- Verifikasi (harus 0 baris)
-- -------------------------------------------------------------
-- select table_name
--   from information_schema.tables
--  where table_schema = 'public'
--    and table_name = 'notifikasi';
