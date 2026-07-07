// Validasi password: minimal 8 karakter, minimal 1 huruf kapital,
// minimal 1 angka, dan minimal 1 karakter spesial
function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password minimal 8 karakter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 huruf kapital');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 angka');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 karakter spesial');
  }

  return { valid: errors.length === 0, errors };
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validateUsername(username) {
  // 3-20 karakter, huruf/angka/underscore saja
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
}

module.exports = { validatePassword, validateEmail, validateUsername };
