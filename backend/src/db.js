const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, '..', 'data.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new sqlite3.Database(dbPath);

// Create tables if not exist
const initSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Meal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS MealRequest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_name TEXT,
  requester_email TEXT,
  meal_id INTEGER,
  quantity INTEGER,
  special_request TEXT,
  status TEXT DEFAULT 'requested',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES Meal(id)
);

CREATE TABLE IF NOT EXISTS BudgetRequest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_request_id INTEGER,
  notes TEXT,
  attachment_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_request_id) REFERENCES MealRequest(id)
);

CREATE TABLE IF NOT EXISTS SalesOrder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_request_id INTEGER,
  sap_id TEXT,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.serialize(() => {
  db.exec(initSql, (err) => {
    if (err) console.error('DB init error', err);
  });

  // seed simple meals if empty
  db.get('SELECT COUNT(*) as cnt FROM Meal', (err, row) => {
    if (!err && row && row.cnt === 0) {
      const stmt = db.prepare('INSERT INTO Meal (name_en, name_ar, description) VALUES (?, ?, ?)');
      stmt.run('Chicken Meal', 'وجبة فراخ', 'Roasted chicken with rice');
      stmt.run('Veg Meal', 'وجبة نباتية', 'Grilled vegetables and salad');
      stmt.run('Fish Meal', 'وجبة سمك', 'Grilled fish with lemon');
      stmt.finalize();
    }
  });
});

module.exports = db;
