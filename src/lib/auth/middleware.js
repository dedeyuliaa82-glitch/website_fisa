import { NextResponse } from "next/server";
import { verifikasiJwt } from "@/lib/auth/jwt";
import { COOKIE_TOKEN, secretJwt } from "@/lib/auth/session";

const RUTE_ADMIN = [
    "/dashboard",
    "/verifikasi",
    "/tagihan",
    "/catat-pembayaran",
    "/santri",
    "/setor-beras",
    "/pengaturan",
    "/rekening",
    "/laporan",
    "/status",
];

function alamatLogin(request, adaGalat) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (adaGalat)
        url.searchParams.set("error", "bukan_admin");
    return NextResponse.redirect(url);
}

export async function updateSession(request) {
    const { pathname } = request.nextUrl;
    const isLoginPage = pathname === "/login";
    const isAdminRoute = RUTE_ADMIN.some((rute) => pathname === rute || pathname.startsWith(rute + "/"));
    const token = request.cookies.get(COOKIE_TOKEN)?.value;
    const sesi = await verifikasiJwt(token, secretJwt());

    // Belum login tapi akses halaman admin -> ke /login
    if (!sesi && isAdminRoute)
        return alamatLogin(request, false);

    // Sudah login tapi bukan admin -> tolak
    if (sesi && isAdminRoute && sesi.peran !== "admin")
        return alamatLogin(request, true);

    // Admin yang sudah login tidak perlu melihat halaman login lagi
    if (sesi && isLoginPage && sesi.peran === "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}
