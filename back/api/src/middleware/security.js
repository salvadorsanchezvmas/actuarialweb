const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { HttpError } = require('../utils/http');

const json = (message) => ({ message });

/** General limiter for every /api request */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
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

/** Requires a valid "Authorization: Bearer <jwt>" header */
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Authentication required.'));
  try {
    req.user = jwt.verify(token, env.jwt.secret);
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
}

function requireRole(...roles) {
  return (req, res, next) =>
    req.user && roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Forbidden.'));
}

module.exports = { apiLimiter, formLimiter, authLimiter, requireAuth, requireRole };
