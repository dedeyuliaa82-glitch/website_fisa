-- =============================================================
-- FISA: longgarkan UNIQUE (id_santri, bulan_tahun)
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- MASALAH:
--   Tabel transaksi punya DUA constraint UNIQUE penuh pada
--   (id_santri, bulan_tahun):
--     - transaksi_id_santri_bulan_tahun_key
--     - unik_pembayaran_bulanan
--   Artinya satu Santri hanya boleh punya SATU baris transaksi
--   per bulan,apa pun statusnya.
--
--   Padahal alur aplikasi butuh lebih dari satu baris:
--     - Wali kirim (menunggu) -> ditolak -> wali kirim ulang
--     - Admin catat dulu sebagai "menunggu" -> disetujui
--     - Koreksi nominal tanpa menghapus riwayat
--   Semua itu akan gagal dengan error 23505 (duplicate key).
--
-- YANG BENAR (sesuai desain migrasi_cagar_ganda.sql):
--   Hanya boleh ada SATU transaksi berstatus 'disetujui'
--   per Santri per bulan. Status 'menunggu'/'ditolak' bebas
--   sebanyaknya.
--
-- JANGAN LEWATI langkah 1&2 tanpa mengecek hasil query-nya.
-- =============================================================

-- 1. Lihat dulu datanya. Kalau ada baris, naikkan nomor urut
--    (kolom id) sehingga tidak ada duplikat:
-- select id_santri, bulan_tahun, count(*) as jumlah,
--        array_agg(status order by id) as status
--   from public.transaksi
--  group by id_santri, bulan_tahun
-- having count(*) > 1;

-- 2. Hapus constraint UNIQUE penuh (index-nya ikut terhapus)
alter table public.transaksi
  drop constraint if exists transaksi_id_santri_bulan_tahun_key;
alter table public.transaksi
  drop constraint if exists unik_pembayaran_bulanan;

-- 3. Pastikan index parsial 'hanya satu lunas per bulan' ada
drop index if exists public.ux_transaksi_lunas_per_bulan;
create unique index ux_transaksi_lunas_per_bulan
  on public.transaksi (id_santri, bulan_tahun)
  where status = 'disetujui';

-- 4. Verifikasi (hasilnya harus 0 baris kalau data sudah bersih):
-- select id_santri, bulan_tahun, count(*) as jumlah
--   from public.transaksi
--  where status = 'disetujui'
--  group by id_santri, bulan_tahun
-- having count(*) > 1;