// Shared SAP push logic: build a Sales Order payload from a meal request,
// store it locally in SalesOrder, and (optionally) POST it to the SAP endpoint.
// The MSSQL sqlListener picks up any pending rows for the real SAP table.
const db = require('./db');
const fetch = require('node-fetch');

function getRequest(requestId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT mr.*, m.name_en, m.name_ar, m.price
         FROM MealRequest mr
         LEFT JOIN Meal m ON m.id = mr.meal_id
        WHERE mr.id = ?`,
      [requestId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function buildPayload(row) {
  const unitPrice = row.price || 0;
  return {
    DocType: 'SalesOrder',
    requestId: row.id,
    requester: { name: row.requester_name, email: row.requester_email },
    department: row.department,
    meal: row.is_special
      ? { special: true, description: row.special_request }
      : { id: row.meal_id, name_en: row.name_en, name_ar: row.name_ar, unitPrice },
    quantity: row.people,
    lineTotal: row.is_special ? null : unitPrice * (row.people || 1),
    neededDate: row.needed_date,
    status: row.status,
    createdAt: row.created_at
  };
}

// Returns { salesOrderId, pushed }
async function pushRequestToSAP(requestId) {
  const row = await getRequest(requestId);
  if (!row) throw new Error('Request not found');

  const payload = JSON.stringify(buildPayload(row));

  const salesOrderId = await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO SalesOrder (meal_request_id, payload, status) VALUES (?, ?, ?)',
      [requestId, payload, 'pending'],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

  const sapEndpoint = process.env.SAP_ENDPOINT;
  if (sapEndpoint) {
    try {
      const r = await fetch(sapEndpoint, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      });
      const text = await r.text();
      db.run('UPDATE SalesOrder SET sap_id=?, status=? WHERE id=?', [text, 'pushed', salesOrderId]);
    } catch (e) {
      // leave as pending; sqlListener / retry will handle it
      console.error('SAP push failed (will retry):', e.message);
    }
  }

  return { salesOrderId, pushed: Boolean(sapEndpoint) };
}

module.exports = { pushRequestToSAP, buildPayload, getRequest };
