import {
  LayoutDashboard,
  BadgeCheck,
  PlusCircle,
  ReceiptText,
  Users,
  Wallet,
  FileText,
  Activity,
} from "lucide-react";
export const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/verifikasi", label: "Verifikasi Pembayaran", icon: BadgeCheck },
    { href: "/tagihan", label: "Tagihan Bulanan", icon: ReceiptText },
    { href: "/catat-pembayaran", label: "Catat Pembayaran", icon: PlusCircle },
    { href: "/santri", label: "Kelola Santri & Wali", icon: Users },
    { href: "/pengaturan", label: "Pengaturan Finansial", icon: Wallet },
    { href: "/laporan", label: "Laporan", icon: FileText },
    { href: "/status", label: "Status Sistem", icon: Activity },
];
/** Acuan nominal default (bisa dioverride per transaksi dari aplikasi mobile). */
export const BIAYA_DEFAULT = {
    spp_smp: 150000,
    spp_smk: 175000,
    spp_takhosus: 200000,
    uang_makan: 300000,
    syahriah: 50000,
};
export const TINGKATAN_OPTIONS = [
    { value: "smp", label: "SMP" },
    { value: "smk", label: "SMK" },
    { value: "takhosus", label: "Takhoshus" },
];
