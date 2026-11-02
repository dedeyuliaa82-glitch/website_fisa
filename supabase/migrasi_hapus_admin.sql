-- =============================================================
-- FISA: izin HAPUS data untuk admin
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query
--             -> paste seluruh file ini -> Run
--
-- Halaman admin kini punya tombol hapus di:
--   - Data Santri & Data Wali
--   - Tagihan Bulanan
--   - Verifikasi Pembayaran
--   - Catat Pembayaran
--
-- Policy di bawah memastikan HANYA admin yang boleh menghapus.
-- Policy bersifat permissive (digabung dengan policy lama), jadi
-- aman dijalankan walau sudah ada policy lain.
-- =============================================================

do $$
declare
  t text;
  daftar text[] := array[
    'santri',
    'transaksi',
    'tagihan',
    'profil',
    'pengaturan_biaya'
  ];
begin
  foreach t in array daftar loop
    -- Lewati tabel yang belum dimigrasi (mis. tagihan sebelum migrasi_tagihan.sql)
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop policy if exists %I on public.%I',
        'admin hapus ' || t, t
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
        'admin hapus ' || t, t
      );
    end if;
  end loop;
end;
$$;

-- Verifikasi: daftar policy hapus yang aktif
-- select tablename, policyname, cmd
--   from pg_policies
--  where schemaname = 'public'
--    and cmd = 'DELETE'
--  order by tablename;
