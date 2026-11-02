"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Skeleton } from "@/components/ui";
import { RekeningFormModal } from "@/components/rekening/RekeningFormModal";
import { cn, pesanGalatDb } from "@/lib/utils";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

/** 7123456789 -> 7123 4567 89 (memudahkan membaca nomor rekening). */
function formatNomor(nomor) {
  return String(nomor ?? "").replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function ManajemenRekeningPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [prosesId, setProsesId] = useState(null);

  async function ambil() {
    const supabase = createClient();
    return await supabase
      .from("rekening_pesantren")
      .select("id, nama_bank, nomor_rekening, atas_nama, is_active, created_at")
      .order("created_at", { ascending: true });
  }

  function terapkan({ data: hasil, error: err }) {
    if (err) {
      setData([]);
      setError(
        /does not exist|schema cache/i.test(String(err.message ?? ""))
          ? "Tabel rekening_pesantren belum ada. Jalankan supabase/migrasi_rekening.sql di SQL Editor Supabase, lalu klik Muat Ulang."
          : pesanGalatDb(err, "Gagal memuat daftar rekening."),
      );
    } else {
      setData(hasil ?? []);
      setError("");
    }
    setLoading(false);
  }

  async function muat() {
    setLoading(true);
    setError("");
    terapkan(await ambil());
  }

  useEffect(() => {
    (async () => terapkan(await ambil()))();
  }, []);

  async function ubahStatus(r) {
    setProsesId(r.id);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("rekening_pesantren")
        .update({ is_active: !r.is_active })
        .eq("id", r.id);
      if (err) throw err;
      setData((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)),
      );
    } catch (err) {
      alert(pesanGalatDb(err, "Gagal mengubah status rekening."));
    } finally {
      setProsesId(null);
    }
  }

  async function hapus(r) {
    if (
      !confirm(
        `Hapus rekening ${r.nama_bank} — ${r.nomor_rekening}?\nWali tidak akan melihat rekening ini lagi.`,
      )
    )
      return;

    setProsesId(r.id);
    try {
      const supabase = createClient();
      const { data: terhapus, error: err } = await supabase
        .from("rekening_pesantren")
        .delete()
        .eq("id", r.id)
        .select("id");
      if (err) throw err;
      if (!(terhapus ?? []).length) {
        throw new Error(
          "Rekening tidak terhapus. Pastikan akun admin & policy RLS mengizinkan hapus.",
        );
      }
      muat();
    } catch (err) {
      alert(pesanGalatDb(err, "Gagal menghapus rekening."));
    } finally {
      setProsesId(null);
    }
  }

  const tampil = data.filter((r) => {
    const k = cari.trim().toLowerCase();
    if (!k) return true;
    return (
      r.nama_bank.toLowerCase().includes(k) ||
      r.nomor_rekening.includes(k.replace(/\s/g, "")) ||
      r.atas_nama.toLowerCase().includes(k)
    );
  });
  const jumlahAktif = data.filter((r) => r.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fisa-600">
          {loading
            ? "Memuat rekening…"
            : `${data.length} rekening • ${jumlahAktif} aktif ditampilkan di aplikasi mobile`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={muat} disabled={loading}>
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Muat Ulang
          </Button>
          <Button onClick={() => setModal("tambah")}>
            <Plus size={16} /> Tambah Rekening
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"
          />
          <Input
            placeholder="Cari nama bank / nomor rekening / atas nama…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="p-0">
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead>
                <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                  <th className="px-5 py-3">Nama Bank</th>
                  <th className="px-5 py-3">Nomor Rekening</th>
                  <th className="px-5 py-3">Atas Nama</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-fisa-50 last:border-0 hover:bg-fisa-50/50"
                  >
                    <td className="px-5 py-3 font-bold text-fisa-900">{r.nama_bank}</td>
                    <td className="px-5 py-3 font-mono text-fisa-800">
                      {formatNomor(r.nomor_rekening)}
                    </td>
                    <td className="px-5 py-3 text-fisa-700">{r.atas_nama}</td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1",
                          r.is_active
                            ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                            : "bg-slate-100 text-slate-600 ring-slate-300",
                        )}
                      >
                        {r.is_active ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {r.is_active ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={prosesId === r.id}
                          onClick={() => ubahStatus(r)}
                          title={
                            r.is_active
                              ? "Sembunyikan dari aplikasi mobile"
                              : "Tampilkan di aplikasi mobile"
                          }
                        >
                          {prosesId === r.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Power size={14} />
                          )}
                          {r.is_active ? "Non-aktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={prosesId === r.id}
                          onClick={() => setModal(r)}
                        >
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={prosesId === r.id}
                          onClick={() => hapus(r)}
                          title="Hapus rekening"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tampil.length === 0 && (
              <p className="p-10 text-center text-sm text-fisa-500">
                {data.length === 0
                  ? "Belum ada rekening. Klik “Tambah Rekening” untuk memulai."
                  : "Tidak ada rekening yang cocok dengan pencarian."}
              </p>
            )}
          </div>
        )}
      </Card>

      {modal === "tambah" && (
        <RekeningFormModal
          onClose={() => setModal(null)}
          onSelesai={() => {
            setModal(null);
            muat();
          }}
        />
      )}
      {modal && modal !== "tambah" && (
        <RekeningFormModal
          awal={modal}
          onClose={() => setModal(null)}
          onSelesai={() => {
            setModal(null);
            muat();
          }}
        />
      )}
    </div>
  );
}
