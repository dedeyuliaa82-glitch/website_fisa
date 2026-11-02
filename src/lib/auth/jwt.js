/**
 * JWT HS256 sederhana memakai Web Crypto.
 * Dipakai di Route Handler (Node) dan middleware (Edge), jadi tidak
 * memakai modul `crypto` Node maupun library tambahan.
 */

const encoder = new TextEncoder();

function keB64url(bytes) {
    let biner = "";
    for (const b of bytes)
        biner += String.fromCharCode(b);
    return btoa(biner).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function dariB64url(teks) {
    const pad = teks.length % 4 ? "=".repeat(4 - (teks.length % 4)) : "";
    const biner = atob(teks.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const hasil = new Uint8Array(biner.length);
    for (let i = 0; i < biner.length; i++)
        hasil[i] = biner.charCodeAt(i);
    return hasil;
}

async function kunciHmac(secret) {
    return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Buat token JWT. `payload` minimal berisi sub, peran, nama. */
export async function tandaTanganJwt(payload, secret, umurDetik = 60 * 60 * 24 * 7) {
    const sekarang = Math.floor(Date.now() / 1000);
    const isi = Object.assign({ iat: sekarang, exp: sekarang + umurDetik }, payload);
    const header = keB64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const body = keB64url(encoder.encode(JSON.stringify(isi)));
    const data = `${header}.${body}`;
    const tanda = await crypto.subtle.sign("HMAC", await kunciHmac(secret), encoder.encode(data));
    return `${data}.${keB64url(new Uint8Array(tanda))}`;
}

/** Verifikasi token. Mengembalikan payload, atau null bila tidak sah/kedaluwarsa. */
export async function verifikasiJwt(token, secret) {
    if (!token || !secret)
        return null;
    const bagian = token.split(".");
    if (bagian.length !== 3)
        return null;
    try {
        const sah = await crypto.subtle.verify("HMAC", await kunciHmac(secret), dariB64url(bagian[2]), encoder.encode(`${bagian[0]}.${bagian[1]}`));
        if (!sah)
            return null;
        const payload = JSON.parse(new TextDecoder().decode(dariB64url(bagian[1])));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
