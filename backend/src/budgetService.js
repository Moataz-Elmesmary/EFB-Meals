// Shared budget-flow actions, used by both the kitchen API and the in-email
// approve/reject links so the behaviour is identical everywhere.
const dao = require('./db');
const email = require('./email');
const { pushRequestToSAP } = require('./sapService');
const T = require('./templates/emailTemplates');

// Kitchen asks the requester to upload a budget PDF.
async function requestBudget(id) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  await dao.updateRequest(id, { status: 'budget_requested' });
  if (req.requester_email) {
    email
      .sendNotification(req.requester_email, `📄 Budget needed #${id} — مطلوب موازنة`, T.budgetUploadRequestTemplate(req))
      .catch(() => {});
  }
  return { status: 'budget_requested' };
}

// Approve the uploaded budget → push to SAP → notify requester.
async function approve(id) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  const budget = await dao.latestBudgetFor(id);
  if (!budget) throw new Error('No budget uploaded to approve.');
  const sap = await pushRequestToSAP(id);
  await dao.updateRequest(id, { status: 'ready_for_sap' });
  if (req.requester_email) {
    email
      .sendNotification(req.requester_email, `🎉 Budget approved #${id} — تم اعتماد الموازنة`, T.budgetApprovedTemplate(req))
      .catch(() => {});
  }
  return { status: 'ready_for_sap', ...sap };
}

// Reject with a reason → notify requester (who can re-upload).
async function reject(id, reason) {
  const req = await dao.getRequest(id);
  if (!req) throw new Error('Request not found');
  await dao.updateRequest(id, { status: 'budget_rejected', reject_reason: reason || '' });
  if (req.requester_email) {
    email
      .sendNotification(req.requester_email, `⚠️ Budget needs changes #${id} — تعديل الموازنة`, T.budgetRejectedTemplate(req, reason || ''))
      .catch(() => {});
  }
  return { status: 'budget_rejected' };
}

// Kitchen adds a note (delay / problem / info) → notify requester.
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

module.exports = { requestBudget, approve, reject, addNote };
