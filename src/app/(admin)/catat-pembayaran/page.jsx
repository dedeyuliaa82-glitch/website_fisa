"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { bulanBerjalan, formatBulanTahun, formatRupiah } from "@/lib/utils";
import { Card, Skeleton, StatusBadge, Button } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { TambahTransaksiModal } from "@/components/verifikasi/TambahTransaksiModal";
import { ArrowRight, ReceiptText, Trash2 } from "lucide-react";

export default function CatatPembayaranPage() {
    const [baru, setBaru] = useState([]);
    const [loading, setLoading] = useState(true);

    async function ambilCatatan() {
        const supabase = createClient();
        const bulan = bulanBerjalan();
        const { data } = await supabase
            .from("transaksi")
            .select("*, santri(nama_santri, tingkatan)")
            .eq("bulan_tahun", bulan)
            .eq("status", "disetujui")
            .order("dibuat_pada", { ascending: false })
            .limit(10);
        return data ?? [];
    }

    useEffect(() => {
        let hidup = true;
        ambilCatatan().then((hasil) => {
            if (!hidup)
                return;
            setBaru(hasil);
            setLoading(false);
        }).catch(() => {
            if (hidup)
                setLoading(false);
        });
        return () => {
            hidup = false;
        };
    }, []);

    function muat() {
        setLoading(true);
        ambilCatatan().then((hasil) => {
            setBaru(hasil);
            setLoading(false);
        }).catch(() => setLoading(false));
    }

    async function hapus(t) {
        if (!confirm(`Hapus pembayaran ${t.santri?.nama_santri ?? "santri ini"} sebesar ${formatRupiah(t.total_bayar)}?`))
            return;
        try {
            const supabase = createClient();
            const { data: terhapus, error } = await supabase.from("transaksi").delete().eq("id", t.id).select("id");
            if (error)
                throw error;
            if (!(terhapus ?? []).length)
                throw new Error("Pembayaran tidak terhapus. Pastikan akun admin & policy RLS mengizinkan hapus.");
            muat();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menghapus pembayaran.");
        }
    }

    return (
      <div className="space-y-5">
        <PageHeader
          judul="Catat Pembayaran"
          deskripsi="Catat pembayaran tunai dan setoran beras fisik yang diterima langsung di pondok."
          bantuan={{
            ringkas: "Gunakan halaman ini untuk pembayaran yang diterima langsung di pondok, bukan transfer yang diunggah wali.",
            langkah: [
              "Cari dan pilih santri yang membayar.",
              "Tentukan bulan tagihan dan metode pembayaran (tunai atau beras fisik).",
              "Isi nominal rincian, lalu simpan. Pembayaran langsung tercatat lunas.",
              "Periksa daftar Baru Dicatat di bawah untuk memastikan data sudah masuk.",
            ],
            catatan: "Pembayaran transfer dari aplikasi mobile diverifikasi lewat menu Verifikasi Pembayaran, bukan di sini.",
          }}
        />

        <Card className="p-4">
          <TambahTransaksiModal inline onSelesai={muat} />
        </Card>

        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fisa-100 p-5 pb-4">
            <div>
              <h2 className="font-extrabold text-fisa-900">Baru Dicatat • {formatBulanTahun(bulanBerjalan())}</h2>
              <p className="text-xs text-fisa-500">Transaksi lunas yang tercatat bulan ini</p>
            </div>
            <Link href="/laporan?tab=lunas" className="flex items-center gap-1 text-sm font-bold text-fisa-700 hover:underline">
              Lihat laporan <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : baru.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <ReceiptText size={28} className="text-fisa-300" />
              <p className="text-sm font-medium text-fisa-500">
                Belum ada pembayaran yang dicatat bulan ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                    <th className="px-5 py-3">Santri</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {baru.map((t) => (
                    <tr key={t.id} className="border-b border-fisa-50 last:border-0">
                      <td className="px-5 py-3 font-bold text-fisa-900">
                        {t.santri?.nama_santri ?? "-"}
                        <span className="block text-xs font-medium text-fisa-500">
                          {t.santri?.tingkatan?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-extrabold text-fisa-900">{formatRupiah(t.total_bayar)}</td>
                      <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="danger" onClick={() => hapus(t)} title="Hapus pembayaran">
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