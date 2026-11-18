"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { idPengguna } from "@/lib/auth/client";
import { formatRupiah } from "@/lib/utils";
import { BIAYA_DEFAULT } from "@/lib/constants";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui";
import { Settings2, Loader2, CheckCircle2 } from "lucide-react";

const FIELD_LABEL = {
    harga_beras_10kg: "Harga Beras 10 Kg",
    spp_smp: "SPP SMP",
    spp_smk: "SPP SMK",
    uang_makan: "Uang Makan",
    syahriah: "Syahriah",
};
const DEFAULTS = {
    harga_beras_10kg: 120000,
    spp_smp: BIAYA_DEFAULT.spp_smp,
    spp_smk: BIAYA_DEFAULT.spp_smk,
    uang_makan: BIAYA_DEFAULT.uang_makan,
    syahriah: BIAYA_DEFAULT.syahriah,
};

export function PengaturanBiayaPanel() {
    const [id, setId] = useState(null);
    const [nilai, setNilai] = useState({
        harga_beras_10kg: "",
        spp_smp: "",
        spp_smk: "",
        spp_takhosus: "",
        uang_makan: "",
        syahriah: "",
    });
    const [kolomHilang, setKolomHilang] = useState(false);
    const [terakhir, setTerakhir] = useState("");
    const [loading, setLoading] = useState(true);
    const [simpan, setSimpan] = useState(false);
    const [pesan, setPesan] = useState("");
    useEffect(() => {
        (async () => {
            var _a;
            const supabase = createClient();
            const { data, error } = await supabase.from("pengaturan_biaya").select("*").limit(1).maybeSingle();
            if (!error && data) {
                setId(data.id);
                const isi = Object.assign({}, nilai);
                Object.keys(FIELD_LABEL).forEach((k) => {
                    if (data[k] !== undefined && data[k] !== null)
                        isi[k] = String(data[k]);
                });
                if (data.spp_smp === undefined)
                    setKolomHilang(true);
                setNilai(isi);
                if (data.diperbarui_pada) {
                    let oleh = "admin";
                    if (data.diperbarui_oleh) {
                        const { data: p } = await supabase.from("users").select("nama_lengkap").or(`id.eq.${data.diperbarui_oleh},id_profil.eq.${data.diperbarui_oleh}`).maybeSingle();
                        oleh = (_a = p === null || p === void 0 ? void 0 : p.nama_lengkap) !== null && _a !== void 0 ? _a : String(data.diperbarui_oleh).slice(0, 8);
                    }
                    setTerakhir(`Terakhir diubah oleh ${oleh} pada ${new Date(data.diperbarui_pada).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`);
                }
            }
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    function setField(k, v) {
        setNilai((prev) => (Object.assign(Object.assign({}, prev), { [k]: v })));
    }
    async function handleSimpan(e) {
        e.preventDefault();
        setSimpan(true);
        setPesan("");
        try {
            const angka = {};
            for (const k of Object.keys(FIELD_LABEL)) {
                const n = Number(nilai[k]);
                if (!n || n <= 0)
                    throw new Error(`Nominal "${FIELD_LABEL[k]}" tidak valid.`);
                angka[k] = n;
            }
            const supabase = createClient();
            const payload = Object.assign(Object.assign({}, angka), { diperbarui_pada: new Date().toISOString(), diperbarui_oleh: idPengguna() });
            if (id) {
                const { error } = await supabase.from("pengaturan_biaya").update(payload).eq("id", id);
                if (error)
                    throw error;
            }
            else {
                const { data, error } = await supabase.from("pengaturan_biaya").insert(payload).select("id").single();
                if (error)
                    throw error;
                setId(data.id);
            }
            setPesan("Semua acuan biaya berhasil disimpan.");
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
            setPesan(msg.includes("column") || msg.includes("schema cache")
                ? "Kolom acuan belum ada di database. Jalankan dulu file supabase/migrasi_acuan_biaya.sql di SQL Editor Supabase."
                : msg);
        }
        finally {
            setSimpan(false);
        }
    }
    return (<Card className="p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-fisa-800 text-white">
            <Settings2 size={20}/>
          </span>
          <div>
            <p className="font-extrabold text-fisa-900">Acuan Biaya Pesantren</p>
            <p className="text-xs text-fisa-500">Satu baris aktif • berlaku untuk seluruh santri</p>
            {terakhir && <p className="mt-1 text-xs font-semibold text-fisa-600">🕒 {terakhir}</p>}
          </div>
        </div>

        {loading ? (<Skeleton className="h-64"/>) : (<form onSubmit={handleSimpan} className="space-y-4">
            {kolomHilang && (<div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Kolom SPP / uang makan / syahriah belum ada di database. Jalankan file{" "}
                <code>supabase/migrasi_acuan_biaya.sql</code> di SQL Editor, lalu muat ulang halaman ini.
              </div>)}
            {pesan && (<div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${pesan.includes("berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {pesan.includes("berhasil") && <CheckCircle2 size={17} className="mt-0.5 shrink-0"/>}
                {pesan}
              </div>)}
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.keys(FIELD_LABEL).map((k) => (<div key={k}>
                  <Label>{FIELD_LABEL[k]} (Rp)</Label>
                  <Input type="number" min={1} required value={nilai[k]} onChange={(e) => setField(k, e.target.value)} placeholder={String(DEFAULTS[k])}/>
                  {nilai[k] && (<p className="mt-1 text-sm font-bold text-fisa-700">= {formatRupiah(Number(nilai[k]))}</p>)}
                </div>))}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={simpan}>
              {simpan && <Loader2 size={18} className="animate-spin"/>}
              Simpan Semua Acuan Biaya
            </Button>
          </form>)}
      </Card>);
}
