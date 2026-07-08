const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const configuredPort = Number(process.env.SMTP_PORT || 587);
  const smtpPort = Number.isNaN(configuredPort)
    ? 587
    : configuredPort === 578 && smtpHost.toLowerCase().includes('gmail')
      ? 587
      : configuredPort;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    from: smtpFrom,
  };
}

function logVerificationEmail(toEmail, verificationLink) {
  console.log('\n================ SIMULASI EMAIL ================');
  console.log(`Kepada     : ${toEmail}`);
  console.log('Subjek     : Verifikasi Akun Kamu');
  console.log('Isi        :');
  console.log('  Klik link berikut untuk memverifikasi akunmu (berlaku 1 jam):');
  console.log(`  ${verificationLink}`);
  console.log('==================================================\n');
}

async function sendVerificationEmail(toEmail, verificationLink) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.warn('SMTP belum dikonfigurasi. Menggunakan simulasi email di console.');
    logVerificationEmail(toEmail, verificationLink);
    return;
  }

  const { host, port, secure, auth, from } = smtpConfig;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });

  try {
    const info = await transporter.sendMail({
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
    console.log(`Email verifikasi berhasil dikirim ke ${toEmail} (${info.messageId})`);
    return info;
  } catch (error) {
    console.error('Gagal mengirim email verifikasi via SMTP. Menggunakan simulasi email di console:', error.message);
    logVerificationEmail(toEmail, verificationLink);
    throw error;
  }
}

module.exports = { sendVerificationEmail };
