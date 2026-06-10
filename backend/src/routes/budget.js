const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dao = require('../db');
const email = require('../email');
const budgetFlow = require('../budgetService');
const { makeToken, verifyToken } = require('../actionToken');
const T = require('../templates/emailTemplates');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;

// ── Requester uploads the budget document (PDF). Amount was set by the kitchen.
router.post('/budget/upload/:id', upload.single('attachment'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!req.file) return res.status(400).json({ error: 'A budget PDF is required.' });
  try {
    const reqRow = await dao.getRequest(id);
    if (!reqRow) return res.status(404).json({ error: 'Request not found' });
    const budget = await dao.latestBudgetFor(id);
    if (!budget) return res.status(400).json({ error: 'No budget has been set for this order yet.' });

    let data = null;
    try {
      data = fs.readFileSync(req.file.path).toString('base64');
    } catch (_) {}

    await dao.updateBudget(budget.id, {
      attachment_path: `/uploads/${req.file.filename}`,
      attachment_name: req.file.originalname,
      attachment_mime: req.file.mimetype,
      attachment_data: data,
      created_by: reqRow.requester_email
    });
    await dao.updateRequest(id, { status: 'budget_uploaded', reject_reason: '' });

    // notify the kitchen with the PDF + approve/reject links
    const links = {
      approve: `${API_URL}/api/budget/action?token=${makeToken(id, 'approve')}`,
      reject: `${API_URL}/api/budget/action?token=${makeToken(id, 'reject')}`
    };
    const attachments = data
      ? [{ name: req.file.originalname, contentType: req.file.mimetype || 'application/pdf', content: data }]
      : [];
    email
      .sendNotification(
        process.env.KITCHEN_EMAIL || 'kitchen@efb.eg',
        `🧾 Budget uploaded #${id} — تم رفع الموازنة`,
        T.budgetUploadedTemplate(reqRow, budget, links),
        attachments
      )
      .catch(() => {});

    res.status(201).json({ status: 'budget_uploaded' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── In-email approve / reject of the uploaded document (token-verified) ──
function page(message, ok) {
  const color = ok ? '#085648' : '#CC4948';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f7f5;display:grid;place-items:center;min-height:100vh;">
    <div style="background:#fff;border-radius:18px;padding:40px;max-width:420px;text-align:center;box-shadow:0 12px 40px rgba(8,30,28,.12);">
      <div style="font-size:48px;">${ok ? '✅' : '⚠️'}</div>
      <h2 style="color:${color};margin:14px 0 6px;">${message}</h2>
      <p style="color:#56706a;font-size:14px;">EFB Meals</p>
    </div>
  </body></html>`;
}

function rejectForm(token) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f7f5;display:grid;place-items:center;min-height:100vh;">
    <form method="POST" action="/api/budget/action/reject" style="background:#fff;border-radius:18px;padding:34px;max-width:440px;width:90%;box-shadow:0 12px 40px rgba(8,30,28,.12);">
      <h2 style="color:#085648;margin:0 0 6px;">رفض الموازنة · Reject budget</h2>
      <p style="color:#56706a;font-size:14px;margin:0 0 16px;">اكتب سبب الرفض عشان يوصل لمقدّم الطلب.</p>
      <input type="hidden" name="token" value="${token}">
      <textarea name="reason" required placeholder="سبب الرفض..." style="width:100%;min-height:110px;border:1.5px solid #e3e8e6;border-radius:12px;padding:12px;font:inherit;box-sizing:border-box;"></textarea>
      <button type="submit" style="margin-top:14px;width:100%;background:#CC4948;color:#fff;border:0;border-radius:10px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;">تأكيد الرفض · Confirm</button>
    </form>
  </body></html>`;
}

router.get('/budget/action', async (req, res) => {
  const v = verifyToken(req.query.token);
  if (!v) return res.status(400).send(page('انتهت صلاحية الرابط أو غير صالح', false));
  if (v.decision === 'reject') return res.send(rejectForm(req.query.token));
  try {
    await budgetFlow.approve(v.requestId);
    res.send(page(`تم اعتماد الموازنة للطلب #${v.requestId}`, true));
  } catch (e) {
    res.status(400).send(page(e.message, false));
  }
});

router.post('/budget/action/reject', express.urlencoded({ extended: true }), async (req, res) => {
  const v = verifyToken(req.body.token);
  if (!v || v.decision !== 'reject') return res.status(400).send(page('رابط غير صالح', false));
  try {
    await budgetFlow.reject(v.requestId, req.body.reason || '');
    res.send(page(`تم رفض الموازنة للطلب #${v.requestId}`, true));
  } catch (e) {
    res.status(400).send(page(e.message, false));
  }
});

module.exports = router;
