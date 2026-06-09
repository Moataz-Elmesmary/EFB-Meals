import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function BudgetModal({ request, onClose, onSave }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!amount || isNaN(parseFloat(amount))) return setErr(t('amountRequired'));
    if (!file) return setErr(t('attachmentRequired'));

    const fd = new FormData();
    fd.append('amount', amount);
    fd.append('currency', currency);
    fd.append('vendor', vendor);
    fd.append('notes', notes);
    fd.append('attachment', file);

    setBusy(true);
    try {
      await onSave(fd);
    } catch (e2) {
      setErr(e2.response?.data?.error || t('error'));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ ease: [0.34, 1.56, 0.64, 1] }}
      >
        <h3>💰 {t('budgetTitle')}</h3>
        <p className="sub">#{request.id} — {t('budgetSub')}</p>

        <div className="form-grid">
          <div className="field">
            <label>{t('amountLabel')}</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t('currencyLabel')}</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option>EGP</option>
              <option>USD</option>
              <option>EUR</option>
              <option>SAR</option>
            </select>
          </div>
          <div className="field full">
            <label>{t('vendorLabel')}</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="field full">
            <label>{t('notesLabel')}</label>
            <textarea style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="field full">
            <label>{t('attachmentLabel')}</label>
            <label className={`file-drop ${file ? 'has-file' : ''}`}>
              {file ? `✅ ${t('fileSelected')}: ${file.name}` : `📎 ${t('chooseFile')}`}
              <input type="file" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
            </label>
          </div>
        </div>

        {err && <div className="alert alert-error" style={{ marginTop: 14 }}>⚠️ {err}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 22, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <><span className="spinner" /> {t('saving')}</> : t('save')}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
