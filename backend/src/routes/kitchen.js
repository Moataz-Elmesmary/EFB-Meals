const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const email = require('../email');

const uploadDir = path.join(__dirname, '..', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// create budget request with attachment
router.post('/budget/:requestId', upload.single('attachment'), (req, res) => {
  const requestId = req.params.requestId;
  const notes = req.body.notes || '';
  const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = 'INSERT INTO BudgetRequest (meal_request_id, notes, attachment_path) VALUES (?, ?, ?)';
  db.run(sql, [requestId, notes, attachmentPath], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const budgetId = this.lastID;

    // update meal request status
    db.run('UPDATE MealRequest SET status=? WHERE id=?', ['budget_requested', requestId]);

    // notify requester
    db.get('SELECT requester_email FROM MealRequest WHERE id=?', [requestId], (err, row) => {
      if (!err && row && row.requester_email) {
        const subject = `Budget created for request #${requestId}`;
        const html = `<p>Your request has a budget created. Please see attachment if provided.</p>`;
        email.sendNotification(row.requester_email, subject, html).catch(() => {});
      }
    });

    res.json({ budgetId, attachmentPath });
  });
});

module.exports = router;
