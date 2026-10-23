require('dotenv').config();
const path = require('path');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const bool = (v, def = false) => (v === undefined || v === '' ? def : String(v).toLowerCase() === 'true');
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const apiRoot = path.resolve(__dirname, '..', '..');
const fromApi = (p) => path.resolve(apiRoot, p);

const isProd = process.env.NODE_ENV === 'production';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT) || 4000,
  corsOrigins: list(process.env.CORS_ORIGINS),
  siteUrl: process.env.SITE_URL || 'http://localhost:5500',
  trustProxy: bool(process.env.TRUST_PROXY, true),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: required('DB_NAME'),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  },

  /** Server-side sessions (random token in an HttpOnly cookie, hash stored in MySQL) */
  session: {
    cookieName: process.env.SESSION_COOKIE || 'af_session',
    ttlHours: Number(process.env.SESSION_TTL_HOURS) || 8,
    idleMinutes: Number(process.env.SESSION_IDLE_MINUTES) || 120,
    // Secure cookies need HTTPS: on in production, off on http://localhost
    secureCookie: bool(process.env.SESSION_SECURE_COOKIE, isProd),
  },

  /** Paths to the website files (front) */
  paths: {
    front: fromApi(process.env.FRONT_DIR || '../../front'),
    saw: fromApi(process.env.SAW_DIR || '../../front/SAW'),
    uploads: fromApi(process.env.UPLOADS_DIR || '../../front/uploads'),
    i18n: fromApi(process.env.I18N_DIR || '../../front/i18n'),
    backups: fromApi(process.env.BACKUPS_DIR || './storage/backups'),
  },
  /** Where the login sends admin/editor users (absolute URL in dev, /SAW/ in prod) */
  adminUrl: process.env.ADMIN_URL || '/SAW/',
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB) || 10,

  /** File repository (role uploader). REPO_DRIVER=onedrive in production, local until credentials exist */
  repository: {
    driver: (process.env.REPO_DRIVER || 'local').toLowerCase(),
    maxMb: Number(process.env.REPO_MAX_MB) || 100,
    localDir: fromApi(process.env.REPO_LOCAL_DIR || './storage/repository'),
    onedrive: {
      // app = OneDrive for Business / SharePoint (client credentials)
      // delegated = personal OneDrive (an admin signs in once; refresh token stored encrypted)
      auth: (process.env.ONEDRIVE_AUTH || 'app').toLowerCase(),
      tenantId: process.env.ONEDRIVE_TENANT_ID || '',
      clientId: process.env.ONEDRIVE_CLIENT_ID || '',
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || '',
      // Target (app mode): one of drive id, site id or the owner's user principal name
      driveId: process.env.ONEDRIVE_DRIVE_ID || '',
      siteId: process.env.ONEDRIVE_SITE_ID || '',
      userId: process.env.ONEDRIVE_USER || '',
      rootFolder: (process.env.ONEDRIVE_ROOT_FOLDER || 'ActuarialFactor/Repositorio').replace(/^\/+|\/+$/g, ''),
      redirectUri: process.env.ONEDRIVE_REDIRECT_URI || '',
      tokenKey: process.env.ONEDRIVE_TOKEN_KEY || '', // 32 bytes in hex (64 chars) to encrypt the refresh token
    },
  },

  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: bool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM || 'Actuarial Factor <no-reply@actuarialfactor.com>',
    notifyTo: list(process.env.MAIL_NOTIFY_TO),
    dryRun: bool(process.env.MAIL_DRY_RUN, false),
  },
};

module.exports = env;
