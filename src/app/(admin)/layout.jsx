"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
export default function AdminLayout({ children, }) {
    const router = useRouter();
    const [namaAdmin, setNamaAdmin] = useState("Admin");
    const [siap, setSiap] = useState(false);
    const [menuTerbuka, setMenuTerbuka] = useState(false);
    useEffect(() => {
        (async () => {
            const res = await fetch("/api/auth/me", { cache: "no-store" });
            if (!res.ok) {
                router.replace("/login");
                return;
            }
            const json = await res.json().catch(() => ({}));
            const user = json.user;
            if ((user === null || user === void 0 ? void 0 : user.peran) !== "admin") {
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/login?error=bukan_admin");
                return;
            }
            setNamaAdmin((user === null || user === void 0 ? void 0 : user.nama) || (user === null || user === void 0 ? void 0 : user.username) || "Admin");
            setSiap(true);
        })();
    }, [router]);
    if (!siap) {
        return (<div className="grid min-h-screen place-items-center bg-fisa-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-fisa-200 border-t-fisa-700"/>
          <p className="text-sm font-semibold text-fisa-700">
            Memeriksa sesi admin…
          </p>
        </div>
      </div>);
    }
    return (<div className="flex min-h-screen bg-fisa-50">
      <Sidebar open={menuTerbuka} onClose={() => setMenuTerbuka(false)}/>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Siluet logo FISA sebagai watermark background konten */}
        <div aria-hidden className="pointer-events-none fixed -bottom-24 -right-24 z-0 opacity-[0.13] select-none">
          <Image src="/logo-fisa.png" alt="" width={520} height={520} priority={false}/>
        </div>
        <div aria-hidden className="pointer-events-none fixed -left-40 -top-40 z-0 opacity-[0.08] select-none">
          <Image src="/logo-fisa.png" alt="" width={400} height={400} priority={false}/>
        </div>
        <Header namaAdmin={namaAdmin} onMenu={() => setMenuTerbuka(true)}/>
        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 p-5 sm:p-6 lg:p-10">
          {children}
        </main>
        <footer className="px-6 pb-5 text-center text-xs font-medium text-fisa-600">
          FISA • Finansial Santri App — Dashboard Admin Pesantren
        </footer>
      </div>
    </div>);
}
