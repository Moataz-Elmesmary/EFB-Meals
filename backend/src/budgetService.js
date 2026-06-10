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

// Step 2 — kitchen approves the order and sets the required budget amount.
async function setBudget(id, { amount, currency, vendor }) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  await dao.createBudget({
    meal_request_id: id,
    amount: parseFloat(amount),
    currency: currency || 'EGP',
    vendor: vendor || '',
    created_by: 'kitchen'
  });
  await dao.updateRequest(id, { status: 'budget_set', reject_reason: '' });
  if (req.requester_email) {
    email
      .sendNotification(
        req.requester_email,
        `💰 Budget required #${id} — موازنة مطلوبة`,
        T.budgetSetTemplate(req, { amount: parseFloat(amount), currency: currency || 'EGP' })
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
      .sendNotification(req.requester_email, `🎉 Order confirmed #${id} — طلبك اكتمل`, T.budgetApprovedTemplate(req))
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
