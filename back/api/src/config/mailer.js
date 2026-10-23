const nodemailer = require('nodemailer');
const env = require('./env');

/**
 * Nodemailer transporter (SMTP). Pooled so notifications reuse connections.
 * In dry-run mode emails are serialized as JSON and logged instead of sent.
 */
const transporter = env.mail.dryRun
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      // Port 587 (secure=false) must upgrade with STARTTLS; never send in plain text
      requireTLS: !env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.password } : undefined,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      tls: { minVersion: 'TLSv1.2' },
    });

async function verifyTransporter() {
  if (env.mail.dryRun) return true;
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    console.warn('[mailer] SMTP verification failed:', err.message);
    return false;
  }
}

module.exports = { transporter, verifyTransporter };
