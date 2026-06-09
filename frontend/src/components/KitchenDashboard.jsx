import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import API_BASE, { getKitchenRequests, requestBudget, approveBudget, rejectBudget, addKitchenNote, fileUrl } from '../api';

export default function KitchenDashboard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

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

  const doReject = (r) => {
    const reason = window.prompt(t('rejectPrompt'));
    if (reason && reason.trim()) run(r.id, () => rejectBudget(r.id, reason.trim()));
  };
  const doNote = (r) => {
    const note = window.prompt(t('notePrompt'), r.kitchen_notes || '');
    if (note != null) run(r.id, () => addKitchenNote(r.id, note));
  };

  const mealLabel = (r) => (r.is_special ? t('special') : ar ? r.name_ar : r.name_en);
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
        <div className="kpi k-budget"><div className="num">{(kpis.budget_requested || 0) + (kpis.budget_rejected || 0)}</div><div className="lbl">{t('kpiAwaiting')}</div></div>
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
                      {r.is_special ? <span className="badge badge-special" style={{ marginInlineStart: 6 }}>{t('special')}</span> : null}
                      {r.urgent ? <span className="badge badge-urgent" style={{ marginInlineStart: 6 }}>🚨 {t('urgent')}</span> : null}
                    </div>
                    <div className="req-meta">
                      <span>👤 {r.requester_name}</span>
                      <span>✉️ {r.requester_email}</span>
                      {r.department ? <span>🏢 {r.department}</span> : null}
                      <span>👥 {r.people} {t('people')}</span>
                      {r.needed_date ? <span>📅 {r.needed_date}</span> : null}
                      {r.needed_time ? <span>⏰ {r.needed_time}</span> : null}
                      {r.amount != null ? <span>💰 {r.amount} {r.currency}</span> : null}
                    </div>
                  </div>
                </div>

                {r.is_special && r.special_request ? <div className="special-box">“{r.special_request}”</div> : null}
                {r.notes ? <div className="special-box">📝 {r.notes}</div> : null}
                {r.reject_reason && r.status === 'budget_rejected' ? <div className="special-box" style={{ borderColor: 'var(--danger)' }}>❌ {r.reject_reason}</div> : null}

                <div className="req-actions">
                  {r.status === 'requested' && (
                    <button className="btn btn-orange btn-sm" onClick={() => run(r.id, () => requestBudget(r.id))} disabled={busyId === r.id}>📄 {t('requestBudget')}</button>
                  )}
                  {(r.status === 'budget_requested' || r.status === 'budget_rejected') && (
                    <span className="await-note">⏳ {t('awaitingUpload')}</span>
                  )}
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
    </div>
  );
}
