-- =============================================================
-- FISA: audit verifikator + validasi total bayar
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
-- =============================================================

-- 1. Kolom audit: siapa & kapan transaksi disetujui/ditolak
alter table public.transaksi
  add column if not exists diverifikasi_oleh uuid,
  add column if not exists diverifikasi_pada timestamptz;

-- 2. Cek dulu baris yang totalnya tidak cocok (WAJIB 0 baris
--    sebelum constraint di bawah dibuat)
select id, id_santri, bulan_tahun, total_bayar,
  coalesce(nominal_spp, 0) + coalesce(nominal_uang_makan, 0)
  + coalesce(nominal_syahriah, 0) + coalesce(nominal_beras, 0) as seharusnya
from public.transaksi
where metode_pembayaran is distinct from 'beras_fisik'
  and abs(
    total_bayar - (
      coalesce(nominal_spp, 0) + coalesce(nominal_uang_makan, 0)
      + coalesce(nominal_syahriah, 0) + coalesce(nominal_beras, 0)
    )
  ) > 0.5;

-- 3. Kunci validasi: total_bayar harus = jumlah komponennya.
--    Dikecualikan untuk setoran beras fisik (nominal 0).
--    Dibuat NOT VALID dulu agar tidak gagal bila data lama kotor,
--    lalu VALIDATE setelah data dibersihkan.
alter table public.transaksi
  drop constraint if exists ck_transaksi_total_cocok;
alter table public.transaksi
  add constraint ck_transaksi_total_cocok
  check (
    metode_pembayaran = 'beras_fisik'
    or abs(
      total_bayar - (
        coalesce(nominal_spp, 0) + coalesce(nominal_uang_makan, 0)
        + coalesce(nominal_syahriah, 0) + coalesce(nominal_beras, 0)
      )
    ) <= 0.5
  )
  not valid;

-- 4. Setelah query nomor 2 di atas menghasilkan 0 baris, jalankan:
-- alter table public.transaksi validate constraint ck_transaksi_total_cocok;
