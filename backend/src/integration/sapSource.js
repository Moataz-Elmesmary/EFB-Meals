// Read-only connection to the SAP-mirror database (EFB_DB by default), which is
// itself kept in sync with SAP by the org's IntegrationUser service. We sync our
// reference data (items, recipes, cost centers) from here.
const sql = require('mssql');

const config = {
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || process.env.MSSQL_PASS || '',
  database: process.env.SOURCE_DB || 'EFB_DB',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
    enableArithAbort: true
  },
  requestTimeout: 120000,
  pool: { min: 0, max: 4 }
};

const SOURCE_ENABLED = !!process.env.MSSQL_HOST;

let poolPromise = null;
function getPool() {
  if (!poolPromise) poolPromise = new sql.ConnectionPool(config).connect();
  return poolPromise;
}

async function query(q) {
  const pool = await getPool();
  const res = await pool.request().query(q);
  return res.recordset;
}

module.exports = { query, SOURCE_ENABLED, SOURCE_DB: config.database };
