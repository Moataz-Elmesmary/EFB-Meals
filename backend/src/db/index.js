// Data access layer — thin async functions over Knex so routes stay clean and
// the same code runs on SQLite (dev) and SQL Server (prod).
const db = require('./knex');
const migrate = require('./migrate');
const seed = require('./seed');

// On SQL Server, Knex creates tables but not the database itself. Connect to
// `master` first and create the target DB if it doesn't exist yet.
async function ensureDatabaseMssql() {
  if (db.DB_TYPE !== 'mssql') return;
  const mssql = require('mssql');
  const name = process.env.MSSQL_DATABASE || process.env.MSSQL_DB || 'EFBMeals';
  let pool;
  try {
    pool = await mssql.connect({
      server: process.env.MSSQL_HOST || 'localhost',
      port: parseInt(process.env.MSSQL_PORT || '1433', 10),
      user: process.env.MSSQL_USER || '',
      password: process.env.MSSQL_PASSWORD || process.env.MSSQL_PASS || '',
      database: 'master',
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
        enableArithAbort: true
      }
    });
    await pool.request().query(`IF DB_ID('${name}') IS NULL CREATE DATABASE [${name}]`);
    console.log(`✓ ensured database ${name}`);
  } finally {
    if (pool) await pool.close();
  }
}

async function init() {
  await ensureDatabaseMssql();
  await migrate();
  await seed();
  console.log(`DB ready (${db.DB_TYPE})`);
}

// ── meals ──────────────────────────────────────────────
const listMeals = () =>
  db('meals').where({ active: true }).orderBy(['category', 'id'])
    .select('id', 'name_en', 'name_ar', 'description_en', 'description_ar', 'category', 'emoji', 'price');

const getMeal = (id) => db('meals').where({ id }).first();

// ── meal requests ──────────────────────────────────────
async function createMealRequest(data) {
  const [row] = await db('main_requests').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}

// Create an order (header) plus its line items.
async function createOrder(header, items) {
  const id = await createMealRequest(header);
  await insertItems(id, items, 'suggested');
  return id;
}

async function insertItems(requestId, items, defaultKind) {
  if (!items || !items.length) return;
  await db('order_request_items').insert(
    items.map((it) => ({
      meal_request_id: requestId,
      meal_id: it.meal_id || null,
      item_code: it.item_code || null,
      meal_name: it.meal_name,
      description: it.description || null,
      emoji: it.emoji || null,
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
      unit_price: it.unit_price || 0,
      kind: it.kind || defaultKind || 'suggested'
    }))
  );
}

// Replace the items of a given kind for a request (used by the kitchen for
// 'requested' items).
async function replaceItems(requestId, items, kind) {
  await db('order_request_items').where({ meal_request_id: requestId, kind }).del();
  await insertItems(requestId, items, kind);
}

// ── reference data (synced from SAP mirror) ────────────────
const CLASS_MAP = { ready: 5, hot: 4 };
const listItemsByClass = (classification) => {
  const cls = CLASS_MAP[classification];
  const q = db('Items').where({ is_active: true }).orderBy('item_name').select('item_code', 'item_name', 'price', 'classification', 'uom');
  if (cls != null) q.where('classification', cls);
  return q;
};
const getItem = (code) => db('Items').where({ item_code: code }).first();
const listCostCenters = () =>
  db('CostCenters').where({ active: true }).whereNotNull('name').orderBy('name').select('code', 'name', 'division');

const getItems = (requestId) => db('order_request_items').where({ meal_request_id: requestId }).orderBy('id');

// Attach line items to a list of request rows in one query.
async function withItems(rows) {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return rows;
  const items = await db('order_request_items').whereIn('meal_request_id', ids).orderBy('id');
  const byReq = {};
  items.forEach((it) => {
    (byReq[it.meal_request_id] = byReq[it.meal_request_id] || []).push(it);
  });
  return rows.map((r) => ({ ...r, items: byReq[r.id] || [] }));
}

async function getRequest(id) {
  const row = await db('main_requests as mr')
    .leftJoin('meals as m', 'm.id', 'mr.meal_id')
    .where('mr.id', id)
    .first('mr.*', 'm.name_en', 'm.name_ar', 'm.emoji', 'm.price');
  if (!row) return row;
  row.items = await getItems(id);
  return row;
}

async function kitchenRequests() {
  const latest = db('request_budget')
    .select('meal_request_id')
    .max('id as bid')
    .groupBy('meal_request_id')
    .as('lb');
  const rows = await db('main_requests as mr')
    .leftJoin('meals as m', 'm.id', 'mr.meal_id')
    .leftJoin(latest, 'lb.meal_request_id', 'mr.id')
    .leftJoin('request_budget as b', 'b.id', 'lb.bid')
    .orderBy('mr.id', 'desc')
    .select(
      'mr.*', 'm.name_en', 'm.name_ar', 'm.emoji',
      'b.id as budget_id', 'b.amount', 'b.currency', 'b.vendor',
      'b.attachment_path', 'b.notes as budget_notes'
    );
  return withItems(rows);
}

const setStatus = (id, status) => db('main_requests').where({ id }).update({ status });
const updateRequest = (id, fields) => db('main_requests').where({ id }).update(fields);

// requests for a single employee (their own), newest first, with latest budget
async function requestsByEmail(email) {
  const latest = db('request_budget').select('meal_request_id').max('id as bid').groupBy('meal_request_id').as('lb');
  const rows = await db('main_requests as mr')
    .leftJoin('meals as m', 'm.id', 'mr.meal_id')
    .leftJoin(latest, 'lb.meal_request_id', 'mr.id')
    .leftJoin('request_budget as b', 'b.id', 'lb.bid')
    .whereRaw('LOWER(mr.requester_email) = ?', [String(email || '').toLowerCase()])
    .orderBy('mr.id', 'desc')
    .select('mr.*', 'm.name_en', 'm.name_ar', 'm.emoji', 'b.amount', 'b.currency', 'b.attachment_path');
  return withItems(rows);
}

// ── budgets ────────────────────────────────────────────
async function createBudget(data) {
  const [row] = await db('request_budget').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}
const latestBudgetFor = (mealRequestId) =>
  db('request_budget').where({ meal_request_id: mealRequestId }).orderBy('id', 'desc').first();
const getBudget = (id) => db('request_budget').where({ id }).first();
const updateBudget = (id, fields) => db('request_budget').where({ id }).update(fields);

// ── sales orders ───────────────────────────────────────
async function createSalesOrder(data) {
  const [row] = await db('sap_sales_orders').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}
const updateSalesOrder = (id, fields) => db('sap_sales_orders').where({ id }).update(fields);
const listSalesOrders = () => db('sap_sales_orders').orderBy('created_at', 'desc');

// ── SAP outbound middleware ────────────────────────────
// GET: approved requests that haven't reached SAP yet (sap_document_number = 0),
// each with its items + latest budget so the mapper has everything it needs.
async function pendingForSap() {
  const rows = await db('main_requests')
    .where({ status: 'ready_for_sap' })
    .andWhere((q) => q.where('sap_document_number', 0).orWhereNull('sap_document_number'))
    .orderBy('id', 'asc');
  const withI = await withItems(rows);
  for (const r of withI) r.budget = await latestBudgetFor(r.id);
  return withI;
}

// UPDATE (by request id): write back the SAP result. number_of_try += 1 on every
// attempt; document_number is only set on success.
async function recordSapResult(id, { documentNumber, feedback }) {
  const row = await db('main_requests').where({ id }).first('sap_number_of_try');
  const tries = ((row && row.sap_number_of_try) || 0) + 1;
  const fields = { sap_integration_feedback: String(feedback || '').slice(0, 1000), sap_number_of_try: tries };
  if (documentNumber != null && documentNumber !== '') fields.sap_document_number = documentNumber;
  await db('main_requests').where({ id }).update(fields);
  return tries;
}

module.exports = {
  db,
  init,
  listMeals,
  getMeal,
  createMealRequest,
  createOrder,
  insertItems,
  replaceItems,
  listItemsByClass,
  getItem,
  listCostCenters,
  getItems,
  getRequest,
  kitchenRequests,
  requestsByEmail,
  setStatus,
  updateRequest,
  createBudget,
  latestBudgetFor,
  getBudget,
  updateBudget,
  createSalesOrder,
  updateSalesOrder,
  listSalesOrders,
  pendingForSap,
  recordSapResult
};
