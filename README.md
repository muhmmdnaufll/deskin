# DeSkin Deploy-Ready Web App

Aplikasi ini adalah implementasi kode siap deploy dari rancangan UI/UX DeSkin. Fokusnya ringan, cepat, tanpa framework berat, dan dapat dipasang di domain sendiri sebagai static/PWA web app.

## Fitur yang sudah ada

- Onboarding, login demo, dan profil pengguna.
- Dashboard dengan ringkasan skin score, rutinitas, keranjang, dan rekomendasi.
- SKINDaily: checklist rutinitas, progress harian, catatan pemicu, reminder permission, dan grafik canvas.
- SKINMap: daftar klinik/apotek/booth/partner, pencarian, filter, geolocation API, dan peta demo ringan tanpa library.
- SKINMarket: katalog produk, filter tipe kulit/masalah kulit, scoring rekomendasi, keranjang, dan checkout demo.
- SKINEdu: modul edukasi, favorit/bookmark, status selesai, dan quiz singkat.
- SKINAnalyzer: akses kamera browser, capture foto, upload foto lokal, input sensor manual, dan penyimpanan hasil analisis.
- SKINAnalysis: skin score, metrik kulit, rekomendasi rutinitas, rekomendasi produk, riwayat analisis, simulasi hardware, dan hook Web Bluetooth.
- SKINTalk: daftar dokter/konsultan, booking konsultasi demo, chat demo, forum komunitas, dan jadwal konsultasi.
- Profil: edit preferensi, pilih plan Free/Premium, export JSON, reset data, logout.
- PWA: manifest, service worker, caching offline dasar, install prompt.
- File deploy: `netlify.toml`, `vercel.json`, `CNAME`, `robots.txt`, `sitemap.xml`, `.nojekyll`, dan `404.html`.

## Struktur file

```text
.
├── index.html
├── styles.css
├── app.js
├── service-worker.js
├── manifest.webmanifest
├── assets/
│   ├── icon.svg
│   └── og.svg
├── netlify.toml
├── vercel.json
├── CNAME
├── robots.txt
├── sitemap.xml
├── 404.html
├── .nojekyll
└── docs/
    ├── DEPLOYMENT.md
    ├── PRODUCTION_NOTES.md
    └── QA_CHECKLIST.md
```

## Menjalankan lokal

Tidak perlu install dependency.

```bash
cd deskin-deploy-ready
python3 -m http.server 8080
```

Buka:

```text
http://localhost:8080
```

Catatan: kamera, geolocation, dan Web Bluetooth lebih aman dites lewat `localhost` atau HTTPS.

## Deploy cepat

### Netlify

1. Drag-and-drop folder ini ke Netlify, atau push ke GitHub lalu import repo.
2. Build command: kosongkan.
3. Publish directory: `.`
4. Tambahkan custom domain di Netlify > Domain management.
5. Arahkan DNS domain Anda ke Netlify sesuai instruksi dashboard.

### Vercel

1. Push folder ini ke GitHub.
2. Import project di Vercel.
3. Framework preset: Other.
4. Build command: kosongkan.
5. Output directory: `.`
6. Tambahkan domain di Project Settings > Domains.

### GitHub Pages

1. Push ke repository GitHub.
2. Settings > Pages > Deploy from branch.
3. Pilih branch dan root folder.
4. Ubah isi `CNAME` ke domain Anda, misalnya `app.domainanda.com`.
5. Arahkan DNS CNAME ke `<username>.github.io`.

### cPanel / hosting biasa

Upload semua file di folder ini ke `public_html` atau subfolder domain. Pastikan `index.html`, `app.js`, dan `styles.css` berada di root yang sama.

## Mengganti domain

Ubah file berikut:

- `CNAME`: ganti `deskin.inc` dengan domain Anda.
- `robots.txt`: ganti URL sitemap.
- `sitemap.xml`: ganti `https://deskin.inc/` dengan URL domain Anda.
- Jika deploy di subfolder, sesuaikan path service worker dan manifest.

## Catatan produksi

Prototype ini sengaja dibuat ringan dan dapat deploy tanpa backend. Fitur yang membutuhkan integrasi nyata masih disediakan sebagai hook/demo:

- AI skin analysis produksi: sambungkan form `SKINAnalyzer` ke API model vision/dermatology.
- Hardware detector nyata: sesuaikan `HW_SERVICE_UUID` dan `HW_CHAR_UUID` di `app.js`.
- Pembayaran: sambungkan checkout ke payment gateway.
- Konsultasi dokter nyata: gunakan backend, autentikasi, jadwal, dan rekam medis sesuai regulasi.
- Data medis/biometrik: gunakan backend aman, enkripsi, consent eksplisit, audit log, dan kebijakan privasi.

## Kinerja

- Tanpa React/Vue/Angular.
- Tanpa CDN eksternal.
- Tanpa library chart besar; grafik memakai Canvas native.
- Penyimpanan demo memakai localStorage.
- Ikon memakai SVG ringan.

