-- =============================================================
-- FISA: cegah pelunasan GANDA di level database
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
-- Efek: satu santri hanya boleh punya SATU transaksi berstatus
-- 'disetujui' per bulan. Berlaku untuk web admin MAUPUN mobile.
-- =============================================================

-- Bersihkan dulu bila sudah ada data ganda (simpan yang terbaru)
-- Jalankan blok ini bila perlu, lalu buat index di bawah.
/*
delete from public.transaksi a
using public.transaksi b
where a.id_santri = b.id_santri
  and a.bulan_tahun = b.bulan_tahun
  and a.status = 'disetujui'
  and b.status = 'disetujui'
  and a.id < b.id;
*/

-- Kunci unik parsial: hanya untuk status 'disetujui'
drop index if exists public.ux_transaksi_lunas_per_bulan;
create unique index ux_transaksi_lunas_per_bulan
  on public.transaksi (id_santri, bulan_tahun)
  where status = 'disetujui';
