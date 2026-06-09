const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = require('node-fetch');

// push to SAP (stub): create SalesOrder row and attempt POST to SAP_ENDPOINT
router.post('/push/:requestId', async (req, res) => {
  const requestId = req.params.requestId;
  db.get('SELECT mr.*, m.name_en, m.name_ar FROM MealRequest mr LEFT JOIN Meal m ON m.id=mr.meal_id WHERE mr.id=?', [requestId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Request not found' });
    const payload = JSON.stringify(row);
    db.run('INSERT INTO SalesOrder (meal_request_id, payload) VALUES (?, ?)', [requestId, payload], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const salesId = this.lastID;

      // attempt to post to external SAP endpoint if configured
      const sapEndpoint = process.env.SAP_ENDPOINT;
      if (sapEndpoint) {
        fetch(sapEndpoint, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } })
          .then(r => r.text())
          .then(text => {
            // store sap response as sap_id (if any)
            db.run('UPDATE SalesOrder SET sap_id=? WHERE id=?', [text, salesId]);
          })
          .catch(() => {});
      }

      res.json({ salesOrderId: salesId });
    });
  });
});

module.exports = router;
