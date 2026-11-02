import { createBrowserClient } from "@supabase/ssr";

/**
 * Token JWT disimpan di cookie HttpOnly dan diambil lewat /api/auth/token.
 * Hasilnya di-cache sebentar agar tidak fetch di setiap query.
 */
let cache = { token: null, sampai: 0 };
let sedangAmbil = null;

async function ambilToken() {
    if (typeof window === "undefined")
        return null;
    if (Date.now() < cache.sampai)
        return cache.token;
    if (sedangAmbil)
        return sedangAmbil;
    const permintaan = fetch("/api/auth/token", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
            const token = (json === null || json === void 0 ? void 0 : json.token) ?? null;
            cache = { token, sampai: Date.now() + 60_000 };
            return token;
        })
        .catch(() => {
            cache = { token: null, sampai: Date.now() + 10_000 };
            return null;
        })
        .finally(() => {
            sedangAmbil = null;
        });
    sedangAmbil = permintaan;
    return permintaan;
}

export function createClient() {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        accessToken: async () => await ambilToken(),
    });
}
