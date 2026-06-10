import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getMyRequests, createRequest, uploadBudget, fileUrl } from '../api';

const STEPS = ['requested', 'budget_set', 'budget_uploaded', 'ready_for_sap'];

function UploadBudget({ request, onDone }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!file) return setErr(t('attachmentRequired'));
    const fd = new FormData();
    fd.append('attachment', file);
    setBusy(true);
    try {
      await uploadBudget(request.id, fd);
      onDone();
    } catch (e2) {
      setErr(e2.response?.data?.error || t('error'));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="upload-budget">
      <div className="upload-title">📄 {t('uploadBudgetTitle')}</div>
      {request.amount != null && (
        <div className="required-budget">{t('requiredBudget')}: <b>{request.amount} {request.currency || 'EGP'}</b></div>
      )}
      <label className={`file-drop ${file ? 'has-file' : ''}`} style={{ marginTop: 10 }}>
        {file ? `✅ ${file.name}` : `📎 ${t('chooseFile')}`}
        <input type="file" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
      </label>
      {err && <div className="alert alert-error" style={{ marginTop: 10 }}>⚠️ {err}</div>}
      <button className="btn btn-orange btn-sm" type="submit" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? <span className="spinner" /> : '⬆️'} {t('sendBudget')}
      </button>
    </form>
  );
}

export default function MyRequests() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

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

  const mealLabel = (r) => r.meal_name || (ar ? r.name_ar : r.name_en) || t('special');
  const itemsLine = (r) => (r.items && r.items.length ? r.items.map((it) => `${it.special ? '📝 ' : ''}${it.meal_name} ×${it.quantity}`).join(' · ') : null);
  const stepIndex = (s) => {
    const i = STEPS.indexOf(s);
    return i < 0 ? 0 : i;
  };

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
          {rows.map((r, i) => {
            const needsUpload = r.status === 'budget_set';
            return (
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

                {itemsLine(r) ? <div className="items-line">🧾 {itemsLine(r)}</div> : null}
                {r.kitchen_notes ? <div className="special-box">💬 {t('kitchenSays')}: {r.kitchen_notes}</div> : null}
                {r.reject_reason ? <div className="special-box" style={{ borderColor: 'var(--danger)' }}>❌ {t('rejectedReason')}: {r.reject_reason}</div> : null}

                {/* status timeline */}
                <div className="timeline">
                  {STEPS.map((s, idx) => {
                    const done = r.status !== 'rejected' && idx <= stepIndex(r.status);
                    return (
                      <div key={s} className={`tl-step ${done ? 'done' : ''}`}>
                        <span className="tl-dot">{done ? '✓' : idx + 1}</span>
                        <span className="tl-label">{t(`status_${s}`)}</span>
                      </div>
                    );
                  })}
                </div>

                {needsUpload && <UploadBudget request={r} onDone={load} />}

                <div className="req-actions">
                  <button className="btn btn-orange btn-sm" onClick={() => reorder(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? <span className="spinner" /> : '🔁'} {t('reorder')}
                  </button>
                  {r.attachment_path && (
                    <a className="btn btn-ghost btn-sm" href={fileUrl(r.attachment_path)} target="_blank" rel="noreferrer">📎 {t('viewAttachment')}</a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
