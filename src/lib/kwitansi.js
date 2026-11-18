/**
 * FISA — Generator Kwitansi PDF
 *
 * Menghasilkan kwitansi resmi ukuran A5 memakai jsPDF (pure-JS, aman
 * untuk bundler Next.js). Semua isian dicetak sebagai teks asli,
 * bukan gambar, sehingga hasil cetak tetap tajam dan bisa dicari.
 */
import { formatBulanTahun, labelMetode, labelTingkatan } from "@/lib/utils";

/* Palet selaras tema FISA (lihat src/app/globals.css) */
const FISA_900 = [11, 61, 46];
const FISA_100 = [224, 238, 227];
const FISA_50 = [242, 247, 243];
const FISA_600 = [52, 110, 77];
const GOLD = [217, 180, 91];
const GARIS = [200, 214, 205];
const TEKS = [35, 71, 53];
const TEKS_LUNAK = [110, 128, 118];

/**
 * Nomor kwitansi unik & deterministik.
 *
 * Diturunkan dari bulan tagihan + id transaksi sehingga:
 *  - selalu unik (id transaksi unik),
 *  - stabil — mengunduh ulang kwitansi yang sama menghasilkan nomor
 *    yang sama. Ini penting untuk dokumen resmi.
 */
export function nomorKwitansi(trx) {
  if (!trx) return "KW/-/-";
  if (trx.nomor_kwitansi) return trx.nomor_kwitansi;
  const bagian = String(trx.bulan_tahun ?? "").split("-");
  const tahun = bagian[0];
  const bulan = bagian[1];
  if (!tahun || !bulan) return "KW/-/-";
  const id = String(trx.id ?? "").replace(/-/g, "").toUpperCase();
  return `KW/${tahun}/${bulan}/${id.slice(-6)}`;
}

/** Rincian pembayaran, hanya baris yang relevan */
export function barisRincian(trx) {
  const t = trx ?? {};
  const semua = [
    { label: "SPP", nilai: Number(t.nominal_spp ?? 0), catatan: null },
    { label: "Uang Makan", nilai: Number(t.nominal_uang_makan ?? 0), catatan: null },
    { label: "Syahriah", nilai: Number(t.nominal_syahriah ?? 0), catatan: null },
    {
      label: t.beras_diganti_uang ? "Beras 10 kg (diganti uang)" : "Beras 10 kg (fisik)",
      nilai: Number(t.nominal_beras ?? 0),
      catatan: t.beras_diganti_uang || Number(t.nominal_beras ?? 0) > 0
        ? null
        : "Disetor langsung ke pondok",
    },
  ];
  // Sembunyikan komponen bernilai 0, kecuali beras (selalu relevan)
  return semua.filter((b) => b.nilai > 0 || b.label.startsWith("Beras"));
}

function rupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(angka ?? 0));
}

function tanggalPanjang(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function tanggalPendek(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * jsPDF (font built-in) hanya bisa meng-encode karakter Latin-1. Teks dari
 * database bisa berisi apa saja, jadi disaring lebih dulu supaya tidak
 * termuncul sebagai karakter aneh di PDF.
 */
function bersihkan(teks) {
  return String(teks ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

/**
 * jsPDF tidak membungkus teks otomatis. Nama yang panjang atau nomor
 * kwitansi yang panjang akan keluar dari halaman, jadi dipotong manual.
 */
function potong(teks, maksKarakter) {
  const s = bersihkan(teks);
  return s.length > maksKarakter ? `${s.slice(0, maksKarakter - 3)}...` : s;
}

/** Ambil logo FISA sebagai bytes; null bila gagal (PDF tetap dibuat) */
async function ambilLogo() {
  try {
    const res = await fetch("/icon.png", { cache: "force-cache" });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/** Susun objek dokumen kwitansi (A5). Diekspor agar bisa diuji. */
export async function buatDokumenKwitansi({ trx, namaVerifikator, nomor }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });

  const KIRI = 14;
  const KANAN = 135;
  const LEBAR = KANAN - KIRI;

  const t = trx ?? {};
  const santri = t.santri ?? {};
  const wali = t.users ?? t.profil ?? t.orang_tua ?? {};

  /* ---------- Kop ---------- */
  doc.setFillColor(...FISA_900);
  doc.rect(0, 0, 148, 33, "F");

  const logo = await ambilLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", KIRI, 6.5, 20, 20);
    } catch {
      /* logo bersifat opsional */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("FISA", KIRI + 24, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("FINANCIAL SANTRI APP", KIRI + 24, 19.5);
  doc.setFontSize(6.8);
  doc.text("Pengelolaan Keuangan Santri", KIRI + 24, 25);

  /* ---------- Judul ---------- */
  doc.setTextColor(...TEKS);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("KUITANSI PEMBAYARAN", KIRI, 45);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.line(KIRI, 48.5, KANAN, 48.5);

  /* ---------- Kotak nomor ---------- */
  const lebarKotak = 54;
  const xKotak = KANAN - lebarKotak;
  doc.setFillColor(...FISA_50);
  doc.setDrawColor(...FISA_600);
  doc.setLineWidth(0.3);
  doc.roundedRect(xKotak, 52, lebarKotak, 13, 1.2, 1.2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...TEKS_LUNAK);
  doc.text("NOMOR KWITANSI", xKotak + 3, 57);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FISA_900);
  doc.text(potong(nomor, 22), xKotak + 3, 62.5);

  /* ---------- Data penerima ---------- */
  let y = 74;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...FISA_600);
  doc.text("DITERIMA OLEH", KIRI, y);

  y += 5.5;
  const lebarLabel = 33;
  const dataPenerima = [
    ["Nama Santri", t.nama_santri ?? santri.nama_santri ?? "-"],
    ["Kelas / Tingkatan", labelTingkatan(santri.tingkatan ?? "-")],
    ["NIS", santri.nis ?? "-"],
    ["Orang Tua / Wali", wali.nama_lengkap ?? "-"],
  ];
  for (const pasangan of dataPenerima) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...TEKS_LUNAK);
    doc.text(pasangan[0], KIRI, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...TEKS);
    doc.text(potong(pasangan[1], 48), KIRI + lebarLabel, y);
    y += 5.4;
  }

  /* ---------- Tabel rincian ---------- */
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...FISA_600);
  doc.text("RINCIAN PEMBAYARAN", KIRI, y);
  y += 3;

  const xNo = KIRI + 3;
  const xUraian = KIRI + 9;
  const xJumlah = KANAN - 3;
  const tinggiKepala = 7;
  const tinggiBaris = 7;
  const tinggiBarisCatatan = 10;
  const tinggiTotal = 9;

  doc.setFillColor(...FISA_900);
  doc.rect(KIRI, y, LEBAR, tinggiKepala, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("NO", xNo, y + 4.6);
  doc.text("URAIAN", xUraian, y + 4.6);
  doc.text("JUMLAH (Rp)", xJumlah, y + 4.6, { align: "right" });
  y += tinggiKepala;

  const baris = barisRincian(t);
  const tinggiIsi = baris.reduce(
    (total, b) => total + (b.catatan ? tinggiBarisCatatan : tinggiBaris),
    0,
  ) + tinggiTotal;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...GARIS);
  doc.setLineWidth(0.2);
  doc.rect(KIRI, y, LEBAR, tinggiIsi, "FD");

  baris.forEach((barisItem, indeks) => {
    const tinggi = barisItem.catatan ? tinggiBarisCatatan : tinggiBaris;
    if (indeks > 0) {
      doc.setDrawColor(...GARIS);
      doc.setLineWidth(0.15);
      doc.line(KIRI + 2, y, KANAN - 2, y);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEKS_LUNAK);
    doc.text(String(indeks + 1), xNo, y + 4.6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEKS);
    doc.text(barisItem.label, xUraian, y + 4.6);

    if (barisItem.catatan) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(5.8);
      doc.setTextColor(...TEKS_LUNAK);
      doc.text(`(${barisItem.catatan})`, xUraian, y + 8.4);
    }

    const warna = barisItem.nilai > 0 ? TEKS : TEKS_LUNAK;
    doc.setFont("helvetica", barisItem.nilai > 0 ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(warna[0], warna[1], warna[2]);
    doc.text(barisItem.nilai > 0 ? rupiah(barisItem.nilai) : "-", xJumlah, y + 4.6, {
      align: "right",
    });

    y += tinggi;
  });

  /* ---------- Baris total ---------- */
  doc.setFillColor(...FISA_100);
  doc.rect(KIRI, y, LEBAR, tinggiTotal, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...FISA_900);
  doc.text("TOTAL", xUraian, y + 5.9);
  doc.setFontSize(10);
  doc.text(rupiah(t.total_bayar ?? 0), xJumlah, y + 5.9, { align: "right" });
  y += tinggiTotal;

  /* ---------- Keterangan ---------- */
  y += 8;
  doc.setFillColor(...FISA_50);
  doc.roundedRect(KIRI, y, LEBAR, 14, 1.2, 1.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.3);
  doc.setTextColor(...TEKS);
  doc.text("Telah diterima dengan sah dan benar, baik uang maupun barang,", KIRI + 3, y + 5.2);
  doc.text(`untuk pembayaran tagihan ${formatBulanTahun(t.bulan_tahun ?? "")}.`, KIRI + 3, y + 9.4);

  /* ---------- Tanda tangan ---------- */
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEKS_LUNAK);
  doc.text(`Tanggal disetujui: ${tanggalPanjang(t.diverifikasi_pada ?? t.dibuat_pada)}`, KIRI, y);

  const xTtd = 88;
  const xTtdTengah = xTtd + 25;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEKS);
  doc.text("Verifikator", xTtdTengah, y - 7, { align: "center" });

  doc.setDrawColor(...GARIS);
  doc.setLineWidth(0.3);
  doc.line(xTtd, y + 5, xTtd + 50, y + 5);

  doc.setFontSize(7.5);
  doc.setTextColor(...FISA_900);
  doc.text(potong(namaVerifikator || "-", 34), xTtdTengah, y + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(...TEKS_LUNAK);
  doc.text("Admin Ponpes", xTtdTengah, y + 13.6, { align: "center" });

  /* ---------- Footer ---------- */
  doc.setFontSize(5.5);
  doc.setTextColor(...TEKS_LUNAK);
  doc.text(
    `Dicetak oleh sistem FISA • metode ${labelMetode(t.metode_pembayaran)} • tanggal cetak ${tanggalPendek(new Date().toISOString())}`,
    KIRI,
    199,
  );
  doc.text("Kwitansi ini sah dan tidak memerlukan materai.", KIRI, 203);

  return doc;
}

/**
 * Buat lalu unduh kwitansi PDF.
 * @returns {Promise<{nomor: string, namaBerkas: string}>}
 */
export async function unduhKwitansiPDF({ trx, namaVerifikator }) {
  const nomor = nomorKwitansi(trx);
  const doc = await buatDokumenKwitansi({ trx, namaVerifikator, nomor });
  const namaBerkas = `Kwitansi-${nomor.replace(/[^\w]+/g, "-")}.pdf`;
  doc.save(namaBerkas);
  return { nomor, namaBerkas };
}

/** Buka pratinjau kwitansi di tab baru tanpa langsung mengunduh */
export async function pratinjauKwitansiPDF({ trx, namaVerifikator }) {
  const nomor = nomorKwitansi(trx);
  const doc = await buatDokumenKwitansi({ trx, namaVerifikator, nomor });
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener");
  return { nomor };
}