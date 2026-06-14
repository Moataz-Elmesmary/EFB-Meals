// Inbound sync: SAP-mirror (EFB_DB) → our EFBMeals reference tables.
// Items / cost centers are upserted by code (create if new, update if exists);
// price lists & recipe lines are full-refreshed (pure detail mirrors).
const dao = require('../db');
const src = require('./sapSource');

const db = dao.db;
const PRICE_LIST = parseInt(process.env.SAP_DEFAULT_PRICE_LIST || '1', 10);

async function upsertByKey(table, key, rows) {
  if (!rows.length) return { ins: 0, upd: 0 };
  const existing = new Set((await db(table).select(key)).map((r) => r[key]));
  const toInsert = rows.filter((r) => !existing.has(r[key]));
  const toUpdate = rows.filter((r) => existing.has(r[key]));
  for (let i = 0; i < toInsert.length; i += 200) {
    await db.batchInsert(table, toInsert.slice(i, i + 200));
  }
  for (const r of toUpdate) {
    const { [key]: k, ...rest } = r;
    await db(table).where(key, k).update(rest);
  }
  return { ins: toInsert.length, upd: toUpdate.length };
}

async function fullRefresh(table, rows) {
  await db(table).del();
  for (let i = 0; i < rows.length; i += 200) {
    await db.batchInsert(table, rows.slice(i, i + 200));
  }
  return rows.length;
}

async function syncCostCenters() {
  const rows = await src.query(
    'SELECT PrcCode, PrcName, DimCode, GrpCode, U_Division, U_Platform, U_Programme, CCTypeCode, Active FROM sap_efb.CostCenter'
  );
  const mapped = rows
    .filter((r) => r.PrcCode)
    .map((r) => ({
      code: String(r.PrcCode),
      name: r.PrcName || null,
      dim_code: r.DimCode != null ? Number(r.DimCode) : null,
      grp_code: r.GrpCode != null ? String(r.GrpCode) : null,
      division: r.U_Division || null,
      platform: r.U_Platform || null,
      programme: r.U_Programme || null,
      cc_type: r.CCTypeCode || null,
      active: r.Active === 'Y' || r.Active === 1,
      synced_at: new Date()
    }));
  return upsertByKey('CostCenters', 'code', mapped);
}

async function syncItems() {
  const rows = await src.query(
    'SELECT ItemCode, ItemName, MainItemClassificationType, U_ItemClassification, Weight, U_Weight, UOM, QuantityOnStock, IsActive FROM dbo.Items WHERE ItemCode IS NOT NULL'
  );
  const mapped = rows.map((r) => ({
    item_code: String(r.ItemCode),
    item_name: r.ItemName || null,
    classification: r.MainItemClassificationType != null ? Number(r.MainItemClassificationType) : null,
    u_classification: r.U_ItemClassification != null ? String(r.U_ItemClassification) : null,
    weight: r.Weight || 0,
    u_weight: r.U_Weight || 0,
    uom: r.UOM != null ? String(r.UOM) : null,
    qty_on_stock: r.QuantityOnStock || 0,
    is_active: r.IsActive === 1 || r.IsActive === '1',
    synced_at: new Date()
  }));
  // de-dupe by code (source may repeat)
  const byCode = new Map();
  mapped.forEach((m) => byCode.set(m.item_code, m));
  return upsertByKey('Items', 'item_code', [...byCode.values()]);
}

async function syncPrices() {
  const rows = await src.query(
    'SELECT it.ItemCode AS code, p.[ItemPrices.PriceList] AS pl, p.[ItemPrices.Price] AS price ' +
      'FROM dbo.Items_ItemPrices p JOIN dbo.Items it ON it._id = p._id WHERE it.ItemCode IS NOT NULL'
  );
  const mapped = rows.map((r) => ({ item_code: String(r.code), price_list: r.pl != null ? Number(r.pl) : null, price: r.price || 0 }));
  const n = await fullRefresh('Item_Prices', mapped);
  // set each item's default price from the configured price list
  const defaults = mapped.filter((m) => m.price_list === PRICE_LIST);
  for (const d of defaults) await db('Items').where('item_code', d.item_code).update({ price: d.price });
  return n;
}

async function syncRecipes() {
  const heads = await src.query('SELECT TreeCode, ProductDescription, Quantity, TreeType FROM dbo.ProductTree WHERE TreeCode IS NOT NULL');
  const mappedHeads = heads.map((r) => ({
    tree_code: String(r.TreeCode),
    product_description: r.ProductDescription || null,
    quantity: r.Quantity || 0,
    tree_type: r.TreeType || null,
    synced_at: new Date()
  }));
  const h = await upsertByKey('ProductTree', 'tree_code', mappedHeads);

  const lines = await src.query(
    'SELECT [ProductTreeLines.ParentItem] AS tree, [ProductTreeLines.ChildNum] AS cn, ' +
      '[ProductTreeLines.ItemCode] AS code, [ProductTreeLines.ItemName] AS name, [ProductTreeLines.Quantity] AS qty ' +
      'FROM dbo.ProductTree_ProductTreeLines'
  );
  const mappedLines = lines
    .filter((r) => r.tree)
    .map((r) => ({
      tree_code: String(r.tree),
      child_num: r.cn != null ? Number(r.cn) : null,
      item_code: r.code != null ? String(r.code) : null,
      item_name: r.name || null,
      quantity: r.qty || 0
    }));
  const l = await fullRefresh('ProductTree_Lines', mappedLines);
  return { heads: h, lines: l };
}

let running = false;
async function runAll() {
  if (!src.SOURCE_ENABLED) {
    console.log('Item sync disabled (no MSSQL source configured)');
    return;
  }
  if (running) {
    console.log('Item sync already in progress — skipping');
    return;
  }
  running = true;
  const t0 = Date.now();
  try {
    const cc = await syncCostCenters();
    const items = await syncItems();
    const prices = await syncPrices();
    const recipes = await syncRecipes();
    console.log(
      `✓ SAP sync from ${src.SOURCE_DB} in ${Date.now() - t0}ms — ` +
        `costCenters(+${cc.ins}/~${cc.upd}) items(+${items.ins}/~${items.upd}) prices(${prices}) ` +
        `recipes(+${recipes.heads.ins}/~${recipes.heads.upd}, lines ${recipes.lines})`
    );
  } catch (e) {
    console.error('SAP sync failed:', e.message);
  } finally {
    running = false;
  }
}

function start() {
  if (!src.SOURCE_ENABLED) return;
  const mins = parseInt(process.env.SYNC_INTERVAL_MIN || '10', 10);
  // Avoid the full ~2min sync on every (nodemon) restart unless asked.
  if (process.env.SYNC_ON_BOOT === 'true') runAll();
  setInterval(runAll, mins * 60 * 1000);
  console.log(`Item sync scheduled every ${mins} min (boot run: ${process.env.SYNC_ON_BOOT === 'true'})`);
}

module.exports = { runAll, start, syncItems, syncPrices, syncRecipes, syncCostCenters };
