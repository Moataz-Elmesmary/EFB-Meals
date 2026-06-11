import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Popup to pick menu items (keeps the order page uncluttered).
export default function ItemsModal({ items, loading, inCart, onAdd, onDec, onClose }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => it.item_name?.toLowerCase().includes(term) || it.item_code?.toLowerCase().includes(term));
  }, [items, q]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal items-modal" onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="items-modal-head">
          <h3>🍽️ {t('pickItems')}</h3>
          <button className="cart-remove" onClick={onClose}>✕</button>
        </div>
        <input className="items-search" placeholder={`🔎 ${t('search')}`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />

        {loading ? (
          <div className="empty"><div className="big">⏳</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="big">🔍</div><p>{t('noItems')}</p></div>
        ) : (
          <div className="items-list">
            {filtered.map((it) => {
              const c = inCart(it.item_code);
              return (
                <div className="item-row" key={it.item_code}>
                  <div className="item-info">
                    <div className="item-name">{it.item_name}</div>
                    <div className="item-sub">{it.item_code}{it.price ? ` · ${it.price} EGP` : ''}</div>
                  </div>
                  {c > 0 ? (
                    <div className="qty card-qty">
                      <button type="button" onClick={() => onDec(it)}>−</button>
                      <span className="qty-num">{c}</span>
                      <button type="button" onClick={() => onAdd(it)}>＋</button>
                    </div>
                  ) : (
                    <button type="button" className="add-pill" onClick={() => onAdd(it)}>＋ {t('addBtn')}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onClose}>✓ {t('done')}</button>
        </div>
      </motion.div>
    </div>
  );
}
