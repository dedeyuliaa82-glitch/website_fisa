"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Input, Label, Modal } from "@/components/ui";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Atur akun login wali (tabel public.users).
 * Akun ini dipakai wali untuk masuk ke aplikasi mobile FISA.
 */
export function AkunWaliModal({ wali, akun, onClose, onSelesai }) {
    var _a, _b, _c;
    const [username, setUsername] = useState((_a = akun === null || akun === void 0 ? void 0 : akun.username) !== null && _a !== void 0 ? _a : "");
    const [email, setEmail] = useState((_b = akun === null || akun === void 0 ? void 0 : akun.email) !== null && _b !== void 0 ? _b : ((_c = wali === null || wali === void 0 ? void 0 : wali.email) !== null && _c !== void 0 ? _c : ""));
    const [password, setPassword] = useState("");
    const [simpan, setSimpan] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!username.trim()) {
            setError("Username wajib diisi.");
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
            const supabase = createClient();
            const { error: err } = await supabase.rpc("admin_simpan_akun", {
                p_id_profil: wali.id,
                p_username: username.trim(),
                p_password: password.trim() || null,
                p_peran: "orang_tua",
                p_email: email.trim() || null,
            });
            if (err)
                throw err;
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
        if (!confirm(`Hapus akun login "${akun.username}"? Wali tidak bisa masuk aplikasi mobile lagi.`))
            return;
        setSimpan(true);
        setError("");
        try {
            const supabase = createClient();
            const { error: err } = await supabase.rpc("admin_hapus_akun", { p_id_profil: wali.id });
            if (err)
                throw err;
            onSelesai();
        }
        catch (err) {
            setError(pesanGalatDb(err, "Gagal menghapus akun login."));
        }
        finally {
            setSimpan(false);
        }
    }
    return (<Modal open onClose={onClose} title={`Akun Login — ${(_c = wali.nama_lengkap) !== null && _c !== void 0 ? _c : "Wali"}`}>
      {error && (<div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>)}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Username</Label>
          <Input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cth: abdullah" autoComplete="off"/>
        </div>
        <div>
          <Label>Email (opsional)</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cth: abdullah@email.com" autoComplete="off"/>
        </div>
        <div>
          <Label>{akun ? "Password Baru (opsional)" : "Password"}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={akun ? "Kosongkan bila tidak diubah" : "Minimal 6 karakter"} autoComplete="new-password"/>
        </div>
        <p className="rounded-xl bg-fisa-50 p-3 text-xs leading-relaxed text-fisa-600">
          Username & password ini dipakai wali untuk login di <b>aplikasi mobile FISA</b>.
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
