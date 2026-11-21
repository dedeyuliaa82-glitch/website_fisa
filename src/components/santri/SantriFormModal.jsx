"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn, labelTingkatan } from "@/lib/utils";
import { Button, Card, Input, Label, Modal, Select, Switch } from "@/components/ui";
import { TINGKATAN_OPTIONS } from "@/lib/constants";
import { Loader2, UserRound, Hash, GraduationCap, Building2, UserPlus } from "lucide-react";
export function SantriFormModal({ awal, onClose, onSelesai, }) {
    var _a, _b, _c, _d, _e;
    const sunting = !!awal;
    const [nama, setNama] = useState((_a = awal === null || awal === void 0 ? void 0 : awal.nama_santri) !== null && _a !== void 0 ? _a : "");
    const [nis, setNis] = useState((_b = awal === null || awal === void 0 ? void 0 : awal.nis) !== null && _b !== void 0 ? _b : "");
    const [tingkatan, setTingkatan] = useState((_c = awal === null || awal === void 0 ? void 0 : awal.tingkatan) !== null && _c !== void 0 ? _c : "smp");
    const [luarKota, setLuarKota] = useState((_d = awal === null || awal === void 0 ? void 0 : awal.luar_kota) !== null && _d !== void 0 ? _d : false);
    const [waliId, setWaliId] = useState((_e = awal === null || awal === void 0 ? void 0 : awal.id_orang_tua) !== null && _e !== void 0 ? _e : "");
    const [daftarWali, setDaftarWali] = useState([]);
    const [simpan, setSimpan] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("users")
                .select("id, nama_lengkap, nomor_telepon")
                .eq("peran", "orang_tua")
                .order("nama_lengkap")
                .limit(200);
            setDaftarWali(data !== null && data !== void 0 ? data : []);
        })();
    }, []);
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!waliId) {
            setError("Pilih wali santri terlebih dahulu.");
            return;
        }
        setSimpan(true);
        try {
            const supabase = createClient();
            if (!sunting) {
                const { error: errInsert } = await supabase.from("santri").insert({
                    nama_santri: nama.trim(),
                    nis: nis.trim() || null,
                    tingkatan,
                    luar_kota: luarKota,
                    id_orang_tua: waliId,
                    dibuat_pada: new Date().toISOString(),
                });
                if (errInsert)
                    throw errInsert;
            }
            else {
                const { error: errUpdate } = await supabase
                    .from("santri")
                    .update({
                    nama_santri: nama.trim(),
                    nis: nis.trim() || null,
                    tingkatan,
                    luar_kota: luarKota,
                    id_orang_tua: waliId,
                })
                    .eq("id", awal.id);
                if (errUpdate)
                    throw errUpdate;
            }
            onSelesai();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menyimpan data.");
        }
        finally {
            setSimpan(false);
        }
    }
    return (<Modal open onClose={onClose} title={sunting ? "Edit Santri" : "Tambah Santri"}>
      {error && (<div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span>{error}</span>
        </div>)}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama Santri</Label>
          <div className="relative">
            <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Input autoFocus required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Ahmad Fauzi" className="pl-10"/>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>NIS</Label>
            <div className="relative">
              <Hash size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
              <Input value={nis} onChange={(e) => setNis(e.target.value)} placeholder="Nomor induk" className="pl-10"/>
            </div>
          </div>
          <div>
            <Label>Tingkatan</Label>
            <Select value={tingkatan} onChange={(e) => setTingkatan(e.target.value)}>
              {TINGKATAN_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-fisa-100 bg-fisa-50/70 p-3.5">
          <Building2 size={18} className="shrink-0 text-fisa-600"/>
          <Switch checked={luarKota} onChange={setLuarKota} label={luarKota ? "Luar kota (beras diganti uang)" : "Lokal (wajib setor beras fisik)"}/>
        </div>
        <div>
          <Label>Wali Santri (wajib)</Label>
          <div className="relative">
            <UserPlus size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
            <Select required value={waliId} onChange={(e) => setWaliId(e.target.value)}>
              <option value="">— Pilih wali —</option>
              {daftarWali.map((w) => {
              var _a;
              return (<option key={w.id} value={w.id}>
                  {(_a = w.nama_lengkap) !== null && _a !== void 0 ? _a : "(tanpa nama)"}{w.nomor_telepon ? ` • ${w.nomor_telepon}` : ""}
                </option>);
          })}
            </Select>
          </div>
          <p className="mt-1 text-xs text-fisa-500">
            {daftarWali.length === 0
            ? "Belum ada data wali. Tambahkan dulu lewat tab Data Wali (cukup nama & nomor telepon)."
            : "Pilih wali dari daftar Data Wali. Tambahkan wali baru di tombol Tambah Wali bila belum terdaftar."}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-fisa-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="sm:min-w-24">Batal</Button>
          <Button type="submit" disabled={simpan} className="sm:min-w-32">
            {simpan && <Loader2 size={16} className="animate-spin"/>}
            {sunting ? "Simpan Perubahan" : "Tambah Santri"}
          </Button>
        </div>
      </form>
    </Modal>);
}
