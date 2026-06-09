import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import MenuCard from './components/MenuCard';
import { createRequest } from './api';

export default function RequestForm({ meals, user }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [mode, setMode] = useState('menu'); // 'menu' | 'special'
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [form, setForm] = useState({
    requester_name: user?.name || '',
    requester_email: user?.email || user?.username || '',
    department: '',
    people: 1,
    needed_date: '',
    special_request: ''
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const mealOptions = useMemo(() => meals || [], [meals]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'menu' && !selectedMeal) return setError(t('pickMealOrSpecial'));
    if (mode === 'special' && !form.special_request.trim()) return setError(t('pickMealOrSpecial'));

    setStatus('loading');
    try {
      await createRequest({
        ...form,
        meal_id: mode === 'menu' ? selectedMeal.id : null,
        special_request: mode === 'special' ? form.special_request : ''
      });
      setStatus('success');
      setSelectedMeal(null);
      setForm((p) => ({ ...p, people: 1, needed_date: '', special_request: '' }));
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
      setStatus('error');
    }
  };

  return (
    <div>
      {/* Mode toggle */}
      <div className="mode-toggle">
        <button className={mode === 'menu' ? 'active' : ''} onClick={() => setMode('menu')} type="button">
          🍱 {t('modeMenu')}
        </button>
        <button className={mode === 'special' ? 'active' : ''} onClick={() => setMode('special')} type="button">
          ✏️ {t('modeSpecial')}
        </button>
      </div>

      {/* Menu grid */}
      <AnimatePresence mode="wait">
        {mode === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="menu-grid"
            style={{ marginBottom: 28 }}
          >
            {mealOptions.map((meal, i) => (
              <MenuCard
                key={meal.id}
                meal={meal}
                index={i}
                selected={selectedMeal?.id === meal.id}
                onSelect={setSelectedMeal}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={submit} className="panel">
        <div className="form-grid">
          <div className="field">
            <label>{t('nameLabel')}</label>
            <input value={form.requester_name} onChange={(e) => set('requester_name', e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('emailLabel')}</label>
            <input type="email" value={form.requester_email} onChange={(e) => set('requester_email', e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('deptLabel')}</label>
            <input value={form.department} placeholder={t('deptPlaceholder')} onChange={(e) => set('department', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('dateLabel')}</label>
            <input type="date" value={form.needed_date} onChange={(e) => set('needed_date', e.target.value)} />
          </div>

          <div className="field">
            <label>{t('peopleLabel')}</label>
            <div className="qty">
              <button type="button" onClick={() => set('people', Math.max(1, form.people - 1))}>−</button>
              <input
                type="number"
                min="1"
                value={form.people}
                onChange={(e) => set('people', Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <button type="button" onClick={() => set('people', form.people + 1)}>+</button>
            </div>
          </div>

          {mode === 'menu' ? (
            <div className="field">
              <label>{t('selectedMeal')}</label>
              <div
                style={{
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--paper-2)',
                  color: selectedMeal ? 'var(--ink)' : 'var(--ink-4)',
                  fontWeight: 700
                }}
              >
                {selectedMeal ? (
                  <>
                    <span style={{ fontSize: 24 }}>{selectedMeal.emoji}</span>
                    {ar ? selectedMeal.name_ar : selectedMeal.name_en}
                  </>
                ) : (
                  t('noMealSelected')
                )}
              </div>
            </div>
          ) : null}

          {mode === 'special' && (
            <div className="field full">
              <label>{t('specialLabel')}</label>
              <textarea
                value={form.special_request}
                placeholder={t('specialPlaceholder')}
                onChange={(e) => set('special_request', e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-orange" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? <><span className="spinner" /> {t('submitting')}</> : <>🚀 {t('submit')}</>}
          </button>
          <AnimatePresence>
            {status === 'success' && (
              <motion.div className="alert alert-success" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                ✅ {t('requestSent')}
              </motion.div>
            )}
            {error && (
              <motion.div className="alert alert-error" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
