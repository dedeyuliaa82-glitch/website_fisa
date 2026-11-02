import { updateSession } from "@/lib/auth/middleware";
export async function middleware(request) {
    return await updateSession(request);
}
export const config = {
    matcher: [
        "/dashboard/:path*",
        "/verifikasi/:path*",
        "/tagihan/:path*",
        "/catat-pembayaran/:path*",
        "/santri/:path*",
        "/setor-beras/:path*",
        "/pengaturan/:path*",
        "/rekening/:path*",
        "/laporan/:path*",
        "/status/:path*",
        "/login",
    ],
};
