const express = require('express');
const router = express.Router();
const db = require('../db');
const email = require('../email');
const { newRequestTemplate } = require('../templates/emailTemplates');

// Public menu (active meals only)
router.get('/meals', (req, res) => {
  db.all(
    'SELECT id, name_en, name_ar, description_en, description_ar, category, emoji, price FROM Meal WHERE active=1 ORDER BY category, id',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Create a meal request — either pick a meal OR send a special request.
router.post('/request', (req, res) => {
  const {
    requester_name,
    requester_email,
    department,
    meal_id,
    special_request,
    people,
    needed_date
  } = req.body;

  if (!requester_name || !requester_email) {
    return res.status(400).json({ error: 'Requester name and email are required.' });
  }

  const isSpecial = !meal_id;
  if (isSpecial && !(special_request && special_request.trim())) {
    return res.status(400).json({ error: 'Pick a meal or describe a special request.' });
  }

  const headcount = Math.max(1, parseInt(people, 10) || 1);

  const insert = (mealName) => {
    const sql = `INSERT INTO MealRequest
      (requester_name, requester_email, department, meal_id, meal_name, is_special, special_request, people, needed_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      requester_name,
      requester_email,
      department || '',
      isSpecial ? null : meal_id,
      mealName || null,
      isSpecial ? 1 : 0,
      special_request || '',
      headcount,
      needed_date || ''
    ];
    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const id = this.lastID;
      const reqRow = {
        id,
        requester_name,
        requester_email,
        department,
        meal_id,
        meal_name: mealName,
        is_special: isSpecial ? 1 : 0,
        special_request,
        people: headcount,
        needed_date
      };
      // notify the kitchen
      const to = process.env.KITCHEN_EMAIL || 'kitchen@example.com';
      email
        .sendNotification(to, `🍽️ New Meal Request #${id} — طلب وجبة جديد`, newRequestTemplate(reqRow))
        .catch(() => {});
      res.status(201).json({ id, status: 'requested' });
    });
  };

  if (isSpecial) return insert(null);

  // resolve the meal name so emails/SAP don't show a bare id
  db.get('SELECT name_en, name_ar FROM Meal WHERE id=?', [meal_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(400).json({ error: 'Selected meal does not exist.' });
    insert(`${row.name_en} / ${row.name_ar}`);
  });
});

module.exports = router;
