/**
 * Create a portal user.
 * Usage: node scripts/create-user.js "Full Name" email@domain.com "password" [admin|editor|client]
 */
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

(async () => {
  const [name, email, password, role = 'client'] = process.argv.slice(2);
  if (!name || !email || !password || password.length < 8) {
    throw new Error('Usage: node scripts/create-user.js "Name" email password(min 8) [role]');
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email.toLowerCase(), hash, role]);
  console.info(`User ${email} created (${role})`);
  await db.pool.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
