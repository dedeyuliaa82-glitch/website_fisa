"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { bulanBerjalan, cn, formatBulanTahun, formatRupiah, labelTingkatan } from "@/lib/utils";
import { Button, Card, Input, Select, Skeleton, StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2, ReceiptText, Search, Sparkles, Trash2, TrendingUp, UserX, Wallet } from "lucide-react";

const ringkasanAwal = { total: 0, tertagih: 0, terkumpul: 0, sisa: 0, lunas: 0, sebagian: 0, belum: 0 };

export default function TagihanPage() {
  const [bulan, setBulan] = useState(bulanBerjalan());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buat, setBuat] = useState(false);
  const [filter, setFilter] = useState("semua");
  const [cari, setCari] = useState("");
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");

  async function ambil(p_bulan) {
    const supabase = createClient();
    const { data: hasil } = await supabase
      .from("tagihan")
      .select("*, santri(nama_santri, nis, tingkatan, users!santri_id_orang_tua_fkey(nama_lengkap))")
      .eq("bulan_tahun", p_bulan)
      .limit(1000);
    return (hasil ?? [])
      .map((t) => ({ ...t, santri: Array.isArray(t.santri) ? (t.santri[0] ?? null) : t.santri }))
      .sort((a, b) => (a.santri?.nama_santri ?? "").localeCompare(b.santri?.nama_santri ?? ""));
  }

  useEffect(() => {
    let hidup = true;
    ambil(bulan).then((hasil) => {
      if (!hidup) return;
      setData(hasil);
      setLoading(false);
    }).catch(() => {
      if (hidup) setLoading(false);
    });
    return () => { hidup = false; };
  }, [bulan]);

  async function muat() {
    setLoading(true);
    try {
      setData(await ambil(bulan));
    } finally {
      setLoading(false);
    }
  }

  async function buatTagihan() {
    setBuat(true);
    setPesan("");
    setGalat("");
    try {
      const supabase = createClient();
      const { data: jumlah, error } = await supabase.rpc("buat_tagihan_bulanan", {
        p_bulan: bulan,
        p_jatuh_tempo: null,
      });
      if (error) throw error;
      setPesan(
        jumlah > 0
          ? `${jumlah} tagihan baru dibuat untuk ${formatBulanTahun(bulan)}.`
          : `Semua santri sudah punya tagihan ${formatBulanTahun(bulan)}.`,
      );
      await muat();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? "");
      setGalat(
        /function|does not exist|schema cache/i.test(msg)
          ? "Fungsi buat_tagihan_bulanan belum ada. Jalankan supabase/migrasi_tagihan.sql di SQL Editor Supabase."
          : msg || "Gagal membuat tagihan.",
      );
    } finally {
      setBuat(false);
    }
  }

  const ringkasan = data.reduce(
    (a, t) => {
      const total = Number(t.total_tagihan ?? 0);
      const bayar = Number(t.total_dibayar ?? 0);
      a.total += 1;
      a.tertagih += total;
      a.terkumpul += bayar;
      a.sisa += Math.max(0, total - bayar);
      if (t.status === "lunas") a.lunas += 1;
      else if (t.status === "sebagian") a.sebagian += 1;
      else a.belum += 1;
      return a;
    },
    { ...ringkasanAwal },
  );

  const tampil = data.filter((t) => {
    if (filter !== "semua" && t.status !== filter) return false;
    const k = cari.toLowerCase();
    if (!k) return true;
    return (
      (t.santri?.nama_santri ?? "").toLowerCase().includes(k) ||
      (t.santri?.nis ?? "").toLowerCase().includes(k) ||
      (t.santri?.users?.nama_lengkap ?? "").toLowerCase().includes(k)
    );
  });

  async function hapus(t) {
    const nama = t.santri?.nama_santri ?? "santri ini";
    if (Number(t.total_dibayar ?? 0) > 0.5) {
      setGalat(`Tagihan ${nama} sudah memiliki pembayaran. Hapus/batalkan pembayarannya dulu.`);
      return;
    }
    if (!confirm(`Hapus tagihan ${nama} untuk ${formatBulanTahun(t.bulan_tahun)}?`)) return;
    setGalat("");
    setPesan("");
    try {
      const supabase = createClient();
      const { data: terhapus, error } = await supabase.from("tagihan").delete().eq("id", t.id).select("id");
      if (error) throw error;
      if (!(terhapus ?? []).length) throw new Error("Tagihan tidak terhapus. Pastikan akun admin & policy RLS mengizinkan hapus.");
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal menghapus tagihan.");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        judul="Tagihan Bulanan"
        deskripsi="Tagihan dibuat otomatis sesuai tingkatan, lalu muncul di aplikasi orang tua."
        bantuan={{
          ringkas: "Buat dan pantau tagihan bulanan seluruh santri dalam satu tempat.",
          langkah: [
            "Pilih bulan tagihan, lalu klik Buat Tagihan. Nominal dihitung dari acuan biaya sesuai tingkatan santri.",
            "Gunakan pencarian dan filter status untuk menemukan tagihan tertentu.",
            "Pantau kartu ringkasan: total tagihan, terkumpul, tunggakan, dan jumlah santri yang belum bayar.",
            "Hapus tagihan hanya bila belum ada pembayaran yang masuk.",
          ],
          catatan: "Alur pembayaran: wali membayar (boleh dicicil) → admin memverifikasi bukti → status tagihan berubah otomatis menjadi sebagian atau lunas. Pembayaran tunai/beras fisik dicatat lewat menu Catat Pembayaran.",
        }}
      />

      <Card className="rounded-2xl border border-fisa-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-fisa-900">Bulan Tagihan</label>
            <Input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="sm:w-52" />
          </div>
          <Button onClick={buatTagihan} disabled={buat || loading} className="sm:ml-auto">
            {buat ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Buat Tagihan
          </Button>
        </div>
      </Card>

      {pesan && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{pesan}</div>}
      {galat && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{galat}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 min-w-0">
          <p className="text-[11px] font-bold uppercase text-fisa-500 truncate">Total Tagihan</p>
          <p className="text-lg font-extrabold text-fisa-900 truncate">{formatRupiah(ringkasan.tertagih)}</p>
          <p className="text-sm text-fisa-500 truncate">{ringkasan.total} santri</p>
        </Card>
        <Card className="p-4 min-w-0">
          <p className="text-[11px] font-bold uppercase text-emerald-600 truncate">Terkumpul</p>
          <p className="text-lg font-extrabold text-emerald-700 truncate">{formatRupiah(ringkasan.terkumpul)}</p>
          <p className="text-sm text-emerald-500 truncate">{ringkasan.lunas} lunas</p>
        </Card>
        <Card className="p-4 min-w-0">
          <p className="text-[11px] font-bold uppercase text-amber-600 truncate">Tunggakan</p>
          <p className="text-lg font-extrabold text-amber-700 truncate">{formatRupiah(ringkasan.sisa)}</p>
          <p className="text-sm text-amber-500 truncate">{ringkasan.sebagian} sebagian</p>
        </Card>
        <Card className="p-4 min-w-0">
          <p className="text-[11px] font-bold uppercase text-slate-600 truncate">Belum Bayar</p>
          <p className="text-lg font-extrabold text-slate-700 truncate">{ringkasan.belum} santri</p>
          <p className="text-sm text-slate-500 truncate">{formatBulanTahun(bulan)}</p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-fisa-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400" />
            <Input placeholder="Cari nama santri / wali / NIS…" value={cari} onChange={(e) => setCari(e.target.value)} className="pl-10" />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-52">
            <option value="semua">Semua status</option>
            <option value="belum_bayar">Belum bayar</option>
            <option value="sebagian">Sebagian</option>
            <option value="lunas">Lunas</option>
            <option value="dibatalkan">Dibatalkan</option>
          </Select>
          <Button variant="outline" onClick={muat} disabled={loading}>Muat ulang</Button>
        </div>
      </Card>

      <Card className="rounded-2xl border border-fisa-100 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : tampil.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <ReceiptText size={28} className="text-fisa-300" />
            <p className="text-sm font-medium text-fisa-500">Belum ada tagihan untuk {formatBulanTahun(bulan)}. Klik “Buat Tagihan” untuk membuatnya.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-full text-sm">
              <thead>
                <tr className="border-b border-fisa-100 bg-gradient-to-r from-fisa-50 to-slate-50 text-xs font-bold uppercase tracking-wide text-fisa-600">
                  <th className="px-5 py-3.5 font-semibold">Santri</th>
                  <th className="px-5 py-3.5 font-semibold">Tingkatan</th>
                  <th className="px-5 py-3.5 font-semibold">Tagihan</th>
                  <th className="px-5 py-3.5 font-semibold">Dibayar</th>
                  <th className="px-5 py-3.5 font-semibold">Sisa</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((t, idx) => (
                  <tr key={t.id} className={`border-b border-fisa-50 last:border-0 transition-colors hover:bg-fisa-50/60 ${idx % 2 === 0 ? "bg-white" : "bg-fisa-25"}`}>
                    <td className="px-5 py-3 font-bold text-fisa-900">
                      {t.santri?.nama_santri ?? "-"}
                      <span className="block text-xs font-medium text-fisa-500">
                        Wali: {t.santri?.users?.nama_lengkap ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fisa-700">{labelTingkatan(t.tingkatan)}</td>
                    <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(t.total_tagihan)}</td>
                    <td className="px-5 py-3 font-bold text-emerald-700">{formatRupiah(t.total_dibayar)}</td>
                    <td className={Number(t.total_tagihan) - Number(t.total_dibayar) > 0.5 ? "px-5 py-3 font-bold text-amber-700" : "px-5 py-3 font-bold text-fisa-500"}>
                      {formatRupiah(Math.max(0, Number(t.total_tagihan) - Number(t.total_dibayar)))}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} className="text-xs" /></td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="danger" onClick={() => hapus(t)} title="Hapus tagihan">
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KartuRingkas({ icon: Icon, label, nilai, sub, tone = "fisa" }) {
  const warna = {
    fisa: "text-fisa-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    slate: "text-slate-700",
  }[tone];
  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase text-fisa-500">{label}</p>
      <p className={cn("mt-0.5 text-lg font-extrabold", warna)}>{nilai}</p>
      <p className="text-xs text-fisa-500">{sub}</p>
    </Card>
  );
}