const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: false,
  enableKeepAlive: true,
});

// Every connection works in UTC so CURRENT_TIMESTAMP / UTC_TIMESTAMP() and the
// driver (timezone: 'Z') agree, whatever the server's local time zone is.
pool.on('connection', (conn) => { conn.query("SET time_zone = '+00:00'"); });

/**
 * Run a parameterized query and return rows. Always use placeholders (?):
 * values are escaped by the driver. pool.query (not execute) is used so
 * LIMIT/OFFSET placeholders accept numbers.
 */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = { pool, query, queryOne, ping };
