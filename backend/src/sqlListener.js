// SQL Listener: polls local SalesOrder rows and inserts into external MSSQL for SAP
const db = require('./db');
const sql = require('mssql');

const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASS,
  server: process.env.MSSQL_HOST, // e.g. 'host\instance' or 'host'
  database: process.env.MSSQL_DB,
  options: { trustServerCertificate: true }
};

async function pushRowToMSSQL(row) {
  let pool;
  try {
    pool = await sql.connect(config);
    // Example insert; adapt mapping to real SAP schema
    const result = await pool.request()
      .input('meal_request_id', sql.Int, row.meal_request_id)
      .input('payload', sql.NVarChar(sql.MAX), row.payload)
      .query("INSERT INTO SalesOrder (meal_request_id, payload) OUTPUT INSERTED.Id VALUES (@meal_request_id, @payload);");
    const insertedId = result.recordset && result.recordset[0] && result.recordset[0].Id;
    return insertedId || null;
  } catch (err) {
    console.error('MSSQL push error', err.message);
    return null;
  } finally {
    if (pool) await pool.close();
  }
}

async function pollAndPush() {
  db.all('SELECT id, meal_request_id, payload FROM SalesOrder WHERE sap_id IS NULL', async (err, rows) => {
    if (err) return console.error('Listener DB read error', err.message);
    for (const row of rows) {
      console.log('Pushing SalesOrder', row.id);
      const externalId = await pushRowToMSSQL(row);
      if (externalId) {
        db.run('UPDATE SalesOrder SET sap_id=? WHERE id=?', [String(externalId), row.id]);
        console.log('Pushed and updated sap_id', externalId);
      }
    }
  });
}

function start(intervalMs = 10000) {
  if (!process.env.MSSQL_HOST) {
    console.log('MSSQL_HOST not configured; SQL listener disabled');
    return;
  }
  console.log('Starting SQL Listener (poll every', intervalMs, 'ms)');
  setInterval(pollAndPush, intervalMs);
}

module.exports = { start };
