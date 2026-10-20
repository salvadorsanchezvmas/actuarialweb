/** Usage: node scripts/run-sql.js database/schema.sql */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

(async () => {
  const file = path.resolve(process.argv[2] || '');
  if (!fs.existsSync(file)) throw new Error(`SQL file not found: ${file}`);
  const conn = await mysql.createConnection({ ...env.db, multipleStatements: true, charset: 'utf8mb4' });
  await conn.query(fs.readFileSync(file, 'utf8'));
  await conn.end();
  console.info(`Executed ${path.basename(file)}`);
})().catch((err) => { console.error(err.message); process.exit(1); });
