"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Input, Label, Modal, Switch } from "@/components/ui";
import { Loader2, Landmark } from "lucide-react";

/** Nama bank yang umum dipakai, sebagai saran (tetap bisa diisi bebas). */
const SARAN_BANK = [
  "Bank Syariah Indonesia (BSI)",
  "Bank Mandiri",
  "Bank Rakyat Indonesia (BRI)",
  "Bank Negara Indonesia (BNI)",
  "Bank Tabungan Negara (BTN)",
  "Bank Central Asia (BCA)",
  "Bank Muamalat",
  "Bank CIMB Niaga",
  "Bank Permata",
  "Bank Jago",
];

/**
 * Form tambah/edit rekening pesantren.
 * Nomor rekening disimpan sebagai digit saja (6–20 angka).
 */
export function RekeningFormModal({ awal, onClose, onSelesai }) {
  const sunting = !!awal;
  const [namaBank, setNamaBank] = useState(awal?.nama_bank ?? "");
  const [nomor, setNomor] = useState(awal?.nomor_rekening ?? "");
  const [atasNama, setAtasNama] = useState(awal?.atas_nama ?? "");
  const [aktif, setAktif] = useState(awal?.is_active ?? true);
  const [simpan, setSimpan] = useState(false);
  const [error, setError] = useState("");

  function validasi() {
    if (namaBank.trim().length < 2) {
      return "Nama bank wajib diisi (minimal 2 karakter).";
    }
    if (!/^\d{6,20}$/.test(nomor)) {
      return "Nomor rekening harus 6–20 digit angka, tanpa spasi atau tanda baca.";
    }
    if (atasNama.trim().length < 2) {
      return "Atas nama wajib diisi (minimal 2 karakter).";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const pesan = validasi();
    if (pesan) {
      setError(pesan);
      return;
    }

    setError("");
    setSimpan(true);
    try {
      const supabase = createClient();
      const isi = {
        nama_bank: namaBank.trim(),
        nomor_rekening: nomor,
        atas_nama: atasNama.trim(),
        is_active: aktif,
      };

      if (sunting) {
        const { error: err } = await supabase
          .from("rekening_pesantren")
          .update(isi)
          .eq("id", awal.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("rekening_pesantren").insert(isi);
        if (err) throw err;
      }

      onSelesai();
    } catch (err) {
      const msg = pesanGalatDb(err, "Gagal menyimpan rekening.");
      setError(
        /does not exist|schema cache/i.test(String(err?.message ?? ""))
          ? "Tabel rekening_pesantren belum ada. Jalankan supabase/migrasi_rekening.sql di SQL Editor Supabase, lalu coba lagi."
          : msg,
      );
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={sunting ? "Edit Rekening Pesantren" : "Tambah Rekening Pesantren"}
    >
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama Bank</Label>
          <Input
            list="saran-bank-fisa"
            required
            value={namaBank}
            onChange={(e) => setNamaBank(e.target.value)}
            placeholder="cth: Bank Syariah Indonesia (BSI)"
            autoComplete="off"
          />
          <datalist id="saran-bank-fisa">
            {SARAN_BANK.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Nomor Rekening</Label>
          <Input
            inputMode="numeric"
            required
            value={nomor}
            onChange={(e) => setNomor(e.target.value.replace(/\D/g, "").slice(0, 20))}
            placeholder="cth: 7123456789"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-fisa-500">
            Hanya angka, 6–20 digit. Spasi dan tanda baca otomatis dihapus.
          </p>
        </div>

        <div>
          <Label>Atas Nama</Label>
          <Input
            required
            value={atasNama}
            onChange={(e) => setAtasNama(e.target.value)}
            placeholder="cth: Yayasan Pesantren FISA"
            autoComplete="off"
          />
        </div>

        <div className="rounded-xl bg-fisa-50 p-3">
          <Switch
            checked={aktif}
            onChange={setAktif}
            label="Tampilkan di aplikasi mobile wali"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-fisa-600">
            Hanya rekening <b>aktif</b> yang bisa dilihat wali. Rekening non-aktif
            tetap tersimpan sebagai arsip.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={simpan}>
            {simpan ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Landmark size={16} />
            )}
            {sunting ? "Simpan Perubahan" : "Tambah Rekening"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
