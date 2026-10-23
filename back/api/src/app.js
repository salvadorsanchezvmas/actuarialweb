const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const adminRoutes = require('./routes/admin.routes');
const sessions = require('./services/session.service');
const { apiLimiter, requireCsrfHeader } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'blob:'],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(cors({
  origin(origin, cb) {
    // Same-origin requests (via /api reverse proxy) send no Origin header
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true, // session cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  maxAge: 600,
}));
app.use(express.json({ limit: '2mb' }));

/* ---------- API ---------- */
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/repository', require('./routes/repository.routes').callback); // OneDrive OAuth callback
app.use('/api/auth', requireCsrfHeader);
app.use('/api', apiLimiter, routes);

/* ---------- Content admin (SAW): only with an admin/editor session ---------- */
const ROLES = require('./config/roles');
const ADMIN_ROLES = ROLES.SAW;
app.use('/SAW', async (req, res, next) => {
  try {
    const user = await sessions.read(req);
    if (user && ADMIN_ROLES.includes(user.role)) {
      res.set('Cache-Control', 'no-store');
      res.set('X-Robots-Tag', 'noindex, nofollow');
      return next();
    }
    if (req.accepts('html') && (req.path === '/' || req.path.endsWith('.html'))) {
      return res.redirect(302, `${env.siteUrl}/login?next=${encodeURIComponent('/SAW/')}`);
    }
    res.status(401).json({ message: 'Authentication required.' });
  } catch (err) { next(err); }
}, express.static(env.paths.saw, { index: 'index.html', dotfiles: 'deny' }));

/* ---------- Public website files used by SAW (fonts, logos, uploads) ---------- */
const publicStatic = (dir) => express.static(path.join(env.paths.front, dir), { dotfiles: 'deny', fallthrough: true, maxAge: '7d' });
app.use('/uploads', express.static(env.paths.uploads, { dotfiles: 'deny', maxAge: '30d' }));
app.use('/assets', publicStatic('assets'));
app.use('/img', publicStatic('img'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
