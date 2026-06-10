// READ-ONLY inspection of the SQL Server: find the SAP item/recipe/cost-center
// tables, dump their columns + a few sample rows so we can mirror them.
// Run: node scripts/inspect-sap.js
require('dotenv').config();
const sql = require('mssql');

const TARGETS = [
  'items', 'items_ItemPrices', 'ProductTree', 'ProductTree_ProductTreeLines',
  'Product', 'sap_CostCenter', 'CostCenter'
];

const base = {
  server: process.env.MSSQL_HOST,
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD || process.env.MSSQL_PASS,
  options: { encrypt: process.env.MSSQL_ENCRYPT === 'true', trustServerCertificate: true, enableArithAbort: true },
  requestTimeout: 60000
};

(async () => {
  let pool = await sql.connect({ ...base, database: 'master' });
  const dbs = (await pool.request().query("SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name")).recordset.map(r => r.name);
  console.log('=== USER DATABASES ===');
  console.log(dbs.join(', '));
  await pool.close();

  for (const db of dbs) {
    let p;
    try {
      p = await sql.connect({ ...base, database: db });
    } catch (e) {
      console.log(`\n[${db}] connect failed: ${e.message}`);
      continue;
    }
    // find target tables in this db
    const found = (await p.request().query(`
      SELECT t.name AS tbl, s.name AS sch
      FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
      WHERE ${TARGETS.map((n) => `t.name = '${n}'`).join(' OR ')}
         OR t.name LIKE '%ProductTree%' OR t.name LIKE '%ItemPrice%' OR t.name LIKE '%CostCenter%'
    `)).recordset;
    if (!found.length) { await p.close(); continue; }

    console.log(`\n\n########## DATABASE: ${db} ##########`);
    for (const f of found) {
      const full = `${f.sch}.${f.tbl}`;
      const cols = (await p.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${f.tbl}' AND TABLE_SCHEMA='${f.sch}'
        ORDER BY ORDINAL_POSITION`)).recordset;
      let cnt = '?';
      try { cnt = (await p.request().query(`SELECT COUNT(*) c FROM ${full}`)).recordset[0].c; } catch (_) {}
      console.log(`\n--- ${full}  (${cnt} rows) ---`);
      console.log('columns: ' + cols.map(c => `${c.COLUMN_NAME}:${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? '(' + c.CHARACTER_MAXIMUM_LENGTH + ')' : ''}`).join(', '));
      try {
        const sample = (await p.request().query(`SELECT TOP 3 * FROM ${full}`)).recordset;
        sample.forEach((r, i) => console.log(`  sample[${i}]: ` + JSON.stringify(r).slice(0, 600)));
      } catch (_) {}
    }
    await p.close();
  }
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
