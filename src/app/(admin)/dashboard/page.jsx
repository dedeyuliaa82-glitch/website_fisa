"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { bulanBerjalan, formatBulanTahun, formatRupiah } from "@/lib/utils";
import { Card, Skeleton, StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wallet, Hourglass, UserX, ArrowRight, Wheat, } from "lucide-react";
export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [totalMasuk, setTotalMasuk] = useState(0);
    const [menunggu, setMenunggu] = useState(0);
    const [belumBayar, setBelumBayar] = useState(0);
    const [totalSantri, setTotalSantri] = useState(0);
    async function muat() {
        setLoading(true);
        var _a;
        const supabase = createClient();
        const bulan = bulanBerjalan();
        const [{ data: msk }, { count: cMenunggu }, { count: cSantri }] = await Promise.all([
            supabase
                .from("transaksi")
                .select("total_bayar")
                .eq("bulan_tahun", bulan)
                .eq("status", "disetujui"),
            supabase
                .from("transaksi")
                .select("id", { count: "exact", head: true })
                .eq("status", "menunggu"),
            supabase
                .from("santri")
                .select("id", { count: "exact", head: true }),
        ]);
        setTotalMasuk((msk !== null && msk !== void 0 ? msk : []).reduce((s, t) => { var _a; return s + Number((_a = t.total_bayar) !== null && _a !== void 0 ? _a : 0); }, 0));
        setMenunggu(cMenunggu !== null && cMenunggu !== void 0 ? cMenunggu : 0);
        setTotalSantri(cSantri !== null && cSantri !== void 0 ? cSantri : 0);
        // Belum bayar = tagihan bulan ini yang belum lunas.
        // Bila tagihan belum dibuat, pakai perkiraan lama.
        const { data: tagih } = await supabase
            .from("tagihan")
            .select("id_santri, status")
            .eq("bulan_tahun", bulan);
        if ((tagih ?? []).length > 0) {
            setBelumBayar((tagih ?? []).filter((t) => t.status !== "lunas" && t.status !== "dibatalkan").length);
        } else {
            const { data: sudah } = await supabase
                .from("transaksi")
                .select("id_santri")
                .eq("bulan_tahun", bulan)
                .in("status", ["menunggu", "disetujui"]);
            const unik = new Set((sudah ?? []).map((t) => t.id_santri));
            setBelumBayar(Math.max(0, (cSantri ?? 0) - unik.size));
        }
        const { data: antri } = await supabase
            .from("transaksi")
            .select("*, santri(*, profil(*))")
            .eq("status", "menunggu")
            .order("dibuat_pada", { ascending: false })
            .limit(5);
        setAntrean((_a = antri) !== null && _a !== void 0 ? antri : []);
        setLoading(false);
    }
    useEffect(() => {
        muat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const stats = [
        {
            label: `Uang Masuk • ${formatBulanTahun(bulanBerjalan())}`,
            nilai: formatRupiah(totalMasuk),
            icon: Wallet,
            aksen: "from-fisa-700 to-fisa-900",
            href: "/laporan?tab=lunas",
            cta: "Lihat yang sudah bayar",
        },
        {
            label: "Menunggu Verifikasi",
            nilai: String(menunggu),
            icon: Hourglass,
            aksen: "from-amber-500 to-amber-700",
            href: "/verifikasi",
            cta: "Verifikasi sekarang",
        },
        {
            label: "Santri Belum Bayar",
            nilai: String(belumBayar),
            icon: UserX,
            aksen: "from-red-500 to-red-700",
            href: "/laporan?tab=belum",
            cta: "Lihat daftarnya",
        },
    ];
    return (<div className="space-y-6">
      <PageHeader
        judul="Dashboard"
        deskripsi={`Ringkasan keuangan pesantren bulan ${formatBulanTahun(bulanBerjalan())} • ${totalSantri} santri terdaftar`}
        bantuan={{
          ringkas: "Dashboard menampilkan kondisi keuangan pesantren bulan berjalan secara ringkas.",
          langkah: [
            "Kartu Uang Masuk menunjukkan total pembayaran yang sudah disetujui bulan ini. Klik untuk melihat daftar santri yang sudah bayar.",
            "Kartu Menunggu Verifikasi menunjukkan jumlah bukti pembayaran yang perlu diperiksa. Klik untuk langsung membuka halaman verifikasi.",
            "Kartu Santri Belum Bayar menunjukkan tagihan yang belum lunas. Klik untuk melihat daftar dan menghubungi wali.",
            "Tabel Antrean Verifikasi Terbaru menampilkan 5 pembayaran terakhir yang menunggu keputusan admin.",
          ],
          catatan: "Angka diperbarui otomatis setiap halaman dimuat. Gunakan menu di samping untuk membuka rincian tiap bagian.",
        }}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 sm:h-40"/>)
        ) : (
            stats.map((s) => {
                const Icon = s.icon;
                return (<article key={s.label} className="group hover:translate-y-1 transition-shadow hover:shadow-lg bg-white rounded-2xl border border-fisa-100 p-5">
                  <Link href={s.href} className="block relative flex items-start gap-4">
                    <div className="absolute left-0 top-0 bottom-0 flex-shrink-0 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fisa-700 to-fisa-900">
                      <Icon size={24} className="text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-fisa-500 truncate">{s.label}</p>
                      <p className="mt-1 text-2xl font-extrabold text-fisa-900">{s.nilai}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-fisa-600">
                        {s.cta} <ArrowRight size={12} className="opacity-70"/>
                      </p>
                    </div>
                  </Link>
                </article>);
            })}
      </div>

      <Card className="rounded-2xl border border-fisa-100 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-fisa-100 flex items-center justify-between">
          <h2 className="font-extrabold text-fisa-900">Antrean Verifikasi Terbaru</h2>
          <Link href="/verifikasi" className="flex items-center gap-1.5 text-sm font-bold text-fisa-700 hover:text-fisa-600 transition">
            Lihat semua <ArrowRight size={14}/>
          </Link>
        </div>
        {loading ? (<div className="space-y-3 p-8 text-center">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-24 mx-auto"/>)}
          </div>) : antrean.length === 0 ? (<div className="p-8 flex flex-col items-center gap-2 bg-fisa-50 rounded-xl">
            <Wheat size={32} className="text-fisa-400"/>
            <p className="text-sm font-semibold text-fisa-700">Tidak ada antrean. Semua pembayaran sudah diverifikasi. Barakallah!</p>
          </div>) : (<div className="overflow-x-auto">
            <table className="min-w-max text-sm">
              <thead>
                <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                  <th className="py-3 pr-4">Santri</th>
                  <th className="py-3 pr-4">Bulan</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {antrean.map((t) => {
                var _a, _b, _c, _d;
                return (<tr key={t.id} className="border-b border-fisa-50 last:border-0 hover:bg-fisa-50/50 transition-colors">
                    <td className="py-3 pr-4 font-bold text-fisa-900">
                      {(_b = (_a = t.santri) === null || _a === void 0 ? void 0 : _a.nama_santri) !== null && _b !== void 0 ? _b : "-"}
                      <span className="block text-xs font-medium text-fisa-500">
                        {(_d = (_c = t.santri) === null || _c === void 0 ? void 0 : _c.tingkatan) === null || _d === void 0 ? void 0 : _d.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-fisa-700">
                      {formatBulanTahun(t.bulan_tahun)}
                    </td>
                    <td className="py-3 pr-4 font-bold text-fisa-900">
                      {formatRupiah(t.total_bayar)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={t.status} className="text-xs"/>
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