const rateLimit = require('express-rate-limit');
const sessions = require('../services/session.service');
const { HttpError } = require('../utils/http');

const json = (message) => ({ message });

/** General limiter for every /api request */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many requests, please try again later.'),
});

/** Strict limiter for public forms (contact, newsletter) */
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many submissions. Please try again later.'),
});

/** Login brute-force protection */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many login attempts. Please try again in 15 minutes.'),
});

/** Loads the session user (if any) into req.user without failing. */
async function loadSession(req, res, next) {
  try {
    req.user = await sessions.read(req);
    next();
  } catch (err) {
    next(err);
  }
}

/** Requires an active session (HttpOnly cookie). */
async function requireAuth(req, res, next) {
  try {
    if (req.user === undefined) req.user = await sessions.read(req);
    if (!req.user) return next(new HttpError(401, 'Your session has expired. Please sign in again.'));
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) =>
    req.user && roles.includes(req.user.role) ? next() : next(new HttpError(403, 'You do not have permission for this action.'));
}

/**
 * CSRF protection for cookie sessions: state-changing requests must carry the
 * custom header the site's fetch() sends. Browsers can't add it cross-site
 * without a CORS preflight, which only our own origins pass. SameSite=Strict
 * cookies are the second layer.
 */
function requireCsrfHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'fetch') return next(new HttpError(403, 'Missing request header.'));
  next();
}

module.exports = { apiLimiter, formLimiter, authLimiter, loadSession, requireAuth, requireRole, requireCsrfHeader };
