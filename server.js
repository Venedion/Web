require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
  console.warn(
    '[PERINGATAN] SESSION_SECRET tidak diset di .env. Gunakan nilai acak yang panjang untuk produksi.'
  );
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_ganti_ini',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,        // cookie tidak bisa diakses lewat JavaScript (mencegah XSS mencuri session)
      sameSite: 'lax',       // mencegah sebagian serangan CSRF
      secure: process.env.NODE_ENV === 'production', // hanya lewat HTTPS saat production
      maxAge: 1000 * 60 * 60 * 2, // 2 jam
    },
  })
);

app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.use('/', authRoutes);

// Handler 404
app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan');
});

// Handler error umum
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Terjadi kesalahan pada server');
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
