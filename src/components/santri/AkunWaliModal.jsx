"use client";
import { useState } from "react";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Input, Label, Modal } from "@/components/ui";
import { Loader2, Trash2 } from "lucide-react";

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
      {error && (<div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>)}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cth: abdullah@email.com" autoComplete="off"/>
        </div>
        <div>
          <Label>{akun ? "Password Baru (opsional)" : "Password"}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={akun ? "Kosongkan bila tidak diubah" : "Minimal 6 karakter"} autoComplete="new-password"/>
        </div>
        <p className="rounded-xl bg-fisa-50 p-3 text-xs leading-relaxed text-fisa-600">
          Wali login di <b>aplikasi mobile FISA</b> memakai <b>email</b> dan password ini.
          Tidak memakai Authentication Supabase.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={simpan}>
            {simpan && <Loader2 size={16} className="animate-spin"/>}
            Simpan
          </Button>
        </div>
        {akun && (<Button type="button" variant="danger" className="w-full" disabled={simpan} onClick={hapusAkun}>
            <Trash2 size={16}/> Hapus Akun Login
          </Button>)}
      </form>
    </Modal>);
}
