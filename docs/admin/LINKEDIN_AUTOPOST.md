# Posting LinkedIn otomatis — axto.io dan xaa.es (`/admin/linkedin`)

Permintaan pemilik, 28 Okt 2026 (REQUESTS 123, rancangan di `docs/BLUEPRINT-V4.md` §35): dua posting setiap hari, satu
untuk axto.io dan satu untuk xaa.es, berupa promosi bergambar dengan hashtag.

## Cara kerjanya
- **Pustaka promosi**: 28 posting per merek (`dashboard/lib/linkedin/library.ts`), cukup empat minggu tanpa pengulangan,
  lalu berputar lagi. Setiap posting punya:
  - gambar 1200×627 (`dashboard/public/social/linkedin/<merek>/<id>.jpg`);
  - teks bahasa Inggris;
  - tautan ke halaman yang dibahas;
  - 3–5 hashtag.
  Isinya diambil dari katalog dan kode. Harga ditulis sebagai harga "mulai dari", dan tidak ada angka pendapatan atau pengguna.
- **Jadwal**: axto.io pukul 09:00 WIB, xaa.es pukul 13:00 WIB. Keduanya bisa diubah per merek.
  - Detak cron setiap menit memposting sekali per merek per hari.
  - Bila LinkedIn menolak, posting dicoba lagi paling banyak 3 kali dengan jeda 15 menit.
  - Bila LinkedIn tidak menjawab, posting **tidak** dicoba lagi otomatis, karena mungkin sudah tayang. Admin menerima e-mail
    untuk mengecek halaman.
- **Keamanan**: Client ID, Client Secret dan token disimpan terenkripsi di R2 (`secure/linkedin.json.enc`). Halaman admin
  hanya menampilkan secret yang bertopeng. Setiap simpan, hubungkan, putuskan dan "Post now" tercatat di Audit log.
- **Token**: berlaku sekitar 60 hari.
  - Bila LinkedIn memberi refresh token, token diperbarui otomatis 7 hari sebelum habis.
  - Bila tidak, admin mendapat e-mail sekali sehari untuk menekan **Reconnect**.

## Menyiapkan (sekali)
1. **LinkedIn Developer Portal** → *My apps* → aplikasi Anda (Client ID-nya diisi di Admin).
2. *Products* → minta **Community Management API**.
   - Memposting atas nama halaman perusahaan butuh izin `w_organization_social` dari produk ini, dan LinkedIn meninjau
     permintaannya.
   - Sebelum disetujui, Connect berakhir dengan pesan `unauthorized_scope_error`, yang ditampilkan apa adanya di Admin.
3. *Auth* → *Authorized redirect URLs for your app* → tambahkan:
   `https://axto.io/api/admin/linkedin/callback`
4. *Auth* → *Client credentials* → **buat Client Secret baru**. Secret yang pernah ditulis di chat atau e-mail harus
   diganti.
5. **Admin → LinkedIn auto-post**:
   1. Isi Client ID dan Client Secret yang baru, lalu tekan **Save app details**.
   2. Tekan **Connect LinkedIn** dan masuk sebagai admin halaman.
6. Tekan **Find my pages** lalu pilih halaman untuk axto.io dan untuk xaa.es. Selama halaman axto.io dan xaa.es belum dibuat,
   keduanya boleh memakai AXTO Digital Global. Nomor halaman juga bisa diketik langsung (`linkedin.com/company/<nomor>/admin`).
7. Centang **Post automatically every day**, lalu tekan **Save**.

## Sehari-hari
- **Daily posting** menampilkan posting hari ini dan besok untuk setiap merek, beserta statusnya.
- **Promotion library** menampilkan pratinjau setiap posting persis seperti yang akan dibaca orang. Di sana Anda bisa:
  - mengeluarkan posting dari rotasi dengan *in rotation*, lalu menekan Save;
  - memposting satu posting sekarang dengan **Post now**;
  - menyalin teksnya dengan **Copy text**.
- **Log** mencatat setiap posting dengan tautannya di LinkedIn, atau galatnya.

## Mengubah atau menambah posting
Ubah `dashboard/lib/linkedin/library.ts`, lalu buat ulang gambarnya:

```
cd dashboard && npx tsx ../docs/linkedin/build-library.mts
```

`npm test` (`tests/linkedin.test.ts`) memeriksa beberapa hal: 28 posting per merek, gambar setiap posting, hashtag, panjang
teks, dan alur posting penuh terhadap LinkedIn tiruan.
