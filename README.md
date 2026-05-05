# Nipah Lestari

Prototype website edukasi, dokumentasi, dan kolaborasi untuk aksi lingkungan berbasis potensi nipah Aceh Singkil.

Project ini mengubah fondasi DeSkin menjadi **Nipah Lestari**, sebuah PWA statis sederhana untuk mendukung narasi karya tulis Sobat Bumi: dari observasi kawasan nipah pesisir menuju gerakan digital yang bisa dilihat, dibuka, dan dikembangkan.

## Fokus utama

- Edukasi potensi nipah dan fungsi pesisir.
- Dokumentasi aksi lapangan melalui catatan dan foto.
- Penjelasan gagasan Biostimulan Cair Nipah.
- Dashboard dampak sosial, ekonomi, lingkungan, dan edukasi.
- Form kolaborasi untuk calon pendukung atau mitra.

## Struktur singkat

```txt
app.html              # shell utama aplikasi
nipah.js              # logic SPA Nipah Lestari
nipah.css             # gaya hijau-pesisir khusus Nipah
api/ai.js             # endpoint AI untuk ringkasan/ide konten
manifest.webmanifest  # metadata PWA
service-worker.js     # service worker ringan
```

## Menjalankan lokal

```bash
npm run serve
```

Lalu buka `http://localhost:8080`.

## Catatan

Data catatan lapangan, foto, dan dukungan disimpan di `localStorage` karena prototype ini dibuat untuk demo kecil/menengah, bukan sistem produksi penuh.
