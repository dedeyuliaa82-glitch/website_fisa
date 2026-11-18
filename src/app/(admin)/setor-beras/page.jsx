"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { bulanBerjalan, cn, formatBulanTahun } from "@/lib/utils";
import { Card, Input, Label, Button, Skeleton } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wheat, Loader2, CheckCircle2, XCircle, Search } from "lucide-react";
export default function SetorBerasPage() {
    var _a;
    const [daftar, setDaftar] = useState([]);
    const [cari, setCari] = useState("");
    const [santriId, setSantriId] = useState("");
    const [bulan, setBulan] = useState(bulanBerjalan());
    const [catatan, setCatatan] = useState("");
    const [proses, setProses] = useState(false);
    const [pesan, setPesan] = useState("");
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            // Hanya santri lokal (luar_kota = false) yang setor beras fisik
            const { data } = await supabase
                .from("santri")
                .select("id, nama_santri, nis")
                .eq("luar_kota", false)
                .order("nama_santri")
                .limit(200);
            setDaftar(data !== null && data !== void 0 ? data : []);
        })();
    }, []);
    const saring = daftar.filter((s) => {
        var _a;
        const k = cari.toLowerCase();
        return !k || s.nama_santri.toLowerCase().includes(k) || ((_a = s.nis) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(k));
    });
    const namaTerpilih = (_a = daftar.find((s) => s.id === santriId)) === null || _a === void 0 ? void 0 : _a.nama_santri;
    async function simpan(e) {
        e.preventDefault();
        if (!santriId) {
            setPesan("Pilih santri terlebih dahulu.");
            return;
        }
        setProses(true);
        setPesan("");
        try {
            const supabase = createClient();
            // Cegah duplikat: sudah ada transaksi bulan ini?
            const { data: ada } = await supabase
                .from("transaksi")
                .select("id, status")
                .eq("id_santri", santriId)
                .eq("bulan_tahun", bulan)
                .maybeSingle();
            if (ada)
                throw new Error(`Santri ini sudah punya catatan bulan ${formatBulanTahun(bulan)} (status: ${ada.status}).`);
            // Catat setoran beras fisik sebagai transaksi lunas-beras (nominal 0, langsung disetujui).
            // Nominal SPP/uang makan/syahriah diisi 0 — admin melengkapi bila dibayar tunai terpisah.
            const { error } = await supabase.from("transaksi").insert({
                id_santri: santriId,
                bulan_tahun: bulan,
                nominal_spp: 0,
                nominal_uang_makan: 0,
                nominal_syahriah: 0,
                beras_diganti_uang: false,
                nominal_beras: 0,
                total_bayar: 0,
                metode_pembayaran: "beras_fisik",
                status: "disetujui",
                alasan_penolakan: null,
                dibuat_pada: new Date().toISOString(),
            });
            if (error)
                throw error;
            setPesan(`Berhasil: ${namaTerpilih} tercatat setor beras 10 kg untuk ${formatBulanTahun(bulan)}.${catatan ? ` (${catatan})` : ""}`);
            setSantriId("");
            setCari("");
        }
        catch (err) {
            setPesan(err instanceof Error ? err.message : "Gagal menyimpan.");
        }
        finally {
            setProses(false);
        }
    }
    // Tentukan kelas warna pesan
    const pesanClass = pesan.startsWith("Berhasil")
        ? "text-emerald-600"
        : pesan.startsWith("Gagal")
            ? "text-red-600"
            : "text-fisa-600";
    const iconBerhasil = pesan.startsWith("Berhasil") ? <CheckCircle2 size={17} className="mt-0.5 shrink-0"/> : null;
    const iconGagal = pesan.startsWith("Gagal") ? <XCircle size={17} className="mt-0.5 shrink-0"/> : null;
    return (<div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        judul="Setor Beras Fisik"
        deskripsi="Catat santri lokal yang mengumpulkan beras 10 kg langsung ke pondok."
        bantuan={{
          ringkas: "Halaman ini khusus untuk setoran beras fisik dari santri lokal, bukan pembayaran uang.",
          langkah: [
            "Cari dan pilih santri lokal yang menyerahkan beras.",
            "Tentukan bulan setoran dan tambahkan catatan bila perlu (misalnya nomor karung).",
            "Klik Simpan Setoran 10 Kg. Transaksi langsung berstatus disetujui.",
          ],
          catatan: "Hanya santri lokal (bukan luar kota) yang muncul di daftar. Setoran beras dinilai memakai Harga Beras 10 Kg di Pengaturan Biaya.",
        }}
      />

      <Card className="rounded-2xl border border-fisa-100 bg-white p-6 shadow-sm">
        {pesan && (<div className="mb-4 flex items-start gap-2 rounded-xl p-3 text-sm font-semibold">
          <span className={pesanClass}>
            {iconBerhasil}{iconGagal}{pesan}
          </span>
        </div>)}

        <form onSubmit={simpan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cari Santri Lokal</Label>
              <div className="relative">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
                <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Ketik nama / NIS…" className="pl-10"/>
              </div>
              {cari && (<div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-fisa-100">
                  {saring.slice(0, 20).map((s) => {
                  var _a;
                  return (<button type="button" key={s.id} onClick={() => { setSantriId(s.id); setCari(s.nama_santri); }} className={cn("block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-fisa-50", santriId === s.id && "bg-fisa-100 font-bold text-fisa-900")}>
                      {s.nama_santri} <span className="text-xs text-fisa-500">• NIS {(_a = s.nis) !== null && _a !== void 0 ? _a : "-"}</span>
                  </button>);
              })}
                  {saring.length === 0 && (<p className="px-4 py-3 text-sm text-fisa-500">Tidak ditemukan. Hanya santri lokal yang tampil.</p>)}
                </div>)}
              {namaTerpilih && !cari && (<p className="mt-2 text-sm font-bold text-fisa-800">Terpilih: {namaTerpilih}</p>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bulan Setoran</Label>
              <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} required/>
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="cth: karung ke-2"/>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full">
            {proses && <Loader2 size={18} className="animate-spin"/>}
            <Wheat size={18}/> Simpan Setoran 10 Kg
          </Button>
        </form>
      </Card>
    </div>);
}