import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { verifikasiJwt } from "@/lib/auth/jwt";
import { COOKIE_TOKEN, secretJwt } from "@/lib/auth/session";
import { klienAdmin } from "@/lib/supabase/admin";

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function pastikanAdmin() {
    const cookieStore = await cookies();
    const sesi = await verifikasiJwt(cookieStore.get(COOKIE_TOKEN)?.value, secretJwt());
    if (!sesi || sesi.peran !== "admin")
        return null;
    return sesi;
}

/**
 * POST /api/admin/akun
 * Body: { action: "simpan" | "hapus", id, email?, password? }
 * Akun wali memakai email sebagai username login.
 */
export async function POST(request) {
    const sesi = await pastikanAdmin();
    if (!sesi)
        return NextResponse.json({ error: "Hanya admin yang boleh mengatur akun." }, { status: 403 });

    try {
        const body = await request.json();
        const action = String(body.action ?? "");
        const id = String(body.id ?? "");
        if (!id)
            return NextResponse.json({ error: "Data wali tidak dikenali." }, { status: 400 });

        const admin = await klienAdmin();
        const { data: wali, error: errWali } = await admin
            .from("users")
            .select("id, peran, password_hash")
            .eq("id", id)
            .maybeSingle();
        if (errWali)
            throw errWali;
        if (!wali || wali.peran !== "orang_tua")
            return NextResponse.json({ error: "Data wali tidak ditemukan." }, { status: 404 });

        if (action === "hapus") {
            const { error } = await admin
                .from("users")
                .update({ username: null, password_hash: null, diperbarui_pada: new Date().toISOString() })
                .eq("id", id);
            if (error)
                throw error;
            return NextResponse.json({ ok: true });
        }

        if (action !== "simpan")
            return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });

        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        if (!POLA_EMAIL.test(email))
            return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
        if (password && password.length < 6)
            return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
        if (!password && !wali.password_hash)
            return NextResponse.json({ error: "Password wajib diisi untuk akun baru." }, { status: 400 });

        const [{ data: samaEmail }, { data: samaUsername }] = await Promise.all([
            admin.from("users").select("id").eq("email", email).neq("id", id).limit(1).maybeSingle(),
            admin.from("users").select("id").eq("username", email).neq("id", id).limit(1).maybeSingle(),
        ]);
        if (samaEmail || samaUsername)
            return NextResponse.json({ error: "Email tersebut sudah dipakai akun lain." }, { status: 409 });

        const isi = {
            username: email,
            email,
            diperbarui_pada: new Date().toISOString(),
        };
        if (password)
            isi.password_hash = await bcrypt.hash(password, 10);

        const { error } = await admin.from("users").update(isi).eq("id", id);
        if (error)
            throw error;
        return NextResponse.json({ ok: true });
    }
    catch (err) {
        console.error("Gagal mengatur akun:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mengatur akun." }, { status: 500 });
    }
}
