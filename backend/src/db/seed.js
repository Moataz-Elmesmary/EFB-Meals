// Seed the bilingual meal catalog when the table is empty.
const db = require('./knex');

const MEALS = [
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

async function seed() {
  const [{ cnt }] = await db('meals').count('id as cnt');
  if (Number(cnt) > 0) return;
  const rows = MEALS.map((m) => ({
    name_en: m[0], name_ar: m[1], description_en: m[2], description_ar: m[3],
    category: m[4], emoji: m[5], price: m[6]
  }));
  await db('meals').insert(rows);
  console.log(`✓ seeded ${rows.length} meals`);
}

module.exports = seed;
