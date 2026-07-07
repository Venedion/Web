const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    throw new Error(
      'Konfigurasi SMTP Gmail belum lengkap. Isi SMTP_USER dan SMTP_PASS di file .env (gunakan App Password Gmail).'
    );
  }

  return {
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    from: smtpFrom,
  };
}

async function sendVerificationEmail(toEmail, verificationLink) {
  const { host, port, secure, auth, from } = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });

  try {
    await transporter.sendMail({
      from: from || auth.user,
      to: toEmail,
      subject: 'Verifikasi Akun Kamu',
      html: `
        <p>Halo,</p>
        <p>Klik link berikut untuk memverifikasi akunmu (berlaku 1 jam):</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>Jika Anda tidak mendaftar, abaikan email ini.</p>
      `,
    });
  } catch (error) {
    console.error('Gagal mengirim email verifikasi:', error);
    throw new Error(`Gagal mengirim email verifikasi ke ${toEmail}: ${error.message}`);
  }
}

module.exports = { sendVerificationEmail };
