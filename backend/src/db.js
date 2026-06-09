const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new sqlite3.Database(dbPath);

// ---------------------------------------------------------------------------
// Schema. CREATE IF NOT EXISTS for fresh databases; the migrate() helper below
// adds any columns that are missing on databases created by an earlier version
// so we never have to drop the file and lose real data.
// ---------------------------------------------------------------------------
const initSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Meal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  category TEXT DEFAULT 'main',
  emoji TEXT DEFAULT '🍽️',
  price REAL DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS MealRequest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_name TEXT,
  requester_email TEXT,
  department TEXT,
  meal_id INTEGER,
  meal_name TEXT,
  is_special INTEGER DEFAULT 0,
  special_request TEXT,
  people INTEGER DEFAULT 1,
  needed_date TEXT,
  status TEXT DEFAULT 'requested',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES Meal(id)
);

CREATE TABLE IF NOT EXISTS BudgetRequest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_request_id INTEGER,
  amount REAL,
  currency TEXT DEFAULT 'EGP',
  vendor TEXT,
  notes TEXT,
  attachment_path TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_request_id) REFERENCES MealRequest(id)
);

CREATE TABLE IF NOT EXISTS SalesOrder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_request_id INTEGER,
  sap_id TEXT,
  status TEXT DEFAULT 'pending',
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Desired columns per table; migrate() adds whatever is missing.
const expectedColumns = {
  Meal: {
    description_en: "TEXT",
    description_ar: "TEXT",
    category: "TEXT DEFAULT 'main'",
    emoji: "TEXT DEFAULT '🍽️'",
    price: "REAL DEFAULT 0",
    active: "INTEGER DEFAULT 1"
  },
  MealRequest: {
    department: "TEXT",
    meal_name: "TEXT",
    is_special: "INTEGER DEFAULT 0",
    people: "INTEGER DEFAULT 1",
    needed_date: "TEXT"
  },
  BudgetRequest: {
    amount: "REAL",
    currency: "TEXT DEFAULT 'EGP'",
    vendor: "TEXT",
    created_by: "TEXT"
  },
  SalesOrder: {
    status: "TEXT DEFAULT 'pending'"
  }
};

function migrate(table, columns) {
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err || !rows) return;
    const have = new Set(rows.map((r) => r.name));
    Object.entries(columns).forEach(([col, def]) => {
      if (!have.has(col)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`, (e) => {
          if (e) console.error(`Migration: failed adding ${table}.${col}`, e.message);
          else console.log(`Migration: added ${table}.${col}`);
        });
      }
    });
  });
}

// Rich, appetizing bilingual catalog. emoji doubles as a lightweight "image"
// so the menu looks good with zero asset hosting.
const seedMeals = [
  ['Grilled Chicken Platter', 'طبق فراخ مشوية', 'Char-grilled chicken, saffron rice & grilled veg', 'فراخ مشوية على الفحم مع أرز بالزعفران وخضار مشوي', 'main', '🍗', 95],
  ['Beef Shawarma Bowl', 'شاورما لحمة', 'Tender beef shawarma, garlic sauce & pickles', 'شاورما لحمة طرية مع صوص توم ومخللات', 'main', '🥙', 110],
  ['Koshari Deluxe', 'كشري ديلوكس', 'Egyptian koshari with crispy onions & spicy sauce', 'كشري مصري بالبصل المقرمش والدقة الحارة', 'main', '🍚', 55],
  ['Mixed Grill', 'مشاوي مشكلة', 'Kofta, kebab & shish tawook with bread', 'كفتة وكباب وشيش طاووق مع العيش', 'main', '🍖', 160],
  ['Fish Sayadeya', 'صيادية سمك', 'Grilled fish over spiced yellow rice', 'سمك مشوي مع أرز صيادية متبل', 'main', '🐟', 130],
  ['Margherita Pizza', 'بيتزا مارجريتا', 'Wood-fired pizza, fresh basil & mozzarella', 'بيتزا على الحطب بالريحان والموتزاريلا', 'main', '🍕', 90],
  ['Caesar Salad', 'سلطة سيزر', 'Crisp romaine, parmesan & creamy dressing', 'خس روماني مقرمش مع بارميزان وصوص كريمي', 'salad', '🥗', 60],
  ['Lentil Soup', 'شوربة عدس', 'Warm Egyptian lentil soup with lemon & cumin', 'شوربة عدس مصري دافئة بالليمون والكمون', 'soup', '🍲', 35],
  ['Falafel Wrap', 'ساندويتش طعمية', 'Crispy falafel, tahini & fresh salad', 'طعمية مقرمشة مع طحينة وسلطة', 'vegetarian', '🌯', 40],
  ['Fruit Platter', 'طبق فواكه', 'Seasonal fresh-cut fruit selection', 'تشكيلة فواكه طازجة حسب الموسم', 'dessert', '🍓', 50],
  ['Oriental Sweets', 'حلويات شرقية', 'Baklava, basbousa & kunafa assortment', 'بقلاوة وبسبوسة وكنافة مشكلة', 'dessert', '🍮', 70],
  ['Coffee & Tea Service', 'خدمة شاي وقهوة', 'Hot drinks station for meetings & events', 'محطة مشروبات ساخنة للاجتماعات والمناسبات', 'beverage', '☕', 25]
];

db.serialize(() => {
  db.exec(initSql, (err) => {
    if (err) console.error('DB init error', err);
  });

  // run column migrations on existing databases
  Object.entries(expectedColumns).forEach(([table, cols]) => migrate(table, cols));

  // seed catalog only when empty
  db.get('SELECT COUNT(*) as cnt FROM Meal', (err, row) => {
    if (!err && row && row.cnt === 0) {
      const stmt = db.prepare(
        'INSERT INTO Meal (name_en, name_ar, description_en, description_ar, category, emoji, price) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      seedMeals.forEach((m) => stmt.run(m));
      stmt.finalize(() => console.log(`Seeded ${seedMeals.length} meals`));
    }
  });
});

module.exports = db;
