import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { tandaTanganJwt } from "@/lib/auth/jwt";
import { COOKIE_TOKEN, COOKIE_USER, UMUR_SESI, secretJwt } from "@/lib/auth/session";

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Dipakai website (cookie) dan mobile (token di response JSON).
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        if (!username || !password) {
            return NextResponse.json({ error: "Username/email dan password wajib diisi." }, { status: 400 });
        }

        const secret = secretJwt();
        if (!secret) {
            return NextResponse.json({
                error: "SUPABASE_JWT_SECRET belum diisi di .env.local. Ambil dari Supabase → Project Settings → API → JWT Settings.",
            }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await supabase.rpc("login_user", {
            p_username: username,
            p_password: password,
        });

        if (error) {
            const pesan = String(error.message ?? "");
            if (/could not find the function|PGRST202|login_user/i.test(pesan)) {
                throw new Error("Tabel users belum siap. Jalankan supabase/migrasi_users.sql di SQL Editor Supabase.");
            }
            throw error;
        }

        const user = Array.isArray(data) ? data[0] : data;
        if (!user) {
            return NextResponse.json({ error: "Username/email atau password salah." }, { status: 401 });
        }

        const token = await tandaTanganJwt({
            sub: user.id_profil,
            aud: "authenticated",
            role: "authenticated",
            peran: user.peran,
            nama: user.nama_lengkap ?? user.username,
            username: user.username,
        }, secret, UMUR_SESI);

        const ringkas = {
            id: user.id_profil,
            username: user.username,
            nama: user.nama_lengkap ?? user.username,
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
        return NextResponse.json({ error: err instanceof Error ? err.message : "Login gagal." }, { status: 500 });
    }
}
