// ───────────────────────────────────────────────────────────
// DB CONNECTION — Knex, configured by DB_TYPE. Same query API for
// SQLite (dev) and SQL Server (prod); only .env changes between them.
// (Mirrors the EFB Fleet data layer.)
// ───────────────────────────────────────────────────────────
const path = require('path');
const knex = require('knex');

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

let config;

if (DB_TYPE === 'sqlite') {
  const file = process.env.SQLITE_PATH || path.join(__dirname, '..', '..', 'data', 'meals.db');
  config = {
    client: 'sqlite3',
    connection: { filename: file },
    useNullAsDefault: true,
    pool: {
      afterCreate(conn, done) {
        conn.run('PRAGMA foreign_keys = ON', () => done(null, conn));
      }
    }
  };
} else if (DB_TYPE === 'mssql') {
  config = {
    client: 'mssql',
    connection: {
      server: process.env.MSSQL_HOST || 'localhost',
      port: parseInt(process.env.MSSQL_PORT || '1433', 10),
      user: process.env.MSSQL_USER || '',
      password: process.env.MSSQL_PASSWORD || process.env.MSSQL_PASS || '',
      database: process.env.MSSQL_DATABASE || process.env.MSSQL_DB || 'EFBMeals',
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
        enableArithAbort: true
      }
    },
    pool: { min: 0, max: 10 }
  };
} else {
  throw new Error(`Unsupported DB_TYPE "${DB_TYPE}". Use "sqlite" or "mssql".`);
}

const db = knex(config);
db.DB_TYPE = DB_TYPE;
module.exports = db;
