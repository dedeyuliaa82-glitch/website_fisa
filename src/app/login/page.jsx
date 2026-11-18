"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { LogoFisa } from "@/components/LogoFisa";
import { Button, Input, Label } from "@/components/ui";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
export default function LoginPage() {
    return (<Suspense fallback={<main className="grid min-h-screen place-items-center bg-fisa-950">
          <p className="text-sm font-semibold text-white">Memuat…</p>
        </main>}>
      <LoginForm />
    </Suspense>);
}
function LoginForm() {
    const params = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [lihat, setLihat] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(params.get("error") === "bukan_admin"
        ? "Akun ini bukan admin. Gunakan akun admin pesantren."
        : "");
    async function handleLogin(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json.error ?? "Login gagal.");
            if (json.user?.peran !== "admin") {
                await fetch("/api/auth/logout", { method: "POST" });
                throw new Error("Akses ditolak: akun ini bukan admin.");
            }
            // Muat ulang penuh agar cache token Supabase di browser ikut direset.
            window.location.href = "/dashboard";
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Login gagal.");
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="arch-pattern flex min-h-screen items-center justify-center bg-linear-to-br from-fisa-900 via-fisa-800 to-fisa-950 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        {/* Panel kiri: branding selaras logo */}
        <div className="arch-pattern relative hidden flex-col justify-between overflow-hidden bg-linear-to-b from-fisa-800 to-fisa-950 p-8 text-white md:flex">
          {/* Siluet logo raksasa di panel branding */}
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 opacity-10 select-none">
            <Image src="/logo-fisa.png" alt="" width={300} height={300}/>
          </div>
          <LogoFisa dark size={52}/>
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-800">
              <ShieldCheck size={14} className="text-gold-400"/>
              Area Khusus Pengurus
            </div>
            <h1 className="text-3xl font-extrabold leading-tight">
              Kelola Keuangan Santri dengan{" "}
              <span className="text-gold-400">Amanah.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Verifikasi pembayaran SPP, uang makan, syahriah, dan beras —
              semua tersimpan dengan aman.
            </p>
          </div>
          <p className="relative text-xs text-emerald-800">
            FISA • Finansial Santri App — © 2026 Pesantren
          </p>
        </div>

        {/* Panel kanan: form */}
        <div className="relative flex flex-col justify-center overflow-hidden p-8 sm:p-10">
          {/* Dekorasi: siluet logo + semburat hijau agar panel putih tidak polos */}
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 select-none">
            <Image src="/logo-fisa.png" alt="" width={300} height={300} className="opacity-[0.08]"/>
          </div>
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-28 select-none">
            <Image src="/logo-fisa.png" alt="" width={260} height={260} className="opacity-[0.05]"/>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-fisa-800 via-fisa-500 to-gold-400"/>
          <div className="relative">
          <div className="mb-6 md:hidden">
            <LogoFisa size={48}/>
          </div>
          <h2 className="text-2xl font-extrabold text-fisa-900">
            Login Admin
          </h2>
          <p className="mt-1 text-sm text-fisa-600">
            Masuk untuk mengelola verifikasi & data santri.
          </p>

          {error && (<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>)}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label>Username / Email</Label>
              <Input required placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"/>
            </div>
            <div>
              <Label>Kata Sandi</Label>
              <div className="relative">
                <Input type={lihat ? "text" : "password"} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="pr-11"/>
                <button type="button" onClick={() => setLihat(!lihat)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-fisa-500" aria-label="Tampilkan sandi">
                  {lihat ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 size={18} className="animate-spin"/>}
              {loading ? "Memeriksa…" : "Masuk Dashboard"}
            </Button>
          </form>

          <p className="mt-6 rounded-xl bg-fisa-50/90 p-3 text-center text-xs leading-relaxed text-fisa-600">
             Akses website khusus untuk admin pesantren. Jika Anda bukan admin, silakan hubungi pengurus pesantren untuk mendapatkan akun admin.
          </p>
          </div>
        </div>
      </div>
    </main>);
}
