-- =============================================================
-- FISA: perbaikan CHECK constraint metode_pembayaran
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- MASALAH:
--   Web admin mengirim nilai 'tunai', sedangkan database hanya
--   menerima 'transfer_manual' / 'beras_fisik'. PostgreSQL menolak
--   dengan error 23514 dan PostgREST membalas HTTP 400
--   (tampilan: "Gagal menyimpan.").
--
-- =============================================================

-- 1. Normalisasi data lama: samakan 'transfer' -> 'transfer_manual'
update public.transaksi
   set metode_pembayaran = 'transfer_manual'
 where metode_pembayaran = 'transfer';

-- 2. Buat ulang CHECK constraint dengan daftar nilai lengkap
alter table public.transaksi
  drop constraint if exists transaksi_metode_pembayaran_check;

alter table public.transaksi
  add constraint transaksi_metode_pembayaran_check
  check (metode_pembayaran = any (array[
    'tunai'::text,
    'transfer_manual'::text,
    'beras_fisik'::text
  ]));

-- 3. Verifikasi (hasilnya harus hanya nilai di atas):
-- select metode_pembayaran, count(*)
--   from public.transaksi
--  group by 1
--  order by 1;