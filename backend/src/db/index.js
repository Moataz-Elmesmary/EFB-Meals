// Data access layer — thin async functions over Knex so routes stay clean and
// the same code runs on SQLite (dev) and SQL Server (prod).
const db = require('./knex');
const migrate = require('./migrate');
const seed = require('./seed');

async function init() {
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
  const [row] = await db('meal_requests').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}

const getRequest = (id) =>
  db('meal_requests as mr')
    .leftJoin('meals as m', 'm.id', 'mr.meal_id')
    .where('mr.id', id)
    .first('mr.*', 'm.name_en', 'm.name_ar', 'm.emoji', 'm.price');

function kitchenRequests() {
  // each request + its latest budget
  const latest = db('budget_requests')
    .select('meal_request_id')
    .max('id as bid')
    .groupBy('meal_request_id')
    .as('lb');
  return db('meal_requests as mr')
    .leftJoin('meals as m', 'm.id', 'mr.meal_id')
    .leftJoin(latest, 'lb.meal_request_id', 'mr.id')
    .leftJoin('budget_requests as b', 'b.id', 'lb.bid')
    .orderBy('mr.created_at', 'desc')
    .select(
      'mr.*', 'm.name_en', 'm.name_ar', 'm.emoji',
      'b.id as budget_id', 'b.amount', 'b.currency', 'b.vendor',
      'b.attachment_path', 'b.notes as budget_notes'
    );
}

const setStatus = (id, status) => db('meal_requests').where({ id }).update({ status });

// ── budgets ────────────────────────────────────────────
async function createBudget(data) {
  const [row] = await db('budget_requests').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}
const latestBudgetFor = (mealRequestId) =>
  db('budget_requests').where({ meal_request_id: mealRequestId }).orderBy('id', 'desc').first();

// ── sales orders ───────────────────────────────────────
async function createSalesOrder(data) {
  const [row] = await db('sales_orders').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}
const updateSalesOrder = (id, fields) => db('sales_orders').where({ id }).update(fields);
const listSalesOrders = () => db('sales_orders').orderBy('created_at', 'desc');

module.exports = {
  db,
  init,
  listMeals,
  getMeal,
  createMealRequest,
  getRequest,
  kitchenRequests,
  setStatus,
  createBudget,
  latestBudgetFor,
  createSalesOrder,
  updateSalesOrder,
  listSalesOrders
};
