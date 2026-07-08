const test = require('node:test');
const assert = require('node:assert/strict');

const { sendVerificationEmail } = require('../utils/mailer');

test('sendVerificationEmail falls back to console simulation when SMTP config is missing', async () => {
  const originalUser = process.env.SMTP_USER;
  const originalPass = process.env.SMTP_PASS;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    await assert.doesNotReject(() =>
      sendVerificationEmail('user@example.com', 'https://example.com/verify')
    );
    assert.match(logs.join('\n'), /SIMULASI EMAIL/i);
  } finally {
    console.log = originalLog;
    if (originalUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = originalUser;

    if (originalPass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = originalPass;
  }
});

test('sendVerificationEmail uses Gmail SMTP with the standard port when SMTP config is present', async () => {
  const originalHost = process.env.SMTP_HOST;
  const originalPort = process.env.SMTP_PORT;
  const originalUser = process.env.SMTP_USER;
  const originalPass = process.env.SMTP_PASS;
  const originalFrom = process.env.SMTP_FROM;

  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '578';
  process.env.SMTP_USER = 'sender@example.com';
  process.env.SMTP_PASS = 'app-password';
  process.env.SMTP_FROM = 'sender@example.com';

  const nodemailer = require('nodemailer');
  const originalCreateTransport = nodemailer.createTransport;
  const sent = [];

  nodemailer.createTransport = (config) => {
    assert.equal(config.host, 'smtp.gmail.com');
    assert.equal(config.port, 587);
    assert.equal(config.secure, false);
    return {
      sendMail: async (mailOptions) => {
        sent.push(mailOptions);
        return { messageId: 'test-id' };
      },
    };
  };

  try {
    await sendVerificationEmail('user@example.com', 'https://example.com/verify');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'user@example.com');
    assert.equal(sent[0].from, 'sender@example.com');
  } finally {
    nodemailer.createTransport = originalCreateTransport;

    if (originalHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalHost;

    if (originalPort === undefined) delete process.env.SMTP_PORT;
    else process.env.SMTP_PORT = originalPort;

    if (originalUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = originalUser;

    if (originalPass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = originalPass;

    if (originalFrom === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = originalFrom;
  }
});
