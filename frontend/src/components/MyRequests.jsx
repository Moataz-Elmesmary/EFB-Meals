import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getMyRequests, createRequest, fileUrl } from '../api';

const STEPS = ['requested', 'budget_requested', 'ready_for_sap'];

export default function MyRequests() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await getMyRequests());
    } catch (_) {
      setRows([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const mealLabel = (r) => (r.is_special ? t('special') : ar ? r.name_ar : r.name_en);
  const stepIndex = (s) => Math.max(0, STEPS.indexOf(s));

  const [busyId, setBusyId] = useState(null);
  const reorder = async (r) => {
    setBusyId(r.id);
    try {
      await createRequest({
        requester_name: r.requester_name,
        requester_email: r.requester_email,
        department: r.department,
        phone: r.phone,
        meal_id: r.is_special ? null : r.meal_id,
        special_request: r.is_special ? r.special_request : '',
        people: r.people,
        notes: r.notes
      });
      await load();
    } catch (_) {}
    setBusyId(null);
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2 className="section-title">🧾 {t('myTitle')}</h2>
          <p className="section-sub">{t('mySub')}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ {t('refresh')}</button>
      </div>

      {loading ? (
        <div className="empty"><div className="big">⏳</div></div>
      ) : rows.length === 0 ? (
        <div className="empty"><div className="big">🍽️</div><h3>{t('myEmpty')}</h3><p>{t('myEmptySub')}</p></div>
      ) : (
        <div className="req-list">
          {rows.map((r, i) => (
            <motion.div key={r.id} className="req-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <div className="req-top">
                <div className="req-emoji">{r.is_special ? '✏️' : r.emoji || '🍽️'}</div>
                <div className="req-main">
                  <div className="req-title">
                    #{r.id} · {mealLabel(r)} <span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span>
                    {r.urgent ? <span className="badge badge-urgent" style={{ marginInlineStart: 6 }}>🚨 {t('urgent')}</span> : null}
                  </div>
                  <div className="req-meta">
                    <span>👥 {r.people} {t('people')}</span>
                    {r.needed_date ? <span>📅 {r.needed_date}</span> : null}
                    {r.amount != null ? <span>💰 {r.amount} {r.currency}</span> : null}
                  </div>
                </div>
              </div>

              {r.is_special && r.special_request ? <div className="special-box">“{r.special_request}”</div> : null}

              {/* status timeline */}
              <div className="timeline">
                {STEPS.map((s, idx) => (
                  <div key={s} className={`tl-step ${idx <= stepIndex(r.status) ? 'done' : ''}`}>
                    <span className="tl-dot">{idx <= stepIndex(r.status) ? '✓' : idx + 1}</span>
                    <span className="tl-label">{t(`status_${s}`)}</span>
                  </div>
                ))}
              </div>

              <div className="req-actions">
                <button className="btn btn-orange btn-sm" onClick={() => reorder(r)} disabled={busyId === r.id}>
                  {busyId === r.id ? <span className="spinner" /> : '🔁'} {t('reorder')}
                </button>
                {r.attachment_path && (
                  <a className="btn btn-ghost btn-sm" href={fileUrl(r.attachment_path)} target="_blank" rel="noreferrer">📎 {t('viewAttachment')}</a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
