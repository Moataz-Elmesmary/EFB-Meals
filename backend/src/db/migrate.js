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

  // Rename legacy tables to the agreed names (preserving data). Runs once.
  const renames = [
    ['meal_requests', 'main_requests'],
    ['order_items', 'order_request_items'],
    ['budget_requests', 'request_budget'],
    ['sales_orders', 'sap_sales_orders']
  ];
  for (const [oldN, newN] of renames) {
    if ((await db.schema.hasTable(oldN)) && !(await db.schema.hasTable(newN))) {
      await db.schema.renameTable(oldN, newN);
      console.log(`✓ renamed table ${oldN} → ${newN}`);
    }
  }

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

  if (!(await db.schema.hasTable('main_requests'))) {
    await db.schema.createTable('main_requests', (t) => {
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
    console.log('✓ created table: main_requests');
  } else {
    for (const [col, def] of [
      ['phone', (t) => t.string('phone', 40)],
      ['needed_time', (t) => t.string('needed_time', 10)],
      ['urgent', (t) => t.boolean('urgent').defaultTo(false)],
      ['notes', (t) => t.string('notes', 1000)],
      ['kitchen_notes', (t) => t.string('kitchen_notes', 1000)],
      ['reject_reason', (t) => t.string('reject_reason', 1000)],
      // Phase 2 — order details
      ['type', (t) => t.string('type', 60)], // مشرفين | فعالية | اجتماع
      ['classification', (t) => t.string('classification', 30)], // ready | hot
      ['location', (t) => t.string('location', 300)],
      ['department_code', (t) => t.string('department_code', 20)],
      ['costcenter1', (t) => t.string('costcenter1', 20)],
      ['costcenter2', (t) => t.string('costcenter2', 20)],
      ['costcenter3', (t) => t.string('costcenter3', 20)],
      ['costcenter4', (t) => t.string('costcenter4', 20)],
      ['costcenter5', (t) => t.string('costcenter5', 20)],
      // Phase 4 — SAP integration tracking (per request)
      ['sap_document_number', (t) => t.bigInteger('sap_document_number').defaultTo(0)],
      ['sap_integration_feedback', (t) => t.string('sap_integration_feedback', 1000)],
      ['sap_number_of_try', (t) => t.integer('sap_number_of_try').defaultTo(0)]
    ]) {
      if (!(await db.schema.hasColumn('main_requests', col))) {
        await db.schema.alterTable('main_requests', def);
        console.log(`✓ added column: main_requests.${col}`);
      }
    }
  }

  // Order line items — one row per item. kind = 'suggested' (by requester) or
  // 'requested' (the actual items the kitchen sets — these are recorded/pushed).
  if (!(await db.schema.hasTable('order_request_items'))) {
    await db.schema.createTable('order_request_items', (t) => {
      t.increments('id').primary();
      t.integer('meal_request_id').index();
      t.integer('meal_id');
      t.string('item_code', 60);
      t.string('meal_name', 400);
      t.string('emoji', 16);
      t.integer('quantity').defaultTo(1);
      t.decimal('unit_price', 12, 2).defaultTo(0);
      t.string('description', 500); // for off-menu special items
      t.string('kind', 20).defaultTo('suggested');
    });
    console.log('✓ created table: order_request_items');
  } else {
    for (const [col, def] of [
      ['item_code', (t) => t.string('item_code', 60)],
      ['description', (t) => t.string('description', 500)],
      ['kind', (t) => t.string('kind', 20).defaultTo('suggested')]
    ]) {
      if (!(await db.schema.hasColumn('order_request_items', col))) {
        await db.schema.alterTable('order_request_items', def);
        console.log(`✓ added column: order_request_items.${col}`);
      }
    }
  }

  if (!(await db.schema.hasTable('request_budget'))) {
    await db.schema.createTable('request_budget', (t) => {
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
    console.log('✓ created table: request_budget');
  } else {
    for (const [col, def] of [
      ['attachment_name', (t) => t.string('attachment_name', 300)],
      ['attachment_mime', (t) => t.string('attachment_mime', 120)],
      ['attachment_data', (t) => t.text('attachment_data')]
    ]) {
      if (!(await db.schema.hasColumn('request_budget', col))) {
        await db.schema.alterTable('request_budget', def);
        console.log(`✓ added column: request_budget.${col}`);
      }
    }
  }

  // Local mirror of what we push to SAP. The real SAP Sales Order lives in the
  // SAP SQL Server (see sapService) — this row tracks our side + the returned id.
  if (!(await db.schema.hasTable('sap_sales_orders'))) {
    await db.schema.createTable('sap_sales_orders', (t) => {
      t.increments('id').primary();
      t.integer('meal_request_id').index();
      t.string('sap_id', 100);
      t.string('status', 20).defaultTo('pending'); // pending|pushed|failed
      t.text('payload');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✓ created table: sap_sales_orders');
  }

  // ── SAP-mirrored reference data (synced from EFB_DB) ───────────────────────
  // Items master (from dbo.Items). The menu is built from these.
  if (!(await db.schema.hasTable('Items'))) {
    await db.schema.createTable('Items', (t) => {
      t.string('item_code', 60).primary();
      t.string('item_name', 400);
      t.bigInteger('classification'); // MainItemClassificationType
      t.string('u_classification', 20); // U_ItemClassification (4=hot meal, 5=ready, …)
      t.float('weight'); // grams
      t.float('u_weight'); // U_Weight
      t.string('uom', 30);
      t.float('qty_on_stock');
      t.decimal('price', 14, 4).defaultTo(0); // default price-list price
      t.boolean('is_active').defaultTo(true);
      t.timestamp('synced_at');
    });
    console.log('✓ created table: Items');
  } else {
    for (const [col, def] of [
      ['u_classification', (t) => t.string('u_classification', 20)],
      ['u_weight', (t) => t.float('u_weight')]
    ]) {
      if (!(await db.schema.hasColumn('Items', col))) {
        await db.schema.alterTable('Items', def);
        console.log(`✓ added column: Items.${col}`);
      }
    }
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
      t.integer('dim_code'); // 3=department, 5=programme, 1/2=auto
      t.string('grp_code', 20);
      t.string('division', 120);
      t.string('platform', 60);
      t.string('programme', 80);
      t.string('cc_type', 20);
      t.boolean('active').defaultTo(true);
      t.timestamp('synced_at');
    });
    console.log('✓ created table: CostCenters');
  } else {
    for (const [col, def] of [
      ['dim_code', (t) => t.integer('dim_code')],
      ['grp_code', (t) => t.string('grp_code', 20)]
    ]) {
      if (!(await db.schema.hasColumn('CostCenters', col))) {
        await db.schema.alterTable('CostCenters', def);
        console.log(`✓ added column: CostCenters.${col}`);
      }
    }
  }
}

module.exports = migrate;
