"use client";
import { useState } from "react";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Input, Label, Modal } from "@/components/ui";
import { Loader2, Trash2, Mail, Lock, ShieldCheck } from "lucide-react";

/**
 * Atur akun login wali (tabel public.users).
 * Wali login ke aplikasi mobile memakai EMAIL + password.
 */
export function AkunWaliModal({ wali, akun, onClose, onSelesai }) {
    const [email, setEmail] = useState(akun?.email ?? wali?.email ?? "");
    const [password, setPassword] = useState("");
    const [simpan, setSimpan] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        const emailIsi = email.trim().toLowerCase();
        if (!emailIsi) {
            setError("Email wajib diisi.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIsi)) {
            setError("Format email tidak valid.");
            return;
        }
        if (!akun && password.trim().length < 6) {
            setError("Password minimal 6 karakter untuk akun baru.");
            return;
        }
        if (password.trim() && password.trim().length < 6) {
            setError("Password minimal 6 karakter.");
            return;
        }
        setSimpan(true);
        try {
            const res = await fetch("/api/admin/akun", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "simpan", id: wali.id, email: emailIsi, password: password.trim() }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json.error ?? "Gagal menyimpan akun login.");
            onSelesai();
        }
        catch (err) {
            setError(pesanGalatDb(err, "Gagal menyimpan akun login."));
        }
        finally {
            setSimpan(false);
        }
    }
    async function hapusAkun() {
        if (!akun)
            return;
        if (!confirm(`Hapus akun login "${akun.email ?? akun.username}"? Wali tidak bisa masuk aplikasi mobile lagi.`))
            return;
        setSimpan(true);
        setError("");
        try {
            const res = await fetch("/api/admin/akun", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "hapus", id: wali.id }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json.error ?? "Gagal menghapus akun login.");
            onSelesai();
        }
        catch (err) {
            setError(pesanGalatDb(err, "Gagal menghapus akun login."));
        }
        finally {
            setSimpan(false);
        }
    }
    return (<Modal open onClose={onClose} title={`Akun Login — ${wali.nama_lengkap ?? "Wali"}`}>
      <p className="-mt-1 mb-5 text-sm leading-relaxed text-fisa-600">
        Buat atau ubah akun login aplikasi mobile FISA untuk wali ini. Login pakai <b>email + password</b>.
      </p>

      {error && (<div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span>{error}</span>
        </div>)}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Email</Label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Input autoFocus required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cth: abdullah@email.com" autoComplete="off" className="pl-10"/>
          </div>
        </div>
        <div>
          <Label>{akun ? "Password Baru (kosongkan bila tidak diubah)" : "Password"}</Label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={akun ? "Kosongkan bila tidak diubah" : "Minimal 6 karakter"} autoComplete="new-password" className="pl-10"/>
          </div>
          <p className="mt-1 text-xs text-fisa-500">
            {akun ? "Biarkan kosong jika password tidak diubah." : "Password ini dipakai wali untuk login aplikasi mobile."}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 text-xs leading-relaxed text-emerald-700">
          <ShieldCheck size={16} className="mt-0.5 shrink-0"/>
          <span>Wali login di aplikasi mobile FISA memakai email dan password ini. Tidak memakai Authentication Supabase.</span>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-fisa-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="sm:min-w-24">Batal</Button>
          <Button type="submit" disabled={simpan} className="sm:min-w-32">
            {simpan && <Loader2 size={16} className="animate-spin"/>}
            Simpan
          </Button>
        </div>
        {akun && (<Button type="button" variant="danger" className="w-full sm:w-auto" disabled={simpan} onClick={hapusAkun}>
            <Trash2 size={16}/> Hapus Akun Login
          </Button>)}
      </form>
    </Modal>);
}
