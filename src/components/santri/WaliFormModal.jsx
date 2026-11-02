"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Input, Label, Modal } from "@/components/ui";
import { Loader2 } from "lucide-react";

/** UUID v4 untuk id baris profil. Wali tidak wajib punya akun login. */
function uuidBaru() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Input wali cukup nama, nomor telepon, dan email — tidak perlu menyalin UUID
 * dari Authentication Supabase. Id profil dibuat otomatis.
 * Wali yang memang punya akun aplikasi mobile tetap bisa login karena
 * id profilnya sama dengan id user di Authentication.
 *
 * Catatan: bila database masih mengikat profil.id ke auth.users,
 * jalankan supabase/migrasi_wali_mandiri.sql sekali saja.
 * Kolom email: jalankan supabase/migrasi_email_wali.sql.
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
                const { error: errInsert } = await supabase.from("profil").insert({
                    id: uuidBaru(),
                    peran: "orang_tua",
                    dibuat_pada: new Date().toISOString(),
                    ...isi,
                });
                if (errInsert)
                    throw errInsert;
            }
            else {
                const { error: errUpdate } = await supabase
                    .from("profil")
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
                setError("Kolom email belum ada di tabel profil. Jalankan supabase/migrasi_email_wali.sql di SQL Editor Supabase, lalu coba lagi.");
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
      {error && (<div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>)}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama Lengkap Wali</Label>
          <Input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: H. Abdullah"/>
        </div>
        <div>
          <Label>Nomor Telepon / WA</Label>
          <Input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="cth: 081234567890"/>
        </div>
        <div>
          <Label>Alamat Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cth: abdullah@email.com" autoComplete="off"/>
        </div>
        <p className="rounded-xl bg-fisa-50 p-3 text-xs leading-relaxed text-fisa-600">
          Tidak perlu akun Supabase. Setelah disimpan, tautkan santri ke wali ini
          lewat tab <b>Data Santri → Edit</b>. Untuk membuat login aplikasi mobile,
          klik tombol <b>Akun</b> pada baris wali. Email tersimpan di data profil wali.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={simpan}>
            {simpan && <Loader2 size={16} className="animate-spin"/>}
            {sunting ? "Simpan" : "Tambah Wali"}
          </Button>
        </div>
      </form>
    </Modal>);
}
