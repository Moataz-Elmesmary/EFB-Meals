const express = require('express');
const router = express.Router();
const dao = require('../db');
const { pushRequestToSAP } = require('../sapService');
const itemSync = require('../integration/sync');
const sapOut = require('../integration/sapOut');
const sapClient = require('../integration/sapClient');

// Trigger an item/cost-center sync from the SAP mirror on demand.
router.post('/sync', (req, res) => {
  itemSync.runAll();
  res.json({ ok: true, message: 'Sync started' });
});

// ── Test helpers (call these from Postman) ──────────────────────────────
// 1) Preview the exact JSON that would be posted to SAP for a request.
router.get('/preview/:requestId', async (req, res) => {
  try {
    const r = await dao.getRequest(parseInt(req.params.requestId, 10));
    if (!r) return res.status(404).json({ error: 'Request not found' });
    r.budget = await dao.latestBudgetFor(r.id);
    res.json(sapOut.mapToSapDoc(r));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Test the item upsert on SAP (create if new, update if the code exists).
//    Body: { "ItemCode": "...", "ItemName": "..." }
router.post('/test-item', async (req, res) => {
  try {
    res.json(await sapClient.upsertItem(req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3) Test the full push (map → SAP → write back doc/feedback/try) for one request.
router.post('/test-push/:requestId', async (req, res) => {
  try {
    const r = await dao.getRequest(parseInt(req.params.requestId, 10));
    if (!r) return res.status(404).json({ error: 'Request not found' });
    r.budget = await dao.latestBudgetFor(r.id);
    const ok = await sapOut.pushOne(r);
    res.json({ pushed: ok, request: await dao.getRequest(r.id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manually (re)push a request to SAP as a Sales Order.
router.post('/push/:requestId', async (req, res) => {
  try {
    res.status(201).json(await pushRequestToSAP(parseInt(req.params.requestId, 10)));
  } catch (e) {
    const code = e.message === 'Request not found' ? 404 : 500;
    res.status(code).json({ error: e.message });
  }
});

// Inspect recorded Sales Orders (handy for SAP integration debugging).
router.get('/orders', async (req, res) => {
  try {
    res.json(await dao.listSalesOrders());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
