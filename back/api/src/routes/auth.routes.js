const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const mail = require('../services/mail.service');
const { validate } = require('../middleware/validate');
const { authLimiter, formLimiter, requireAuth } = require('../middleware/security');
const { asyncHandler, HttpError } = require('../utils/http');
const { getLang } = require('../utils/i18n');

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
// Pre-computed hash so timing is similar when the user does not exist
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

/** POST /auth/login → { token, user, redirect } */
router.post(
  '/login',
  authLimiter,
  validate({ email: { type: 'email', required: true, max: 160 }, password: { type: 'string', required: true, max: 200 } }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await db.queryOne(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = ? AND status = 'active'",
      [email]
    );
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Invalid email or password.');

    await db.query('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
    const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirect: '/portal', // Cambiar cuando exista el portal de clientes
    });
  })
);

/** GET /auth/me — current user */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await db.queryOne('SELECT id, name, email, role, company FROM users WHERE id = ?', [req.user.sub]);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ data: user });
}));

/** POST /auth/forgot-password — always responds 200 (no user enumeration) */
router.post(
  '/forgot-password',
  formLimiter,
  validate({ email: { type: 'email', required: true, max: 160 } }),
  asyncHandler(async (req, res) => {
    const user = await db.queryOne("SELECT id, name, email FROM users WHERE email = ? AND status = 'active'", [req.body.email]);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))',
        [user.id, sha256(token)]
      );
      mail.sendPasswordReset({ ...user, lang: getLang(req) }, token);
    }
    res.json({ message: 'If the email exists, you will receive instructions shortly.' });
  })
);

/** POST /auth/reset-password { token, password } */
router.post(
  '/reset-password',
  authLimiter,
  validate({ token: { type: 'string', required: true, max: 128 }, password: { type: 'string', required: true, min: 8, max: 200 } }),
  asyncHandler(async (req, res) => {
    const reset = await db.queryOne(
      'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()',
      [sha256(req.body.token)]
    );
    if (!reset) throw new HttpError(400, 'This link is invalid or has expired.');
    const hash = await bcrypt.hash(req.body.password, 12);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, reset.user_id]);
    await db.query('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL', [reset.user_id]);
    res.json({ message: 'Your password has been updated. You can now sign in.' });
  })
);

module.exports = router;
