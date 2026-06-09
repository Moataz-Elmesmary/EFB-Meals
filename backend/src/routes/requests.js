const express = require('express');
const router = express.Router();
const dao = require('../db');
const email = require('../email');
const { newRequestTemplate, requestConfirmationTemplate } = require('../templates/emailTemplates');

// Public menu (active meals only)
router.get('/meals', async (req, res) => {
  try {
    res.json(await dao.listMeals());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create an order — a cart of items (each meal + quantity), and/or special
// request lines, plus delivery date/time and an order note.
router.post('/request', async (req, res) => {
  const { requester_name, requester_email, department, phone, people, needed_date, needed_time, notes } = req.body;

  if (!requester_name || !requester_email) {
    return res.status(400).json({ error: 'Requester name and email are required.' });
  }

  // Normalize to a cart, supporting the legacy single-meal payload + reorder.
  let raw = Array.isArray(req.body.items) ? req.body.items : null;
  if (!raw) {
    if (req.body.meal_id) raw = [{ meal_id: req.body.meal_id, quantity: people }];
    else if (req.body.special_request) raw = [{ special: true, meal_name: req.body.special_request, quantity: people }];
  }
  if (!raw || !raw.length) return res.status(400).json({ error: 'Add at least one item to the order.' });

  try {
    const items = [];
    for (const it of raw) {
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      if (it.meal_id) {
        const m = await dao.getMeal(it.meal_id);
        if (!m) return res.status(400).json({ error: 'Selected meal does not exist.' });
        items.push({ meal_id: m.id, meal_name: `${m.name_en} / ${m.name_ar}`, emoji: m.emoji, quantity: qty, unit_price: m.price || 0, special: false });
      } else {
        const text = String(it.meal_name || it.special_request || '').trim();
        if (!text) continue;
        items.push({ meal_id: null, meal_name: text, emoji: '✏️', quantity: qty, unit_price: 0, special: true });
      }
    }
    if (!items.length) return res.status(400).json({ error: 'Add at least one item to the order.' });

    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const summary = items.map((i) => `${i.meal_name} ×${i.quantity}`).join(' · ');
    const today = new Date().toISOString().slice(0, 10);
    const urgent = !needed_date || needed_date === today;

    const header = {
      requester_name,
      requester_email,
      department: department || '',
      phone: phone || '',
      meal_id: null,
      meal_name: summary,
      is_special: items.every((i) => i.special),
      special_request: '',
      people: totalQty,
      needed_date: needed_date || '',
      needed_time: needed_time || '',
      urgent,
      notes: notes || ''
    };

    const id = await dao.createOrder(header, items);
    const reqRow = { id, ...header, items };

    // notify kitchen
    email
      .sendNotification(
        process.env.KITCHEN_EMAIL || 'kitchen@efb.eg',
        `🍽️ New Meal Request #${id} — طلب وجبة جديد`,
        newRequestTemplate(reqRow)
      )
      .catch(() => {});

    // confirmation to requester
    email
      .sendNotification(
        requester_email,
        `✅ Order confirmation #${id} — تأكيد طلبك`,
        requestConfirmationTemplate(reqRow)
      )
      .catch(() => {});

    res.status(201).json({ id, status: 'requested' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
