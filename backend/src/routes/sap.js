const express = require('express');
const router = express.Router();
const dao = require('../db');
const { pushRequestToSAP } = require('../sapService');

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
