"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { idPengguna } from "@/lib/auth/client";
import { bulanBerjalan, formatBulanTahun, formatRupiah, labelTingkatan, pesanGalatDb } from "@/lib/utils";
import { Button, Card, Input, Label, Modal, Select } from "@/components/ui";
import { Loader2, Plus, Search, Sparkles, Wheat, UserRound, Calendar, CreditCard } from "lucide-react";

/** Admin hanya mencatat uang tunai dan setoran beras fisik.
 *  Transfer/bukti pembayaran masuk lewat upload orang tua di app mobile. */
const METODE_OPSISI = [
  { value: "tunai", label: "Tunai di pondok" },
  { value: "beras_fisik", label: "Beras fisik (10 kg per karung)" },
];

const KOSONG = { spp: 0, makan: 0, syahriah: 0, beras: 0 };

/**
 * Catat pembayaran langsung oleh admin (tunai / beras fisik).
 * Mendukung cicilan: nominal boleh lebih kecil dari sisa tagihan.
 * Status selalu 'disetujui' karena uang/beras sudah diterima admin.
 */
export function TambahTransaksiModal({ onClose, onSelesai, inline }) {
  const [daftar, setDaftar] = useState([]);
  const [cari, setCari] = useState("");
  const [santriId, setSantriId] = useState("");
  const [bulan, setBulan] = useState(bulanBerjalan());
  const [metode, setMetode] = useState("tunai");
  const [karung, setKarung] = useState(1);
  const [nom, setNom] = useState(KOSONG);
  const [acuan, setAcuan] = useState(null);
  const [tagihan, setTagihan] = useState(null);
  const [dibayar, setDibayar] = useState(KOSONG);
  const [reload, setReload] = useState(0);
  const [simpan, setSimpan] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: santri }, { data: atur }] = await Promise.all([
        supabase.from("santri").select("id, nama_santri, nis, tingkatan, luar_kota").order("nama_santri").limit(500),
        supabase.from("pengaturan_biaya").select("*").limit(1).maybeSingle(),
      ]);
      setDaftar(santri ?? []);
      setAcuan(atur ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!santriId || !bulan) return;
    let hidup = true;
    (async () => {
      const supabase = createClient();
      const [{ data: tag }, { data: bayar }] = await Promise.all([
        supabase.from("tagihan").select("*").eq("id_santri", santriId).eq("bulan_tahun", bulan).maybeSingle(),
        supabase
          .from("transaksi")
          .select("nominal_spp, nominal_uang_makan, nominal_syahriah, nominal_beras, total_bayar, metode_pembayaran")
          .eq("id_santri", santriId)
          .eq("bulan_tahun", bulan)
          .eq("status", "disetujui"),
      ]);
      if (!hidup) return;
      const jumlah = (bayar ?? []).reduce(
        (a, t) => ({
          spp: a.spp + Number(t.nominal_spp ?? 0),
          makan: a.makan + Number(t.nominal_uang_makan ?? 0),
          syahriah: a.syahriah + Number(t.nominal_syahriah ?? 0),
          beras: a.beras + Number(t.nominal_beras ?? 0),
        }),
        { ...KOSONG },
      );
      setTagihan(tag ?? null);
      setDibayar(jumlah);
    })();
    return () => { hidup = false; };
  }, [santriId, bulan, reload]);

  const santri = daftar.find((s) => s.id === santriId);
  const tahkosus = santri?.tingkatan === "takhosus";
  const metodeTersedia = tahkosus
    ? METODE_OPSISI.filter((o) => o.value !== "beras_fisik")
    : METODE_OPSISI;
  const saring = daftar.filter((s) => {
    const k = cari.toLowerCase();
    return !k || s.nama_santri.toLowerCase().includes(k) || (s.nis ?? "").toLowerCase().includes(k);
  });

  const acuanNom = (() => {
    if (!santri || !acuan) return { ...KOSONG };
    const sppKey = santri.tingkatan === "smp" ? "spp_smp" : "spp_smk";
    return {
      spp: tahkosus ? 0 : Number(acuan[sppKey] ?? 0),
      makan: tahkosus ? 0 : Number(acuan.uang_makan ?? 0),
      syahriah: Number(acuan.syahriah ?? 0),
      beras: tahkosus ? 0 : santri.luar_kota ? Number(acuan.harga_beras_10kg ?? 0) : 0,
    };
  })();

  const target = tagihan
    ? {
        spp: Number(tagihan.nominal_spp ?? 0),
        makan: Number(tagihan.nominal_uang_makan ?? 0),
        syahriah: Number(tagihan.nominal_syahriah ?? 0),
        beras: Number(tagihan.nominal_beras ?? 0),
      }
    : acuanNom;

  const sisa = {
    spp: Math.max(0, target.spp - dibayar.spp),
    makan: Math.max(0, target.makan - dibayar.makan),
    syahriah: Math.max(0, target.syahriah - dibayar.syahriah),
    beras: Math.max(0, target.beras - dibayar.beras),
  };
  const sisaTotal = sisa.spp + sisa.makan + sisa.syahriah + sisa.beras;
  const totalDibayarLama = dibayar.spp + dibayar.makan + dibayar.syahriah + dibayar.beras;
  const totalTagihan = target.spp + target.makan + target.syahriah + target.beras;

  const hargaBeras = Number(acuan?.harga_beras_10kg ?? 0);
  const nilaiBeras = hargaBeras * (Number(karung) || 0);

  const total = metode === "beras_fisik" ? 0 : nom.spp + nom.makan + nom.syahriah + nom.beras;
  const settle = metode === "beras_fisik" ? nilaiBeras : total;

  function isiSisa() {
    setNom({ ...sisa });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!santriId) {
      setError("Pilih santri yang membayar.");
      return;
    }
    if (metode === "beras_fisik") {
      if (!hargaBeras) {
        setError("Harga beras belum diatur. Isi Harga Beras 10 Kg di Pengaturan Biaya.");
        return;
      }
      if (nilaiBeras <= 0) {
        setError("Jumlah karung beras harus lebih dari 0.");
        return;
      }
    } else if (total <= 0) {
      setError("Nominal masih Rp 0 semua. Isi manual atau pakai Isi sisa tagihan.");
      return;
    }
    if (settle > sisaTotal + 0.5) {
      setError(
        `Nominal melebihi sisa tagihan (sisa ${formatRupiah(sisaTotal)}). Kurangi jumlahnya bila cicilan.`,
      );
      return;
    }
    setSimpan(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("transaksi").insert({
        id_santri: santriId,
        bulan_tahun: bulan,
        nominal_spp: metode === "beras_fisik" ? 0 : nom.spp,
        nominal_uang_makan: metode === "beras_fisik" ? 0 : nom.makan,
        nominal_syahriah: metode === "beras_fisik" ? 0 : nom.syahriah,
        nominal_beras: metode === "beras_fisik" ? nilaiBeras : nom.beras,
        beras_diganti_uang: metode === "beras_fisik" ? false : nom.beras > 0,
        total_bayar: total,
        metode_pembayaran: metode,
        status: "disetujui",
        diverifikasi_oleh: idPengguna(),
        diverifikasi_pada: new Date().toISOString(),
        dibuat_pada: new Date().toISOString(),
      });
      if (error) throw error;
      setNom(KOSONG);
      setKarung(1);
      setReload((r) => r + 1);
      onSelesai?.();
    } catch (err) {
      setError(pesanGalatDb(err, "Gagal menyimpan pembayaran."));
    } finally {
      setSimpan(false);
    }
  }

  function setField(k, v) {
    setNom((p) => ({ ...p, [k]: Number(v) || 0 }));
  }

  function resetForm() {
    setCari("");
    setSantriId("");
    setBulan(bulanBerjalan());
    setMetode("tunai");
    setKarung(1);
    setNom(KOSONG);
    setTagihan(null);
    setDibayar(KOSONG);
    setError("");
  }

  const konten = (
    <>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Santri yang membayar</Label>
          <div className="relative">
            <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Ketik nama / NIS…" className="pl-10"/>
          </div>
          {cari && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-fisa-100">
              {saring.slice(0, 20).map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setSantriId(s.id);
                    setCari(s.nama_santri);
                    if (s.tingkatan === "takhosus" && metode === "beras_fisik") setMetode("tunai");
                  }}
                  className={`block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-fisa-50 ${santriId === s.id ? "bg-fisa-100 font-bold text-fisa-900" : "text-fisa-800"}`}
                >
                  {s.nama_santri} <span className="text-xs text-fisa-500">• {labelTingkatan(s.tingkatan)} • NIS {s.nis ?? "-"}</span>
                </button>
              ))}
              {saring.length === 0 && <p className="px-4 py-3 text-sm text-fisa-500">Tidak ditemukan.</p>}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Bulan Tagihan</Label>
            <div className="relative">
              <Calendar size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
              <Input type="month" required value={bulan} onChange={(e) => setBulan(e.target.value)} className="pl-10"/>
            </div>
          </div>
          <div>
            <Label>Metode Pembayaran</Label>
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              {metodeTersedia.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {santriId && (
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fisa-600">Tagihan {formatBulanTahun(bulan)}</span>
                <span className="font-extrabold text-fisa-900">{formatRupiah(totalTagihan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fisa-600">Sudah dibayar</span>
                <span className="font-bold text-emerald-700">{formatRupiah(totalDibayarLama)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-fisa-200 pt-1">
                <span className="font-extrabold text-fisa-900">Sisa</span>
                <span className="font-extrabold text-amber-700">{formatRupiah(sisaTotal)}</span>
              </div>
              {!tagihan && (
                <p className="mt-2 text-xs font-medium text-fisa-500">
                  Tagihan bulan ini belum dibuat — nominal memakai acuan tingkatan dan akan dibuat otomatis saat disimpan.
                </p>
              )}
              {tagihan?.status === "lunas" && (
                <p className="mt-2 text-xs font-bold text-emerald-700">Tagihan bulan ini sudah LUNAS.</p>
              )}
            </div>
          </Card>
        )}

        {metode === "beras_fisik" ? (
          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <Label>Jumlah karung (10 kg)</Label>
                <Input type="number" min={1} value={karung} onChange={(e) => setKarung(e.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-fisa-800 p-3 text-sm text-white">
                <span className="font-bold">Nilai beras diserahkan</span>
                <span className="font-extrabold">{formatRupiah(nilaiBeras)}</span>
              </div>
              <p className="text-xs text-fisa-500">
                Setoran beras dinilai dari Harga Beras 10 Kg di Pengaturan Biaya, bukan uang masuk.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label>Rincian Nominal</Label>
              <button type="button" onClick={isiSisa} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-fisa-700 hover:underline">
                <Sparkles size={13} /> Isi sisa tagihan
              </button>
            </div>
            <div className="grid gap-3">
              {[["spp", "SPP"], ["makan", "Uang makan"], ["syahriah", "Syahriah"], ["beras", "Beras"]]
                .filter(([k]) => !tahkosus || k === "syahriah")
                .map(([k, label]) => (
                <div key={k}>
                  <Label>{label} (Rp)</Label>
                  <Input type="number" min={0} value={nom[k]} onChange={(e) => setField(k, e.target.value)} />
                </div>
              ))}
            </div>
            {tahkosus && (
              <p className="rounded-xl bg-fisa-50 px-3 py-2 text-xs font-semibold text-fisa-600">
                Takhosus hanya membayar <b>Syahriah</b>. Begitu syahriah dibayar, tagihan langsung lunas.
              </p>
            )}
            <div className="flex items-center justify-between rounded-xl bg-fisa-800 p-3 text-sm text-white">
              <span className="font-bold">Total diterima</span>
              <span className="font-extrabold">{formatRupiah(total)}</span>
            </div>
            {total > 0 && total < sisaTotal && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Pembayaran sebagian (cicilan). Sisa setelah ini: {formatRupiah(sisaTotal - total)}.
              </p>
            )}
          </>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-fisa-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={inline ? resetForm : onClose} className="sm:min-w-24">Batal</Button>
          <Button type="submit" disabled={simpan || sisaTotal <= 0.5} className="sm:min-w-32">
            {simpan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Catat Bayar
          </Button>
        </div>
      </form>
    </>
  );

  if (inline) {
    return <div>{konten}</div>;
  }

  return (
    <Modal open onClose={onClose} title="Catat Pembayaran">
      {konten}
    </Modal>
  );
}
