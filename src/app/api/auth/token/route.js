import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifikasiJwt } from "@/lib/auth/jwt";
import { COOKIE_TOKEN, secretJwt } from "@/lib/auth/session";

/** GET /api/auth/token -> token JWT untuk klien Supabase di browser. */
export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_TOKEN)?.value;
    const sesi = await verifikasiJwt(token, secretJwt());
    if (!sesi) {
        return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }
    return NextResponse.json({ token }, {
        headers: { "Cache-Control": "no-store" },
    });
}
