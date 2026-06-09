import React, { useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function RequestForm({ meals }){
  const { t } = useTranslation();
  const [form, setForm] = useState({ requester_name: '', requester_email: '', meal_id: '', quantity: 1, special_request: ''});
  const [status, setStatus] = useState(null);

  function submit(e){
    e.preventDefault();
    axios.post('http://localhost:3000/api/request', form).then(r=>{
      setStatus('submitted');
    }).catch(()=>setStatus('error'));
  }

  return (
    <motion.form onSubmit={submit} initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ maxWidth: 600 }}>
      <div>
        <label>Name</label>
        <input value={form.requester_name} onChange={e=>setForm({...form, requester_name: e.target.value})} />
      </div>
      <div>
        <label>Email</label>
        <input value={form.requester_email} onChange={e=>setForm({...form, requester_email: e.target.value})} />
      </div>
      <div>
        <label>Meal</label>
        <select value={form.meal_id} onChange={e=>setForm({...form, meal_id: e.target.value})}>
          <option value="">-- select --</option>
          {meals.map(m=> <option key={m.id} value={m.id}>{m.name_en} / {m.name_ar}</option>)}
        </select>
      </div>
      <div>
        <label>Quantity</label>
        <input type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: parseInt(e.target.value||1,10)})} />
      </div>
      <div>
        <label>Special Request</label>
        <textarea value={form.special_request} onChange={e=>setForm({...form, special_request: e.target.value})} />
      </div>
      <button type="submit">{t('submit')}</button>
      {status === 'submitted' && <div style={{ color: 'green' }}>Submitted</div>}
      {status === 'error' && <div style={{ color: 'red' }}>Error</div>}
    </motion.form>
  )
}
