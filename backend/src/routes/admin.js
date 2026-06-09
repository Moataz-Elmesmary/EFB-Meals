const express = require('express');
const router = express.Router();
const db = require('../db');
const email = require('../email');

// list all meal requests
router.get('/requests', (req, res) => {
  db.all('SELECT mr.id, mr.requester_name, mr.requester_email, mr.quantity, mr.special_request, mr.status, m.name_en, m.name_ar, mr.created_at FROM MealRequest mr LEFT JOIN Meal m ON m.id=mr.meal_id ORDER BY mr.created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// get single request
router.get('/requests/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT mr.*, m.name_en, m.name_ar FROM MealRequest mr LEFT JOIN Meal m ON m.id=mr.meal_id WHERE mr.id=?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.all('SELECT * FROM BudgetRequest WHERE meal_request_id=?', [id], (err2, budgets) => {
      if (err2) return res.status(500).json({ error: err2.message });
      row.budgets = budgets;
      res.json(row);
    });
  });
});

// mark request ready to push to SAP (kitchen action)
router.post('/requests/:id/ready', (req, res) => {
  const id = req.params.id;
  db.run('UPDATE MealRequest SET status=? WHERE id=?', ['ready_for_sap', id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // notify ops
    db.get('SELECT requester_email, requester_name FROM MealRequest WHERE id=?', [id], (err2, row) => {
      if (!err2 && row && row.requester_email) {
        const subject = `Your meal request #${id} is ready`;
        const html = `<p>Hi ${row.requester_name || ''},</p><p>Your meal request (#${id}) is ready and will be sent to SAP.</p>`;
        email.sendNotification(row.requester_email, subject, html).catch(()=>{});
      }
    });
    res.json({ ok: true });
  });
});

module.exports = router;
