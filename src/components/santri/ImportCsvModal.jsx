"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pesanGalatDb } from "@/lib/utils";
import { Button, Modal } from "@/components/ui";
import { Upload, Loader2, FileSpreadsheet, Info } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Impor massal santri dari CSV.
 * Format header: nama_santri,nis,tingkatan,luar_kota,wali
 * Contoh: Ahmad Fauzi,12345,smp,false,H. Abdullah
 * Kolom wali berisi NAMA wali (bukan UUID). Wali yang belum ada akan
 * dibuat otomatis. Kolom lama id_orang_tua (UUID) masih didukung.
 * File Excel (.xlsx) harap disimpan sebagai CSV terlebih dahulu.
 */
export function ImportCsvModal({ onClose, onSelesai }) {
    const fileRef = useRef(null);
    const [hasil, setHasil] = useState("");
    const [proses, setProses] = useState(false);
    async function handleFile(f) {
        setProses(true);
        setHasil("");
        try {
            const teks = await f.text();
            const baris = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
            if (baris.length < 2)
                throw new Error("File kosong. Tambahkan baris data di bawah header.");
            const header = baris[0].toLowerCase().split(",").map((h) => h.trim());
            const idx = {
                nama: header.indexOf("nama_santri"),
                nis: header.indexOf("nis"),
                tingkat: header.indexOf("tingkatan"),
                luar: header.indexOf("luar_kota"),
                wali: header.indexOf("wali") !== -1 ? header.indexOf("wali") : header.indexOf("id_orang_tua"),
            };
            if (idx.nama === -1)
                throw new Error("Header wajib: nama_santri,nis,tingkatan,luar_kota,wali");
            if (idx.wali === -1)
                throw new Error("Kolom wali wajib ada (isi dengan nama wali).");
            const validTingkat = new Set(["smp", "smk", "takhosus"]);
            const rows = baris.slice(1).map((b) => {
                const c = b.split(",").map((s) => s.trim());
                const tingkatan = (c[idx.tingkat] || "smp").toLowerCase();
                return {
                    nama_santri: c[idx.nama],
                    nis: c[idx.nis] || null,
                    tingkatan: validTingkat.has(tingkatan) ? tingkatan : "smp",
                    luar_kota: ["true", "1", "ya", "y"].includes((c[idx.luar] || "").toLowerCase()),
                    wali: c[idx.wali] || "",
                };
            }).filter((r) => r.nama_santri);
            if (rows.length === 0)
                throw new Error("Tidak ada baris valid.");
            const tanpaWali = rows.filter((r) => !r.wali.trim());
            if (tanpaWali.length > 0)
                throw new Error(`${tanpaWali.length} baris belum diisi nama wali.`);
            const supabase = createClient();
            const { data: profil, error: errProfil } = await supabase
                .from("users")
                .select("id, nama_lengkap")
                .eq("peran", "orang_tua")
                .limit(500);
            if (errProfil)
                throw errProfil;
            const peta = new Map();
            (profil !== null && profil !== void 0 ? profil : []).forEach((w) => {
                if (w.nama_lengkap)
                    peta.set(w.nama_lengkap.trim().toLowerCase(), w.id);
            });
            const waliBaru = [...new Set(rows
                    .map((r) => r.wali.trim())
                    .filter((n) => !UUID_RE.test(n) && !peta.has(n.toLowerCase())))];
            for (const namaWali of waliBaru) {
                const { data, error } = await supabase
                    .from("users")
                    .insert({ nama_lengkap: namaWali, peran: "orang_tua" })
                    .select("id")
                    .single();
                if (error)
                    throw error;
                peta.set(namaWali.toLowerCase(), data.id);
            }
            const siap = rows.map((r) => {
                const wali = r.wali.trim();
                return {
                    nama_santri: r.nama_santri,
                    nis: r.nis,
                    tingkatan: r.tingkatan,
                    luar_kota: r.luar_kota,
                    id_orang_tua: UUID_RE.test(wali) ? wali : peta.get(wali.toLowerCase()),
                    dibuat_pada: new Date().toISOString(),
                };
            });
            const { error } = await supabase.from("santri").insert(siap);
            if (error)
                throw error;
            setHasil(`Berhasil mengimpor ${siap.length} santri${waliBaru.length ? ` dan menambah ${waliBaru.length} wali baru` : ""}.`);
            onSelesai();
        }
        catch (err) {
            setHasil(`Gagal: ${pesanGalatDb(err, "Gagal mengimpor.")}`);
        }
        finally {
            setProses(false);
        }
    }
    return (<Modal open onClose={onClose} title="Impor Santri (CSV)">
      <div className="space-y-4">
        <div className="rounded-xl border border-fisa-100 bg-fisa-50 p-4 text-xs leading-relaxed text-fisa-700">
          <div className="flex items-start gap-2 mb-3">
            <Info size={16} className="mt-0.5 shrink-0 text-fisa-600"/>
            <p className="font-bold text-fisa-900">Format CSV</p>
          </div>
          <code className="mt-1 block rounded bg-white border border-fisa-100 p-2.5 font-mono text-[11px] overflow-x-auto">
            nama_santri,nis,tingkatan,luar_kota,wali<br />
            Ahmad Fauzi,12345,smp,false,H. Abdullah<br />
            Siti Aisyah,12346,smk,true,H. Abdullah
          </code>
          <p className="mt-3">Tulis <b>nama wali</b> — tidak perlu UUID. Wali yang belum terdaftar dibuat otomatis. Kolom lama <b>id_orang_tua</b> (UUID) masih didukung. File Excel (.xlsx) → Save As → CSV terlebih dahulu.</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
            var _a;
            const f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (f)
                handleFile(f);
        }}/>
        <Button className="w-full" size="lg" disabled={proses} onClick={() => { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }}>
          {proses ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>}
          {proses ? "Mengimpor…" : "Pilih File CSV"}
        </Button>
        {hasil && (<p className={`rounded-xl p-3 text-sm font-semibold ${hasil.startsWith("Berhasil") ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
            {hasil}
          </p>)}
        <p className="flex items-center justify-center gap-1 text-center text-xs text-fisa-500">
          <FileSpreadsheet size={13}/> Satu baris CSV = satu santri + nama walinya.
        </p>
      </div>
    </Modal>);
}
