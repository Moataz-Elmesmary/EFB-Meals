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

// Kitchen → ask the requester to upload a budget PDF.
router.post('/request-budget/:id', async (req, res) => {
  try {
    res.json(await budgetFlow.requestBudget(parseInt(req.params.id, 10)));
  } catch (e) {
    res.status(e.message === 'Request not found' ? 404 : 500).json({ error: e.message });
  }
});

// Kitchen → approve the uploaded budget (→ SAP).
router.post('/approve/:id', async (req, res) => {
  try {
    res.json(await budgetFlow.approve(parseInt(req.params.id, 10)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Kitchen → reject the budget with a reason.
router.post('/reject/:id', async (req, res) => {
  const reason = (req.body && req.body.reason) || '';
  if (!reason.trim()) return res.status(400).json({ error: 'A rejection reason is required.' });
  try {
    res.json(await budgetFlow.reject(parseInt(req.params.id, 10), reason));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Kitchen → add a note (delay / problem / info).
router.post('/note/:id', async (req, res) => {
  const note = (req.body && req.body.note) || '';
  try {
    res.json(await budgetFlow.addNote(parseInt(req.params.id, 10), note));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
