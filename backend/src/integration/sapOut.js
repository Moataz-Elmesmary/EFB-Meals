// ───────────────────────────────────────────────────────────
// SAP OUTBOUND MIDDLEWARE (the integration job).
//
// Pattern (same as the Fleet integration):
//   every N minutes →
//     GET  approved requests where sap_document_number = 0   (dao.pendingForSap)
//     MAP  each into a SAP document model                    (mapToSapDoc)
//     PUSH to SAP via the API (user/password)                (sapClient)
//     UPDATE by request id:                                  (dao.recordSapResult)
//        success → sap_document_number = <returned>, feedback = OK, try += 1
//        failure → feedback = <error>, try += 1  (document stays 0 → retried)
// ───────────────────────────────────────────────────────────
const dao = require('./../db');
const sapClient = require('./sapClient');

// The kitchen's items are the recorded/authoritative ones that go to SAP.
const RECORDED_KIND = 'requested';
const INTERVAL_MIN = parseInt(process.env.SAP_OUT_INTERVAL_MIN || '5', 10);

let running = false;

// Map one request (header + items + budget) into the SAP document model.
// Kept in one place so the field mapping is easy to adjust to the real doc type.
function mapToSapDoc(req) {
  const recorded = (req.items || []).filter((i) => i.kind === RECORDED_KIND);
  return {
    // our tracking key (UDF on the SAP side)
    RequestId: req.id,
    U_RequestId: req.id,
    DocDate: req.needed_date || undefined,
    Comments: `EFB Meals #${req.id} · ${req.requester_name || ''} · ${req.department || ''}`.trim(),
    // cost-center allocation (header)
    CostCenter1: req.costcenter1 || req.department_code || null,
    CostCenter2: req.costcenter2 || null,
    CostCenter3: req.costcenter3 || null,
    CostCenter4: req.costcenter4 || null,
    CostCenter5: req.costcenter5 || null,
    Budget: req.budget ? { amount: req.budget.amount, currency: req.budget.currency } : null,
    BudgetFileName: req.budget && req.budget.attachment_name,
    BudgetFileBase64: req.budget && req.budget.attachment_data,
    // lines = the kitchen's recorded items
    DocumentLines: recorded.map((it) => ({
      ItemCode: it.item_code || null,
      ItemDescription: it.meal_name,
      Quantity: it.quantity,
      special: !it.item_code
    }))
  };
}

async function pushOne(req) {
  try {
    // ensure any off-menu special item exists on SAP first (create/update by code)
    for (const it of (req.items || []).filter((i) => i.kind === RECORDED_KIND && !i.item_code)) {
      const code = `EFB${req.id}-${(it.meal_name || '').slice(0, 8)}`.replace(/\s+/g, '');
      await sapClient.upsertItem({ ItemCode: code, ItemName: it.meal_name, ItemsGroupCode: -1 });
    }
    const doc = mapToSapDoc(req);
    const { docNum, docEntry } = await sapClient.createDocument(doc);
    const tries = await dao.recordSapResult(req.id, { documentNumber: docNum, feedback: `OK · DocEntry ${docEntry}` });
    console.log(`SAP ✓ request #${req.id} → doc ${docNum} (try ${tries})`);
    return true;
  } catch (e) {
    const tries = await dao.recordSapResult(req.id, { documentNumber: null, feedback: e.message });
    console.error(`SAP ✗ request #${req.id} (try ${tries}): ${e.message}`);
    return false;
  }
}

// One sweep: push everything that's pending.
async function runOnce() {
  if (running) return { skipped: true };
  if (!sapClient.ENABLED) return { skipped: true, reason: 'SAP not configured' };
  running = true;
  let ok = 0;
  let fail = 0;
  try {
    const pending = await dao.pendingForSap();
    for (const req of pending) {
      const done = await pushOne(req);
      done ? ok++ : fail++;
    }
    if (pending.length) console.log(`SAP sweep: ${ok} pushed, ${fail} failed, of ${pending.length}`);
    return { ok, fail, total: pending.length };
  } finally {
    running = false;
  }
}

function start() {
  if (!sapClient.ENABLED) {
    console.log('SAP outbound disabled (set SAP_API_URL + user/pass, or SAP_DRY_RUN=true)');
    return;
  }
  console.log(`SAP outbound middleware on${sapClient.DRY_RUN ? ' (DRY RUN)' : ''}, every ${INTERVAL_MIN} min`);
  setInterval(() => runOnce().catch((e) => console.error('SAP sweep error:', e.message)), INTERVAL_MIN * 60 * 1000);
}

module.exports = { runOnce, start, pushOne, mapToSapDoc };
