"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bulanBerjalan, formatBulanTahun, formatRupiah, labelMetode, labelTingkatan } from "@/lib/utils";
import { Button, Card, Input, Label, Skeleton, StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { Download, FileText, CheckCircle2, Hourglass, UserX, TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function normalisasiSantri(s) {
  if (!s) return null;
  return Array.isArray(s) ? (s[0] ?? null) : s;
}

function enamBulanTerakhir(bulanAcuan) {
  const [tahun, bulan] = String(bulanAcuan ?? "").split("-").map(Number);
  const dasar = tahun > 0 && bulan > 0 ? new Date(tahun, bulan - 1, 1) : new Date();
  const hasil = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(dasar.getFullYear(), dasar.getMonth() - i, 1);
    hasil.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return hasil;
}

const NAMA_BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function labelBulanSingkat(bulanTahun) {
  return NAMA_BULAN_SINGKAT[Number(bulanTahun.split("-")[1]) - 1];
}

const formatRupiahRingkas = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Ambil semua baris lewat pagination agar rekap 6 bulan tidak terpotong batas 1000 baris Supabase. */
async function ambilSemua(buatQuery) {
  const ukuran = 1000;
  const hasil = [];
  for (let dari = 0; ; dari += ukuran) {
    const { data } = await buatQuery().range(dari, dari + ukuran - 1);
    if (!data?.length) break;
    hasil.push(...data);
    if (data.length < ukuran) break;
  }
  return hasil;
}

function TooltipGrafik({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-fisa-100 bg-white p-3 shadow-lg">
      <p className="text-xs font-extrabold text-fisa-900">{formatBulanTahun(d.bulan)}</p>
      <div className="mt-1.5 space-y-1 text-xs">
        <p className="flex justify-between gap-6">
          <span className="text-fisa-500">Target tagihan</span>
          <span className="font-bold text-fisa-800">{formatRupiah(d.target)}</span>
        </p>
        <p className="flex justify-between gap-6">
          <span className="text-fisa-500">Uang masuk</span>
          <span className="font-bold text-emerald-700">{formatRupiah(d.masuk)}</span>
        </p>
        <p className="flex justify-between gap-6">
          <span className="text-fisa-500">Pencapaian</span>
          <span className="font-bold text-amber-600">{d.persen}%</span>
        </p>
      </div>
      <p className="mt-1.5 border-t border-fisa-50 pt-1.5 text-[11px] text-fisa-500">
        {d.lunas} lunas • {d.menunggu} menunggu
      </p>
    </div>
  );
}

export default function LaporanPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <LaporanIsi />
    </Suspense>
  );
}

function LaporanIsi() {
  const params = useSearchParams();
  const tabAwal = params.get("tab");
  const [bulan, setBulan] = useState(bulanBerjalan());
  const [tab, setTab] = useState(tabAwal === "belum" ? "belum" : tabAwal === "menunggu" ? "menunggu" : "lunas");
  const [tagihan, setTagihan] = useState([]);
  const [trx, setTrx] = useState([]);
  const [tren, setTren] = useState({});
  const [loading, setLoading] = useState(true);
  const tabelRef = useRef(null);

  /** Klik kartu = pindah kategori + langsung lompat ke rekap di bawahnya */
  function pilihTab(k) {
    setTab(k);
    setTimeout(() => {
      tabelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  async function muat() {
    setLoading(true);
    const supabase = createClient();
    const rentang = enamBulanTerakhir(bulan);
    const [{ data: hasilTagihan }, { data: hasilTrx }, riwayatTagihan, riwayatTrx] =
      await Promise.all([
        supabase
          .from("tagihan")
          .select("*, santri(nama_santri, nis, tingkatan, profil(nama_lengkap))")
          .eq("bulan_tahun", bulan)
          .limit(1000),
        supabase
          .from("transaksi")
          .select("id, id_santri, bulan_tahun, total_bayar, status, metode_pembayaran, santri(nama_santri, tingkatan)")
          .eq("bulan_tahun", bulan)
          .order("dibuat_pada", { ascending: false })
          .limit(1000),
        ambilSemua(() =>
          supabase
            .from("tagihan")
            .select("bulan_tahun, status, total_tagihan")
            .gte("bulan_tahun", rentang[0])
            .lte("bulan_tahun", rentang[rentang.length - 1])
            .order("id"),
        ),
        ambilSemua(() =>
          supabase
            .from("transaksi")
            .select("bulan_tahun, status, total_bayar")
            .gte("bulan_tahun", rentang[0])
            .lte("bulan_tahun", rentang[rentang.length - 1])
            .order("id"),
        ),
      ]);

    setTagihan((hasilTagihan ?? []).map((r) => ({ ...r, santri: normalisasiSantri(r.santri) })));
    setTrx((hasilTrx ?? []).map((r) => ({ ...r, santri: normalisasiSantri(r.santri) })));

    const agg = {};
    rentang.forEach((b) => { agg[b] = { masuk: 0, target: 0, lunas: 0, menunggu: 0 }; });
    (riwayatTrx ?? []).forEach((t) => {
      if (!agg[t.bulan_tahun]) agg[t.bulan_tahun] = { masuk: 0, target: 0, lunas: 0, menunggu: 0 };
      if (t.status === "disetujui") agg[t.bulan_tahun].masuk += Number(t.total_bayar ?? 0);
      else if (t.status === "menunggu") agg[t.bulan_tahun].menunggu += 1;
    });
    (riwayatTagihan ?? []).forEach((t) => {
      if (!agg[t.bulan_tahun]) agg[t.bulan_tahun] = { masuk: 0, target: 0, lunas: 0, menunggu: 0 };
      if (t.status !== "dibatalkan") agg[t.bulan_tahun].target += Number(t.total_tagihan ?? 0);
      if (t.status === "lunas") agg[t.bulan_tahun].lunas += 1;
    });
    setTren(agg);
    setLoading(false);
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan]);

  const lunasTrx = trx.filter((d) => d.status === "disetujui");
  const menungguTrx = trx.filter((d) => d.status === "menunggu");
  const totalMasuk = lunasTrx.reduce((s, d) => s + Number(d.total_bayar ?? 0), 0);

  const lunasTagihan = tagihan.filter((t) => t.status === "lunas");
  const sebagianTagihan = tagihan.filter((t) => t.status === "sebagian");
  const pendingIds = new Set(menungguTrx.map((t) => t.id_santri));
  const belumTagihan = tagihan.filter(
    (t) => t.status !== "lunas" && t.status !== "dibatalkan" && !pendingIds.has(t.id_santri),
  );

  const totalTagihan = tagihan
    .filter((t) => t.status !== "dibatalkan")
    .reduce((s, t) => s + Number(t.total_tagihan ?? 0), 0);
  const tunggakan = tagihan
    .filter((t) => t.status !== "lunas" && t.status !== "dibatalkan")
    .reduce((s, t) => s + Math.max(0, Number(t.total_tagihan ?? 0) - Number(t.total_dibayar ?? 0)), 0);

  const tabs = [
    { key: "lunas", label: "Sudah Bayar", jumlah: lunasTagihan.length, icon: CheckCircle2 },
    { key: "menunggu", label: "Menunggu", jumlah: menungguTrx.length, icon: Hourglass },
    { key: "belum", label: "Belum Bayar", jumlah: belumTagihan.length, icon: UserX },
  ];

  const labelTab = tab === "lunas" ? "Sudah Bayar" : tab === "menunggu" ? "Menunggu" : "Belum Bayar";

  function unduhCsv() {
    let header = "";
    let isi = [];
    if (tab === "belum") {
      header = "nama_santri,nis,tingkatan,wali,bulan,tagihan,dibayar,sisa,status";
      isi = belumTagihan.map((t) =>
        [
          `"${t.santri?.nama_santri ?? "-"}"`,
          t.santri?.nis ?? "-",
          t.santri?.tingkatan ?? "-",
          `"${t.santri?.profil?.nama_lengkap ?? "-"}"`,
          t.bulan_tahun,
          t.total_tagihan ?? 0,
          t.total_dibayar ?? 0,
          Math.max(0, Number(t.total_tagihan ?? 0) - Number(t.total_dibayar ?? 0)),
          t.status,
        ].join(","),
      );
    } else if (tab === "lunas") {
      header = "nama_santri,tingkatan,bulan,tagihan,dibayar,status";
      isi = lunasTagihan.map((t) =>
        [
          `"${t.santri?.nama_santri ?? "-"}"`,
          t.santri?.tingkatan ?? "-",
          t.bulan_tahun,
          t.total_tagihan ?? 0,
          t.total_dibayar ?? 0,
          t.status,
        ].join(","),
      );
    } else {
      header = "nama_santri,tingkatan,bulan,total_bayar,status,metode";
      isi = menungguTrx.map((d) =>
        [
          `"${d.santri?.nama_santri ?? "-"}"`,
          d.santri?.tingkatan ?? "-",
          d.bulan_tahun,
          d.total_bayar ?? 0,
          d.status,
          d.metode_pembayaran ? labelMetode(d.metode_pembayaran) : "-",
        ].join(","),
      );
    }
    const blob = new Blob([[header, ...isi].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-fisa-${tab}-${bulan}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rentang = enamBulanTerakhir(bulan);
  const dataGrafik = rentang.map((b) => {
    const t = tren[b] ?? { masuk: 0, target: 0, lunas: 0, menunggu: 0 };
    return {
      bulan: b,
      label: labelBulanSingkat(b),
      target: t.target,
      masuk: t.masuk,
      persen: t.target > 0 ? Math.round((t.masuk / t.target) * 100) : 0,
      lunas: t.lunas,
      menunggu: t.menunggu,
    };
  });
  const adaDataGrafik = dataGrafik.some((d) => d.target > 0 || d.masuk > 0);
  const maksPersen = Math.max(100, ...dataGrafik.map((d) => d.persen));
  const domainPersen = [0, Math.ceil(maksPersen / 20) * 20];

  return (
    <div className="space-y-5">
      <PageHeader
        judul="Laporan"
        deskripsi={`Rekap bulanan ${formatBulanTahun(bulan)}`}
        bantuan={{
          ringkas: "Pantau rekap pembayaran dan tunggakan per bulan dalam satu halaman.",
          langkah: [
            "Pilih bulan pada filter di atas untuk melihat data bulan tersebut.",
            "Klik kartu Sudah Bayar, Menunggu, atau Belum Bayar untuk berpindah kategori; tabel rincian akan langsung ditampilkan.",
            "Klik Unduh CSV untuk menyimpan rincian kategori aktif sebagai berkas Excel/CSV.",
            "Bagian Target vs Uang Masuk menampilkan perbandingan target tagihan dan penerimaan aktual 6 bulan terakhir.",
          ],
          catatan: "Kategori Menunggu berisi transaksi yang belum diverifikasi. Verifikasi lewat menu Verifikasi Pembayaran agar statusnya berubah. Grafik memakai total tagihan non-dibatalkan sebagai target dan transaksi disetujui sebagai uang masuk.",
        }}
      />

      {/* 1. ATAS: filter bulan + ringkasan kartu status (fokus utama) */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <Label>Pilih Bulan</Label>
          <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const aktif = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => pilihTab(t.key)}
                className={cn(
                  "cursor-pointer rounded-xl p-3 text-left ring-2 transition hover:-translate-y-0.5",
                  aktif
                    ? t.key === "belum"
                      ? "bg-red-600 text-white ring-red-600 shadow-lg"
                      : t.key === "menunggu"
                        ? "bg-amber-500 text-white ring-amber-500 shadow-lg"
                        : "bg-fisa-800 text-white ring-fisa-800 shadow-lg"
                    : "bg-fisa-50 text-fisa-900 ring-transparent hover:bg-fisa-100",
                )}
              >
                <p className={cn("flex items-center gap-1.5 text-[11px] font-bold", aktif ? "text-white/85" : "text-fisa-500")}>
                  <Icon size={13} /> {t.label}
                </p>
                <p className="mt-0.5 text-lg font-extrabold">{t.jumlah} santri</p>
                {t.key === "lunas" && (
                  <p className={cn("text-xs font-bold", aktif ? "text-white/85" : "text-fisa-600")}>
                    {formatRupiah(totalMasuk)} terkumpul
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Ringkasan tagihan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Ringkas label="Total Tagihan" nilai={formatRupiah(totalTagihan)} sub={`${tagihan.length} tagihan`} />
        <Ringkas label="Terkumpul (uang)" nilai={formatRupiah(totalMasuk)} sub="tunai & transfer" tone="emerald" />
        <Ringkas label="Tunggakan" nilai={formatRupiah(tunggakan)} sub={`${sebagianTagihan.length} sebagian`} tone="amber" />
        <Ringkas label="Belum Bayar" nilai={`${belumTagihan.length} santri`} sub="belum ada pembayaran" tone="slate" />
      </div>

      {/* 2. TENGAH: tabel rincian kategori aktif + tombol unduh CSV */}
      <div ref={tabelRef} className="scroll-mt-20">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fisa-100 p-5 pb-4">
            <div>
              <h2 className="font-extrabold text-fisa-900">Rincian {labelTab}</h2>
              <p className="text-xs text-fisa-500">{formatBulanTahun(bulan)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={unduhCsv}>
              <Download size={15} /> Unduh CSV
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : tab === "belum" ? (
            belumTagihan.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <CheckCircle2 size={28} className="text-emerald-500" />
                <p className="text-sm font-semibold text-fisa-700">Semua santri sudah membayar bulan ini. MasyaAllah!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-3xl text-left text-sm">
                  <thead>
                    <tr className="border-b border-fisa-100 bg-red-50/60 text-xs uppercase text-red-500">
                      <th className="px-5 py-3">Santri</th>
                      <th className="px-5 py-3">Tingkatan</th>
                      <th className="px-5 py-3">Tagihan</th>
                      <th className="px-5 py-3">Dibayar</th>
                      <th className="px-5 py-3">Sisa</th>
                      <th className="px-5 py-3">Wali (untuk ditagih)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {belumTagihan.map((t) => (
                      <tr key={t.id} className="border-b border-fisa-50 last:border-0">
                        <td className="px-5 py-3 font-bold text-fisa-900">
                          {t.santri?.nama_santri ?? "-"}
                          <span className="block text-xs font-medium text-fisa-500">NIS {t.santri?.nis ?? "-"}</span>
                        </td>
                        <td className="px-5 py-3 text-fisa-700">{labelTingkatan(t.santri?.tingkatan)}</td>
                        <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(t.total_tagihan)}</td>
                        <td className="px-5 py-3 font-bold text-emerald-700">{formatRupiah(t.total_dibayar)}</td>
                        <td className="px-5 py-3 font-bold text-amber-700">
                          {formatRupiah(Math.max(0, Number(t.total_tagihan ?? 0) - Number(t.total_dibayar ?? 0)))}
                        </td>
                        <td className="px-5 py-3 font-semibold text-fisa-900">{t.santri?.profil?.nama_lengkap ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === "lunas" ? (
            lunasTagihan.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <FileText size={28} className="text-fisa-300" />
                <p className="text-sm font-medium text-fisa-500">Belum ada tagihan lunas bulan ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-3xl text-left text-sm">
                  <thead>
                    <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                      <th className="px-5 py-3">Santri</th>
                      <th className="px-5 py-3">Tagihan</th>
                      <th className="px-5 py-3">Dibayar</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lunasTagihan.map((t) => (
                      <tr key={t.id} className="border-b border-fisa-50 last:border-0">
                        <td className="px-5 py-3 font-bold text-fisa-900">
                          {t.santri?.nama_santri ?? "-"}
                          <span className="block text-xs font-medium text-fisa-500">{labelTingkatan(t.santri?.tingkatan)}</span>
                        </td>
                        <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(t.total_tagihan)}</td>
                        <td className="px-5 py-3 font-bold text-emerald-700">{formatRupiah(t.total_dibayar)}</td>
                        <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : menungguTrx.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <FileText size={28} className="text-fisa-300" />
              <p className="text-sm font-medium text-fisa-500">Tidak ada transaksi menunggu bulan ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-left text-sm">
                <thead>
                  <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                    <th className="px-5 py-3">Santri</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Metode</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {menungguTrx.map((d) => (
                    <tr key={d.id} className="border-b border-fisa-50 last:border-0">
                      <td className="px-5 py-3 font-bold text-fisa-900">
                        {d.santri?.nama_santri ?? "-"}
                        <span className="block text-xs font-medium text-fisa-500">{d.santri?.tingkatan?.toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(d.total_bayar)}</td>
                      <td className="px-5 py-3 text-fisa-700">{d.metode_pembayaran ? labelMetode(d.metode_pembayaran) : "-"}</td>
                      <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* 3. BAWAH: perbandingan target tagihan vs uang masuk aktual */}
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-fisa-100 text-fisa-800">
              <TrendingUp size={18} />
            </span>
            <div>
              <h2 className="font-extrabold text-fisa-900">Target vs Uang Masuk</h2>
              <p className="text-xs text-fisa-500">
                Perbandingan target tagihan dan penerimaan aktual • {formatBulanTahun(rentang[0])} – {formatBulanTahun(rentang[rentang.length - 1])}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-fisa-50 px-3 py-1 text-[11px] font-bold text-fisa-600">Rentang 6 bulan</span>
        </div>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : !adaDataGrafik ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <FileText size={28} className="text-fisa-300" />
            <p className="text-sm font-medium text-fisa-500">Belum ada data tagihan pada rentang ini.</p>
          </div>
        ) : (
          <div className="h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dataGrafik} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
                <defs>
                  <linearGradient id="gradienMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#478a61" />
                    <stop offset="100%" stopColor="#2b5840" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eee3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#478a61", fontSize: 11, fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  yAxisId="kiri"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6aa67d", fontSize: 10 }}
                  width={64}
                  tickFormatter={(v) => `Rp ${formatRupiahRingkas.format(v)}`}
                />
                <YAxis
                  yAxisId="kanan"
                  orientation="right"
                  domain={domainPersen}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#b08a3a", fontSize: 10 }}
                  width={40}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<TooltipGrafik />} cursor={{ fill: "rgba(11, 61, 46, 0.05)" }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Bar yAxisId="kiri" dataKey="target" name="Target tagihan" fill="#c2ddc9" radius={[6, 6, 0, 0]} maxBarSize={26}>
                  {dataGrafik.map((d) => (
                    <Cell key={d.bulan} fill={d.bulan === bulan ? "#97c4a4" : "#c2ddc9"} />
                  ))}
                </Bar>
                <Bar yAxisId="kiri" dataKey="masuk" name="Uang masuk" fill="url(#gradienMasuk)" radius={[6, 6, 0, 0]} maxBarSize={26}>
                  {dataGrafik.map((d) => (
                    <Cell key={d.bulan} fill={d.bulan === bulan ? "#0b3d2e" : "url(#gradienMasuk)"} />
                  ))}
                </Bar>
                <Line
                  yAxisId="kanan"
                  type="monotone"
                  dataKey="persen"
                  name="Pencapaian"
                  stroke="#d9b45b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#d9b45b", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function Ringkas({ label, nilai, sub, tone = "fisa" }) {
  const warna = {
    fisa: "text-fisa-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    slate: "text-slate-700",
  }[tone];
  return (
    <Card>
      <p className="text-[11px] font-bold uppercase text-fisa-500">{label}</p>
      <p className={cn("mt-0.5 text-lg font-extrabold", warna)}>{nilai}</p>
      <p className="text-xs text-fisa-500">{sub}</p>
    </Card>
  );
}
