# Deployment Guide

## Pilihan hosting yang paling mudah

### 1. Netlify
- Publish directory: `.`
- Build command: kosong
- Redirect SPA sudah diatur di `netlify.toml`

DNS umum:
- Apex/root domain: gunakan A record atau ALIAS/ANAME sesuai instruksi Netlify.
- Subdomain `www`: gunakan CNAME ke target Netlify.

### 2. Vercel
- Framework: Other
- Build command: kosong
- Output directory: `.`
- Rewrite SPA sudah diatur di `vercel.json`

DNS umum:
- Tambahkan domain di Vercel.
- Ikuti instruksi A/CNAME yang muncul di dashboard Vercel.

### 3. GitHub Pages
- Upload repository.
- Settings > Pages.
- Source: deploy from branch.
- Simpan domain di file `CNAME`.

DNS umum:
- `www`: CNAME ke `<username>.github.io`.
- Apex domain: ikuti IP GitHub Pages terbaru dari dokumentasi GitHub.

### 4. cPanel
- Zip seluruh isi folder.
- Upload ke `public_html`.
- Extract.
- Pastikan HTTPS aktif.

## Setelah deploy

1. Buka domain memakai HTTPS.
2. Cek PWA install prompt.
3. Cek kamera di SKINAnalyzer.
4. Cek localStorage dengan membuat profil dan menambah analisis.
5. Cek service worker di DevTools > Application > Service Workers.
6. Uji tampilan mobile.

## Environment / konfigurasi

Karena proyek ini statis, tidak memakai `.env`. Untuk produksi, buat endpoint backend dan ubah titik integrasi di `app.js`:

- `connectDevice()` untuk hardware BLE.
- Submit handler `#analysisForm` untuk AI analysis API.
- `showCart()` untuk payment gateway.
- `showBooking()` untuk appointment backend.
- Chat handler di `bindTalk()` untuk realtime chat.
