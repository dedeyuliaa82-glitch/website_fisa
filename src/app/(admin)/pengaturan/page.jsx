"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, Skeleton } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { PengaturanBiayaPanel } from "@/components/pengaturan/PengaturanBiayaPanel";
import { ManajemenRekeningPanel } from "@/components/rekening/ManajemenRekeningPanel";
import { Landmark, Settings2, Wallet } from "lucide-react";

const TABS = [
    { key: "biaya", label: "Pengaturan Biaya", icon: Settings2 },
    { key: "rekening", label: "Manajemen Rekening", icon: Landmark },
];

const BANTUAN = {
    biaya: {
        ringkas: "Semua nominal di tab ini tersimpan di tabel pengaturan_biaya dan dibaca aplikasi mobile sebagai acuan tagihan.",
        langkah: [
            "Isi nominal SPP sesuai tingkatan, uang makan, syahriah, dan harga beras 10 kg.",
            "Klik Simpan Semua Acuan Biaya. Nilai ini menjadi default saat tagihan bulanan dibuat.",
            "Santri Takhoshus hanya ditagih Syahriah — SPP, uang makan, dan beras tidak dikenakan.",
        ],
        catatan: "Nominal resmi tiap tagihan tetap dicatat per transaksi di tabel transaksi oleh aplikasi mobile. Ubah acuan hanya bila harga resmi pesantren berubah.",
    },
    rekening: {
        ringkas: "Kelola rekening bank atau e-wallet pesantren yang ditampilkan ke wali di aplikasi mobile untuk transfer manual.",
        langkah: [
            "Klik Tambah Rekening, lalu isi nama bank/e-wallet, nomor rekening, dan atas nama.",
            "Aktifkan sakelar 'Tampilkan di aplikasi mobile wali' agar rekening bisa dilihat wali.",
            "Gunakan tombol Aktifkan/Non-aktifkan untuk menyembunyikan rekening tanpa menghapusnya.",
            "Klik Edit untuk memperbarui data, atau Hapus untuk membuang rekening yang sudah tidak dipakai.",
        ],
        catatan: "Wali hanya bisa melihat rekening aktif. Tambah, ubah, dan hapus hanya bisa dilakukan admin di halaman ini.",
    },
};

export default function PengaturanPage() {
    return (
      <Suspense fallback={<div className="space-y-5">
        <div className="flex items-center gap-2">
          <Wallet size={22} className="text-fisa-700"/>
          <h1 className="text-2xl font-extrabold text-fisa-900">Pengaturan Finansial</h1>
        </div>
        <Card><Skeleton className="h-64"/></Card>
      </div>}>
        <PengaturanFinansial />
      </Suspense>
    );
}

function PengaturanFinansial() {
    const router = useRouter();
    const params = useSearchParams();
    const tab = params.get("tab") === "rekening" ? "rekening" : "biaya";

    function setTab(key) {
        const href = key === "rekening" ? "/pengaturan?tab=rekening" : "/pengaturan";
        router.replace(href, { scroll: false });
    }

    return (<div className="space-y-5">
      <PageHeader
        judul="Pengaturan Finansial"
        deskripsi={tab === "rekening"
            ? "Rekening bank dan e-wallet untuk transfer manual wali."
            : "Acuan nominal SPP, uang makan, syahriah, dan harga beras untuk pembuatan tagihan."}
        bantuan={BANTUAN[tab]}
      />

      <div className="flex gap-2">
        {TABS.map((t) => {
            const Icon = t.icon;
            const aktif = tab === t.key;
            return (<button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", aktif ? "bg-fisa-800 text-white shadow" : "bg-white text-fisa-700 ring-1 ring-fisa-100 hover:bg-fisa-50")}>
              <Icon size={16}/> {t.label}
            </button>);
        })}
      </div>

      {tab === "biaya" ? (<div className="mx-auto max-w-4xl p-4 sm:p-6">
          <PengaturanBiayaPanel />
        </div>) : (<ManajemenRekeningPanel />)}
    </div>);
}