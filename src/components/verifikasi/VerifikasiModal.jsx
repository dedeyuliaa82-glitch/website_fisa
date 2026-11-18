"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { idPengguna } from "@/lib/auth/client";
import { formatRupiah, formatBulanTahun, labelMetode, pesanGalatDb } from "@/lib/utils";
import { nomorKwitansi, unduhKwitansiPDF, pratinjauKwitansiPDF } from "@/lib/kwitansi";
import { Button, Input, Modal, StatusBadge, Textarea } from "@/components/ui";
import { Check, X, ExternalLink, Loader2, FileText, Receipt } from "lucide-react";
function baris(label, nilai) {
    return (<div className="flex items-center justify-between border-b border-fisa-50 py-2 text-sm last:border-0">
      <span className="text-fisa-600">{label}</span>
      <span className="font-bold text-fisa-900">{nilai}</span>
    </div>);
}
export function VerifikasiModal({ transaksi, onClose, onSelesai, onRefresh, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const [modeTolak, setModeTolak] = useState(false);
    const [alasan, setAlasan] = useState("");
    const [proses, setProses] = useState(null);
    const [galat, setGalat] = useState("");
    const [namaVerifikator, setNamaVerifikator] = useState("");
    const [kwitansi, setKwitansi] = useState(null);
    // Koreksi manual: admin mencatat nominal yang dibayar tunai langsung di pondok
    const [koreksi, setKoreksi] = useState(false);
    const [editNom, setEditNom] = useState({ spp: 0, makan: 0, syahriah: 0, beras: 0 });
    useEffect(() => {
        setKoreksi(false);
        setGalat("");
        setAlasan("");
        setModeTolak(false);
        setEditNom({
            spp: Number(transaksi?.nominal_spp ?? 0),
            makan: Number(transaksi?.nominal_uang_makan ?? 0),
            syahriah: Number(transaksi?.nominal_syahriah ?? 0),
            beras: Number(transaksi?.nominal_beras ?? 0),
        });
        if (transaksi?.status === "disetujui") {
            const nomor = nomorKwitansi(transaksi);
            setKwitansi({ nomor, namaVerifikator: "Admin Ponpes", otomatis: false });
        } else {
            setKwitansi(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaksi && transaksi.id]);
    useEffect(() => {
        (async () => {
            setNamaVerifikator("");
            const oleh = transaksi?.diverifikasi_oleh;
            if (!oleh)
                return;
            const supabase = createClient();
            const { data } = await supabase.from("users").select("nama_lengkap").or(`id.eq.${oleh},id_profil.eq.${oleh}`).maybeSingle();
            const nama = (data && data.nama_lengkap) || String(oleh).slice(0, 8);
            setNamaVerifikator(nama);
            setKwitansi((k) => (k ? { ...k, namaVerifikator: nama } : k));
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transaksi && transaksi.id]);
    if (!transaksi)
        return null;
    const t = transaksi;
    // Nominal efektif: hasil koreksi manual admin bila mode koreksi aktif
    const efektif = koreksi
        ? { nominal_spp: editNom.spp, nominal_uang_makan: editNom.makan, nominal_syahriah: editNom.syahriah, nominal_beras: editNom.beras }
        : { nominal_spp: Number(t.nominal_spp ?? 0), nominal_uang_makan: Number(t.nominal_uang_makan ?? 0), nominal_syahriah: Number(t.nominal_syahriah ?? 0), nominal_beras: Number(t.nominal_beras ?? 0) };
    // Validasi total: jumlah komponen harus = total_bayar (kecuali beras fisik)
    const jumlahKomponen = efektif.nominal_spp + efektif.nominal_uang_makan + efektif.nominal_syahriah + efektif.nominal_beras;
    const selisih = t.metode_pembayaran === "beras_fisik" ? 0 : Math.abs(Number(t.total_bayar ?? 0) - jumlahKomponen);
    function publicUrl(path) {
        if (!path)
            return null;
        if (path.startsWith("http"))
            return path;
        const supabase = createClient();
        const { data } = supabase.storage.from("bukti-pembayaran").getPublicUrl(path);
        return data.publicUrl;
    }
    async function setujui() {
        setProses("setuju");
        setGalat("");
        try {
            const supabase = createClient();
            // Cicilan diizinkan: beberapa transaksi 'disetujui' per bulan.
            // Batas "tidak boleh melebihi tagihan" dijaga trigger database.
            // Cegah menyetujui yang belum bayar: semua nominal 0 (kecuali beras fisik yang memang 0)
            if (t.metode_pembayaran !== "beras_fisik" && jumlahKomponen <= 0) {
                setGalat("Belum ada pembayaran tercatat (semua nominal Rp 0). Catat nominal yang dibayar tunai di pondok lewat Koreksi Nominal, atau tolak transaksi ini.");
                setProses(null);
                return;
            }
            const disetujuiPada = new Date().toISOString();
            const namaAdmin = namaVerifikator || "Admin Ponpes";
            // Nomor kwitansi: pakai kolom di database bila sudah ada
            // (migrasi_kwitansi.sql), kalau belum turunkan dari id transaksi.
            const nomor = nomorKwitansi(t);
            const { error } = await supabase
                .from("transaksi")
                .update({
                    status: "disetujui",
                    alasan_penolakan: null,
                    nominal_spp: efektif.nominal_spp,
                    nominal_uang_makan: efektif.nominal_uang_makan,
                    nominal_syahriah: efektif.nominal_syahriah,
                    nominal_beras: efektif.nominal_beras,
                    total_bayar: t.metode_pembayaran === "beras_fisik" ? 0 : jumlahKomponen,
                    // Audit: siapa & kapan menyetujui
                    diverifikasi_oleh: idPengguna(),
                    diverifikasi_pada: disetujuiPada,
                    // Disimpan bila kolomnya sudah tersedia
                    nomor_kwitansi: nomor,
                })
                .eq("id", t.id);
            if (error) {
                // Kolom nomor_kwitansi belum ada -> ulangi tanpa kolom itu.
                if (/nomor_kwitansi|column|PGRST/i.test(error.message ?? "")) {
                    const { error: ulangi } = await supabase
                        .from("transaksi")
                        .update({
                        status: "disetujui",
                        alasan_penolakan: null,
                        nominal_spp: efektif.nominal_spp,
                        nominal_uang_makan: efektif.nominal_uang_makan,
                        nominal_syahriah: efektif.nominal_syahriah,
                        nominal_beras: efektif.nominal_beras,
                        total_bayar: t.metode_pembayaran === "beras_fisik" ? 0 : jumlahKomponen,
                        diverifikasi_oleh: idPengguna(),
                        diverifikasi_pada: disetujuiPada,
                    })
                        .eq("id", t.id);
                    if (ulangi)
                        throw ulangi;
                }
                else {
                    throw error;
                }
            }
            setProses(null);
            // Kwitansi: nomor disimpan, PDF tidak diunduh otomatis.
            const transaksiLunas = {
                ...t,
                status: "disetujui",
                total_bayar: jumlahKomponen,
                nominal_spp: efektif.nominal_spp,
                nominal_uang_makan: efektif.nominal_uang_makan,
                nominal_syahriah: efektif.nominal_syahriah,
                nominal_beras: efektif.nominal_beras,
                diverifikasi_pada: disetujuiPada,
                nomor_kwitansi: nomor,
            };
            try {
                // (PDF diunduh saja bila admin klik "Unduh PDF" di modal kemudian)
                setKwitansi({ nomor, namaVerifikator: namaAdmin, otomatis: false });
            }
            catch {
                // PDF gagal dibuat tidak boleh membatalkan persetujuan
                setKwitansi({ nomor, namaVerifikator: namaAdmin, gagal: true });
            }
            // Modal sengaja TIDAK ditutup supaya admin masih bisa
            // mencetak/mengunduh ulang kwitansi. Daftar di belakang
            // tetap disegarkan lewat onRefresh.
            onRefresh?.();
        }
        catch (err) {
            setGalat(pesanGalatDb(err, "Gagal menyetujui."));
            setProses(null);
        }
    }
    /** Unduh ulang kwitansi untuk transaksi yang sudah disetujui */
    async function unduhKwitansi() {
        if (!kwitansi)
            return;
        setProses("kwitansi");
        try {
            await unduhKwitansiPDF({ trx: { ...t, nomor_kwitansi: kwitansi.nomor }, namaVerifikator: kwitansi.namaVerifikator });
            setKwitansi((k) => (k ? { ...k, gagal: false } : k));
        }
        catch {
            setKwitansi((k) => (k ? { ...k, gagal: true } : k));
        }
        finally {
            setProses(null);
        }
    }
    async function lihatKwitansi() {
        if (!kwitansi)
            return;
        setProses("kwitansi");
        try {
            await pratinjauKwitansiPDF({ trx: { ...t, nomor_kwitansi: kwitansi.nomor }, namaVerifikator: kwitansi.namaVerifikator });
        }
        catch {
            setKwitansi((k) => (k ? { ...k, gagal: true } : k));
        }
        finally {
            setProses(null);
        }
    }
    async function tolak() {
        if (!alasan.trim())
            return;
        setProses("tolak");
        setGalat("");
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("transaksi")
                .update({
                status: "ditolak",
                alasan_penolakan: alasan.trim(),
                diverifikasi_oleh: idPengguna(),
                diverifikasi_pada: new Date().toISOString(),
            })
                .eq("id", t.id);
            if (error)
                throw error;
            setProses(null);
            setModeTolak(false);
            setAlasan("");
            onSelesai();
        }
        catch (err) {
            setGalat(pesanGalatDb(err, "Gagal menolak."));
            setProses(null);
        }
    }
    // Simpan koreksi nominal tanpa mengubah status (tetap menunggu)
    async function simpanKoreksi() {
        setProses("koreksi");
        setGalat("");
        try {
            const supabase = createClient();
            if (t.metode_pembayaran !== "beras_fisik" && jumlahKomponen <= 0) {
                setGalat("Koreksi masih Rp 0 semua. Isi nominal yang dibayar tunai terlebih dahulu.");
                setProses(null);
                return;
            }
            const { error } = await supabase
                .from("transaksi")
                .update({
                    nominal_spp: efektif.nominal_spp,
                    nominal_uang_makan: efektif.nominal_uang_makan,
                    nominal_syahriah: efektif.nominal_syahriah,
                    nominal_beras: efektif.nominal_beras,
                    total_bayar: t.metode_pembayaran === "beras_fisik" ? 0 : jumlahKomponen,
                })
                .eq("id", t.id);
            if (error)
                throw error;
            setProses(null);
            onSelesai();
        }
        catch (err) {
            setGalat(pesanGalatDb(err, "Gagal menyimpan koreksi."));
            setProses(null);
        }
    }
    const bukti = publicUrl(t.url_bukti_transfer);
    return (<Modal open={!!transaksi} onClose={onClose} title="Verifikasi Pembayaran" wide>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Bukti transfer */}
        <div>
          <p className="mb-2 text-sm font-bold text-fisa-900">Bukti Transfer</p>
          {bukti ? (<a href={bukti} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-fisa-100">
              <Image src={bukti} alt="Bukti transfer" width={600} height={800} className="max-h-105 w-full object-contain bg-fisa-50" unoptimized/>
              <span className="flex items-center justify-center gap-1 bg-fisa-50 py-2 text-xs font-bold text-fisa-700 group-hover:underline">
                <ExternalLink size={13}/> Buka ukuran penuh
              </span>
            </a>) : (<div className="grid h-48 place-items-center rounded-xl bg-fisa-50 text-sm font-medium text-fisa-500">
              {t.metode_pembayaran === "beras_fisik"
                ? "Setoran beras fisik — tanpa bukti transfer."
                : "Tidak ada bukti terlampir."}
            </div>)}
        </div>

        {/* Rincian */}
        <div>
          <p className="text-lg font-extrabold text-fisa-900">{t.santri?.nama_santri ?? "-"}</p>
          <p className="text-sm text-fisa-600">
            {t.santri?.tingkatan?.toUpperCase() ?? "-"} • NIS {t.santri?.nis ?? "-"} • Wali:{" "}
            {t.santri?.users?.nama_lengkap ?? "-"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={t.status}/>
            <span className="text-xs font-semibold text-fisa-500">
              {formatBulanTahun(t.bulan_tahun)} • {labelMetode(t.metode_pembayaran)}
            </span>
          </div>

          <div className="mt-3 rounded-xl bg-fisa-50 p-4">
            {baris("SPP", formatRupiah(t.nominal_spp))}
            {baris("Uang makan", formatRupiah(t.nominal_uang_makan))}
            {baris("Syahriah", formatRupiah(t.nominal_syahriah))}
            {baris(t.beras_diganti_uang ? "Beras (diganti uang)" : "Beras (fisik)", formatRupiah(t.nominal_beras))}
            <div className="flex items-center justify-between pt-2 text-base">
              <span className="font-extrabold text-fisa-900">Total</span>
              <span className="font-extrabold text-fisa-700">{formatRupiah(t.total_bayar)}</span>
            </div>
          </div>

          {t.status === "ditolak" && t.alasan_penolakan && (<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <b>Alasan penolakan:</b> {t.alasan_penolakan}
            </p>)}

          {selisih > 0.5 && (<p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              ⚠️ Selisih total: tercatat {formatRupiah(t.total_bayar)}, jumlah komponen {formatRupiah(jumlahKomponen)}. Periksa nominal sebelum menyetujui.
            </p>)}

          {t.diverifikasi_oleh && (<p className="mt-3 rounded-xl bg-fisa-50 p-3 text-xs font-semibold text-fisa-600">
              🕒 {t.status === "disetujui" ? "Disetujui" : "Diverifikasi"} oleh {namaVerifikator || "…"} pada{" "}
              {t.diverifikasi_pada ? new Date(t.diverifikasi_pada).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
            </p>)}

          {galat && (<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {galat}
            </p>)}

          {/* Kwitansi otomatis: muncul setelah transaksi disetujui */}
          {kwitansi && (<div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                <Receipt size={16} /> Kwitansi {kwitansi.nomor}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-700">
                {kwitansi.gagal
                  ? "PDF gagal dibuat otomatis. Nomor kwitansi tetap tersimpan — unduh ulang lewat tombol di bawah."
                  : "PDF kwitansi sudah diunduh otomatis. Simpan file ini untuk wali."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={unduhKwitansi} disabled={proses === "kwitansi"}>
                  {proses === "kwitansi" ? <Loader2 size={15} className="animate-spin"/> : <FileText size={15}/>}
                  Unduh PDF
                </Button>
                <Button variant="outline" size="sm" onClick={lihatKwitansi} disabled={proses === "kwitansi"}>
                  <ExternalLink size={15}/> Lihat
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={onSelesai} className="mt-2 w-full">
                Selesai &amp; tutup
              </Button>
            </div>)}

          {t.status === "menunggu" && !kwitansi && (<div className="mt-3 rounded-xl border border-fisa-200 p-3">
              <button type="button" onClick={() => setKoreksi(!koreksi)} className="cursor-pointer text-sm font-extrabold text-fisa-700 hover:underline">
                {koreksi ? "▾ Tutup koreksi nominal" : "✏️ Koreksi nominal (bayar tunai di pondok)"}
              </button>
              {koreksi && (<div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[["spp", "SPP"], ["makan", "Uang makan"], ["syahriah", "Syahriah"], ["beras", "Beras"]].map(([k, label]) => (
                      <div key={k}>
                        <span className="mb-1 block text-xs font-bold text-fisa-700">{label} (Rp)</span>
                        <Input type="number" min={0} value={editNom[k]} onChange={(e) => setEditNom({ ...editNom, [k]: Number(e.target.value) || 0 })}/>
                      </div>))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-fisa-50 p-3 text-sm">
                    <span className="font-bold text-fisa-700">Total baru</span>
                    <span className="font-extrabold text-fisa-900">{formatRupiah(jumlahKomponen)}</span>
                  </div>
                  <Button variant="outline" onClick={simpanKoreksi} disabled={proses === "koreksi"} className="w-full">
                    {proses === "koreksi" ? <Loader2 size={16} className="animate-spin"/> : null}
                    Simpan Koreksi (tetap menunggu)
                  </Button>
                </div>)}
            </div>)}

          {t.status === "menunggu" && !modeTolak && !kwitansi && (<div className="mt-4 grid grid-cols-2 gap-3">              <Button variant="danger" onClick={() => setModeTolak(true)}>
                <X size={16}/> Tolak
              </Button>
              <Button onClick={setujui} disabled={proses === "setuju"}>
                {proses === "setuju" ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                Setujui
              </Button>
            </div>)}

          {t.status === "menunggu" && modeTolak && !kwitansi && (<div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-3">
              <Textarea placeholder="Tulis alasan penolakan, misal: bukti buram, nominal kurang…" value={alasan} onChange={(e) => setAlasan(e.target.value)}/>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setModeTolak(false)}>Batal</Button>
                <Button variant="danger" onClick={tolak} disabled={!alasan.trim() || proses === "tolak"}>
                  {proses === "tolak" ? <Loader2 size={16} className="animate-spin"/> : <X size={16}/>}
                  Tolak
                </Button>
              </div>
            </div>)}
        </div>
      </div>
    </Modal>);
}
