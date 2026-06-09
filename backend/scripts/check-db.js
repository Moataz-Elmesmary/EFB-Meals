// Diagnostic: test the SQL Server connection and ensure the meals database
// exists. Run:  node scripts/check-db.js
require('dotenv').config();
const mssql = require('mssql');

const name = process.env.MSSQL_DATABASE || process.env.MSSQL_DB || 'EFBMeals';
const base = {
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || process.env.MSSQL_PASS || '',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
    enableArithAbort: true
  }
};

(async () => {
  console.log(`Connecting to ${base.server}:${base.port} as ${base.user} ...`);
  let pool;
  try {
    pool = await mssql.connect({ ...base, database: 'master' });
    console.log('✓ connected to SQL Server');
    const before = await pool.request().query(`SELECT DB_ID('${name}') AS id`);
    console.log(`  ${name} exists before: ${before.recordset[0].id ? 'YES' : 'no'}`);
    await pool.request().query(`IF DB_ID('${name}') IS NULL CREATE DATABASE [${name}]`);
    const after = await pool.request().query(`SELECT DB_ID('${name}') AS id`);
    console.log(`✓ ${name} exists now: ${after.recordset[0].id ? 'YES (id ' + after.recordset[0].id + ')' : 'NO'}`);
    console.log('\nAll good — now run: npm run dev');
  } catch (e) {
    console.error('\n✗ FAILED:', e.message);
    console.error('\nCheck: is the SQL Server reachable from this machine, and are MSSQL_USER/PASSWORD correct in .env?');
    process.exitCode = 1;
  } finally {
    if (pool) await pool.close();
  }
})();
