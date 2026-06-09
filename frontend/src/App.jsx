import React, { useState, useEffect } from 'react'
import axios from 'axios'
import RequestForm from './RequestForm'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function App(){
  const { t, i18n } = useTranslation();
  const [meals, setMeals] = useState([]);

  useEffect(()=>{
    axios.get('http://localhost:3000/api/meals').then(r=>setMeals(r.data)).catch(()=>{});
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 20 }}>
      <motion.h1 initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>{t('title')}</motion.h1>
      <div style={{ marginBottom: 10 }}>
        <button onClick={()=>i18n.changeLanguage('en')}>English</button>
        <button onClick={()=>i18n.changeLanguage('ar')} style={{ marginLeft:8 }}>عربي</button>
      </div>
      <RequestForm meals={meals} />
    </div>
  )
}
