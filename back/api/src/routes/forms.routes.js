const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/db');
const mail = require('../services/mail.service');
const { validate } = require('../middleware/validate');
const { formLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/http');
const { SUPPORTED } = require('../utils/i18n');

const SERVICES = ['pricing', 'reserving', 'captive', 'mergers', 'other'];

/** POST /contact — "Schedule a consultation" form */
router.post(
  '/contact',
  formLimiter,
  validate({
    name: { type: 'string', required: true, max: 120 },
    company: { type: 'string', required: true, max: 160 },
    email: { type: 'email', required: true, max: 160 },
    phone: { type: 'phone', max: 20 },
    service: { type: 'enum', values: SERVICES },
    preferred_date: { type: 'date' },
    subject: { type: 'string', max: 160 },
    message: { type: 'string', required: true, max: 3000 },
    consent: { type: 'boolean', required: true },
    source: { type: 'string', max: 255 },
    lang: { type: 'enum', values: SUPPORTED },
  }),
  asyncHandler(async (req, res) => {
    const c = req.body;
    const result = await db.query(
      `INSERT INTO contact_requests
        (name, company, email, phone, service, preferred_date, subject, message, consent, source, lang, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.name, c.company, c.email, c.phone, c.service, c.preferred_date, c.subject, c.message, c.consent ? 1 : 0,
        c.source, c.lang || 'en', req.ip, (req.get('user-agent') || '').slice(0, 255)]
    );
    // Fire-and-forget: respond fast, emails are logged in email_log
    mail.notifyNewContact(c);
    res.status(201).json({ id: result.insertId, message: c.lang === 'es' ? '¡Gracias! Recibimos su solicitud y le contactaremos a la brevedad.' : 'Thank you! We received your request and will contact you shortly.' });
  })
);

/** POST /newsletter/subscribe */
router.post(
  '/newsletter/subscribe',
  formLimiter,
  validate({ email: { type: 'email', required: true, max: 160 }, source: { type: 'string', max: 255 }, lang: { type: 'enum', values: SUPPORTED } }),
  asyncHandler(async (req, res) => {
    const { email, source } = req.body;
    const lang = req.body.lang || 'en';
    const existing = await db.queryOne('SELECT id, status, unsubscribe_token FROM newsletter_subscribers WHERE email = ?', [email]);

    if (existing && existing.status === 'subscribed') {
      return res.json({ message: 'You are already subscribed. Thank you!' });
    }
    const token = existing ? existing.unsubscribe_token : crypto.randomBytes(24).toString('hex');
    if (existing) {
      await db.query("UPDATE newsletter_subscribers SET status = 'subscribed', unsubscribed_at = NULL, lang = ? WHERE id = ?", [lang, existing.id]);
    } else {
      await db.query(
        'INSERT INTO newsletter_subscribers (email, source, lang, unsubscribe_token, ip_address) VALUES (?, ?, ?, ?, ?)',
        [email, source, lang, token, req.ip]
      );
    }
    mail.notifyNewSubscriber({ email, token, lang });
    res.status(201).json({ message: 'You are now subscribed. Thank you!' });
  })
);

/** GET /newsletter/unsubscribe?token=... (link inside emails) */
router.get('/newsletter/unsubscribe', asyncHandler(async (req, res) => {
  const token = String(req.query.token || '').slice(0, 64);
  if (token) {
    await db.query(
      "UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = UTC_TIMESTAMP() WHERE unsubscribe_token = ?",
      [token]
    );
  }
  res.type('html').send('<p style="font-family:sans-serif">You have been unsubscribed. <a href="/">Back to Actuarial Factor</a></p>');
}));

module.exports = router;
