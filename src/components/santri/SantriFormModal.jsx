"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Modal, Select, Switch } from "@/components/ui";
import { TINGKATAN_OPTIONS } from "@/lib/constants";
import { Loader2 } from "lucide-react";
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
    // Muat daftar wali (peran = orang_tua) untuk dropdown.
    // Kolom santri.id_orang_tua di database bersifat WAJIB (NOT NULL),
    // jadi setiap santri harus ditautkan ke satu data wali.
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("profil")
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
      {error && (<div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>)}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nama Santri</Label>
          <Input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Ahmad Fauzi"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>NIS</Label>
            <Input value={nis} onChange={(e) => setNis(e.target.value)} placeholder="Nomor induk"/>
          </div>
          <div>
            <Label>Tingkatan</Label>
            <Select value={tingkatan} onChange={(e) => setTingkatan(e.target.value)}>
              {TINGKATAN_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </Select>
          </div>
        </div>
        <div className="rounded-xl bg-fisa-50 p-3">
          <Switch checked={luarKota} onChange={setLuarKota} label={luarKota ? "Santri luar kota (beras diganti uang)" : "Santri lokal (wajib setor beras fisik)"}/>
        </div>
        <div>
          <Label>Wali Santri (wajib)</Label>
          <Select required value={waliId} onChange={(e) => setWaliId(e.target.value)}>
            <option value="">— Pilih wali —</option>
            {daftarWali.map((w) => {
            var _a;
            return (<option key={w.id} value={w.id}>
                {(_a = w.nama_lengkap) !== null && _a !== void 0 ? _a : "(tanpa nama)"}{w.nomor_telepon ? ` • ${w.nomor_telepon}` : ""}
              </option>);
        })}
          </Select>
          <p className="mt-1 text-xs text-fisa-500">
            {daftarWali.length === 0
            ? "Belum ada data wali. Tambahkan dulu lewat tab Data Wali (cukup nama & nomor telepon)."
            : "Wali diambil dari tab Data Wali. Tambahkan wali baru di sana bila belum terdaftar."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={simpan}>
            {simpan && <Loader2 size={16} className="animate-spin"/>}
            {sunting ? "Simpan" : "Tambah"}
          </Button>
        </div>
      </form>
    </Modal>);
}
