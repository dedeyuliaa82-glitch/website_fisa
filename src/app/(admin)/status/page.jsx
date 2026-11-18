"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button, Card, Skeleton } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { CheckCircle2, XCircle, Loader2, Activity, ShieldCheck, FileWarning, ChevronDown } from "lucide-react";

/** Probe otomatis: tabel/kolom ada? (baca head + count, tanpa mengubah data) */
const PROBE = [
  { id: "users", tabel: "users", kolom: "id,username,nama_lengkap,nomor_telepon,email,peran,aktif", label: "Tabel users (login & data wali/admin)", file: "supabase/migrasi_users_menggantikan_profil.sql" },
  { id: "santri", tabel: "santri", kolom: "id,id_orang_tua,nama_santri,nis,tingkatan,luar_kota", label: "Tabel santri", file: "skema awal" },
  { id: "transaksi", tabel: "transaksi", kolom: "id,id_santri,bulan_tahun,total_bayar,status", label: "Tabel transaksi", file: "skema awal" },
  { id: "pengaturan", tabel: "pengaturan_biaya", kolom: "id,harga_beras_10kg", label: "Acuan harga beras", file: "skema awal" },
  { id: "acuan", tabel: "pengaturan_biaya", kolom: "spp_smp,spp_smk,spp_takhosus,uang_makan,syahriah", label: "Kolom acuan SPP/makan/syahriah", file: "supabase/migrasi_acuan_biaya.sql" },
  { id: "audit", tabel: "transaksi", kolom: "diverifikasi_oleh,diverifikasi_pada", label: "Kolom audit verifikator", file: "supabase/migrasi_audit_validasi.sql" },
  { id: "metode", tabel: "transaksi", kolom: "metode_pembayaran,total_bayar", label: "Kolom metode pembayaran", file: "supabase/migrasi_metode_pembayaran.sql" },
  { id: "tagihan", tabel: "tagihan", kolom: "id,id_santri,bulan_tahun,total_tagihan,total_dibayar,status", label: "Tabel tagihan bulanan", file: "skema awal" },
  { id: "rekening", tabel: "rekening_pesantren", kolom: "id,nama_bank,nomor_rekening,atas_nama,is_active", label: "Tabel rekening pesantren", file: "skema awal" },
];

/** Tidak bisa dicek otomatis — diverifikasi manual di dashboard Supabase */
const MANUAL = [
  { label: "Policy RLS admin & wali", cara: "Authentication → Policies: pastikan tiap tabel punya policy admin + wali." },
  { label: "Kunci anti-lunas-ganda", cara: "Jalankan supabase/migrasi_cagar_ganda.sql (index ux_transaksi_lunas_per_bulan)." },
  { label: "Satu transaksi per bulan saja", cara: "Jalankan supabase/migrasi_unik_bulanan.sql agar wali bisa kirim ulang setelah transaksi ditolak." },
  { label: "Validasi total bayar", cara: "Jalankan supabase/migrasi_audit_validasi.sql, pastikan query cek selisih = 0 baris." },
  { label: "Bucket bukti-pembayaran (public)", cara: "Storage → bukti-pembayaran harus public agar foto bukti tampil." },
  { label: "Fungsi buat_tagihan_bulanan", cara: "Jalankan supabase/migrasi_tagihan.sql agar tagihan bulanan bisa dibuat otomatis." },
  { label: "Izin hapus data admin", cara: "Jalankan supabase/migrasi_hapus_admin.sql agar tombol hapus di semua halaman berfungsi." },
  { label: "Input wali tanpa UUID", cara: "Jalankan supabase/migrasi_wali_mandiri.sql agar wali bisa didata hanya dengan nama & nomor telepon (tanpa akun Supabase)." },
  { label: "Data wali di tabel users", cara: "Jalankan supabase/migrasi_users_menggantikan_profil.sql agar tabel users menyimpan nama, email, dan nomor telepon wali." },
  { label: "JWT secret login mandiri", cara: "Isi SUPABASE_JWT_SECRET di .env.local (Supabase → Project Settings → API → JWT Settings) agar login website & mobile berfungsi." },
  { label: "RLS rekening pesantren", cara: "Jalankan supabase/migrasi_rekening.sql agar admin bisa mengelola rekening dan wali hanya melihat rekening aktif (is_active = true)." },
];

export default function StatusPage() {
  const [hasil, setHasil] = useState({});
  const [loading, setLoading] = useState(true);

  async function cek() {
    setLoading(true);
    const supabase = createClient();
    const out = {};
    for (const p of PROBE) {
      const { count, error } = await supabase.from(p.tabel).select(p.kolom, { head: true, count: "exact" });
      out[p.id] = error ? { ok: false, info: "hilang / belum migrasi" } : { ok: true, info: `${count ?? 0} baris` };
    }
    setHasil(out);
    setLoading(false);
  }

  useEffect(() => {
    cek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gagal = PROBE.filter((p) => hasil[p.id] && !hasil[p.id].ok);

  return (
    <div className="space-y-5">
      <PageHeader
        judul="Status Sistem"
        deskripsi="Pemeriksaan otomatis tabel, kolom & migrasi database."
        bantuan={{
          ringkas: "Halaman ini memeriksa kesiapan database yang dipakai website dan aplikasi mobile.",
          langkah: [
            "Daftar atas menunjukkan tabel/kolom yang dicek otomatis beserta jumlah barisnya.",
            "Baris berwarna merah berarti migrasi SQL belum dijalankan — ikuti nama file yang tertera.",
            "Klik Periksa Ulang setelah menjalankan migrasi untuk memverifikasi hasilnya.",
            "Buka bagian Cek Manual untuk daftar hal yang harus dipastikan lewat dashboard Supabase.",
          ],
          catatan: "Halaman ini hanya membaca struktur database; tidak mengubah data apa pun.",
        }}
        aksi={
          <Button variant="outline" onClick={cek} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />} Periksa Ulang
          </Button>
        }
      />

      {gagal.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <FileWarning size={18} className="mt-0.5 shrink-0" />
          {gagal.length} komponen belum siap: {gagal.map((g) => g.label).join("; ")}. Jalankan file SQL yang tertera di tiap baris, lalu Periksa Ulang.
        </div>
      )}

      <Card className="rounded-2xl border border-fisa-100 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <ul className="divide-y divide-fisa-50">
            {PROBE.map((p) => {
              const r = hasil[p.id] || {};
              return (
                <li key={p.id} className="flex items-start gap-3 p-4">
                  {r.ok ? (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-fisa-900">{p.label}</p>
                    <p className={cn("text-xs font-semibold", r.ok ? "text-emerald-600" : "text-red-600")}>
                      {r.ok ? `OK • ${r.info}` : `BERMASALAH • ${r.info}`}
                    </p>
                    {!r.ok && (
                      <p className="mt-1 text-xs text-fisa-600">Perbaikan: jalankan <code className="rounded bg-fisa-100 px-1">{p.file}</code> di SQL Editor Supabase.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="rounded-2xl border border-fisa-100 bg-white overflow-hidden shadow-sm">
        <details className="group p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <ShieldCheck size={18} className="text-fisa-700" />
            <h2 className="font-extrabold text-fisa-900">Cek Manual (tidak bisa otomatis)</h2>
            <span className="ml-auto text-xs font-semibold text-fisa-500">{MANUAL.length} item</span>
            <ChevronDown size={16} className="text-fisa-500 transition group-open:rotate-180" />
          </summary>
          <ul className="mt-4 space-y-2.5">
            {MANUAL.map((m) => (
              <li key={m.label} className="rounded-xl bg-fisa-50 p-4 text-sm">
                <p className="font-extrabold text-fisa-900">{m.label}</p>
                <p className="text-xs text-fisa-600">{m.cara}</p>
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}