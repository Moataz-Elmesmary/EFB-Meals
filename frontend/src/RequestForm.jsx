import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ItemsModal from './components/ItemsModal';
import { createRequest, getItems, getCostCenters } from './api';

const TYPES = ['supervisors', 'event', 'meeting'];

export default function RequestForm({ user, initialCart, onCartConsumed }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    type: '', classification: 'hot', department_code: '', location: '', people: 1,
    needed_date: '', needed_time: '', notes: ''
  });
  const [cart, setCart] = useState([]); // { item_code|null, name, quantity, special }
  const [specialText, setSpecialText] = useState('');
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [costCenters, setCostCenters] = useState([]);
  const [modal, setModal] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);
  const isUrgent = !form.needed_date || form.needed_date === today;
  const displayName = user?.name && user.name.toLowerCase() !== 'user' ? user.name : (user?.email ? user.email.split('@')[0] : '');

  useEffect(() => {
    getCostCenters().then(setCostCenters).catch(() => setCostCenters([]));
  }, []);

  // load items whenever the classification changes
  useEffect(() => {
    setItemsLoading(true);
    getItems(form.classification)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [form.classification]);

  useEffect(() => {
    if (initialCart && initialCart.length) {
      setCart(initialCart);
      onCartConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCart]);

  const inCart = (code) => cart.find((x) => x.item_code === code)?.quantity || 0;
  const addItem = (it) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.item_code === it.item_code);
      if (i >= 0) { const cp = [...c]; cp[i] = { ...cp[i], quantity: cp[i].quantity + 1 }; return cp; }
      return [...c, { key: `i${it.item_code}`, item_code: it.item_code, name: it.item_name, quantity: 1, special: false }];
    });
  const decItem = (it) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.item_code === it.item_code);
      if (i < 0) return c;
      if (c[i].quantity <= 1) return c.filter((_, idx) => idx !== i);
      const cp = [...c]; cp[i] = { ...cp[i], quantity: cp[i].quantity - 1 }; return cp;
    });
  const addSpecial = () => {
    const text = specialText.trim();
    if (!text) return;
    setCart((c) => [...c, { key: `s${Date.now()}`, item_code: null, name: text, quantity: 1, special: true }]);
    setSpecialText('');
  };
  const setQty = (key, q) => setCart((c) => c.map((x) => (x.key === key ? { ...x, quantity: Math.max(1, q) } : x)));
  const removeItem = (key) => setCart((c) => c.filter((x) => x.key !== key));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.type) return setError(t('chooseType'));
    if (!form.department_code) return setError(t('chooseDept'));
    if (!cart.length) return setError(t('cartEmpty'));
    setStatus('loading');
    try {
      const dept = costCenters.find((c) => c.code === form.department_code);
      await createRequest({
        requester_name: user?.name || '',
        requester_email: user?.email || '',
        phone: user?.phone || '',
        department: dept ? dept.name : (user?.department || ''),
        department_code: form.department_code,
        type: form.type,
        classification: form.classification,
        location: form.location,
        people: form.people,
        needed_date: form.needed_date,
        needed_time: form.needed_time,
        notes: form.notes,
        items: cart.map((i) => (i.special ? { special: true, meal_name: i.name, quantity: i.quantity } : { item_code: i.item_code, quantity: i.quantity }))
      });
      setStatus('success');
      setCart([]);
      setForm((p) => ({ ...p, location: '', people: 1, needed_date: '', needed_time: '', notes: '' }));
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
      setStatus('error');
    }
  };

  return (
    <div>
      {/* identity */}
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

      <form onSubmit={submit}>
        {/* ── order details (top) ── */}
        <div className="panel">
          <h3 className="block-title">📋 {t('orderDetails')}</h3>
          <div className="form-grid">
            <div className="field">
              <label>{t('typeLabel')} *</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} required>
                <option value="">{t('choose')}</option>
                {TYPES.map((tp) => <option key={tp} value={tp}>{t(`type_${tp}`)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t('classificationLabel')}</label>
              <select value={form.classification} onChange={(e) => { set('classification', e.target.value); setCart([]); }}>
                <option value="hot">{t('class_hot')}</option>
                <option value="ready">{t('class_ready')}</option>
              </select>
            </div>
            <div className="field full">
              <label>{t('deptLabel')} *</label>
              <select value={form.department_code} onChange={(e) => set('department_code', e.target.value)} required>
                <option value="">{t('choose')}</option>
                {costCenters.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}{c.division ? ` (${c.division})` : ''}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t('locationLabel')}</label>
              <input value={form.location} placeholder={t('locationPlaceholder')} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div className="field">
              <label>{t('peopleLabel')}</label>
              <div className="qty">
                <button type="button" onClick={() => set('people', Math.max(1, form.people - 1))}>−</button>
                <input type="number" min="1" value={form.people} onChange={(e) => set('people', Math.max(1, parseInt(e.target.value, 10) || 1))} />
                <button type="button" onClick={() => set('people', form.people + 1)}>+</button>
              </div>
            </div>
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
              <textarea style={{ minHeight: 64 }} value={form.notes} placeholder={t('notesPlaceholder')} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── suggested items ── */}
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="block-head">
            <h3 className="block-title">🛒 {t('suggestedItems')} <span className="hint">({t('suggestedHint')})</span></h3>
            <button type="button" className="btn btn-orange btn-sm" onClick={() => setModal(true)}>＋ {t('addFromMenu')}</button>
          </div>

          {/* off-menu special card */}
          <div className="special-card" style={{ marginTop: 14 }}>
            <div className="special-card-head">
              <span className="special-ico">🙋</span>
              <div>
                <div className="special-card-title">{t('specialCardTitle')}</div>
                <div className="special-card-sub">{t('specialCardSub')}</div>
              </div>
            </div>
            <div className="special-add">
              <input value={specialText} placeholder={t('specialLinePlaceholder')} onChange={(e) => setSpecialText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecial())} />
              <button type="button" className="btn btn-ghost" onClick={addSpecial}>✏️ {t('addSpecialLine')}</button>
            </div>
          </div>

          {/* cart */}
          {cart.length === 0 ? (
            <div className="cart-empty" style={{ marginTop: 14 }}>{t('cartEmpty')}</div>
          ) : (
            <div className="cart-list" style={{ marginTop: 14 }}>
              <AnimatePresence>
                {cart.map((it) => (
                  <motion.div key={it.key} className="cart-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <span className="cart-emoji">{it.special ? '📝' : '🍽️'}</span>
                    <span className="cart-name">{it.name}</span>
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

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-orange btn-lg" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? <><span className="spinner" /> {t('submitting')}</> : <>🚀 {t('submit')}</>}
            </button>
            <AnimatePresence>
              {status === 'success' && <motion.div className="alert alert-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>✅ {t('requestSent')}</motion.div>}
              {error && <motion.div className="alert alert-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>⚠️ {error}</motion.div>}
            </AnimatePresence>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {modal && (
          <ItemsModal items={items} loading={itemsLoading} inCart={inCart} onAdd={addItem} onDec={decItem} onClose={() => setModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
