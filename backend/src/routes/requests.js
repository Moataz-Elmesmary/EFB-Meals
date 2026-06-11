const express = require('express');
const router = express.Router();
const dao = require('../db');
const email = require('../email');
const { newRequestTemplate, requestConfirmationTemplate } = require('../templates/emailTemplates');

// Menu items for the requester, filtered by classification (ready | hot).
router.get('/items', async (req, res) => {
  try {
    res.json(await dao.listItemsByClass(req.query.classification));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Departments / cost centers for the dropdown.
router.get('/cost-centers', async (req, res) => {
  try {
    res.json(await dao.listCostCenters());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Legacy alias — keep /meals working (ready-to-eat items by default).
router.get('/meals', async (req, res) => {
  try {
    res.json(await dao.listItemsByClass(req.query.classification || 'ready'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create an order. The requester provides order details + SUGGESTED items;
// the kitchen later sets the actual (requested) items.
router.post('/request', async (req, res) => {
  const {
    requester_name, requester_email, department, department_code, phone,
    type, classification, location, people, needed_date, needed_time, notes
  } = req.body;

  if (!requester_name || !requester_email) {
    return res.status(400).json({ error: 'Requester name and email are required.' });
  }

  const raw = Array.isArray(req.body.items) ? req.body.items : [];
  try {
    const items = [];
    for (const it of raw) {
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      if (it.special) {
        const text = String(it.meal_name || '').trim();
        if (text) items.push({ item_code: null, meal_name: text, emoji: '✏️', quantity: qty, unit_price: 0, kind: 'suggested' });
      } else if (it.item_code) {
        const m = await dao.getItem(it.item_code);
        if (m) items.push({ item_code: m.item_code, meal_name: m.item_name, emoji: '🍽️', quantity: qty, unit_price: m.price || 0, kind: 'suggested' });
      }
    }

    const headcount = Math.max(1, parseInt(people, 10) || 1);
    const summary = items.length ? items.map((i) => `${i.meal_name} ×${i.quantity}`).join(' · ') : '—';
    const today = new Date().toISOString().slice(0, 10);
    const urgent = !needed_date || needed_date === today;

    const header = {
      requester_name,
      requester_email,
      department: department || '',
      department_code: department_code || '',
      phone: phone || '',
      type: type || '',
      classification: classification || '',
      location: location || '',
      meal_id: null,
      meal_name: summary,
      is_special: false,
      special_request: '',
      people: headcount,
      needed_date: needed_date || '',
      needed_time: needed_time || '',
      urgent,
      notes: notes || '',
      status: 'requested'
    };

    const id = await dao.createOrder(header, items);
    const reqRow = { id, ...header, items };

    email
      .sendNotification(process.env.KITCHEN_EMAIL || 'kitchen@efb.eg', `🍽️ New Meal Request #${id} — طلب وجبة جديد`, newRequestTemplate(reqRow))
      .catch(() => {});
    email
      .sendNotification(requester_email, `✅ Order confirmation #${id} — تأكيد طلبك`, requestConfirmationTemplate(reqRow))
      .catch(() => {});

    res.status(201).json({ id, status: 'requested' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
