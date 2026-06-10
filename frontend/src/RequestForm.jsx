import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import MenuCard from './components/MenuCard';
import { createRequest } from './api';

export default function RequestForm({ meals, user, initialCart, onCartConsumed }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [cart, setCart] = useState([]); // { key, meal_id, name_en, name_ar, emoji, quantity, special }
  const [specialText, setSpecialText] = useState('');
  const [form, setForm] = useState({ needed_date: '', needed_time: '', notes: '' });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const mealOptions = useMemo(() => meals || [], [meals]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Prefill the cart when reordering a previous order.
  useEffect(() => {
    if (initialCart && initialCart.length) {
      setCart(initialCart);
      onCartConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCart]);
  const displayName =
    user?.name && user.name.toLowerCase() !== 'user'
      ? user.name
      : (user?.email ? user.email.split('@')[0].replace(/[._-]+/g, ' ') : '');
  const today = new Date().toISOString().slice(0, 10);
  const isUrgent = !form.needed_date || form.needed_date === today;
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const addMeal = (meal) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.meal_id === meal.id);
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [...c, { key: `m${meal.id}`, meal_id: meal.id, name_en: meal.name_en, name_ar: meal.name_ar, emoji: meal.emoji, quantity: 1, special: false }];
    });

  const addSpecial = () => {
    const text = specialText.trim();
    if (!text) return;
    setCart((c) => [...c, { key: `s${Date.now()}`, meal_id: null, name_en: text, name_ar: text, emoji: '✏️', quantity: 1, special: true }]);
    setSpecialText('');
  };

  const setQty = (key, q) => setCart((c) => c.map((x) => (x.key === key ? { ...x, quantity: Math.max(1, q) } : x)));
  const removeItem = (key) => setCart((c) => c.filter((x) => x.key !== key));
  const countOf = (mealId) => cart.find((x) => x.meal_id === mealId)?.quantity || 0;
  const decMeal = (meal) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.meal_id === meal.id);
      if (i < 0) return c;
      if (c[i].quantity <= 1) return c.filter((_, idx) => idx !== i);
      const copy = [...c];
      copy[i] = { ...copy[i], quantity: copy[i].quantity - 1 };
      return copy;
    });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!cart.length) return setError(t('cartEmpty'));
    setStatus('loading');
    try {
      await createRequest({
        requester_name: user?.name || '',
        requester_email: user?.email || '',
        department: user?.department || '',
        phone: user?.phone || '',
        needed_date: form.needed_date,
        needed_time: form.needed_time,
        notes: form.notes,
        items: cart.map((i) => (i.special ? { special: true, meal_name: i.name_en, quantity: i.quantity } : { meal_id: i.meal_id, quantity: i.quantity }))
      });
      setStatus('success');
      setCart([]);
      setForm({ needed_date: '', needed_time: '', notes: '' });
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
      setStatus('error');
    }
  };

  return (
    <div>
      {/* Identity (auto from Microsoft) */}
      <div className="identity-card">
        <span className="avatar lg">{(displayName || '?')[0].toUpperCase()}</span>
        <div className="identity-info">
          <div className="identity-name">👋 {t('hello')} {displayName}</div>
          <div className="identity-meta">
            {user?.email ? <span>✉️ {user.email}</span> : null}
            {user?.department ? <span>🏢 {user.department}</span> : null}
            {user?.phone ? <span>📞 {user.phone}</span> : null}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="menu-grid" style={{ marginBottom: 24 }}>
        {mealOptions.map((meal, i) => (
          <MenuCard key={meal.id} meal={meal} index={i} count={countOf(meal.id)} onAdd={addMeal} onDec={decMeal} />
        ))}
      </div>

      {/* Special request — anything not on the menu */}
      <div className="special-card">
        <div className="special-card-head">
          <span className="special-ico">🙋</span>
          <div>
            <div className="special-card-title">{t('specialCardTitle')}</div>
            <div className="special-card-sub">{t('specialCardSub')}</div>
          </div>
        </div>
        <div className="special-add">
          <input
            value={specialText}
            placeholder={t('specialLinePlaceholder')}
            onChange={(e) => setSpecialText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecial())}
          />
          <button type="button" className="btn btn-orange" onClick={addSpecial}>＋ {t('addSpecialLine')}</button>
        </div>
      </div>

      {/* Cart */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: 14 }}>
          🛒 {t('cartTitle')} {totalQty > 0 && <span className="cart-count">{totalQty}</span>}
        </h3>

        {cart.length === 0 ? (
          <div className="cart-empty">{t('cartEmpty')}</div>
        ) : (
          <div className="cart-list">
            <AnimatePresence>
              {cart.map((it) => (
                <motion.div key={it.key} className="cart-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <span className="cart-emoji">{it.emoji}</span>
                  <span className="cart-name">{it.special ? '📝 ' : ''}{ar ? it.name_ar : it.name_en}</span>
                  <div className="qty sm">
                    <button type="button" onClick={() => setQty(it.key, it.quantity - 1)}>−</button>
                    <input value={it.quantity} onChange={(e) => setQty(it.key, parseInt(e.target.value, 10) || 1)} />
                    <button type="button" onClick={() => setQty(it.key, it.quantity + 1)}>+</button>
                  </div>
                  <button type="button" className="cart-remove" onClick={() => removeItem(it.key)}>✕</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <div className="form-grid">
            <div className="field">
              <label>{t('dateLabel')}</label>
              <input type="date" min={today} value={form.needed_date} onChange={(e) => set('needed_date', e.target.value)} />
              {isUrgent && <span className="urgent-hint">🚨 {t('urgentHint')}</span>}
            </div>
            <div className="field">
              <label>{t('timeLabel')}</label>
              <input type="time" value={form.needed_time} onChange={(e) => set('needed_time', e.target.value)} />
            </div>
            <div className="field full">
              <label>{t('notesLabel')} <span className="hint">({t('optional')})</span></label>
              <textarea style={{ minHeight: 70 }} value={form.notes} placeholder={t('notesPlaceholder')} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-orange btn-lg" type="submit" disabled={status === 'loading' || !cart.length}>
              {status === 'loading' ? <><span className="spinner" /> {t('submitting')}</> : <>🚀 {t('submit')}</>}
            </button>
            <AnimatePresence>
              {status === 'success' && (
                <motion.div className="alert alert-success" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>✅ {t('requestSent')}</motion.div>
              )}
              {error && (
                <motion.div className="alert alert-error" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>⚠️ {error}</motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </div>
  );
}
