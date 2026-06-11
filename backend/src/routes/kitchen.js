const express = require('express');
const router = express.Router();
const dao = require('../db');
const budgetFlow = require('../budgetService');

// Kitchen queue — each request with its latest budget (if any)
router.get('/requests', async (req, res) => {
  try {
    res.json(await dao.kitchenRequests());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

// Step 2 — kitchen approves the order, sets the FINAL (requested) items +
// notes + the required budget amount. These items are what gets recorded.
router.post('/set-budget/:id', async (req, res) => {
  const { amount, currency, vendor, notes, items } = req.body || {};
  if (amount == null || amount === '' || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'A valid budget amount is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to record for this order.' });
  }
  try {
    res.json(await budgetFlow.setBudget(parseInt(req.params.id, 10), { amount, currency, vendor, notes, items }));
  } catch (e) {
    res.status(e.message === 'Request not found' ? 404 : 500).json({ error: e.message });
  }
});

// Step 2 (alt) — kitchen rejects the whole order.
router.post('/reject-order/:id', async (req, res) => {
  const reason = (req.body && req.body.reason) || '';
  if (!reason.trim()) return res.status(400).json({ error: 'A reason is required.' });
  try {
    res.json(await budgetFlow.rejectOrder(parseInt(req.params.id, 10), reason));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Step 4 — kitchen approves the uploaded budget document → SAP.
router.post('/approve/:id', async (req, res) => {
  try {
    res.json(await budgetFlow.approve(parseInt(req.params.id, 10)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Step 4 (alt) — kitchen rejects the uploaded document (requester re-uploads).
router.post('/reject/:id', async (req, res) => {
  const reason = (req.body && req.body.reason) || '';
  if (!reason.trim()) return res.status(400).json({ error: 'A rejection reason is required.' });
  try {
    res.json(await budgetFlow.reject(parseInt(req.params.id, 10), reason));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Kitchen note (delay / problem / info) at any time.
router.post('/note/:id', async (req, res) => {
  const note = (req.body && req.body.note) || '';
  try {
    res.json(await budgetFlow.addNote(parseInt(req.params.id, 10), note));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
