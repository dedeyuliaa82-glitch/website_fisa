"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBulanTahun, formatRupiah, labelTingkatan } from "@/lib/utils";
import { Button, Card, Input, Select, Skeleton, StatusBadge } from "@/components/ui";
import { VerifikasiModal } from "@/components/verifikasi/VerifikasiModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Search, Eye, Trash2 } from "lucide-react";
export default function VerifikasiPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("menunggu");
    const [cari, setCari] = useState("");
    const [terpilih, setTerpilih] = useState(null);
    async function muat() {
        var _a;
        setLoading(true);
        const supabase = createClient();
        let q = supabase
            .from("transaksi")
            .select("*, santri(*, users!santri_id_orang_tua_fkey(*))")
            .order("dibuat_pada", { ascending: false })
            .limit(100);
        if (filter !== "semua")
            q = q.eq("status", filter);
        const { data: hasil } = await q;
        setData((_a = hasil) !== null && _a !== void 0 ? _a : []);
        setLoading(false);
    }
    useEffect(() => {
        muat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    async function hapus(t) {
        var _a;
        const nama = ((_a = t.santri) === null || _a === void 0 ? void 0 : _a.nama_santri) ?? "santri ini";
        const ket = t.status === "disetujui" ? " Pembayaran ini akan mengurangi total yang sudah dibayar." : "";
        if (!confirm(`Hapus transaksi ${nama} • ${formatBulanTahun(t.bulan_tahun)}?${ket}`))
            return;
        try {
            const supabase = createClient();
            const { data: terhapus, error } = await supabase.from("transaksi").delete().eq("id", t.id).select("id");
            if (error)
                throw error;
            if (!(terhapus !== null && terhapus !== void 0 ? terhapus : []).length)
                throw new Error("Transaksi tidak terhapus. Pastikan akun admin & policy RLS mengizinkan hapus.");
            muat();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menghapus transaksi.");
        }
    }
    const tampil = data.filter((t) => {
        const k = cari.toLowerCase();
        if (!k)
            return true;
        return (
            (t.santri?.nama_santri?.toLowerCase().includes(k)) ||
            (t.santri?.users?.nama_lengkap?.toLowerCase().includes(k)) ||
            (t.santri?.nis?.toLowerCase().includes(k))
        );
    });
    return (<div className="space-y-5">
      <PageHeader
        judul="Verifikasi Pembayaran"
        deskripsi="Periksa bukti transfer dari wali, lalu setujui atau tolak."
        bantuan={{
          ringkas: "Halaman ini menjadi tempat admin memeriksa pembayaran transfer yang dikirim wali lewat aplikasi mobile.",
          langkah: [
            "Gunakan pencarian atau filter status untuk menemukan transaksi yang ingin diperiksa.",
            "Klik Detail untuk melihat rincian nominal, bukti transfer, dan data santri.",
            "Setujui bila bukti dan nominal sesuai; tolak bila tidak sesuai dengan alasan yang jelas.",
            "Status tagihan santri akan berubah otomatis menjadi sebagian atau lunas setelah disetujui.",
          ],
          catatan: "Pembayaran tunai dan setoran beras fisik tidak melalui halaman ini — catat lewat menu Catat Pembayaran.",
        }}
      />

      <Card className="rounded-2xl border border-fisa-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Input placeholder="Cari nama santri / wali / NIS…" value={cari} onChange={(e) => setCari(e.target.value)} className="pl-10"/>
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-52">
            <option value="semua">Semua status</option>
            <option value="menunggu">Menunggu</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </Select>
          <Button variant="outline" onClick={muat}>Muat ulang</Button>
        </div>
      </Card>

      <Card className="rounded-2xl border border-fisa-100 bg-white overflow-hidden shadow-sm">
        {loading ? (<div className="p-8 text-center">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12"/>)}
          </div>) : tampil.length === 0 ? (<p className="p-10 text-center text-sm font-medium text-fisa-500">
            Tidak ada transaksi yang cocok.
          </p>) : (<div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead>
                <tr className="border-b border-fisa-100 bg-gradient-to-r from-fisa-50 to-slate-50 text-xs font-bold uppercase tracking-wide text-fisa-500">
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Santri</th>
                  <th className="px-5 py-3.5">Tingkatan</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((t, idx) => {
                return (<tr key={t.id} className={`border-b border-fisa-50 last:border-0 transition-colors hover:bg-emerald-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                    <td className="px-5 py-3 text-fisa-700">
                      {t.dibuat_pada ? new Date(t.dibuat_pada).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      <span className="block text-xs text-fisa-500">{formatBulanTahun(t.bulan_tahun)}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-fisa-900">
                      {t.santri?.nama_santri ?? "-"}
                      <span className="block text-xs font-medium text-fisa-500">
                        Wali: {t.santri?.users?.nama_lengkap ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fisa-700">{labelTingkatan(t.santri?.tingkatan ?? "-")}</td>
                    <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(t.total_bayar)}</td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} className="text-xs"/></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setTerpilih(t)}>
                          <Eye size={15}/> Detail
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => hapus(t)} title="Hapus transaksi">
                          <Trash2 size={15}/>
                        </Button>
                      </div>
                    </td>
                  </tr>);
            })}
              </tbody>
            </table>
          </div>)}
      </Card>

      <VerifikasiModal transaksi={terpilih} onClose={() => setTerpilih(null)} onRefresh={muat} onSelesai={() => {
            setTerpilih(null);
            muat();
        }}/>
    </div>);
}