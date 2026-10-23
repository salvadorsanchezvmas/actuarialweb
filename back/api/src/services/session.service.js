/**
 * Server-side sessions without PHP.
 * The browser keeps a random token in an HttpOnly cookie; MySQL stores only
 * its SHA-256 hash, the user, expiry and last activity. Logout or disabling a
 * user invalidates the session immediately.
 */
const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.session.secureCookie,
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMs,
  };
}

async function create(res, user, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttlMs = env.session.ttlHours * 3600 * 1000;
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, ip_address, user_agent, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR), UTC_TIMESTAMP())`,
    [sha256(token), user.id, req.ip, (req.get('user-agent') || '').slice(0, 255), env.session.ttlHours]
  );
  res.cookie(env.session.cookieName, token, cookieOptions(ttlMs));
}

/** Returns the active user for the request cookie, or null. Refreshes last activity. */
async function read(req) {
  const token = parseCookies(req.get('cookie'))[env.session.cookieName];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await db.queryOne(
    `SELECT s.id AS session_id, u.id, u.name, u.email, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
        AND s.last_seen_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
        AND u.status = 'active'`,
    [sha256(token), env.session.idleMinutes]
  );
  if (!row) return null;
  await db.query('UPDATE sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [row.session_id]);
  return row;
}

async function destroy(req, res) {
  const token = parseCookies(req.get('cookie'))[env.session.cookieName];
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]);
  res.clearCookie(env.session.cookieName, { ...cookieOptions(0), maxAge: undefined });
}

/** Remove all sessions of a user (password change, disabled account). */
const destroyAllForUser = (userId) => db.query('DELETE FROM sessions WHERE user_id = ?', [userId]);

/** Housekeeping: delete expired sessions. */
const purgeExpired = () => db.query('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()');

module.exports = { create, read, destroy, destroyAllForUser, purgeExpired };
