const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'xi_ads_monthly.db');
const db = new Database(DB_PATH);

// WAL mode: better concurrent read performance
db.pragma('journal_mode = WAL');
// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

/**
 * Drop-in replacement for pool.query(sql, params).
 * mysql2 returns [rows, fields]; we return [rows] so
 * `const [rows] = query(...)` destructuring works identically.
 *
 * better-sqlite3 is synchronous, so no await is needed.
 */
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  return [stmt.all(params)];
}

module.exports = { db, query };
