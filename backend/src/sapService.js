// ───────────────────────────────────────────────────────────
// SAP integration — turns a meal request into a Sales Order and pushes it to
// SAP. Primary path: INSERT into the SAP SQL Server Sales Order table. Optional
// path: POST to a SAP REST endpoint. A local sap_sales_orders row tracks our side.
// ───────────────────────────────────────────────────────────
const mssql = require('mssql');
const fetch = require('node-fetch');
const dao = require('./db');

// Dedicated SAP SQL Server connection (separate from the app DB).
const SAP_DB_ENABLED = !!process.env.SAP_MSSQL_HOST;
const SAP_TABLE = process.env.SAP_SALESORDER_TABLE || 'SalesOrder';
const sapConfig = {
  server: process.env.SAP_MSSQL_HOST || 'localhost',
  port: parseInt(process.env.SAP_MSSQL_PORT || '1433', 10),
  user: process.env.SAP_MSSQL_USER || '',
  password: process.env.SAP_MSSQL_PASS || '',
  database: process.env.SAP_MSSQL_DB || 'SAP',
  options: { trustServerCertificate: true, enableArithAbort: true }
};

function buildPayload(row, budget) {
  return {
    DocType: 'SalesOrder',
    RequestId: row.id,
    RequesterName: row.requester_name,
    RequesterEmail: row.requester_email,
    Department: row.department,
    Phone: row.phone,
    // full cart: every item + its quantity
    Items: (row.items || []).map((it) => ({ meal: it.meal_name, special: !!it.special, quantity: it.quantity })),
    Summary: row.meal_name,
    TotalQuantity: row.people,
    NeededDate: row.needed_date,
    NeededTime: row.needed_time,
    Notes: row.notes,
    Budget: budget ? { amount: budget.amount, currency: budget.currency, vendor: budget.vendor } : null,
    BudgetFileName: budget && budget.attachment_name,
    BudgetFileBase64: budget && budget.attachment_data, // PDF stored in SAP too
    Status: row.status,
    CreatedAt: row.created_at
  };
}

// Insert into the SAP SQL Server Sales Order table. Adjust the column mapping to
// match the real SAP table — keep OUTPUT INSERTED.Id to capture the SAP doc id.
async function insertIntoSap(p) {
  let pool;
  try {
    pool = await mssql.connect(sapConfig);
    const result = await pool
      .request()
      .input('RequestId', mssql.Int, p.RequestId)
      .input('Requester', mssql.NVarChar(200), p.RequesterName)
      .input('Department', mssql.NVarChar(200), p.Department)
      .input('MealName', mssql.NVarChar(400), p.Summary)
      .input('Quantity', mssql.Int, p.TotalQuantity)
      .input('LineTotal', mssql.Decimal(12, 2), p.Budget ? p.Budget.amount : null)
      .input('NeededDate', mssql.NVarChar(20), p.NeededDate)
      .input('Payload', mssql.NVarChar(mssql.MAX), JSON.stringify(p))
      .query(
        `INSERT INTO ${SAP_TABLE} (RequestId, Requester, Department, MealName, Quantity, LineTotal, NeededDate, Payload)
         OUTPUT INSERTED.Id
         VALUES (@RequestId, @Requester, @Department, @MealName, @Quantity, @LineTotal, @NeededDate, @Payload)`
      );
    const id = result.recordset && result.recordset[0] && result.recordset[0].Id;
    return id ? String(id) : null;
  } finally {
    if (pool) await pool.close();
  }
}

async function pushToSapTarget(payload) {
  if (SAP_DB_ENABLED) return insertIntoSap(payload);
  if (process.env.SAP_ENDPOINT) {
    const r = await fetch(process.env.SAP_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    return (await r.text()) || null;
  }
  return null; // not configured — stays pending locally
}

// Build payload, record locally, attempt push. Returns { salesOrderId, sapId, pushed }.
async function pushRequestToSAP(requestId) {
  const row = await dao.getRequest(requestId);
  if (!row) throw new Error('Request not found');
  const budget = await dao.latestBudgetFor(requestId);

  const payload = buildPayload(row, budget);
  const salesOrderId = await dao.createSalesOrder({
    meal_request_id: requestId,
    payload: JSON.stringify(payload),
    status: 'pending'
  });

  try {
    const sapId = await pushToSapTarget(payload);
    if (sapId) {
      await dao.updateSalesOrder(salesOrderId, { sap_id: sapId, status: 'pushed' });
      return { salesOrderId, sapId, pushed: true };
    }
    return { salesOrderId, sapId: null, pushed: false };
  } catch (e) {
    console.error('SAP push failed (will retry):', e.message);
    await dao.updateSalesOrder(salesOrderId, { status: 'failed' });
    return { salesOrderId, sapId: null, pushed: false, error: e.message };
  }
}

// Retry any sales orders that haven't reached SAP yet (called by sqlListener).
async function retryPending() {
  const pending = await dao.db('sap_sales_orders').whereNull('sap_id').whereIn('status', ['pending', 'failed']);
  for (const so of pending) {
    try {
      const payload = JSON.parse(so.payload);
      const sapId = await pushToSapTarget(payload);
      if (sapId) {
        await dao.updateSalesOrder(so.id, { sap_id: sapId, status: 'pushed' });
        console.log('SAP retry pushed sales order', so.id, '→', sapId);
      }
    } catch (e) {
      console.error('SAP retry failed for', so.id, e.message);
    }
  }
}

module.exports = { pushRequestToSAP, retryPending, buildPayload, SAP_DB_ENABLED };
