# QA Checklist

## Smoke test

- [ ] Halaman welcome terbuka.
- [ ] Tombol Masuk demo cepat masuk ke Dashboard.
- [ ] Profil dapat diedit dan disimpan.
- [ ] Dashboard menampilkan skin score dan rekomendasi produk.
- [ ] SKINDaily checklist bisa dicentang.
- [ ] SKINDaily catatan harian bisa ditambahkan.
- [ ] SKINDaily progress chart muncul.
- [ ] SKINMap search dan filter berjalan.
- [ ] SKINMap tombol lokasi meminta permission.
- [ ] SKINMarket filter produk berjalan.
- [ ] Produk bisa masuk keranjang.
- [ ] Keranjang bisa checkout demo dan dikosongkan.
- [ ] SKINEdu artikel bisa dibuka.
- [ ] SKINEdu bookmark dan tanda selesai berjalan.
- [ ] SKINEdu quiz memberikan skor.
- [ ] SKINAnalyzer kamera bisa dibuka di HTTPS/localhost.
- [ ] Upload foto lokal menampilkan preview.
- [ ] Form analisis menyimpan hasil ke SKINAnalysis.
- [ ] SKINAnalysis menampilkan metrik, chart, dan riwayat.
- [ ] Simulasi hardware menambah analisis baru.
- [ ] SKINTalk booking dokter membuat jadwal.
- [ ] Chat demo membalas otomatis.
- [ ] Forum dapat membuat topik dan balasan.
- [ ] Export JSON profil menghasilkan file.
- [ ] Reset demo menghapus data.
- [ ] PWA install prompt muncul di browser yang mendukung.

## Browser target

- [ ] Chrome desktop.
- [ ] Edge desktop.
- [ ] Chrome Android.
- [ ] Safari iOS untuk fitur umum. Web Bluetooth tidak dijamin.

## Performance

- [ ] Lighthouse Performance > 90 untuk hosting statis.
- [ ] Tidak ada request CDN eksternal.
- [ ] Total JS/CSS masih ringan.
