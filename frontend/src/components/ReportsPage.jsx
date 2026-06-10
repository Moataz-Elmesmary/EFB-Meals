import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getKitchenRequests, fileUrl } from '../api';

const STATUSES = ['all', 'requested', 'budget_set', 'budget_uploaded', 'ready_for_sap', 'rejected'];

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [dept, setDept] = useState('all');
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getKitchenRequests());
    } catch (e) {
      setRows([]);
      setError(e.response?.data?.error || e.message || 'Failed to load');
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.department || '').trim()).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (dept !== 'all' && (r.department || '') !== dept) return false;
      if (!term) return true;
      const itemsText = (r.items || []).map((it) => it.meal_name).join(' ');
      return [r.requester_name, r.requester_email, r.department, r.meal_name, itemsText, r.notes, String(r.id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, status, dept]);

  const totalBudget = useMemo(
    () => filtered.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [filtered]
  );

  const mealLabel = (r) => r.meal_name || (ar ? r.name_ar : r.name_en) || t('special');

  const exportCsv = () => {
    const headers = ['ID', 'Requester', 'Email', 'Department', 'Phone', 'Meal', 'People', 'Status', 'Budget', 'Currency', 'NeededDate', 'CreatedAt'];
    const lines = [headers.join(',')];
    filtered.forEach((r) => {
      const row = [
        r.id, r.requester_name, r.requester_email, r.department, r.phone,
        r.is_special ? 'Special request' : r.meal_name || r.name_en,
        r.people, r.status, r.amount || '', r.currency || '', r.needed_date || '', r.created_at || ''
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`);
      lines.push(row.join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `efb-meals-report-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <h2 className="section-title">📊 {t('reportsTitle')}</h2>
          <p className="section-sub">{t('reportsSub')}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ {t('refresh')}</button>
      </div>

      <div className="kpis">
        <div className="kpi k-all"><div className="num">{filtered.length}</div><div className="lbl">{t('kpiAll')}</div></div>
        <div className="kpi k-new"><div className="num">{filtered.filter((r) => r.status === 'requested').length}</div><div className="lbl">{t('kpiNew')}</div></div>
        <div className="kpi k-ready"><div className="num">{filtered.filter((r) => r.status === 'ready_for_sap').length}</div><div className="lbl">{t('kpiReady')}</div></div>
        <div className="kpi k-budget"><div className="num">{Math.round(totalBudget)}</div><div className="lbl">{t('totalBudget')} (EGP)</div></div>
      </div>

      <div className="report-toolbar">
        <input className="grow" placeholder={`🔎 ${t('search')}`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">{t('allDepartments')}</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? t('allStatuses') : t(`status_${s}`)}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={exportCsv} disabled={!filtered.length}>⬇️ {t('exportCsv')}</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠️ {error} <button className="btn btn-ghost btn-sm" onClick={load}>↻</button></div>}

      {loading ? (
        <div className="empty"><div className="big">⏳</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="big">📭</div><h3>{t('noRequests')}</h3></div>
      ) : (
        <motion.div className="table-wrap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <table className="report">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('colRequester')}</th>
                <th>{t('deptLabel')}</th>
                <th>{t('colMeal')}</th>
                <th>{t('totalQty')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colBudget')}</th>
                <th>{t('colAttachment')}</th>
                <th>{t('dateLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.requester_name}</div>
                    <div style={{ color: 'var(--ink-4)', fontSize: '.8rem' }}>{r.requester_email}</div>
                  </td>
                  <td>{r.department || '—'}</td>
                  <td>{mealLabel(r)}</td>
                  <td>{r.people}</td>
                  <td><span className={`badge badge-${r.status}`}>{t(`status_${r.status}`)}</span></td>
                  <td>{r.amount != null ? `${r.amount} ${r.currency || 'EGP'}` : '—'}</td>
                  <td>
                    {r.attachment_path ? (
                      <a className="dl-link" href={fileUrl(r.attachment_path)} target="_blank" rel="noreferrer">⬇️ {t('download')}</a>
                    ) : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{(r.needed_date || r.created_at || '').toString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
