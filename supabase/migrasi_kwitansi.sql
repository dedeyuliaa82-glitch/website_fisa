-- =============================================================
-- FISA: nomor kwitansi pada transaksi yang sudah lunas
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Tanpa migrasi ini fitur Kwitansi PDF TETAP BERJALAN:
-- nomor diturunkan dari id transaksi (KW/2026/10/D6E7F8).
-- Jalankan migrasi ini bila ingin nomor tersimpan permanen di
-- database sehingga bisa dicari & diaudit lewat Laporan.
-- =============================================================

-- 1. Tambah kolom
alter table public.transaksi
  add column if not exists nomor_kwitansi text;

-- 2. Isi nomor untuk transaksi yang sudah disetujui & belum punya nomor.
--    Urut berdasarkan waktu supaya nomornya berurutan per bulan.
with urut as (
  select
    id,
    row_number() over (
      partition by bulan_tahun
      order by coalesce(diverifikasi_pada, dibuat_pada) asc, id asc
    ) as no_urut
  from public.transaksi
  where status = 'disetujui' and nomor_kwitansi is null
)
update public.transaksi t
   set nomor_kwitansi =
         'KW/' || split_part(t.bulan_tahun, '-', 1) || '/'
         || split_part(t.bulan_tahun, '-', 2) || '/'
         || lpad(u.no_urut::text, 4, '0')
  from urut u
 where t.id = u.id;

-- 3. Jaga nomor tetap unik
drop index if exists public.ux_transaksi_nomor_kwitansi;
create unique index ux_transaksi_nomor_kwitansi
  on public.transaksi (nomor_kwitansi)
  where nomor_kwitansi is not null;

-- 4. Verifikasi (tidak boleh ada nomor ganda):
-- select nomor_kwitansi, count(*) from public.transaksi
--  where nomor_kwitansi is not null
--  group by 1 having count(*) > 1;

-- Catatan: aplikasi memakai kolom ini bila tersedia. Bila kolom dihapus
-- lagi, nomor otomatis diturunkan dari id transaksi tanpa error.