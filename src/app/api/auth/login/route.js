import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { tandaTanganJwt } from "@/lib/auth/jwt";
import { COOKIE_TOKEN, COOKIE_USER, UMUR_SESI, secretJwt } from "@/lib/auth/session";
import { klienAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/auth/login
 * Body: { username, password }
 * `username` boleh berisi username admin atau email (wali & admin).
 * Dipakai website (cookie) dan mobile (token di response JSON).
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const kunci = String(body.username ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        if (!kunci || !password) {
            return NextResponse.json({ error: "Email/username dan password wajib diisi." }, { status: 400 });
        }

        const secret = secretJwt();
        if (!secret) {
            return NextResponse.json({
                error: "SUPABASE_JWT_SECRET belum diisi di .env.local. Ambil dari Supabase → Project Settings → API → JWT Settings.",
            }, { status: 500 });
        }

        const admin = await klienAdmin();
        const kolom = "id, username, email, password_hash, nama_lengkap, peran, aktif";

        // Cari berdasarkan email dulu (akun wali memakai email), lalu username.
        const [{ data: lewatEmail }, { data: lewatUsername }] = await Promise.all([
            admin.from("users").select(kolom).eq("email", kunci).eq("aktif", true).limit(1).maybeSingle(),
            admin.from("users").select(kolom).eq("username", kunci).eq("aktif", true).limit(1).maybeSingle(),
        ]);
        const user = lewatEmail ?? lewatUsername;

        if (!user) {
            return NextResponse.json({ error: "Email/username atau password salah." }, { status: 401 });
        }

        const hash = String(user.password_hash ?? "");
        let cocok = false;
        if (hash.startsWith("$2")) {
            cocok = await bcrypt.compare(password, hash);
        }
        else {
            // Hash lama yang masih plaintext: cocokkan lalu perbarui ke bcrypt.
            cocok = hash !== "" && hash === password;
            if (cocok) {
                const baru = await bcrypt.hash(password, 10);
                await admin.from("users").update({ password_hash: baru }).eq("id", user.id);
            }
        }

        if (!cocok) {
            return NextResponse.json({ error: "Email/username atau password salah." }, { status: 401 });
        }

        const token = await tandaTanganJwt({
            sub: user.id,
            aud: "authenticated",
            role: "authenticated",
            peran: user.peran,
            nama: user.nama_lengkap ?? user.username ?? user.email,
            username: user.username ?? user.email,
        }, secret, UMUR_SESI);

        const ringkas = {
            id: user.id,
            id_user: user.id,
            username: user.username,
            email: user.email,
            nama: user.nama_lengkap ?? user.username ?? user.email,
            peran: user.peran,
        };

        const response = NextResponse.json({ token, user: ringkas });
        const opsi = {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: UMUR_SESI,
        };
        response.cookies.set(COOKIE_TOKEN, token, Object.assign({}, opsi, { httpOnly: true }));
        response.cookies.set(COOKIE_USER, encodeURIComponent(JSON.stringify(ringkas)), Object.assign({}, opsi, { httpOnly: false }));
        return response;
    }
    catch (err) {
        console.error("Login gagal:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Login gagal." }, { status: 500 });
    }
}
