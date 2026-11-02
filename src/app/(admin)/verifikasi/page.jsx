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
            .select("*, santri(*, profil(*))")
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
        var _a, _b, _c, _d, _e, _f, _g;
        const k = cari.toLowerCase();
        if (!k)
            return true;
        return (((_b = (_a = t.santri) === null || _a === void 0 ? void 0 : _a.nama_santri) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(k)) ||
            ((_e = (_d = (_c = t.santri) === null || _c === void 0 ? void 0 : _c.profil) === null || _d === void 0 ? void 0 : _d.nama_lengkap) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(k)) ||
            ((_g = (_f = t.santri) === null || _f === void 0 ? void 0 : _f.nis) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(k)));
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

      <Card className="flex flex-col gap-3 sm:flex-row">
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
      </Card>

      <Card className="p-0">
        {loading ? (<div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12"/>)}
          </div>) : tampil.length === 0 ? (<p className="p-10 text-center text-sm font-medium text-fisa-500">
            Tidak ada transaksi yang cocok.
          </p>) : (<div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead>
                <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Santri</th>
                  <th className="px-5 py-3">Tingkatan</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((t) => {
                var _a, _b, _c, _d, _e, _f, _g;
                return (<tr key={t.id} className="border-b border-fisa-50 last:border-0 hover:bg-fisa-50/50">
                    <td className="px-5 py-3 text-fisa-700">
                      {t.dibuat_pada ? new Date(t.dibuat_pada).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      <span className="block text-xs text-fisa-500">{formatBulanTahun(t.bulan_tahun)}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-fisa-900">
                      {(_b = (_a = t.santri) === null || _a === void 0 ? void 0 : _a.nama_santri) !== null && _b !== void 0 ? _b : "-"}
                      <span className="block text-xs font-medium text-fisa-500">
                        Wali: {(_e = (_d = (_c = t.santri) === null || _c === void 0 ? void 0 : _c.profil) === null || _d === void 0 ? void 0 : _d.nama_lengkap) !== null && _e !== void 0 ? _e : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fisa-700">{labelTingkatan((_g = (_f = t.santri) === null || _f === void 0 ? void 0 : _f.tingkatan) !== null && _g !== void 0 ? _g : "-")}</td>
                    <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(t.total_bayar)}</td>
                    <td className="px-5 py-3"><StatusBadge status={t.status}/></td>
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
