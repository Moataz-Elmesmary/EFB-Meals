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
      <motion.form
        className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}
        initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
      >
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

export default function KitchenDashboard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [budgetFor, setBudgetFor] = useState(null);

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
  const doRejectOrder = (r) => {
    const reason = window.prompt(t('rejectOrderPrompt'));
    if (reason && reason.trim()) run(r.id, () => rejectOrder(r.id, reason.trim()));
  };
  const doReject = (r) => {
    const reason = window.prompt(t('rejectPrompt'));
    if (reason && reason.trim()) run(r.id, () => rejectBudget(r.id, reason.trim()));
  };
  const doNote = (r) => {
    const note = window.prompt(t('notePrompt'), r.kitchen_notes || '');
    if (note != null) run(r.id, () => addKitchenNote(r.id, note));
  };
  const saveBudget = async (payload) => {
    await setBudget(budgetFor.id, payload);
    setBudgetFor(null);
    await load();
  };

  const mealLabel = (r) => r.meal_name || (ar ? r.name_ar : r.name_en) || t('special');
  const itemsLine = (r) => (r.items && r.items.length ? r.items.map((it) => `${it.special ? '📝 ' : ''}${it.meal_name} ×${it.quantity}`).join(' · ') : null);
  const pdfUrl = (r) => (r.budget_id ? `${API_BASE}/api/kitchen/budget/${r.budget_id}/file` : fileUrl(r.attachment_path));

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
        <div className="kpi k-new"><div className="num">{kpis.requested || 0}</div><div className="lbl">{t('kpiNew')}</div></div>
        <div className="kpi k-budget"><div className="num">{kpis.budget_set || 0}</div><div className="lbl">{t('kpiAwaiting')}</div></div>
        <div className="kpi k-budget"><div className="num">{kpis.budget_uploaded || 0}</div><div className="lbl">{t('kpiToReview')}</div></div>
        <div className="kpi k-ready"><div className="num">{kpis.ready_for_sap || 0}</div><div className="lbl">{t('kpiReady')}</div></div>
      </div>

      {loading ? (
        <div className="empty"><div className="big">⏳</div></div>
      ) : requests.length === 0 ? (
        <div className="empty"><div className="big">🧑‍🍳</div><h3>{t('noRequests')}</h3><p>{t('noRequestsSub')}</p></div>
      ) : (
        <div className="req-list">
          <AnimatePresence>
            {requests.map((r, i) => (
              <motion.div key={r.id} className="req-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                <div className="req-top">
                  <div className="req-emoji">{r.is_special ? '✏️' : r.emoji || '🍽️'}</div>
                  <div className="req-main">
                    <div className="req-title">
                      #{r.id} · {mealLabel(r)} <span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span>
                      {r.urgent ? <span className="badge badge-urgent" style={{ marginInlineStart: 6 }}>🚨 {t('urgent')}</span> : null}
                    </div>
                    <div className="req-meta">
                      <span>👤 {r.requester_name}</span>
                      <span>✉️ {r.requester_email}</span>
                      {r.department ? <span>🏢 {r.department}</span> : null}
                      {r.phone ? <span>📞 {r.phone}</span> : null}
                      <span>👥 {r.people} {t('people')}</span>
                      {r.needed_date ? <span>📅 {r.needed_date}</span> : null}
                      {r.needed_time ? <span>⏰ {r.needed_time}</span> : null}
                      {r.amount != null ? <span>💰 {r.amount} {r.currency}</span> : null}
                    </div>
                  </div>
                </div>

                {itemsLine(r) ? <div className="items-line">🧾 {itemsLine(r)}</div> : null}
                {r.notes ? <div className="special-box">📝 {r.notes}</div> : null}
                {r.reject_reason ? <div className="special-box" style={{ borderColor: 'var(--danger)' }}>❌ {r.reject_reason}</div> : null}

                <div className="req-actions">
                  {r.status === 'requested' && (
                    <>
                      <button className="btn btn-orange btn-sm" onClick={() => setBudgetFor(r)} disabled={busyId === r.id}>💰 {t('setBudget')}</button>
                      <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => doRejectOrder(r)} disabled={busyId === r.id}>✕ {t('rejectOrder')}</button>
                    </>
                  )}
                  {r.status === 'budget_set' && <span className="await-note">⏳ {t('awaitingUpload')}</span>}
                  {r.status === 'budget_uploaded' && (
                    <>
                      <a className="btn btn-ghost btn-sm" href={pdfUrl(r)} target="_blank" rel="noreferrer">📎 {t('viewBudget')}</a>
                      <button className="btn btn-primary btn-sm" onClick={() => run(r.id, () => approveBudget(r.id))} disabled={busyId === r.id}>✓ {t('approve')}</button>
                      <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => doReject(r)} disabled={busyId === r.id}>✕ {t('reject')}</button>
                    </>
                  )}
                  {r.status === 'ready_for_sap' && r.budget_id && (
                    <a className="btn btn-ghost btn-sm" href={pdfUrl(r)} target="_blank" rel="noreferrer">📎 {t('viewBudget')}</a>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => doNote(r)} disabled={busyId === r.id}>💬 {t('addNote')}</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {budgetFor && <SetBudgetModal request={budgetFor} onClose={() => setBudgetFor(null)} onSave={saveBudget} />}
      </AnimatePresence>
    </div>
  );
}
