const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dao = require('../db');
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

// Download a budget attachment straight from the DB copy (source of truth).
router.get('/budget/:budgetId/file', async (req, res) => {
  try {
    const b = await dao.getBudget(parseInt(req.params.budgetId, 10));
    if (!b || !b.attachment_data) return res.status(404).send('Not found');
    res.setHeader('Content-Type', b.attachment_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${b.attachment_name || 'budget'}"`);
    res.send(Buffer.from(b.attachment_data, 'base64'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Kitchen queue — each request with its latest budget (if any)
router.get('/requests', async (req, res) => {
  try {
    res.json(await dao.kitchenRequests());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
  try {
    // Store the file in the DB too (source of truth) in addition to the disk copy.
    let attachmentData = null;
    try {
      attachmentData = fs.readFileSync(req.file.path).toString('base64');
    } catch (_) {}

    const budgetId = await dao.createBudget({
      meal_request_id: requestId,
      amount: parseFloat(amount),
      currency: currency || 'EGP',
      vendor: vendor || '',
      notes: notes || '',
      attachment_path: attachmentPath,
      attachment_name: req.file.originalname,
      attachment_mime: req.file.mimetype,
      attachment_data: attachmentData,
      created_by: created_by || 'kitchen'
    });
    await dao.setStatus(requestId, 'budget_requested');

    const reqRow = await dao.getRequest(requestId);
    if (reqRow && reqRow.requester_email) {
      email
        .sendNotification(
          reqRow.requester_email,
          `💰 Budget ready for request #${requestId} — تم تجهيز الميزانية`,
          budgetCreatedTemplate(reqRow, { amount: parseFloat(amount), currency: currency || 'EGP', vendor, notes })
        )
        .catch(() => {});
    }
    res.status(201).json({ budgetId, attachmentPath, amount: parseFloat(amount), status: 'budget_requested' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mark ready → push to SAP Sales Order + notify requester.
router.post('/ready/:requestId', async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  try {
    const reqRow = await dao.getRequest(requestId);
    if (!reqRow) return res.status(404).json({ error: 'Request not found' });

    const budget = await dao.latestBudgetFor(requestId);
    if (!budget) return res.status(400).json({ error: 'A budget must be created before marking ready.' });

    const result = await pushRequestToSAP(requestId);
    await dao.setStatus(requestId, 'ready_for_sap');

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
