import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import API_BASE, { getKitchenRequests, getItems, setBudget, rejectOrder, approveBudget, rejectBudget, addKitchenNote, fileUrl } from '../api';
import ItemsModal from './ItemsModal';

// Kitchen sets the FINAL (requested) items + quantities + notes + budget.
function SetBudgetModal({ request, onClose, onSave }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState(request.kitchen_notes || '');
  // prefill with the requester's suggestions as a starting point
  const [cart, setCart] = useState(() =>
    (request.items || [])
      .filter((i) => i.kind === 'suggested')
      .map((it, idx) =>
        it.item_code
          ? { key: `i${it.item_code}`, item_code: it.item_code, name: it.meal_name, quantity: it.quantity, special: false }
          : { key: `s${idx}`, item_code: null, name: it.meal_name, description: it.description || '', quantity: it.quantity, special: true }
      )
  );
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [picker, setPicker] = useState(false);
  const [sp, setSp] = useState({ name: '', desc: '', qty: 1 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setItemsLoading(true);
    getItems(request.classification || 'hot').then(setItems).catch(() => setItems([])).finally(() => setItemsLoading(false));
  }, [request.classification]);

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
    const name = sp.name.trim();
    if (!name) return;
    setCart((c) => [...c, { key: `s${Date.now()}`, item_code: null, name, description: sp.desc.trim(), quantity: Math.max(1, parseInt(sp.qty, 10) || 1), special: true }]);
    setSp({ name: '', desc: '', qty: 1 });
  };
  const setQty = (key, q) => setCart((c) => c.map((x) => (x.key === key ? { ...x, quantity: Math.max(1, q) } : x)));
  const removeItem = (key) => setCart((c) => c.filter((x) => x.key !== key));

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return setErr(t('amountRequired'));
    if (!cart.length) return setErr(t('kitchenNeedsItems'));
    setBusy(true);
    try {
      await onSave({
        amount, currency, vendor, notes,
        items: cart.map((i) => (i.special ? { special: true, meal_name: i.name, description: i.description, quantity: i.quantity } : { item_code: i.item_code, quantity: i.quantity }))
      });
    } catch (e2) {
      setErr(e2.response?.data?.error || t('error'));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.form className="modal items-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
        <h3>💰 {t('setBudgetTitle')} — #{request.id}</h3>
        <p className="sub">{t('setBudgetSub')}</p>

        <div className="block-head" style={{ marginTop: 6 }}>
          <div className="block-title" style={{ fontSize: '1rem' }}>🧾 {t('finalItems')}</div>
          <button type="button" className="btn btn-orange btn-sm" onClick={() => setPicker(true)}>＋ {t('addFromMenu')}</button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty" style={{ marginTop: 10 }}>{t('kitchenNeedsItems')}</div>
        ) : (
          <div className="cart-list" style={{ marginTop: 10, maxHeight: '32vh', overflowY: 'auto' }}>
            {cart.map((it) => (
              <div key={it.key} className="cart-row">
                <span className="cart-emoji">{it.special ? '📝' : '🍽️'}</span>
                <span className="cart-name">{it.name}{it.description ? <small className="cart-desc"> — {it.description}</small> : null}</span>
                <div className="qty sm">
                  <button type="button" onClick={() => setQty(it.key, it.quantity - 1)}>−</button>
                  <input value={it.quantity} onChange={(e) => setQty(it.key, parseInt(e.target.value, 10) || 1)} />
                  <button type="button" onClick={() => setQty(it.key, it.quantity + 1)}>+</button>
                </div>
                <button type="button" className="cart-remove" onClick={() => removeItem(it.key)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* off-menu item */}
        <div className="special-fields" style={{ marginTop: 12 }}>
          <input className="sf-name" value={sp.name} placeholder={t('itemNameLabel')} onChange={(e) => setSp({ ...sp, name: e.target.value })} />
          <input className="sf-desc" value={sp.desc} placeholder={t('descriptionLabel')} onChange={(e) => setSp({ ...sp, desc: e.target.value })} />
          <input className="sf-qty" type="number" min="1" value={sp.qty} onChange={(e) => setSp({ ...sp, qty: e.target.value })} />
          <button type="button" className="btn btn-ghost" onClick={addSpecial}>＋ {t('addBtn')}</button>
        </div>

        <div className="modal-divider" />
        <div className="block-title" style={{ fontSize: '1rem', marginBottom: 6 }}>💰 {t('budgetSection')}</div>
        <div className="form-grid">
          <div className="field"><label>{t('amountLabel')} *</label><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="field"><label>{t('currencyLabel')}</label><select value={currency} onChange={(e) => setCurrency(e.target.value)}><option>EGP</option><option>USD</option><option>EUR</option><option>SAR</option></select></div>
          <div className="field full"><label>{t('vendorLabel')}</label><input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
          <div className="field full"><label>{t('notesLabel')}</label><textarea style={{ minHeight: 64 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        {err && <div className="alert alert-error" style={{ marginTop: 12 }}>⚠️ {err}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : '✓'} {t('setBudgetSend')}</button>
        </div>

        <AnimatePresence>
          {picker && <ItemsModal items={items} loading={itemsLoading} inCart={inCart} onAdd={addItem} onDec={decItem} onClose={() => setPicker(false)} />}
        </AnimatePresence>
      </motion.form>
    </div>
  );
}

function ReasonModal({ title, sub, placeholder, confirmLabel, danger, initial = '', onClose, onSubmit }) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(text.trim()); } catch (_) { setBusy(false); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}>
        <h3>{title}</h3>
        {sub && <p className="sub">{sub}</p>}
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', minHeight: 110, border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, font: 'inherit', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn" style={danger ? { background: 'var(--danger)', color: '#fff' } : { background: 'var(--emerald)', color: '#fff' }} disabled={busy}>
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

export default function KitchenDashboard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [budgetFor, setBudgetFor] = useState(null);
  const [reason, setReason] = useState(null);
  const [filter, setFilter] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRequests(await getKitchenRequests()); } catch (_) { setRequests([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const c = {};
    requests.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);
  const filtered = useMemo(() => (filter ? requests.filter((r) => r.status === filter) : requests), [requests, filter]);

  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(); await load(); } catch (e) { alert(e.response?.data?.error || 'Error'); }
    setBusyId(null);
  };
  const saveBudget = async (payload) => { await setBudget(budgetFor.id, payload); setBudgetFor(null); await load(); };
  const submitReason = async (text) => {
    const { request, kind } = reason;
    if (kind !== 'note' && !text) return;
    if (kind === 'order') await rejectOrder(request.id, text);
    else if (kind === 'budget') await rejectBudget(request.id, text);
    else await addKitchenNote(request.id, text);
    setReason(null);
    await load();
  };

  const pdfUrl = (r) => (r.budget_id ? `${API_BASE}/api/kitchen/budget/${r.budget_id}/file` : fileUrl(r.attachment_path));
  const reasonProps = () => {
    if (!reason) return {};
    if (reason.kind === 'order') return { title: `✕ ${t('rejectOrder')}`, sub: `#${reason.request.id}`, placeholder: t('rejectOrderPrompt'), confirmLabel: t('rejectOrder'), danger: true };
    if (reason.kind === 'budget') return { title: `✕ ${t('reject')}`, sub: `#${reason.request.id}`, placeholder: t('rejectPrompt'), confirmLabel: t('reject'), danger: true };
    return { title: `💬 ${t('addNote')}`, sub: `#${reason.request.id}`, placeholder: t('notePrompt'), confirmLabel: t('addNote'), initial: reason.request.kitchen_notes || '' };
  };

  const itemList = (its) => its.map((it) => (
    <div className="oi-row" key={it.id}>
      <span className="oi-name">{it.kind === 'requested' && !it.item_code ? '📝' : it.emoji || '🍽️'} {it.meal_name}{it.description ? <small className="cart-desc"> — {it.description}</small> : null}</span>
      <span className="oi-qty">× {it.quantity}</span>
    </div>
  ));

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2 className="section-title">🔥 {t('kitchenTitle')}</h2>
          <p className="section-sub">{t('kitchenSub')}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ {t('refresh')}</button>
      </div>

      <div className="kpis">
        {[
          { st: 'requested', cls: 'k-new', lbl: 'kpiNew' },
          { st: 'budget_set', cls: 'k-budget', lbl: 'kpiAwaiting' },
          { st: 'budget_uploaded', cls: 'k-budget', lbl: 'kpiToReview' },
          { st: 'ready_for_sap', cls: 'k-ready', lbl: 'kpiReady' }
        ].map((k) => (
          <button key={k.st} className={`kpi ${k.cls} ${filter === k.st ? 'active' : ''}`} onClick={() => setFilter(filter === k.st ? null : k.st)}>
            <div className="num">{kpis[k.st] || 0}</div>
            <div className="lbl">{t(k.lbl)}</div>
          </button>
        ))}
      </div>
      {filter && (
        <div className="filter-bar">
          <span>{t('filtering')}: <b>{t(`status_${filter}`)}</b></span>
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter(null)}>✕ {t('clearFilter')}</button>
        </div>
      )}

      {loading ? (
        <div className="empty"><div className="big">⏳</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="big">🧑‍🍳</div><h3>{t('noRequests')}</h3><p>{t('noRequestsSub')}</p></div>
      ) : (
        <div className="req-list">
          <AnimatePresence>
            {filtered.map((r, i) => {
              const suggested = (r.items || []).filter((it) => it.kind === 'suggested');
              const requested = (r.items || []).filter((it) => it.kind === 'requested');
              return (
                <motion.div key={r.id} className="req-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <div className="order-head">
                    <div className="order-id">{t('orderWord')} <b>#{r.id}</b></div>
                    <div className="order-badges">
                      <span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span>
                      {r.urgent ? <span className="badge badge-urgent">🚨 {t('urgent')}</span> : null}
                    </div>
                  </div>

                  <div className="order-requester">
                    <span>👤 <b>{r.requester_name}</b></span>
                    <span>✉️ {r.requester_email}</span>
                    {r.department ? <span>🏢 {r.department}</span> : null}
                    {r.phone ? <span>📞 {r.phone}</span> : null}
                  </div>
                  <div className="order-meta">
                    {r.type ? <span>🏷️ {t(`type_${r.type}`)}</span> : null}
                    {r.classification ? <span>🍽️ {t(`class_${r.classification}`)}</span> : null}
                    {r.location ? <span>📍 {r.location}</span> : null}
                    <span>👥 {t('peopleShort')}: {r.people}</span>
                    {r.needed_date ? <span>📅 {r.needed_date}</span> : <span>📅 {t('asap')}</span>}
                    {r.needed_time ? <span>⏰ {r.needed_time}</span> : null}
                    {r.amount != null ? <span>💰 {r.amount} {r.currency}</span> : null}
                  </div>

                  {suggested.length > 0 && (
                    <div className="items-group">
                      <div className="items-group-title">🙋 {t('suggestedByRequester')}</div>
                      <div className="order-items">{itemList(suggested)}</div>
                    </div>
                  )}
                  {requested.length > 0 && (
                    <div className="items-group">
                      <div className="items-group-title">✅ {t('finalItems')}</div>
                      <div className="order-items">{itemList(requested)}</div>
                    </div>
                  )}

                  {r.notes ? <div className="special-box">📝 {r.notes}</div> : null}
                  {r.reject_reason ? <div className="special-box" style={{ borderColor: 'var(--danger)' }}>❌ {r.reject_reason}</div> : null}

                  <div className="req-actions">
                    {r.status === 'requested' && (
                      <>
                        <button className="btn btn-orange btn-sm" onClick={() => setBudgetFor(r)} disabled={busyId === r.id}>💰 {t('setBudget')}</button>
                        <button className="btn btn-sm danger-btn" onClick={() => setReason({ request: r, kind: 'order' })} disabled={busyId === r.id}>✕ {t('rejectOrder')}</button>
                      </>
                    )}
                    {r.status === 'budget_set' && <span className="await-note">⏳ {t('awaitingUpload')}</span>}
                    {r.status === 'budget_uploaded' && (
                      <>
                        <a className="btn btn-ghost btn-sm" href={pdfUrl(r)} target="_blank" rel="noreferrer">📎 {t('viewBudget')}</a>
                        <button className="btn btn-primary btn-sm" onClick={() => run(r.id, () => approveBudget(r.id))} disabled={busyId === r.id}>✓ {t('approve')}</button>
                        <button className="btn btn-sm danger-btn" onClick={() => setReason({ request: r, kind: 'budget' })} disabled={busyId === r.id}>✕ {t('reject')}</button>
                      </>
                    )}
                    {r.status === 'ready_for_sap' && r.budget_id && (
                      <a className="btn btn-ghost btn-sm" href={pdfUrl(r)} target="_blank" rel="noreferrer">📎 {t('viewBudget')}</a>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setReason({ request: r, kind: 'note' })} disabled={busyId === r.id}>💬 {t('addNote')}</button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {budgetFor && <SetBudgetModal request={budgetFor} onClose={() => setBudgetFor(null)} onSave={saveBudget} />}
        {reason && <ReasonModal {...reasonProps()} onClose={() => setReason(null)} onSubmit={submitReason} />}
      </AnimatePresence>
    </div>
  );
}
