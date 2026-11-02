export const COOKIE_TOKEN = "fisa_token";
export const COOKIE_USER = "fisa_user";
export const UMUR_SESI = 60 * 60 * 24 * 7; // 7 hari

/** Secret JWT dari Supabase (Project Settings -> API -> JWT Settings). */
export function secretJwt() {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret || secret.startsWith("ISI_"))
        return null;
    return secret;
}
