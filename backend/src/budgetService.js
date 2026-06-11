// Shared budget-flow actions used by the kitchen API and the in-email links.
//
// Flow:
//   requested        → kitchen reviews the order
//   budget_set       → kitchen approved & set the required amount; employee uploads PDF
//   budget_uploaded  → employee uploaded the PDF; kitchen approves/rejects (app or email)
//   ready_for_sap    → kitchen approved → pushed to SAP
//   rejected         → kitchen rejected the order (terminal)
const dao = require('./db');
const email = require('./email');
const { pushRequestToSAP } = require('./sapService');
const T = require('./templates/emailTemplates');

// Step 2 — the kitchen reviews the order, enters the FINAL (requested) items +
// quantities + a note, and sets the required budget. These items are what gets
// recorded and (later) pushed to SAP — not the requester's suggestions.
async function setBudget(id, { amount, currency, vendor, notes, items }) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');

  // resolve the kitchen's requested items
  const resolved = [];
  for (const it of items || []) {
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    if (it.special) {
      const text = String(it.meal_name || '').trim();
      if (text) resolved.push({ item_code: null, meal_name: text, description: it.description || '', emoji: '✏️', quantity: qty, kind: 'requested' });
    } else if (it.item_code) {
      const m = await dao.getItem(it.item_code);
      if (m) resolved.push({ item_code: m.item_code, meal_name: m.item_name, emoji: '🍽️', quantity: qty, unit_price: m.price || 0, kind: 'requested' });
    }
  }

  await dao.createBudget({ meal_request_id: id, amount: parseFloat(amount), currency: currency || 'EGP', vendor: vendor || '', created_by: 'kitchen' });
  if (resolved.length) await dao.replaceItems(id, resolved, 'requested');
  await dao.updateRequest(id, { status: 'budget_set', reject_reason: '', kitchen_notes: notes || '' });

  const fresh = await dao.getRequest(id);
  if (req.requester_email) {
    email
      .sendNotification(
        req.requester_email,
        `💰 Budget required #${id} — موازنة مطلوبة`,
        T.budgetSetTemplate(fresh, { amount: parseFloat(amount), currency: currency || 'EGP', notes })
      )
      .catch(() => {});
  }
  return { status: 'budget_set' };
}

// Step 2 (alt) — kitchen rejects the whole order.
async function rejectOrder(id, reason) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  await dao.updateRequest(id, { status: 'rejected', reject_reason: reason || '' });
  if (req.requester_email) {
    email
      .sendNotification(req.requester_email, `❌ Order declined #${id} — تم رفض الطلب`, T.orderRejectedTemplate(req, reason || ''))
      .catch(() => {});
  }
  return { status: 'rejected' };
}

// Step 4 — kitchen approves the uploaded budget document → push to SAP.
async function approve(id) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  const budget = await dao.latestBudgetFor(id);
  if (!budget || !budget.attachment_data) throw new Error('No budget document uploaded yet.');
  const sap = await pushRequestToSAP(id);
  await dao.updateRequest(id, { status: 'ready_for_sap' });
  if (req.requester_email) {
    email
      .sendNotification(req.requester_email, `🎉 Order confirmed #${id} — طلبك اكتمل`, T.budgetApprovedTemplate(req, budget))
      .catch(() => {});
  }
  return { status: 'ready_for_sap', ...sap };
}

// Step 4 (alt) — kitchen rejects the uploaded document → employee re-uploads.
async function reject(id, reason) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  await dao.updateRequest(id, { status: 'budget_set', reject_reason: reason || '' });
  if (req.requester_email) {
    email
      .sendNotification(req.requester_email, `⚠️ Budget needs changes #${id} — تعديل الموازنة`, T.budgetRejectedTemplate(req, reason || ''))
      .catch(() => {});
  }
  return { status: 'budget_set' };
}

// Kitchen note at any time.
async function addNote(id, note) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  await dao.updateRequest(id, { kitchen_notes: note || '' });
  if (req.requester_email && note) {
    email
      .sendNotification(req.requester_email, `💬 Update on #${id} — تحديث على طلبك`, T.kitchenNoteTemplate(req, note))
      .catch(() => {});
  }
  return { ok: true };
}

module.exports = { setBudget, rejectOrder, approve, reject, addNote };
