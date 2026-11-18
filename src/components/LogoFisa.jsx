import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
/**
 * Logo FISA.
 * Letakkan file logo asli di `public/logo-fisa.png` (nama persis).
 * Jika file belum ada, otomatis tampil monogram kubah "F" sebagai fallback.
 */
export function LogoFisa({ size = 44, withText = true, dark = false, className, }) {
    const [gagal, setGagal] = useState(false);
    return (<div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-linear-to-br from-fisa-700 via-fisa-800 to-fisa-950 shadow-md" style={{ width: size, height: size }}>
        {!gagal ? (<Image src="/logo-fisa.png" alt="Logo FISA" width={size} height={size} className="h-full w-full object-contain p-1" onError={() => setGagal(true)} priority/>) : (<svg viewBox="0 0 48 48" width={size * 0.72} height={size * 0.72}>
            <path d="M24 4c5 6 12 9 12 17 0 3-1.5 5.5-4 7 2.5 1.5 4 4 4 7 0 5-5 9-12 9s-12-4-12-9c0-3 1.5-5.5 4-7-2.5-1.5-4-4-4-7 0-8 7-11 12-17Z" fill="none" stroke="#e0eee3" strokeWidth="3" strokeLinejoin="round"/>
            <text x="24" y="31" textAnchor="middle" fontSize="16" fontWeight="800" fill="#d9b45b" fontFamily="sans-serif">
              F
            </text>
          </svg>)}
      </div>
      {withText && (<div className="leading-tight">
        
          <p className={cn("text-[25px] font-extrabold", dark ? "text-fisa-200" : "text-fisa-900")}>
            FISA
          </p>
          <p className={cn("text-[11px] font-medium", dark ? "text-fisa-200" : "text-fisa-900")}>
            Finansial Santri App
          </p>
        </div>)}
    </div>);
}
