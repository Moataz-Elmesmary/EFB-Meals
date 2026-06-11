import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getMyRequests, uploadBudget, fileUrl } from '../api';

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

export default function MyRequests({ onReorder }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getMyRequests());
    } catch (e) {
      setRows([]);
      setError(e.response?.data?.error || e.message || 'Failed to load');
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };
  const onUploaded = async () => {
    await load();
    flash(t('budgetSent'));
  };

  const itemList = (its) => its.map((it) => (
    <div className="oi-row" key={it.id}>
      <span className="oi-name">{it.kind === 'requested' && !it.item_code ? '📝' : it.emoji || '🍽️'} {it.meal_name}{it.description ? <small className="cart-desc"> — {it.description}</small> : null}</span>
      <span className="oi-qty">× {it.quantity}</span>
    </div>
  ));
  const stepIndex = (s) => {
    const i = STEPS.indexOf(s);
    return i < 0 ? 0 : i;
  };

  const reorder = (r) => {
    const items = (r.items || []).filter((it) => it.kind === 'suggested').map((it, i) =>
      it.special
        ? { key: `s${r.id}_${i}`, item_code: null, name: it.meal_name, description: it.description || '', quantity: it.quantity, special: true }
        : { key: `i${it.item_code}`, item_code: it.item_code, name: it.meal_name, quantity: it.quantity, special: false }
    );
    if (items.length) onReorder?.(items);
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

      <AnimatePresence>
        {notice && (
          <motion.div className="alert alert-success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 16 }}>
            ✅ {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="empty"><div className="big">⏳</div></div>
      ) : error ? (
        <div className="alert alert-error">⚠️ {error} <button className="btn btn-ghost btn-sm" style={{ marginInlineStart: 10 }} onClick={load}>↻ {t('refresh')}</button></div>
      ) : rows.length === 0 ? (
        <div className="empty"><div className="big">🍽️</div><h3>{t('myEmpty')}</h3><p>{t('myEmptySub')}</p></div>
      ) : (
        <div className="req-list">
          {rows.map((r, i) => {
            const needsUpload = r.status === 'budget_set';
            const completed = r.status === 'ready_for_sap';
            return (
              <motion.div key={r.id} className="req-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                <div className="order-head">
                  <div className="order-id">{t('orderWord')} <b>#{r.id}</b></div>
                  <div className="order-badges">
                    <span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span>
                    {r.urgent ? <span className="badge badge-urgent">🚨 {t('urgent')}</span> : null}
                  </div>
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

                {(r.items || []).some((i) => i.kind === 'suggested') && (
                  <div className="items-group">
                    <div className="items-group-title">🙋 {t('suggestedItems')}</div>
                    <div className="order-items">{itemList((r.items || []).filter((i) => i.kind === 'suggested'))}</div>
                  </div>
                )}
                {(r.items || []).some((i) => i.kind === 'requested') && (
                  <div className="items-group">
                    <div className="items-group-title">✅ {t('finalItems')}</div>
                    <div className="order-items">{itemList((r.items || []).filter((i) => i.kind === 'requested'))}</div>
                  </div>
                )}

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

                {needsUpload && <UploadBudget request={r} onDone={onUploaded} />}

                {(completed || r.attachment_path) && (
                  <div className="req-actions">
                    {completed && (
                      <button className="btn btn-orange btn-sm" onClick={() => reorder(r)}>🔁 {t('reorder')}</button>
                    )}
                    {r.attachment_path && (
                      <a className="btn btn-ghost btn-sm" href={fileUrl(r.attachment_path)} target="_blank" rel="noreferrer">📎 {t('viewAttachment')}</a>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
