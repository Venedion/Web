const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY tidak valid. Harus 64 karakter hex (32 byte). Lihat .env.example.'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

// Mengenkripsi teks (misalnya email) sehingga tidak tersimpan sebagai plaintext di database
function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (semua dalam hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Mendekripsi teks yang sebelumnya dienkripsi oleh fungsi encrypt()
function decrypt(payload) {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// Hash satu arah (bukan untuk password) dipakai untuk index pencarian email tanpa
// menyimpan email dalam bentuk plaintext, dan untuk menyimpan hash token verifikasi
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Membuat token verifikasi acak yang aman (dikirim ke user via email/link)
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { encrypt, decrypt, sha256, generateVerificationToken };
