const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const email = require('../email');
const { pushRequestToSAP } = require('../sapService');
const { budgetCreatedTemplate, readyTemplate } = require('../templates/emailTemplates');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function fetchRequest(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT mr.*, m.name_en, m.name_ar, m.emoji
         FROM MealRequest mr LEFT JOIN Meal m ON m.id = mr.meal_id
        WHERE mr.id = ?`,
      [id],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

// Kitchen queue — all requests with their latest budget (if any)
router.get('/requests', (req, res) => {
  const sql = `
    SELECT mr.*, m.name_en, m.name_ar, m.emoji,
           b.id AS budget_id, b.amount, b.currency, b.vendor, b.attachment_path, b.notes AS budget_notes
      FROM MealRequest mr
      LEFT JOIN Meal m ON m.id = mr.meal_id
      LEFT JOIN BudgetRequest b ON b.id = (
        SELECT id FROM BudgetRequest WHERE meal_request_id = mr.id ORDER BY id DESC LIMIT 1
      )
     ORDER BY mr.created_at DESC`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create a budget request — amount AND attachment are mandatory.
router.post('/budget/:requestId', upload.single('attachment'), async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  const { amount, currency, vendor, notes, created_by } = req.body;

  if (!req.file) return res.status(400).json({ error: 'Attachment is required for budget requests.' });
  if (amount == null || amount === '' || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'A valid budget amount is required.' });
  }

  const attachmentPath = `/uploads/${req.file.filename}`;
  const sql = `INSERT INTO BudgetRequest
    (meal_request_id, amount, currency, vendor, notes, attachment_path, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(
    sql,
    [requestId, parseFloat(amount), currency || 'EGP', vendor || '', notes || '', attachmentPath, created_by || 'kitchen'],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const budgetId = this.lastID;
      db.run('UPDATE MealRequest SET status=? WHERE id=?', ['budget_requested', requestId]);

      try {
        const reqRow = await fetchRequest(requestId);
        if (reqRow && reqRow.requester_email) {
          const budget = { amount: parseFloat(amount), currency: currency || 'EGP', vendor, notes };
          email
            .sendNotification(
              reqRow.requester_email,
              `💰 Budget ready for request #${requestId} — تم تجهيز الميزانية`,
              budgetCreatedTemplate(reqRow, budget)
            )
            .catch(() => {});
        }
      } catch (_) {}

      res.status(201).json({ budgetId, attachmentPath, amount: parseFloat(amount), status: 'budget_requested' });
    }
  );
});

// Mark ready → push to SAP (SalesOrder) and notify requester.
router.post('/ready/:requestId', async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  try {
    const reqRow = await fetchRequest(requestId);
    if (!reqRow) return res.status(404).json({ error: 'Request not found' });

    // budget is required before a request can be marked ready
    const budget = await new Promise((resolve) =>
      db.get('SELECT id FROM BudgetRequest WHERE meal_request_id=? LIMIT 1', [requestId], (e, r) => resolve(r))
    );
    if (!budget) return res.status(400).json({ error: 'A budget must be created before marking ready.' });

    const result = await pushRequestToSAP(requestId);
    db.run('UPDATE MealRequest SET status=? WHERE id=?', ['ready_for_sap', requestId]);

    if (reqRow.requester_email) {
      email
        .sendNotification(
          reqRow.requester_email,
          `✅ Request #${requestId} is ready — طلبك جاهز`,
          readyTemplate(reqRow)
        )
        .catch(() => {});
    }
    res.json({ ok: true, status: 'ready_for_sap', ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
