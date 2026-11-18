"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Judul halaman admin + tombol bantuan (ikon i) di samping judul.
 * Petunjuk panjang dipindahkan ke modal agar halaman tetap bersih.
 *
 * bantuan = {
 *   ringkas?: string,
 *   langkah?: ReactNode[],
 *   catatan?: ReactNode,
 * }
 */
export function PageHeader({ judul, deskripsi, bantuan, aksi, className }) {
  const [buka, setBuka] = useState(false);
  const adaBantuan = !!bantuan;

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-fisa-900 sm:text-2xl">
            {judul}
          </h1>
          {adaBantuan && (
            <button
              type="button"
              onClick={() => setBuka(true)}
              title={`Bantuan: ${judul}`}
              aria-label={`Buka bantuan ${judul}`}
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full bg-fisa-100 text-fisa-700 transition hover:bg-fisa-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fisa-500 focus-visible:ring-offset-2"
            >
              <Info size={15} />
            </button>
          )}
        </div>
        {deskripsi && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fisa-600">
            {deskripsi}
          </p>
        )}
      </div>

      {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}

      {adaBantuan && (
        <Modal
          open={buka}
          onClose={() => setBuka(false)}
          title={`Bantuan — ${judul}`}
        >
          <div className="space-y-4 text-sm text-fisa-700">
            {bantuan.ringkas && (
              <p className="leading-relaxed">{bantuan.ringkas}</p>
            )}

            {bantuan.langkah && bantuan.langkah.length > 0 && (
              <ol className="space-y-2">
                {bantuan.langkah.map((langkah, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-fisa-50 p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fisa-800 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{langkah}</span>
                  </li>
                ))}
              </ol>
            )}

            {bantuan.catatan && (
              <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <Lightbulb size={16} className="mt-0.5 shrink-0" />
                <span>{bantuan.catatan}</span>
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
