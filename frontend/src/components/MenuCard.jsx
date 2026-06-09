import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function MenuCard({ meal, count = 0, onSelect, index = 0 }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const name = ar ? meal.name_ar : meal.name_en;
  const sub = ar ? meal.name_en : meal.name_ar;
  const desc = ar ? meal.description_ar : meal.description_en;

  return (
    <motion.button
      type="button"
      className={`meal-card ${count > 0 ? 'selected' : ''}`}
      onClick={() => onSelect(meal)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      style={{ textAlign: ar ? 'right' : 'left' }}
    >
      {count > 0 && <span className="cart-badge">× {count}</span>}
      <div className="meal-emoji">{meal.emoji || '🍽️'}</div>
      <div className="meal-name">
        {name}
        <small>{sub}</small>
      </div>
      <div className="meal-desc">{desc}</div>
      <div className="meal-foot">
        <span className="cat-chip">{meal.category}</span>
        <span className="add-pill">＋ {t('addBtn')}</span>
      </div>
    </motion.button>
  );
}
