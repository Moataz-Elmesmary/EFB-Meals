// ───────────────────────────────────────────────────────────
// SCHEMA MIGRATION — idempotent; runs on every boot. Works on both
// SQLite and SQL Server because Knex normalizes column types.
// ───────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('./knex');

async function ensureSqliteDir() {
  if (db.DB_TYPE !== 'sqlite') return;
  const dir = path.dirname(db.client.config.connection.filename);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function migrate() {
  await ensureSqliteDir();

  if (!(await db.schema.hasTable('meals'))) {
    await db.schema.createTable('meals', (t) => {
      t.increments('id').primary();
      t.string('name_en', 200).notNullable();
      t.string('name_ar', 200).notNullable();
      t.string('description_en', 500);
      t.string('description_ar', 500);
      t.string('category', 60).defaultTo('main');
      t.string('emoji', 16).defaultTo('🍽️');
      t.decimal('price', 12, 2).defaultTo(0);
      t.boolean('active').defaultTo(true);
    });
    console.log('✓ created table: meals');
  }

  if (!(await db.schema.hasTable('meal_requests'))) {
    await db.schema.createTable('meal_requests', (t) => {
      t.increments('id').primary();
      t.string('requester_name', 200);
      t.string('requester_email', 200).index();
      t.string('department', 200);
      t.integer('meal_id').index();
      t.string('meal_name', 400);
      t.boolean('is_special').defaultTo(false);
      t.string('special_request', 1000);
      t.integer('people').defaultTo(1);
      t.string('needed_date', 20);
      t.string('phone', 40);
      t.string('status', 30).defaultTo('requested').index(); // requested|budget_requested|ready_for_sap
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✓ created table: meal_requests');
  } else if (!(await db.schema.hasColumn('meal_requests', 'phone'))) {
    // additive migration for existing databases
    await db.schema.alterTable('meal_requests', (t) => t.string('phone', 40));
    console.log('✓ added column: meal_requests.phone');
  }

  if (!(await db.schema.hasTable('budget_requests'))) {
    await db.schema.createTable('budget_requests', (t) => {
      t.increments('id').primary();
      t.integer('meal_request_id').index();
      t.decimal('amount', 12, 2);
      t.string('currency', 8).defaultTo('EGP');
      t.string('vendor', 200);
      t.string('notes', 1000);
      t.string('attachment_path', 500); // on-disk copy
      t.string('attachment_name', 300);
      t.string('attachment_mime', 120);
      t.text('attachment_data'); // base64 copy in the DB (source of truth)
      t.string('created_by', 200);
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✓ created table: budget_requests');
  } else {
    for (const [col, def] of [
      ['attachment_name', (t) => t.string('attachment_name', 300)],
      ['attachment_mime', (t) => t.string('attachment_mime', 120)],
      ['attachment_data', (t) => t.text('attachment_data')]
    ]) {
      if (!(await db.schema.hasColumn('budget_requests', col))) {
        await db.schema.alterTable('budget_requests', def);
        console.log(`✓ added column: budget_requests.${col}`);
      }
    }
  }

  // Local mirror of what we push to SAP. The real SAP Sales Order lives in the
  // SAP SQL Server (see sapService) — this row tracks our side + the returned id.
  if (!(await db.schema.hasTable('sales_orders'))) {
    await db.schema.createTable('sales_orders', (t) => {
      t.increments('id').primary();
      t.integer('meal_request_id').index();
      t.string('sap_id', 100);
      t.string('status', 20).defaultTo('pending'); // pending|pushed|failed
      t.text('payload');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✓ created table: sales_orders');
  }
}

module.exports = migrate;
