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

// Create a meal request — either pick a meal OR send a special request.
router.post('/request', async (req, res) => {
  const { requester_name, requester_email, department, phone, meal_id, special_request, people, needed_date, needed_time, notes } = req.body;

  if (!requester_name || !requester_email) {
    return res.status(400).json({ error: 'Requester name and email are required.' });
  }
  const isSpecial = !meal_id;
  if (isSpecial && !(special_request && special_request.trim())) {
    return res.status(400).json({ error: 'Pick a meal or describe a special request.' });
  }
  const headcount = Math.max(1, parseInt(people, 10) || 1);

  // Urgent when wanted today (or no date given).
  const today = new Date().toISOString().slice(0, 10);
  const urgent = !needed_date || needed_date === today;

  try {
    let mealName = null;
    if (!isSpecial) {
      const meal = await dao.getMeal(meal_id);
      if (!meal) return res.status(400).json({ error: 'Selected meal does not exist.' });
      mealName = `${meal.name_en} / ${meal.name_ar}`;
    }

    const id = await dao.createMealRequest({
      requester_name,
      requester_email,
      department: department || '',
      phone: phone || '',
      meal_id: isSpecial ? null : meal_id,
      meal_name: mealName,
      is_special: isSpecial,
      special_request: special_request || '',
      people: headcount,
      needed_date: needed_date || '',
      needed_time: needed_time || '',
      urgent,
      notes: notes || ''
    });

    const reqRow = {
      id, requester_name, requester_email, department, phone, meal_id,
      meal_name: mealName, is_special: isSpecial, special_request, people: headcount,
      needed_date, needed_time, urgent, notes
    };
    // notify the kitchen
    email
      .sendNotification(
        process.env.KITCHEN_EMAIL || 'kitchen@efb.eg',
        `🍽️ New Meal Request #${id} — طلب وجبة جديد`,
        newRequestTemplate(reqRow)
      )
      .catch(() => {});

    // confirmation to the requester
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
