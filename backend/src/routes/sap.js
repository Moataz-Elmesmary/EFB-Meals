const express = require('express');
const router = express.Router();
const db = require('../db');
const { pushRequestToSAP } = require('../sapService');

// Manually (re)push a request to SAP as a Sales Order.
router.post('/push/:requestId', async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  try {
    const result = await pushRequestToSAP(requestId);
    res.status(201).json(result);
  } catch (e) {
    const code = e.message === 'Request not found' ? 404 : 500;
    res.status(code).json({ error: e.message });
  }
});

// Inspect recorded Sales Orders (handy for SAP integration debugging).
router.get('/orders', (req, res) => {
  db.all('SELECT * FROM SalesOrder ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
