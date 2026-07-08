const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// Pastikan folder dan file data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ nextId: 1, users: [] }, null, 2));
}

function readData() {
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  // Tulis ke file sementara dulu lalu rename, supaya lebih aman dari korupsi data
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function findByUsername(username) {
  const data = readData();
  return data.users.find((u) => u.username === username) || null;
}

function findByEmailHash(emailHash) {
  const data = readData();
  return data.users.find((u) => u.email_hash === emailHash) || null;
}

function findById(id) {
  const data = readData();
  return data.users.find((u) => u.id === id) || null;
}

function findByVerificationTokenHash(tokenHash) {
  const data = readData();
  return data.users.find((u) => u.verification_token_hash === tokenHash) || null;
}

function createUser({ username, emailEncrypted, emailHash, passwordHash, verificationTokenHash, verificationExpiresAt }) {
  const data = readData();

  const newUser = {
    id: data.nextId,
    username,
    email_encrypted: emailEncrypted,
    email_hash: emailHash,
    password_hash: passwordHash,
    is_verified: false,
    verification_token_hash: verificationTokenHash,
    verification_expires_at: verificationExpiresAt,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: Date.now(),
  };

  data.users.push(newUser);
  data.nextId += 1;
  writeData(data);

  return newUser;
}

function markVerified(userId) {
  const data = readData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return;
  user.is_verified = true;
  user.verification_token_hash = null;
  user.verification_expires_at = null;
  writeData(data);
}

function refreshVerificationToken(userId, verificationTokenHash, verificationExpiresAt) {
  const data = readData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return null;

  user.verification_token_hash = verificationTokenHash;
  user.verification_expires_at = verificationExpiresAt;
  user.is_verified = false;
  writeData(data);

  return user;
}

function updateLoginFailure(userId, failedAttempts, lockedUntil) {
  const data = readData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return;
  user.failed_login_attempts = failedAttempts;
  user.locked_until = lockedUntil;
  writeData(data);
}

function resetLoginFailure(userId) {
  updateLoginFailure(userId, 0, null);
}

module.exports = {
  findByUsername,
  findByEmailHash,
  findById,
  findByVerificationTokenHash,
  createUser,
  markVerified,
  refreshVerificationToken,
  updateLoginFailure,
  resetLoginFailure,
};
