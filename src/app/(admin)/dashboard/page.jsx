"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { bulanBerjalan, formatBulanTahun, formatRupiah } from "@/lib/utils";
import { Button, Card, Skeleton, StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wallet, Hourglass, UserX, ArrowRight, Wheat } from "lucide-react";
import { VerifikasiModal } from "@/components/verifikasi/VerifikasiModal";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [totalMasuk, setTotalMasuk] = useState(0);
    const [menunggu, setMenunggu] = useState(0);
    const [belumBayar, setBelumBayar] = useState(0);
    const [totalSantri, setTotalSantri] = useState(0);
    const [antrean, setAntrean] = useState([]);
    const [terpilih, setTerpilih] = useState(null);

    async function muat() {
        setLoading(true);
        try {
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

            setTotalMasuk((msk ?? []).reduce((s, t) => s + Number(t.total_bayar ?? 0), 0));
            setMenunggu(cMenunggu ?? 0);
            setTotalSantri(cSantri ?? 0);

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
                .select("*, santri(*, users!santri_id_orang_tua_fkey(*))")
                .eq("status", "menunggu")
                .order("dibuat_pada", { ascending: false })
                .limit(5);

            setAntrean(antri ?? []);
        } catch (err) {
            console.error("Gagal memuat dashboard:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        muat();
    }, []);

    const stats = [
        {
            label: `Uang Masuk • ${formatBulanTahun(bulanBerjalan())}`,
            nilai: formatRupiah(totalMasuk),
            icon: Wallet,
            aksen: "from-emerald-600 to-emerald-800",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-700",
            border: "border-emerald-100",
            href: "/laporan?tab=lunas",
            cta: "Lihat yang sudah bayar",
        },
        {
            label: "Menunggu Verifikasi",
            nilai: String(menunggu),
            icon: Hourglass,
            aksen: "from-amber-500 to-amber-700",
            iconBg: "bg-amber-50",
            iconColor: "text-amber-700",
            border: "border-amber-100",
            href: "/verifikasi",
            cta: "Verifikasi sekarang",
        },
        {
            label: "Santri Belum Bayar",
            nilai: String(belumBayar),
            icon: UserX,
            aksen: "from-red-500 to-red-700",
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
            border: "border-red-100",
            href: "/laporan?tab=belum",
            cta: "Lihat daftarnya",
        },
    ];

    return (
        <div className="space-y-6">
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
                    [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 sm:h-40" />)
                ) : (
                    stats.map((s) => {
                        const Icon = s.icon;
                        return (
                            <article key={s.label} className={`group transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white rounded-2xl border ${s.border} p-5 cursor-pointer`}>
                                <Link href={s.href} className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 grid h-12 w-12 place-items-center rounded-xl ${s.iconBg} shadow-sm`}>
                                        <Icon size={22} className={s.iconColor} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-fisa-600 truncate uppercase tracking-tight">{s.label}</p>
                                        <p className="mt-1.5 text-3xl font-extrabold text-fisa-950 truncate">{s.nilai}</p>
                                        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-fisa-700 group-hover:text-fisa-900 transition-colors">
                                            {s.cta} <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                                        </p>
                                    </div>
                                </Link>
                            </article>
                        );
                    })
                )}
            </div>

            <Card className="rounded-2xl border border-fisa-100 bg-white overflow-hidden shadow-sm">
                <div className="p-5 border-b border-fisa-100 flex items-center justify-between">
                    <h2 className="font-extrabold text-fisa-900">Antrean Verifikasi Terbaru</h2>
                    <Link href="/verifikasi" className="flex items-center gap-1.5 text-sm font-bold text-fisa-700 hover:text-fisa-600 transition">
                        Lihat semua <ArrowRight size={14} />
                    </Link>
                </div>
                {loading ? (
                    <div className="space-y-3 p-8 text-center">
                        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full mx-auto" />)}
                    </div>
                ) : antrean.length === 0 ? (
                    <div className="p-8 flex flex-col items-center gap-2 bg-fisa-50 rounded-xl m-5">
                        <Wheat size={32} className="text-fisa-400" />
                        <p className="text-sm font-semibold text-fisa-700">Tidak ada antrean. Semua pembayaran sudah diverifikasi.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-3xl text-left text-sm">
                            <thead>
                                <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase tracking-wide text-fisa-600">
                                    <th className="px-5 py-3">Santri</th>
                                    <th className="px-5 py-3">Bulan</th>
                                    <th className="px-5 py-3">Total</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {antrean.map((t, idx) => (
                                    <tr key={t.id} className={`border-b border-fisa-50 last:border-0 transition-colors hover:bg-fisa-50/60 ${idx % 2 === 0 ? "bg-white" : "bg-fisa-25"}`}>
                                        <td className="px-5 py-3 font-bold text-fisa-900">
                                            {t.santri?.nama_santri ?? "-"}
                                            <span className="block text-xs font-medium text-fisa-500">
                                                {t.santri?.tingkatan?.toUpperCase() ?? "-"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-fisa-700">
                                            {formatBulanTahun(t.bulan_tahun)}
                                        </td>
                                        <td className="px-5 py-3 font-bold text-fisa-900">
                                            {formatRupiah(t.total_bayar)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <StatusBadge status={t.status} className="text-xs" />
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Button size="sm" variant="outline" onClick={() => setTerpilih(t)}>
                                                Verifikasi
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <VerifikasiModal
                transaksi={terpilih}
                onClose={() => setTerpilih(null)}
                onRefresh={muat}
                onSelesai={() => {
                    setTerpilih(null);
                    muat();
                }}
            />
        </div>
    );
}
