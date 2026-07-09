const express = require('express');
const bcrypt = require('bcryptjs');
const os = require('os');
const rateLimit = require('express-rate-limit');

const db = require('../db');
const { encrypt, decrypt, sha256, generateVerificationToken } = require('../utils/crypto');
const { validatePassword, validateEmail, validateUsername } = require('../utils/validators');
const { sendVerificationEmail } = require('../utils/mailer');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit
const VERIFICATION_EXPIRY_MS = 60 * 60 * 1000; // 1 jam

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Terlalu banyak percobaan login. Coba lagi nanti.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Terlalu banyak percobaan registrasi. Coba lagi nanti.',
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// ---------- REGISTRASI ----------

router.get('/register', (req, res) => {
  res.render('register', { errors: [], old: {} });
});

router.post('/register', registerLimiter, async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const errors = [];

  if (!validateUsername(username)) {
    errors.push('Username harus 3-20 karakter, hanya huruf/angka/underscore');
  }
  if (!validateEmail(email)) {
    errors.push('Format email tidak valid');
  }
  const passCheck = validatePassword(password);
  if (!passCheck.valid) {
    errors.push(...passCheck.errors);
  }
  if (password !== confirmPassword) {
    errors.push('Konfirmasi password tidak cocok');
  }

  if (errors.length > 0) {
    return res.render('register', { errors, old: { username, email } });
  }

  const emailLower = email.trim().toLowerCase();
  const emailHash = sha256(emailLower);
  const existingUserByEmail = db.findByEmailHash(emailHash);
  const existingUserByUsername = db.findByUsername(username);

  if (existingUserByUsername && (!existingUserByEmail || existingUserByUsername.id !== existingUserByEmail.id)) {
    errors.push('Username sudah digunakan');
  }

  if (existingUserByEmail && existingUserByEmail.is_verified) {
    errors.push('Email sudah terdaftar');
  }

  if (errors.length > 0) {
    return res.render('register', { errors, old: { username, email } });
  }

  try {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationToken = generateVerificationToken();
    const verificationTokenHash = sha256(verificationToken);
    const verificationExpiresAt = Date.now() + VERIFICATION_EXPIRY_MS;

    if (existingUserByEmail && !existingUserByEmail.is_verified) {
      db.refreshVerificationToken(existingUserByEmail.id, verificationTokenHash, verificationExpiresAt);
    } else {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const emailEncrypted = encrypt(emailLower);

      db.createUser({
        username,
        emailEncrypted,
        emailHash,
        passwordHash,
        verificationTokenHash,
        verificationExpiresAt,
      });
    }

    const verificationLink = `${baseUrl}/verify/${verificationToken}`;
    const localIp = getLocalIpAddress();
    const localLink = localIp ? `http://${localIp}:${process.env.PORT || 3000}/verify/${verificationToken}` : null;
    const emailLink = localLink || verificationLink;

    try {
      await sendVerificationEmail(emailLower, emailLink);
    } catch (emailErr) {
      console.error('Gagal mengirim email verifikasi:', emailErr);
      req.session.pendingVerificationEmail = emailLower;
      req.session.pendingVerificationLink = emailLink;
    }

    const verificationContext = {
      email: emailLower,
      verificationLink: req.session.pendingVerificationLink || emailLink,
      primaryLink: verificationLink,
      localLink,
    };

    res.render('check-email', verificationContext);
  } catch (err) {
    console.error('Registrasi gagal:', err);
    res.render('register', {
      errors: [
        err.message || 'Terjadi kesalahan pada server. Coba lagi.',
      ],
      old: { username, email },
    });
  }
});

// ---------- VERIFIKASI EMAIL ----------

router.get('/verify/:token', (req, res) => {
  const { token } = req.params;
  const tokenHash = sha256(token);

  const user = db.findByVerificationTokenHash(tokenHash);

  if (!user) {
    return res.render('verify-result', {
      success: false,
      message: 'Link verifikasi tidak valid.',
    });
  }

  if (user.is_verified) {
    return res.render('verify-result', {
      success: true,
      message: 'Akun ini sudah terverifikasi sebelumnya. Silakan login.',
    });
  }

  if (Date.now() > user.verification_expires_at) {
    return res.render('verify-result', {
      success: false,
      message: 'Link verifikasi sudah kedaluwarsa. Silakan daftar ulang atau minta link baru.',
    });
  }

  db.markVerified(user.id);

  res.render('verify-result', {
    success: true,
    message: 'Akun berhasil diverifikasi! Silakan login.',
  });
});

// ---------- LOGIN ----------

router.get('/login', (req, res) => {
  if (req.query.guest === '1') {
    return req.session.regenerate((err) => {
      if (err) {
        console.error('Guest login gagal:', err);
        return res.render('login', { error: 'Tidak dapat masuk sebagai guest saat ini.' });
      }
      req.session.guest = true;
      req.session.username = 'Guest';
      return res.redirect('/dashboard');
    });
  }

  res.render('login', { error: null });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { error: 'Email dan password wajib diisi' });
  }

  const emailHash = sha256(email.trim().toLowerCase());
  const user = db.findByEmailHash(emailHash);

  const genericError = 'Email atau password salah';

  if (!user) {
    return res.render('login', { error: genericError });
  }

  if (user.locked_until && Date.now() < user.locked_until) {
    const minutesLeft = Math.ceil((user.locked_until - Date.now()) / 60000);
    return res.render('login', {
      error: `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutesLeft} menit.`,
    });
  }

  if (!user.is_verified) {
    return res.render('login', {
      error: 'Akun belum diverifikasi. Silakan cek email untuk link verifikasi.',
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    const newAttempts = user.failed_login_attempts + 1;
    let lockedUntil = null;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = Date.now() + LOCK_DURATION_MS;
    }

    db.updateLoginFailure(user.id, newAttempts, lockedUntil);

    return res.render('login', { error: genericError });
  }

  db.resetLoginFailure(user.id);

  req.session.regenerate((err) => {
    if (err) {
      console.error(err);
      return res.render('login', { error: 'Terjadi kesalahan pada server' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/dashboard');
  });
});

// ---------- LOGOUT ----------

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ---------- DASHBOARD (contoh halaman terproteksi) ----------

router.get('/dashboard', requireLogin, (req, res) => {
  if (req.session.guest) {
    return res.render('dashboard', {
      username: req.session.username || 'Guest',
      email: 'guest@arogya.local',
      createdAt: 'Guest Access',
    });
  }

  const user = db.findById(req.session.userId);

  if (!user) {
    return req.session.destroy(() => res.redirect('/login'));
  }

  const email = decrypt(user.email_encrypted);

  res.render('dashboard', {
    username: user.username,
    email,
    createdAt: new Date(user.created_at).toLocaleString('id-ID'),
  });
});

module.exports = router;
