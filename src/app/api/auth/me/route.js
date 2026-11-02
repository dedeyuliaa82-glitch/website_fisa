import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifikasiJwt } from "@/lib/auth/jwt";
import { COOKIE_TOKEN, secretJwt } from "@/lib/auth/session";

/** GET /api/auth/me -> data pengguna yang sedang login. */
export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_TOKEN)?.value;
    const sesi = await verifikasiJwt(token, secretJwt());
    if (!sesi) {
        return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }
    return NextResponse.json({
        user: {
            id: sesi.sub,
            username: sesi.username,
            nama: sesi.nama,
            peran: sesi.peran,
        },
    }, { headers: { "Cache-Control": "no-store" } });
}
