# Nipah Lestari

Portal operasional sederhana untuk mencatat data lapangan nipah, batch nira atau BCN, dokumentasi, mitra program, dan bantuan AI.

Project ini berjalan sebagai static PWA di Vercel dengan beberapa serverless API di folder `api/`.

## Struktur aktif

```txt
app.html                  # shell aplikasi
main.css                  # gaya dasar layout lama yang masih dipakai
signature.css             # token tema dan gaya global Nipah
assets/nipah.css          # gaya utama aplikasi operasional
assets/operasi.js         # logic SPA aplikasi
api/ai.js                 # endpoint Gemini AI
api/auth.js               # endpoint login/register/logout
api/data.js               # endpoint penyimpanan data user
manifest.webmanifest      # metadata PWA
service-worker.js         # service worker ringan
vercel.json               # routing Vercel
```

## Environment Variables

Untuk fitur AI, set nama environment variable berikut di Vercel:

```txt
GEMINI_API_KEY
```

Opsional:

```txt
GEMINI_MODEL
```

Jika `GEMINI_MODEL` dikosongkan, aplikasi memakai `gemini-2.0-flash` lalu fallback ke `gemini-1.5-flash`.

## Cek AI setelah deploy

Buka endpoint berikut di domain production:

```txt
/api/ai
```

Hasil yang benar harus memuat `envReady: true` dan `envName: GEMINI_API_KEY`.

Untuk cek panggilan Gemini langsung:

```txt
/api/ai?test=1
```

Jika berhasil, response akan memuat `test.ok: true` dan jawaban pendek dari Gemini.

## Menjalankan lokal

```bash
npm run serve
```

Lalu buka `http://localhost:8080`.

## Validasi cepat

```bash
npm run check
```

Script ini mengecek syntax file JavaScript aktif: `assets/operasi.js` dan `api/ai.js`.

## Catatan penyimpanan

Sebelum login, data tersimpan di `localStorage`. Setelah login aktif dan `api/data.js` tersedia, progress pengguna dapat disinkronkan ke akun masing-masing.
