import { createClient } from "@supabase/supabase-js";
import { tandaTanganJwt } from "@/lib/auth/jwt";
import { secretJwt } from "@/lib/auth/session";

/**
 * Klien Supabase khusus server (service_role). Dipakai route handler untuk
 * membaca/menulis tabel users tanpa RLS. Jangan pernah diimpor dari komponen
 * browser.
 */
let klien = null;
let kedaluwarsa = 0;

export async function klienAdmin() {
    if (klien && Date.now() < kedaluwarsa)
        return klien;
    const secret = secretJwt();
    if (!secret)
        throw new Error("SUPABASE_JWT_SECRET belum diisi di .env.local.");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const ref = new URL(url).hostname.split(".")[0];
    const token = await tandaTanganJwt({ role: "service_role", iss: "supabase", ref }, secret, 300);
    klien = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });
    kedaluwarsa = Date.now() + 240_000;
    return klien;
}
