require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const bool = (v, def = false) => (v === undefined ? def : String(v).toLowerCase() === 'true');
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
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

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
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

if (env.isProd && env.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

module.exports = env;
