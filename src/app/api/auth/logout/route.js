import { NextResponse } from "next/server";
import { COOKIE_TOKEN, COOKIE_USER } from "@/lib/auth/session";

/** POST /api/auth/logout -> hapus sesi website. */
export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_TOKEN, "", { path: "/", maxAge: 0 });
    response.cookies.set(COOKIE_USER, "", { path: "/", maxAge: 0 });
    return response;
}
