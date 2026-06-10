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
      t.string('needed_time', 10);
      t.boolean('urgent').defaultTo(false);
      t.string('notes', 1000); // order comment from the requester
      t.string('kitchen_notes', 1000); // notes from the kitchen back to the requester
      t.string('reject_reason', 1000);
      // requested|budget_requested|budget_uploaded|ready_for_sap|budget_rejected
      t.string('status', 30).defaultTo('requested').index();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✓ created table: meal_requests');
  } else {
    for (const [col, def] of [
      ['phone', (t) => t.string('phone', 40)],
      ['needed_time', (t) => t.string('needed_time', 10)],
      ['urgent', (t) => t.boolean('urgent').defaultTo(false)],
      ['notes', (t) => t.string('notes', 1000)],
      ['kitchen_notes', (t) => t.string('kitchen_notes', 1000)],
      ['reject_reason', (t) => t.string('reject_reason', 1000)]
    ]) {
      if (!(await db.schema.hasColumn('meal_requests', col))) {
        await db.schema.alterTable('meal_requests', def);
        console.log(`✓ added column: meal_requests.${col}`);
      }
    }
  }

  // Cart line items — one row per meal in an order, with its quantity.
  if (!(await db.schema.hasTable('order_items'))) {
    await db.schema.createTable('order_items', (t) => {
      t.increments('id').primary();
      t.integer('meal_request_id').index();
      t.integer('meal_id');
      t.string('meal_name', 400);
      t.string('emoji', 16);
      t.integer('quantity').defaultTo(1);
      t.decimal('unit_price', 12, 2).defaultTo(0);
    });
    console.log('✓ created table: order_items');
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

  // ── SAP-mirrored reference data (synced from EFB_DB) ───────────────────────
  // Items master (from dbo.Items). The menu is built from these.
  if (!(await db.schema.hasTable('Items'))) {
    await db.schema.createTable('Items', (t) => {
      t.string('item_code', 60).primary();
      t.string('item_name', 400);
      t.bigInteger('classification'); // MainItemClassificationType
      t.float('weight'); // grams
      t.string('uom', 30);
      t.float('qty_on_stock');
      t.decimal('price', 14, 4).defaultTo(0); // default price-list price
      t.boolean('is_active').defaultTo(true);
      t.timestamp('synced_at');
    });
    console.log('✓ created table: Items');
  }

  // Item price lists (from dbo.Items_ItemPrices).
  if (!(await db.schema.hasTable('Item_Prices'))) {
    await db.schema.createTable('Item_Prices', (t) => {
      t.increments('id').primary();
      t.string('item_code', 60).index();
      t.bigInteger('price_list');
      t.decimal('price', 14, 4);
    });
    console.log('✓ created table: Item_Prices');
  }

  // Recipe header (from dbo.ProductTree).
  if (!(await db.schema.hasTable('ProductTree'))) {
    await db.schema.createTable('ProductTree', (t) => {
      t.string('tree_code', 60).primary();
      t.string('product_description', 400);
      t.float('quantity'); // base quantity the recipe yields
      t.string('tree_type', 60);
      t.timestamp('synced_at');
    });
    console.log('✓ created table: ProductTree');
  }

  // Recipe lines (from dbo.ProductTree_ProductTreeLines).
  if (!(await db.schema.hasTable('ProductTree_Lines'))) {
    await db.schema.createTable('ProductTree_Lines', (t) => {
      t.increments('id').primary();
      t.string('tree_code', 60).index(); // ParentItem
      t.bigInteger('child_num');
      t.string('item_code', 60);
      t.string('item_name', 400);
      t.float('quantity');
    });
    console.log('✓ created table: ProductTree_Lines');
  }

  // Cost centers / departments (from sap_efb.CostCenter).
  if (!(await db.schema.hasTable('CostCenters'))) {
    await db.schema.createTable('CostCenters', (t) => {
      t.string('code', 20).primary(); // PrcCode
      t.string('name', 120); // PrcName
      t.string('division', 120);
      t.string('platform', 60);
      t.string('programme', 80);
      t.string('cc_type', 20);
      t.boolean('active').defaultTo(true);
      t.timestamp('synced_at');
    });
    console.log('✓ created table: CostCenters');
  }
}

module.exports = migrate;
