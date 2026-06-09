import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function MenuCard({ meal, count = 0, onAdd, onDec, index = 0 }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const name = ar ? meal.name_ar : meal.name_en;
  const sub = ar ? meal.name_en : meal.name_ar;
  const desc = ar ? meal.description_ar : meal.description_en;

  return (
    <motion.div
      className={`meal-card ${count > 0 ? 'selected' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
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
        {meal.price ? <span className="meal-price">{meal.price} EGP</span> : <span className="cat-chip">{meal.category}</span>}
        {count === 0 ? (
          <button type="button" className="add-pill" onClick={() => onAdd(meal)}>＋ {t('addBtn')}</button>
        ) : (
          <div className="qty card-qty">
            <button type="button" onClick={() => onDec(meal)} aria-label="minus">−</button>
            <span className="qty-num">{count}</span>
            <button type="button" onClick={() => onAdd(meal)} aria-label="plus">＋</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
