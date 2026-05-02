# Production Notes

## Batasan versi statis

Aplikasi ini bersifat demo karena belum ada backend dan belum ada perangkat hardware nyata yang disediakan.

Yang sudah berjalan secara nyata di browser:
- Routing SPA.
- Penyimpanan data dengan localStorage.
- Kamera browser dan upload foto lokal.
- Geolocation permission.
- Web Bluetooth request flow jika browser mendukung.
- PWA install dan offline cache dasar.
- Grafik Canvas.
- Rekomendasi produk berbasis rule.
- Forum, chat, booking, cart, dan profil demo.

Yang perlu backend/API untuk produksi:
- AI analysis berbasis foto.
- Akun multi-device dan login aman.
- Konsultasi dokter sungguhan.
- Pembayaran.
- Inventory produk.
- Moderasi forum.
- Data biometric/health compliance.

## Rekomendasi stack backend ringan

- API: Node.js Fastify atau Python FastAPI.
- Database: PostgreSQL atau Supabase.
- Storage foto: S3-compatible object storage.
- Auth: Supabase Auth, Firebase Auth, Auth0, atau custom JWT.
- Payment Indonesia: Midtrans, Xendit, Doku, atau Stripe bila target global.
- Realtime chat: Supabase Realtime, Firebase, Pusher, atau WebSocket.
- AI: endpoint model vision internal atau provider yang memenuhi consent dan privacy.

## Privacy dan keamanan

- Minta consent eksplisit sebelum analisis wajah.
- Jelaskan apakah foto disimpan, berapa lama, dan untuk tujuan apa.
- Encrypt data sensitif at rest dan in transit.
- Pisahkan data medis dari data marketing.
- Buat fitur hapus akun dan hapus data.
- Audit akses data konsultasi.
- Tambahkan halaman Privacy Policy dan Terms of Service sebelum publik.

## Hardware BLE

Ganti UUID demo di `app.js`:

```js
const HW_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const HW_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
```

Lalu ubah parser data sensor di `connectDevice()` sesuai payload alat:

```text
moisture,sebum,texture,acne,sensitivity
```

Untuk iOS, Web Bluetooth tidak konsisten di Safari. Pertimbangkan native app atau BLE gateway.
