const express = require('express');
const router = express.Router();
const db = require('../db');
const email = require('../email');

// list meals
router.get('/meals', (req, res) => {
  db.all('SELECT id, name_en, name_ar, description FROM Meal WHERE active=1', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// create request
router.post('/request', (req, res) => {
  const { requester_name, requester_email, meal_id, quantity, special_request } = req.body;
  const sql = 'INSERT INTO MealRequest (requester_name, requester_email, meal_id, quantity, special_request) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [requester_name, requester_email, meal_id, quantity || 1, special_request || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const requestId = this.lastID;

    // send notification to kitchen (example email)
    const subject = `New Meal Request #${requestId}`;
    const html = `<p>New request from ${requester_name} (${requester_email})</p><p>Meal ID: ${meal_id}</p><p>Quantity: ${quantity}</p><p>Special: ${special_request}</p>`;
    email.sendNotification(process.env.KITCHEN_EMAIL || 'kitchen@example.com', subject, html).catch(() => {});

    res.json({ id: requestId });
  });
});

module.exports = router;
