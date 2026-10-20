const env = require('../config/env');
const { transporter } = require('../config/mailer');
const db = require('../config/db');
const templates = require('../templates/emails');

/**
 * Send an email using a template and log the result in `email_log`.
 * Never throws: a failed notification must not break the user request.
 */
async function send(to, templateName, ...args) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
  if (!recipients.length) return false;

  const { subject, html, text, headers } = templates[templateName](...args);
  let status = 'sent';
  let error = null;
  let messageId = null;

  try {
    const info = await transporter.sendMail({ from: env.mail.from, to: recipients.join(', '), subject, html, text, headers });
    messageId = info.messageId || null;
    if (env.mail.dryRun) console.info(`[mail:dry-run] ${templateName} → ${recipients.join(', ')} | ${subject}`);
  } catch (err) {
    status = 'failed';
    error = err.message.slice(0, 500);
    console.error(`[mail] ${templateName} → ${recipients.join(', ')} failed:`, err.message);
  }

  try {
    await db.query(
      'INSERT INTO email_log (template, recipient, subject, status, message_id, error) VALUES (?, ?, ?, ?, ?, ?)',
      [templateName, recipients.join(', ').slice(0, 255), subject.slice(0, 255), status, messageId, error]
    );
  } catch (err) {
    console.error('[mail] could not write email_log:', err.message);
  }
  return status === 'sent';
}

module.exports = {
  send,
  /** Notifications grouped by business event */
  notifyNewContact: (contact) =>
    Promise.all([send(env.mail.notifyTo, 'contactAdmin', contact), send(contact.email, 'contactConfirmation', contact)]),
  notifyNewSubscriber: (sub) => send(sub.email, 'newsletterWelcome', sub),
  // contact.lang / sub.lang / user.lang pick the language of user-facing emails;
  // the internal notification (contactAdmin) is always in English.
  sendPasswordReset: (user, token) => send(user.email, 'passwordReset', user, token),
};
