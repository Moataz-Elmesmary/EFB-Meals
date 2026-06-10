import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import API_BASE, { getKitchenRequests, setBudget, rejectOrder, approveBudget, rejectBudget, addKitchenNote, fileUrl } from '../api';

function SetBudgetModal({ request, onClose, onSave }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [vendor, setVendor] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return setErr(t('amountRequired'));
    setBusy(true);
    try {
      await onSave({ amount, currency, vendor });
    } catch (e2) {
      setErr(e2.response?.data?.error || t('error'));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}>
        <h3>💰 {t('setBudgetTitle')}</h3>
        <p className="sub">#{request.id} — {t('setBudgetSub')}</p>
        <div className="form-grid">
          <div className="field"><label>{t('amountLabel')}</label><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
          <div className="field"><label>{t('currencyLabel')}</label><select value={currency} onChange={(e) => setCurrency(e.target.value)}><option>EGP</option><option>USD</option><option>EUR</option><option>SAR</option></select></div>
          <div className="field full"><label>{t('vendorLabel')}</label><input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
        </div>
        {err && <div className="alert alert-error" style={{ marginTop: 12 }}>⚠️ {err}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : '✓'} {t('setBudgetSend')}</button>
        </div>
      </motion.form>
    </div>
  );
}

// Generic reason / note modal (replaces window.prompt)
function ReasonModal({ title, sub, placeholder, confirmLabel, danger, initial = '', onClose, onSubmit }) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(text.trim());
    } catch (_) {
      setBusy(false);
    }
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
  const [reason, setReason] = useState(null); // { request, kind: 'order'|'budget'|'note' }
  const [filter, setFilter] = useState(null); // status filter from the KPI cards

  const load = async () => {
    setLoading(true);
    try {
      setRequests(await getKitchenRequests());
    } catch (_) {
      setRequests([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const c = {};
    requests.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  const filtered = useMemo(() => (filter ? requests.filter((r) => r.status === filter) : requests), [requests, filter]);

  const run = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Error');
    }
    setBusyId(null);
  };

  const saveBudget = async (payload) => {
    await setBudget(budgetFor.id, payload);
    setBudgetFor(null);
    await load();
  };

  const submitReason = async (text) => {
    const { request, kind } = reason;
    if (kind !== 'note' && !text) return; // reason required
    if (kind === 'order') await rejectOrder(request.id, text);
    else if (kind === 'budget') await rejectBudget(request.id, text);
    else await addKitchenNote(request.id, text);
    setReason(null);
    await load();
  };

  const itemName = (it) => it.meal_name;
  const pdfUrl = (r) => (r.budget_id ? `${API_BASE}/api/kitchen/budget/${r.budget_id}/file` : fileUrl(r.attachment_path));

  const reasonProps = () => {
    if (!reason) return {};
    if (reason.kind === 'order') return { title: `✕ ${t('rejectOrder')}`, sub: `#${reason.request.id}`, placeholder: t('rejectOrderPrompt'), confirmLabel: t('rejectOrder'), danger: true };
    if (reason.kind === 'budget') return { title: `✕ ${t('reject')}`, sub: `#${reason.request.id}`, placeholder: t('rejectPrompt'), confirmLabel: t('reject'), danger: true };
    return { title: `💬 ${t('addNote')}`, sub: `#${reason.request.id}`, placeholder: t('notePrompt'), confirmLabel: t('addNote'), initial: reason.request.kitchen_notes || '' };
  };

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
          <button
            key={k.st}
            className={`kpi ${k.cls} ${filter === k.st ? 'active' : ''}`}
            onClick={() => setFilter(filter === k.st ? null : k.st)}
          >
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
            {filtered.map((r, i) => (
              <motion.div key={r.id} className="req-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                {/* header */}
                <div className="order-head">
                  <div className="order-id">{t('orderWord')} <b>#{r.id}</b></div>
                  <div className="order-badges">
                    <span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span>
                    {r.urgent ? <span className="badge badge-urgent">🚨 {t('urgent')}</span> : null}
                  </div>
                </div>

                {/* requester */}
                <div className="order-requester">
                  <span>👤 <b>{r.requester_name}</b></span>
                  <span>✉️ {r.requester_email}</span>
                  {r.department ? <span>🏢 {r.department}</span> : null}
                  {r.phone ? <span>📞 {r.phone}</span> : null}
                </div>

                {/* items */}
                <div className="order-items">
                  {(r.items || []).map((it) => (
                    <div className="oi-row" key={it.id}>
                      <span className="oi-name">{it.special ? '📝' : it.emoji || '🍽️'} {itemName(it)}</span>
                      <span className="oi-qty">× {it.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* order meta */}
                <div className="order-meta">
                  {r.needed_date ? <span>📅 {r.needed_date}</span> : <span>📅 {t('asap')}</span>}
                  {r.needed_time ? <span>⏰ {r.needed_time}</span> : null}
                  <span>🍴 {t('totalQty')}: {r.people}</span>
                  {r.amount != null ? <span>💰 {r.amount} {r.currency}</span> : null}
                </div>

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
            ))}
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
