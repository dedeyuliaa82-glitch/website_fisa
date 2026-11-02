import "./globals.css";
export const metadata = {
    title: "FISA — Dashboard Admin Pesantren",
    description: "Panel kontrol pengurus pesantren: verifikasi pembayaran, kelola santri, dan pengaturan biaya FISA (Finansial Santri App).",
    // Favicon memakai file konvensi Next.js (file-based metadata):
    //   src/app/icon.png (512x512)       -> <link rel="icon" sizes="any">
    //   src/app/apple-icon.png (192x192) -> <link rel="apple-touch-icon">
    // JANGAN set `icons` di sini karena akan menimpa keduanya.
};
export default function RootLayout({ children, }) {
    return (<html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-fisa-50 text-fisa-950">{children}</body>
    </html>);
}
