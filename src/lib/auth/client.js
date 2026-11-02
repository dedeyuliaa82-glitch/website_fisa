/** Helper sisi browser: baca data pengguna dari cookie (bukan token). */

export function bacaCookie(nama) {
    if (typeof document === "undefined")
        return null;
    const cocok = document.cookie.match(new RegExp(`(?:^|;\\s*)${nama}=([^;]*)`));
    return cocok ? cocok[1] : null;
}

/** { id, nama, peran } atau null. */
export function penggunaSaatIni() {
    const mentah = bacaCookie("fisa_user");
    if (!mentah)
        return null;
    try {
        return JSON.parse(decodeURIComponent(mentah));
    }
    catch (_a) {
        return null;
    }
}

/** Id profil pengguna yang sedang login (untuk kolom audit). */
export function idPengguna() {
    const user = penggunaSaatIni();
    return user ? user.id : null;
}
