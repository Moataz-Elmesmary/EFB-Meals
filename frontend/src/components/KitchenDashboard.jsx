import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getKitchenRequests, createBudget, markReady, fileUrl } from '../api';
import BudgetModal from './BudgetModal';

export default function KitchenDashboard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [budgetFor, setBudgetFor] = useState(null);
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
    const c = { requested: 0, budget_requested: 0, ready_for_sap: 0 };
    requests.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  const saveBudget = async (formData) => {
    await createBudget(budgetFor.id, formData);
    setBudgetFor(null);
    await load();
  };

  const sendToSap = async (r) => {
    setBusyId(r.id);
    try {
      await markReady(r.id);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Error');
    }
    setBusyId(null);
  };

  const mealLabel = (r) => {
    if (r.is_special) return t('special');
    return ar ? r.name_ar : r.name_en;
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
        <div className="kpi k-new"><div className="num">{kpis.requested || 0}</div><div className="lbl">{t('kpiNew')}</div></div>
        <div className="kpi k-budget"><div className="num">{kpis.budget_requested || 0}</div><div className="lbl">{t('kpiBudget')}</div></div>
        <div className="kpi k-ready"><div className="num">{kpis.ready_for_sap || 0}</div><div className="lbl">{t('kpiReady')}</div></div>
        <div className="kpi k-all"><div className="num">{requests.length}</div><div className="lbl">{t('kpiAll')}</div></div>
      </div>

      {loading ? (
        <div className="empty"><div className="big">⏳</div></div>
      ) : requests.length === 0 ? (
        <div className="empty">
          <div className="big">🧑‍🍳</div>
          <h3>{t('noRequests')}</h3>
          <p>{t('noRequestsSub')}</p>
        </div>
      ) : (
        <div className="req-list">
          <AnimatePresence>
            {requests.map((r, i) => (
              <motion.div
                key={r.id}
                className="req-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <div className="req-top">
                  <div className="req-emoji">{r.is_special ? '✏️' : r.emoji || '🍽️'}</div>
                  <div className="req-main">
                    <div className="req-title">
                      #{r.id} · {mealLabel(r)}{' '}
                      <span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span>
                      {r.is_special ? <span className="badge badge-special" style={{ marginInlineStart: 6 }}>{t('special')}</span> : null}
                    </div>
                    <div className="req-meta">
                      <span>👤 {r.requester_name}</span>
                      <span>✉️ {r.requester_email}</span>
                      {r.department ? <span>🏢 {r.department}</span> : null}
                      <span>👥 {r.people} {t('people')}</span>
                      {r.needed_date ? <span>📅 {r.needed_date}</span> : null}
                      {r.amount != null ? <span>💰 {r.amount} {r.currency}</span> : null}
                    </div>
                  </div>
                </div>

                {r.is_special && r.special_request ? (
                  <div className="special-box">“{r.special_request}”</div>
                ) : null}

                <div className="req-actions">
                  {r.status === 'requested' && (
                    <button className="btn btn-orange btn-sm" onClick={() => setBudgetFor(r)}>💰 {t('createBudget')}</button>
                  )}
                  {r.attachment_path && (
                    <a className="btn btn-ghost btn-sm" href={fileUrl(r.attachment_path)} target="_blank" rel="noreferrer">📎 {t('viewAttachment')}</a>
                  )}
                  {r.status === 'budget_requested' && (
                    <button className="btn btn-primary btn-sm" onClick={() => sendToSap(r)} disabled={busyId === r.id}>
                      {busyId === r.id ? <><span className="spinner" /> {t('sendingSap')}</> : <>📤 {t('markReady')}</>}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {budgetFor && (
          <BudgetModal request={budgetFor} onClose={() => setBudgetFor(null)} onSave={saveBudget} />
        )}
      </AnimatePresence>
    </div>
  );
}
