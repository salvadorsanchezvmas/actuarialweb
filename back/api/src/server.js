const env = require('./config/env');
const app = require('./app');
const db = require('./config/db');
const { verifyTransporter } = require('./config/mailer');

const server = app.listen(env.port, '127.0.0.1', async () => {
  console.info(`[api] listening on http://127.0.0.1:${env.port}/api (${env.nodeEnv})`);
  try {
    await db.ping();
    console.info('[api] MySQL connected');
  } catch (err) {
    console.error('[api] MySQL connection failed:', err.message);
  }
  if (await verifyTransporter()) console.info(`[api] mail transporter ready${env.mail.dryRun ? ' (dry-run)' : ''}`);
});

function shutdown(signal) {
  console.info(`[api] ${signal} received, shutting down`);
  server.close(() => db.pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('[api] unhandled rejection', err));
