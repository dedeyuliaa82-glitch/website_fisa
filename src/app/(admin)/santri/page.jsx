"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { labelTingkatan } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button, Card, Input, Select, Skeleton } from "@/components/ui";
import { SantriFormModal } from "@/components/santri/SantriFormModal";
import { ImportCsvModal } from "@/components/santri/ImportCsvModal";
import { WaliFormModal } from "@/components/santri/WaliFormModal";
import { AkunWaliModal } from "@/components/santri/AkunWaliModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Plus, Search, Upload, Pencil, Trash2, Users, GraduationCap, UserPlus, KeyRound } from "lucide-react";
export default function SantriPage() {
    const [tab, setTab] = useState("santri");
    // --- Santri ---
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("semua");
    const [cari, setCari] = useState("");
    const [modal, setModal] = useState(null);
    const [sunting, setSunting] = useState(null);
    // --- Wali ---
    const [wali, setWali] = useState([]);
    const [loadingWali, setLoadingWali] = useState(false);
    const [cariWali, setCariWali] = useState("");
    const [modalWali, setModalWali] = useState(false);
    const [suntingWali, setSuntingWali] = useState(null);
    const [petaSantri, setPetaSantri] = useState({});
    const [akunWali, setAkunWali] = useState({});
    const [modalAkun, setModalAkun] = useState(null);
    async function muatSantri() {
        var _a;
        setLoading(true);
        const supabase = createClient();
        let q = supabase.from("santri").select("*, profil(*)").order("nama_santri").limit(200);
        if (filter !== "semua")
            q = q.eq("tingkatan", filter);
        const { data: hasil } = await q;
        setData((_a = hasil) !== null && _a !== void 0 ? _a : []);
        setLoading(false);
    }
    async function muatWali() {
        var _a, _b, _c;
        setLoadingWali(true);
        const supabase = createClient();
        const [{ data: profil, error: errProfil }, { data: santri }, { data: akun }] = await Promise.all([
            supabase.from("profil").select("id, nama_lengkap, nomor_telepon, email").eq("peran", "orang_tua").order("nama_lengkap").limit(200),
            supabase.from("santri").select("nama_santri, id_orang_tua").limit(500),
            supabase.rpc("admin_daftar_akun"),
        ]);
        let daftarProfil = profil;
        if (errProfil && /column .*email|schema cache/i.test(String(errProfil.message ?? ""))) {
            const ulang = await supabase.from("profil").select("id, nama_lengkap, nomor_telepon").eq("peran", "orang_tua").order("nama_lengkap").limit(200);
            daftarProfil = ulang.data;
        }
        setWali((_a = daftarProfil) !== null && _a !== void 0 ? _a : []);
        const peta = {};
        ((_b = santri) !== null && _b !== void 0 ? _b : []).forEach((s) => {
            var _a;
            var _b;
            if (!s.id_orang_tua)
                return;
            ((_a = peta[_b = s.id_orang_tua]) !== null && _a !== void 0 ? _a : (peta[_b] = [])).push(s.nama_santri);
        });
        setPetaSantri(peta);
        const petaAkun = {};
        ((_c = akun) !== null && _c !== void 0 ? _c : []).forEach((a) => {
            petaAkun[a.id_profil] = a;
        });
        setAkunWali(petaAkun);
        setLoadingWali(false);
    }
    useEffect(() => {
        muatSantri();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);
    useEffect(() => {
        if (tab === "wali")
            muatWali();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);
    async function hapus(id, nama) {
        if (!confirm(`Hapus santri "${nama}"? Riwayat transaksinya ikut terpengaruh.`))
            return;
        try {
            const supabase = createClient();
            const { data: terhapus, error } = await supabase.from("santri").delete().eq("id", id).select("id");
            if (error)
                throw error;
            if (!(terhapus !== null && terhapus !== void 0 ? terhapus : []).length)
                throw new Error("Santri tidak terhapus. Pastikan akun admin & policy RLS mengizinkan hapus.");
            muatSantri();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menghapus santri.");
        }
    }
    async function hapusWali(w) {
        var _a;
        const anak = (_a = petaSantri[w.id]) !== null && _a !== void 0 ? _a : [];
        if (anak.length > 0) {
            alert(`Wali ini masih tertaut ke ${anak.length} santri (${anak.join(", ")}). Lepaskan tautannya dulu di tab Data Santri.`);
            return;
        }
        if (!confirm(`Hapus data wali "${w.nama_lengkap ?? "(tanpa nama)"}"? Akun login (jika ada) tidak ikut terhapus.`))
            return;
        try {
            const supabase = createClient();
            const { data: terhapus, error } = await supabase.from("profil").delete().eq("id", w.id).select("id");
            if (error)
                throw error;
            if (!(terhapus !== null && terhapus !== void 0 ? terhapus : []).length)
                throw new Error("Data wali tidak terhapus. Pastikan akun admin & policy RLS mengizinkan hapus.");
            muatWali();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menghapus data wali.");
        }
    }
    const tampil = data.filter((s) => {
        var _a, _b, _c;
        const k = cari.toLowerCase();
        return (!k ||
            s.nama_santri.toLowerCase().includes(k) ||
            ((_a = s.nis) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(k)) ||
            ((_c = (_b = s.profil) === null || _b === void 0 ? void 0 : _b.nama_lengkap) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(k)));
    });
    const tampilWali = wali.filter((w) => {
        var _a, _b, _c;
        const k = cariWali.toLowerCase();
        return !k || ((_a = w.nama_lengkap) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(k)) || ((_b = w.nomor_telepon) === null || _b === void 0 ? void 0 : _b.includes(k)) || ((_c = w.email) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(k));
    });
    return (<div className="space-y-5">
      <PageHeader
        judul="Kelola Santri & Wali"
        deskripsi={tab === "santri" ? `${tampil.length} santri ditampilkan` : `${tampilWali.length} wali terdaftar`}
        bantuan={{
          ringkas: "Kelola data santri dan wali/orang tua. Gunakan tab Data Santri dan Data Wali di bawah judul.",
          langkah: [
            "Tab Data Santri: tambah santri satu per satu, impor CSV, atau edit data yang sudah ada.",
            "Tab Data Wali: klik Tambah Wali, isi nama lengkap, nomor WA, dan alamat email.",
            "Klik tombol Akun pada baris wali untuk membuat username & password login aplikasi mobile.",
            "Tautkan santri ke wali lewat tab Data Santri → Edit → pilih wali.",
          ],
          catatan: "Wali tidak perlu akun Supabase. Data wali hanya untuk administrasi; akun login mobile dibuat terpisah lewat tombol Akun.",
        }}
        aksi={tab === "santri" ? (<>
            <Button variant="outline" onClick={() => setModal("impor")}>
              <Upload size={16}/> Impor CSV
            </Button>
            <Button onClick={() => setModal("tambah")}>
              <Plus size={16}/> Tambah Santri
            </Button>
          </>) : (<Button onClick={() => setModalWali(true)}>
            <UserPlus size={16}/> Tambah Wali
          </Button>)}
      />

      {/* Tab pemisah Santri / Wali */}
      <div className="flex gap-2">
        {[
            { key: "santri", label: "Data Santri", icon: GraduationCap },
            { key: "wali", label: "Data Wali", icon: Users },
        ].map((t) => {
            const Icon = t.icon;
            const aktif = tab === t.key;
            return (<button key={t.key} onClick={() => setTab(t.key)} className={cn("flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", aktif ? "bg-fisa-800 text-white shadow" : "bg-white text-fisa-700 ring-1 ring-fisa-100 hover:bg-fisa-50")}>
              <Icon size={16}/> {t.label}
            </button>);
        })}
      </div>

      {tab === "santri" ? (<>
          <Card className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
              <Input placeholder="Cari nama / NIS / wali…" value={cari} onChange={(e) => setCari(e.target.value)} className="pl-10"/>
            </div>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-48">
              <option value="semua">Semua tingkatan</option>
              <option value="smp">SMP</option>
              <option value="smk">SMK</option>
              <option value="takhosus">Takhoshus</option>
            </Select>
          </Card>

          <Card className="p-0">
            {loading ? (<div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12"/>)}</div>) : (<div className="overflow-x-auto">
                <table className="w-full min-w-3xl text-left text-sm">
                  <thead>
                    <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                      <th className="px-5 py-3">Nama Santri</th>
                      <th className="px-5 py-3">NIS</th>
                      <th className="px-5 py-3">Tingkatan</th>
                      <th className="px-5 py-3">Domisili</th>
                      <th className="px-5 py-3">Wali</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tampil.map((s) => {
                    var _a, _b, _c;
                    return (<tr key={s.id} className="border-b border-fisa-50 last:border-0 hover:bg-fisa-50/50">
                        <td className="px-5 py-3 font-bold text-fisa-900">{s.nama_santri}</td>
                        <td className="px-5 py-3 text-fisa-700">{(_a = s.nis) !== null && _a !== void 0 ? _a : "-"}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-fisa-100 px-2.5 py-1 text-xs font-bold text-fisa-800">
                            {labelTingkatan(s.tingkatan)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-fisa-700">{s.luar_kota ? "Luar kota" : "Lokal"}</td>
                        <td className="px-5 py-3 text-fisa-700">{(_c = (_b = s.profil) === null || _b === void 0 ? void 0 : _b.nama_lengkap) !== null && _c !== void 0 ? _c : <span className="font-semibold text-amber-600">Belum ditautkan</span>}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSunting(s)}>
                              <Pencil size={14}/>
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => hapus(s.id, s.nama_santri)}>
                              <Trash2 size={14}/>
                            </Button>
                          </div>
                        </td>
                      </tr>);
                })}
                  </tbody>
                </table>
                {tampil.length === 0 && (<p className="p-10 text-center text-sm text-fisa-500">Belum ada data santri.</p>)}
              </div>)}
          </Card>
        </>) : (<>
          <Card className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fisa-400"/>
              <Input placeholder="Cari nama / nomor / email wali…" value={cariWali} onChange={(e) => setCariWali(e.target.value)} className="pl-10"/>
            </div>
          </Card>

          <Card className="p-0">
            {loadingWali ? (<div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12"/>)}</div>) : (<div className="overflow-x-auto">
                <table className="w-full min-w-3xl text-left text-sm">
                  <thead>
                    <tr className="border-b border-fisa-100 bg-fisa-50/60 text-xs uppercase text-fisa-500">
                      <th className="px-5 py-3">Nama Wali</th>
                      <th className="px-5 py-3">Nomor Telepon</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Santri Tertaut</th>
                      <th className="px-5 py-3">Akun Login</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tampilWali.map((w) => {
                    var _a, _b, _c, _d;
                    const anak = (_a = petaSantri[w.id]) !== null && _a !== void 0 ? _a : [];
                    const akun = akunWali[w.id];
                    return (<tr key={w.id} className="border-b border-fisa-50 last:border-0 hover:bg-fisa-50/50">
                          <td className="px-5 py-3 font-bold text-fisa-900">{(_b = w.nama_lengkap) !== null && _b !== void 0 ? _b : "(tanpa nama)"}</td>
                          <td className="px-5 py-3 text-fisa-700">{(_c = w.nomor_telepon) !== null && _c !== void 0 ? _c : "-"}</td>
                          <td className="px-5 py-3 text-fisa-700">{(_d = w.email) !== null && _d !== void 0 ? _d : "-"}</td>
                          <td className="px-5 py-3 text-fisa-700">
                            {anak.length === 0 ? (<span className="font-semibold text-amber-600">Belum ada santri tertaut</span>) : (anak.join(", "))}
                          </td>
                          <td className="px-5 py-3 text-fisa-700">
                            {akun ? (<span className="font-semibold text-fisa-800">{akun.username}</span>) : (<span className="font-semibold text-amber-600">Belum ada</span>)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setModalAkun(w)} title="Atur akun login mobile">
                                <KeyRound size={14}/> Akun
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setSuntingWali(w)}>
                                <Pencil size={14}/> Edit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => hapusWali(w)} title="Hapus data wali">
                                <Trash2 size={14}/>
                              </Button>
                            </div>
                          </td>
                        </tr>);
                })}
                  </tbody>
                </table>
                {tampilWali.length === 0 && (<p className="p-10 text-center text-sm text-fisa-500">
                    Belum ada data wali. Klik Tambah Wali untuk mendata orang tua/wali santri.
                  </p>)}
              </div>)}
          </Card>
        </>)}

      {modal === "tambah" && (<SantriFormModal onClose={() => setModal(null)} onSelesai={() => { setModal(null); muatSantri(); }}/>)}
      {modal === "impor" && (<ImportCsvModal onClose={() => setModal(null)} onSelesai={muatSantri}/>)}
      {sunting && (<SantriFormModal awal={sunting} onClose={() => setSunting(null)} onSelesai={() => { setSunting(null); muatSantri(); }}/>)}
      {modalWali && (<WaliFormModal onClose={() => setModalWali(false)} onSelesai={() => { setModalWali(false); muatWali(); }}/>)}
      {suntingWali && (<WaliFormModal awal={suntingWali} onClose={() => setSuntingWali(null)} onSelesai={() => { setSuntingWali(null); muatWali(); }}/>)}
      {modalAkun && (<AkunWaliModal wali={modalAkun} akun={akunWali[modalAkun.id]} onClose={() => setModalAkun(null)} onSelesai={() => { setModalAkun(null); muatWali(); }}/>)}
    </div>);
}
