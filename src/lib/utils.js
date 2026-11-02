import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatRupiah(nominal) {
    const nilai = Number(nominal !== null && nominal !== void 0 ? nominal : 0);
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(nilai);
}
/** '2026-10' -> 'Oktober 2026' */
export function formatBulanTahun(bulanTahun) {
    const [tahun, bulan] = bulanTahun.split("-").map(Number);
    if (!tahun || !bulan)
        return bulanTahun;
    const nama = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(tahun, bulan - 1, 1));
    return `${nama.charAt(0).toUpperCase()}${nama.slice(1)} ${tahun}`;
}
/** Bulan berjalan 'YYYY-MM' */
export function bulanBerjalan() {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${m}`;
}
export function labelTingkatan(t) {
    if (t === "smp")
        return "SMP";
    if (t === "smk")
        return "SMK";
    return "Takhoshus";
}
/** Nilai DB metode_pembayaran -> label Bahasa Indonesia */
export function labelMetode(m) {
    if (m === "tunai")
        return "Tunai";
    if (m === "transfer_manual" || m === "transfer")
        return "Transfer";
    if (m === "beras_fisik")
        return "Beras fisik";
    return m ?? "-";
}
/**
 * Terjemahkan error PostgREST/Supabase menjadi pesan yang bisa
 * ditindaklanjuti pengelola, bukan kode mentah.
 */
export function pesanGalatDb(err, fallback = "Gagal menyimpan.") {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    if (/melebihi tagihan/i.test(msg))
        return "Nominal melebihi sisa tagihan. Kurangi jumlahnya atau periksa tagihan bulan tersebut.";
    if (/tagihan/i.test(msg) && /does not exist|schema cache/i.test(msg))
        return "Tabel tagihan belum ada. Jalankan supabase/migrasi_tagihan.sql di SQL Editor, lalu ulangi.";
    if (/metode_pembayaran/i.test(msg))
        return "Metode pembayaran tidak dikenal. Jalankan supabase/migrasi_metode_pembayaran.sql di SQL Editor, lalu ulangi.";
    if (/total_cocok|23514/i.test(msg))
        return "Total bayar harus sama dengan jumlah rincian (SPP + uang makan + syahriah + beras). Periksa kembali nominalnya.";
    if (/23505|duplicate key|already exists/i.test(msg))
        return "Data ini sudah ada (duplikat). Periksa kembali sebelum menyimpan.";
    if (/42501|row-level security/i.test(msg))
        return "Akun ini tidak punya izin.admin saja yang boleh menyimpan data ini.";
    if (/23503|foreign key/i.test(msg))
        return "Relasi data ditolak database. Bila sedang menambah wali, jalankan supabase/migrasi_wali_mandiri.sql di SQL Editor agar wali tidak wajib terikat akun login, lalu ulangi.";
    if (/diverifikasi_oleh|PGRST204|column/i.test(msg))
        return "Kolom audit belum ada di database. Jalankan supabase/migrasi_audit_validasi.sql di SQL Editor, lalu ulangi.";
    return msg || fallback;
}
