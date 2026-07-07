# Secure Web App — Login, Registrasi, Verifikasi Email

Website sederhana dengan sistem autentikasi yang aman, dibangun dengan
Node.js + Express.

## Fitur Keamanan

- **Hash password** dengan bcrypt (12 salt rounds) — password asli tidak pernah disimpan
- **Validasi password**: minimal 8 karakter, 1 huruf kapital, 1 angka, 1 karakter spesial
- **Enkripsi email** dengan AES-256-GCM sebelum disimpan ke database (bukan plaintext)
- **Verifikasi email** via link unik yang dikirim setelah registrasi (token acak 32 byte, di-hash dengan SHA-256 sebelum disimpan, kedaluwarsa 1 jam)
- **Rate limiting** untuk mencegah brute force di endpoint login & registrasi
- **Account lockout**: akun terkunci 15 menit setelah 5 kali percobaan login gagal
- **Session aman**: cookie httpOnly, sameSite=lax, session di-regenerate saat login (mencegah session fixation)
- **Pesan error digeneralisasi** saat login gagal (tidak membocorkan apakah email terdaftar atau tidak)

## Cara Menjalankan

1. Install dependencies:
   ```
   npm install
   ```

2. Salin file environment:
   ```
   cp .env.example .env
   ```

3. Generate kunci enkripsi dan session secret, lalu isi ke `.env`:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Jalankan dua kali untuk mendapat dua nilai berbeda: satu untuk `ENCRYPTION_KEY`, satu untuk `SESSION_SECRET`.

4. Jalankan server:
   ```
   npm start
   ```

5. Buka `http://localhost:3000` di browser.

## Alur Verifikasi Email (Simulasi)

Karena belum ada konfigurasi SMTP, saat kamu registrasi, link verifikasi
**tidak benar-benar dikirim ke inbox** — link tersebut akan tampil di
**terminal/console** tempat server berjalan, contoh:

```
================ SIMULASI EMAIL ================
Kepada     : nama@email.com
Subjek     : Verifikasi Akun Kamu
Isi        :
  Klik link berikut untuk memverifikasi akunmu (berlaku 1 jam):
  http://localhost:3000/verify/a1b2c3...
==================================================
```

Salin link tersebut ke browser untuk memverifikasi akun.

### Mengaktifkan Pengiriman Email Sungguhan

Kalau nanti sudah punya SMTP (misalnya Gmail App Password):

1. Install nodemailer: `npm install nodemailer`
2. Isi bagian SMTP di file `.env`
3. Ganti isi `utils/mailer.js` sesuai contoh kode yang sudah dikomentari di bagian bawah file tersebut

## Struktur Project

```
secure-webapp/
├── server.js              # Entry point aplikasi
├── db.js                  # Penyimpanan data user (JSON file)
├── routes/
│   └── authRoutes.js      # Semua endpoint: register, login, verify, logout, dashboard
├── middleware/
│   └── auth.js            # Proteksi halaman yang butuh login
├── utils/
│   ├── crypto.js           # Enkripsi AES-256-GCM & hashing SHA-256
│   ├── validators.js       # Validasi password, email, username
│   └── mailer.js            # Simulasi pengiriman email
├── views/                  # Halaman EJS (register, login, dashboard, dll)
├── public/css/style.css    # Styling
└── data/users.json         # Database (dibuat otomatis saat pertama jalan)
```

## Kenapa Pakai JSON File, Bukan SQLite?

Awalnya project ini didesain pakai `better-sqlite3`, tapi package tersebut
butuh proses *native build* (compile C++) yang sering gagal di lingkungan
tanpa build tools lengkap (termasuk beberapa setup Windows). Supaya kamu
bisa langsung `npm install` dan jalan tanpa drama compile error, storage-nya
diganti ke JSON file murni JavaScript. Cocok untuk belajar dan demo; kalau
mau dipakai skala lebih besar nanti, tinggal ganti `db.js` ke database
sungguhan (PostgreSQL/MySQL/SQLite) tanpa mengubah routes-nya, karena semua
akses data sudah dibungkus lewat fungsi-fungsi di `db.js`.

## Catatan Keamanan Lanjutan (Kalau Mau Dikembangkan)

- Tambahkan CSRF token di setiap form (misalnya pakai `csurf` atau custom token)
- Pindahkan session store dari memory ke Redis kalau nanti multi-server
- Tambahkan HTTPS (via reverse proxy seperti nginx) sebelum deploy ke production
- Tambahkan fitur "resend verification email" untuk token yang sudah kedaluwarsa
- Tambahkan logging percobaan login gagal untuk audit trail
