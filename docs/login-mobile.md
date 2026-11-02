# Login Mobile FISA — Tanpa Supabase Auth

Login wali memakai tabel `public.users` (username/email + password).
Token yang dikembalikan adalah JWT yang ditandatangani dengan **JWT Secret**
Supabase, jadi RLS (`auth.uid()`) tetap berjalan seperti biasa.

## 1. Endpoint login

`POST https://<domain-website-fisa>/api/auth/login`

```json
{ "username": "abdullah", "password": "rahasia123" }
```

Respons sukses:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-profil-wali",
    "username": "abdullah",
    "nama": "H. Abdullah",
    "peran": "orang_tua"
  }
}
```

Respons gagal: `401` dengan `{ "error": "Username/email atau password salah." }`.

> Akun dibuat admin di website: **Kelola Santri & Wali → tab Data Wali → tombol Akun**.

## 2. Contoh Flutter (login)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> loginWali(String username, String password) async {
  final res = await http.post(
    Uri.parse('https://<domain-website-fisa>/api/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'username': username, 'password': password}),
  );
  final data = jsonDecode(res.body) as Map<String, dynamic>;
  if (res.statusCode != 200) {
    throw Exception(data['error'] ?? 'Login gagal');
  }
  return data; // { token, user }
}
```

## 3. Mengambil data dengan token

### Opsi A — SupabaseClient dengan header Authorization

```dart
final data = await loginWali(username, password);
final token = data['token'] as String;

final client = SupabaseClient(
  'https://<project>.supabase.co',
  '<anon-key>',
  headers: {'Authorization': 'Bearer $token'},
);

final santri = await client
    .from('santri')
    .select()
    .eq('id_orang_tua', data['user']['id']);
```

### Opsi B — HTTP langsung ke PostgREST (paling pasti)

```dart
final res = await http.get(
  Uri.parse(
    'https://<project>.supabase.co/rest/v1/santri'
    '?select=*&id_orang_tua=eq.${data['user']['id']}',
  ),
  headers: {
    'apikey': '<anon-key>',
    'Authorization': 'Bearer $token',
  },
);
```

## 4. Yang harus dihapus dari aplikasi mobile

- `supabase.auth.signInWithPassword(...)`
- Pembacaan sesi GoTrue (`onAuthStateChange`, `currentSession`, dll.)

Ganti dengan menyimpan token hasil `/api/auth/login` (misalnya di
`SharedPreferences` / `flutter_secure_storage`), lalu pakai token itu untuk
setiap request data.

## 5. Rekening pesantren (tujuan transfer)

Wali hanya bisa **membaca** rekening yang aktif. Tambah/ubah/hapus dilakukan
admin di website (menu **Pengaturan Rekening**).

```dart
final rekening = await client
    .from('rekening_pesantren')
    .select('id, nama_bank, nomor_rekening, atas_nama')
    .eq('is_active', true)
    .order('created_at');
```

Atau lewat HTTP langsung:

```
GET https://<project>.supabase.co/rest/v1/rekening_pesantren
    ?select=id,nama_bank,nomor_rekening,atas_nama,is_active
    &is_active=eq.true
    &order=created_at.asc
```

Policy RLS memastikan wali **tidak bisa** menulis ke tabel ini, dan rekening
non-aktif (`is_active = false`) tidak ikut terkirim.

## 6. Catatan

- Token berlaku **7 hari**. Setelah kedaluwarsa, tampilkan halaman login lagi.
- Password di database disimpan sebagai hash bcrypt (`pgcrypto`), bukan teks biasa.
- Jangan menaruh `SUPABASE_JWT_SECRET` di aplikasi mobile. Secret hanya ada di
  server website (`.env.local`).
