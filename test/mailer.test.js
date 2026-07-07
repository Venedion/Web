const test = require('node:test');
const assert = require('node:assert/strict');

const { sendVerificationEmail } = require('../utils/mailer');

test('sendVerificationEmail throws a clear error when SMTP config is missing', async () => {
  await assert.rejects(
    () => sendVerificationEmail('user@example.com', 'https://example.com/verify'),
    /SMTP/i
  );
});
