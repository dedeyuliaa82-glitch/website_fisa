"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Input, Label, Modal } from "@/components/ui";
import { Info, Loader2, Mail, Phone, UserRound } from "lucide-react";

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Input wali cukup nama, nomor telepon, dan email — tidak perlu menyalin UUID.
 * Wali disimpan di tabel `users` (peran orang_tua) tanpa akun login.
 * Akun login dibuat belakangan lewat tombol "Akun" pada baris wali.
 */
export function WaliFormModal({ awal, onClose, onSelesai, }) {
    var _a, _b, _c;
    const sunting = !!awal;
    const [nama, setNama] = useState((_a = awal === null || awal === void 0 ? void 0 : awal.nama_lengkap) !== null && _a !== void 0 ? _a : "");
    const [telepon, setTelepon] = useState((_b = awal === null || awal === void 0 ? void 0 : awal.nomor_telepon) !== null && _b !== void 0 ? _b : "");
    const [email, setEmail] = useState((_c = awal === null || awal === void 0 ? void 0 : awal.email) !== null && _c !== void 0 ? _c : "");
    const [simpan, setSimpan] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!nama.trim()) {
            setError("Nama wali wajib diisi.");
            return;
        }
        const emailIsi = email.trim().toLowerCase();
        if (emailIsi && !POLA_EMAIL.test(emailIsi)) {
            setError("Format alamat email tidak valid.");
            return;
        }
        setSimpan(true);
        try {
            const supabase = createClient();
            const isi = {
                nama_lengkap: nama.trim(),
                nomor_telepon: telepon.trim() || null,
                email: emailIsi || null,
            };
            if (!sunting) {
                const { error: errInsert } = await supabase.from("users").insert({
                    peran: "orang_tua",
                    ...isi,
                });
                if (errInsert)
                    throw errInsert;
            }
            else {
                const { error: errUpdate } = await supabase
                    .from("users")
                    .update(isi)
                    .eq("id", awal.id);
                if (errUpdate)
                    throw errUpdate;
            }
            onSelesai();
        }
        catch (err) {
            const msg = String((err && err.message) || "");
            if (/column .*email|schema cache/i.test(msg)) {
                setError("Kolom email belum ada di tabel users. Jalankan supabase/migrasi_users_menggantikan_profil.sql di SQL Editor Supabase, lalu coba lagi.");
            }
            else {
                setError(pesanGalatDb(err, "Gagal menyimpan data wali."));
            }
        }
        finally {
            setSimpan(false);
        }
    }
    return (<Modal open onClose={onClose} title={sunting ? "Edit Data Wali" : "Tambah Wali"}>
      <p className="-mt-1 mb-5 text-sm leading-relaxed text-fisa-600">
        {sunting
            ? "Perbarui data wali. Perubahan langsung dipakai di data santri dan akun login mobile."
            : "Lengkapi data orang tua/wali. Setelah disimpan, santri bisa ditautkan ke wali ini."}
      </p>

      {error && (<div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <Info size={16} className="mt-0.5 shrink-0"/>
          <span>{error}</span>
        </div>)}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama Lengkap Wali</Label>
          <div className="relative">
            <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Input autoFocus required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: H. Abdullah" className="pl-10"/>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nomor Telepon / WA</Label>
            <div className="relative">
              <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
              <Input type="tel" inputMode="tel" value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="cth: 081234567890" className="pl-10"/>
            </div>
          </div>
          <div>
            <Label>Alamat Email</Label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cth: abdullah@email.com" autoComplete="off" className="pl-10"/>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 rounded-xl border border-fisa-100 bg-fisa-50/70 p-3.5 text-xs leading-relaxed text-fisa-600">
          <Info size={16} className="mt-0.5 shrink-0 text-fisa-600"/>
          <p>
           Akun belum diperlukan. Simpan data sekarang, tautkan santri ke wali di menu Data Santri, lalu buat akun aplikasi mobile melalui tombol Akun pada tabel wali.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-fisa-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="sm:min-w-24">Batal</Button>
          <Button type="submit" disabled={simpan} className="sm:min-w-32">
            {simpan && <Loader2 size={16} className="animate-spin"/>}
            {sunting ? "Simpan Perubahan" : "Tambah Wali"}
          </Button>
        </div>
      </form>
    </Modal>);
}
