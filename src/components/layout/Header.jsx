"use client";
import { LogoFisa } from "@/components/LogoFisa";
import { LogOut, Menu } from "lucide-react";
export function Header({ namaAdmin, onMenu, }) {
    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    }
    const namaTampil = namaAdmin === "adminnk" ? "Admin Pesantren" : namaAdmin;
    return (<header className="sticky top-0 z-20 flex items-center gap-2 border-b border-fisa-100 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-md sm:gap-3 sm:px-6 sm:py-3">
      <button onClick={onMenu} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-fisa-100 text-fisa-800 transition hover:bg-fisa-50 lg:hidden" aria-label="Buka menu">
        <Menu size={19}/>
      </button>
      <div className="min-w-0 lg:hidden">
        <LogoFisa size={34} withText={false}/>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="min-w-0 text-right leading-tight">
          <p className="max-w-[10rem] truncate text-sm font-extrabold text-fisa-900 sm:max-w-[16rem]">{namaTampil}</p>
          <p className="hidden text-[11px] font-semibold text-fisa-600 sm:block">Admin Pesantren</p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-fisa-600 to-fisa-900 text-sm font-extrabold text-white shadow-sm sm:h-10 sm:w-10">
          {namaTampil.charAt(0).toUpperCase()}
        </div>
        <button onClick={logout} className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 sm:gap-2 sm:px-3" aria-label="Logout" title="Keluar">
          <LogOut size={15} className="shrink-0"/>
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>);
}
