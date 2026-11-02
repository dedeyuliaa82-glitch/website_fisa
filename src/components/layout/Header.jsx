"use client";
import { LogoFisa } from "@/components/LogoFisa";
import { LogOut, Menu } from "lucide-react";
export function Header({ namaAdmin, onMenu, }) {
    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        // Muat ulang penuh agar cache token Supabase di browser ikut direset.
        window.location.href = "/login";
    }
    return (<header className="sticky top-0 z-20 flex items-center gap-3 border-b border-fisa-100 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-fisa-100 text-fisa-800 lg:hidden" aria-label="Buka menu">
        <Menu size={20}/>
      </button>
      <div className="lg:hidden">
        <LogoFisa size={36}/>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-extrabold text-fisa-900">{namaAdmin}</p>
          <p className="text-xs font-medium text-fisa-500">Admin Pesantren</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-linear-to-br from-fisa-600 to-fisa-900 font-extrabold text-white">
          {namaAdmin.charAt(0).toUpperCase()}
        </div>
        <button onClick={logout} className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100">
          <LogOut size={16}/>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>);
}
