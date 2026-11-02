-- =============================================================
-- FISA: kolom acuan biaya rutin di tabel pengaturan_biaya
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
-- Setelah itu nominal SPP / uang makan / syahriah bisa diubah
-- dari halaman Pengaturan Biaya di web admin.
-- =============================================================

alter table public.pengaturan_biaya
  add column if not exists spp_smp numeric not null default 150000,
  add column if not exists spp_smk numeric not null default 175000,
  add column if not exists spp_takhosus numeric not null default 200000,
  add column if not exists uang_makan numeric not null default 300000,
  add column if not exists syahriah numeric not null default 50000;

-- =============================================================
-- KONTRAK UNTUK APLIKASI MOBILE (Flutter):
-- Acuan biaya dibaca dari baris pertama tabel ini:
--   from('pengaturan_biaya')
--     .select('harga_beras_10kg, spp_smp, spp_smk, spp_takhosus, uang_makan, syahriah')
--     .limit(1).maybeSingle()
-- Pilih kolom SPP sesuai tingkatan santri.
-- Policy baca untuk wali (tambahkan bila belum ada):
-- =============================================================

drop policy if exists "semua baca pengaturan" on public.pengaturan_biaya;
create policy "semua baca pengaturan"
  on public.pengaturan_biaya for select to authenticated
  using (true);
