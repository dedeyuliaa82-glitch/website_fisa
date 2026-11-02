"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { LogoFisa } from "@/components/LogoFisa";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
export function Sidebar({ open, onClose, }) {
    const pathname = usePathname();
    return (<>
      {/* Overlay mobile */}
      <div onClick={onClose} className={cn("fixed inset-0 z-30 bg-fisa-950/50 backdrop-blur-sm transition lg:hidden", open ? "block" : "hidden")}/>
      <aside className={cn("arch-pattern fixed inset-y-0 left-0 z-40 flex w-68 flex-col bg-fisa-900 text-white shadow-2xl transition-transform lg:static lg:z-auto lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between p-5">
          <LogoFisa dark/>
          <button onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/10 lg:hidden" aria-label="Tutup menu">
            <X size={16}/>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {NAV_ITEMS.map((item) => {
            const aktif = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (<Link key={item.href} href={item.href} onClick={onClose} className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition", aktif
                    ? "bg-white text-fisa-900 shadow-lg"
                    : "text-white/85 hover:bg-white/10 hover:text-white")}>
                <Icon size={18} className={aktif ? "text-fisa-700" : ""}/>
                {item.label}
              </Link>);
        })}
        </nav>

        <div className="m-4 rounded-2xl border border-white/10 bg-fisa-950/60 p-4 text-xs leading-relaxed text-white/80">
          <p className="font-bold text-gold-400">FISA • Amanah Keuangan</p>
          <p className="mt-1">
            Verifikasi setiap pembayaran dengan teliti sebelum menyetujui.
          </p>
        </div>
      </aside>
    </>);
}
