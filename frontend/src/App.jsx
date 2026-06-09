import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import RequestForm from './RequestForm';
import AuthButton from './AuthButton';
import KitchenDashboard from './components/KitchenDashboard';
import { getMeals } from './api';

export default function App() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [meals, setMeals] = useState([]);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('request'); // 'request' | 'kitchen'

  useEffect(() => {
    getMeals().then(setMeals).catch(() => setMeals([]));
  }, []);

  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [ar, i18n.language]);

  const scrollToForm = () => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <div className="brand-badge">🍽️</div>
            <div>
              EFB Meals
              <small>{t('brandSub')}</small>
            </div>
          </div>
          <div className="spacer" />
          <nav className="nav-tabs">
            <button className={`nav-tab ${view === 'request' ? 'active' : ''}`} onClick={() => setView('request')}>
              {t('navRequest')}
            </button>
            <button className={`nav-tab ${view === 'kitchen' ? 'active' : ''}`} onClick={() => setView('kitchen')}>
              {t('navKitchen')}
            </button>
          </nav>
          <button className="lang-btn" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')}>
            {ar ? 'EN' : 'عربي'}
          </button>
        </div>
      </header>

      {view === 'request' ? (
        <>
          {/* Hero */}
          <section className="hero">
            <div className="container hero-grid">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1] }}>
                <span className="eyebrow">{t('eyebrow')}</span>
                <h1 className="hero-title">
                  {t('heroTitlePre')} <span className="accent">{t('heroTitleAccent')}</span>
                </h1>
                <p className="hero-text">{t('heroText')}</p>
                <div className="cta-row">
                  <button className="btn btn-orange" onClick={scrollToForm}>🚀 {t('ctaOrder')}</button>
                  <AuthButton onSignIn={setUser} user={user} />
                </div>
                {user && (
                  <p style={{ marginTop: 14, color: 'var(--ink-3)' }}>
                    {t('loggedInAs')} <strong>{user.name || user.username}</strong>
                  </p>
                )}
                <div className="stats">
                  <div className="stat"><div className="num">{meals.length}</div><div className="lbl">{t('statMeals')}</div></div>
                  <div className="stat"><div className="num">{t('statApprovalVal')}</div><div className="lbl">{t('statApproval')}</div></div>
                  <div className="stat"><div className="num">SAP</div><div className="lbl">{t('statSap')}</div></div>
                </div>
              </motion.div>

              <div className="hero-visual">
                <motion.div className="platter" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}>
                  🍛
                </motion.div>
                <span className="float-emoji e1">🍗</span>
                <span className="float-emoji e2">🥗</span>
                <span className="float-emoji e3">🍕</span>
                <span className="float-emoji e4">🧃</span>
              </div>
            </div>
          </section>

          {/* Order section */}
          <section className="section" id="order">
            <div className="container">
              <div className="section-head">
                <div>
                  <h2 className="section-title">🍱 {t('menuTitle')}</h2>
                  <p className="section-sub">{t('menuSub')}</p>
                </div>
              </div>
              <RequestForm meals={meals} user={user} />
            </div>
          </section>
        </>
      ) : (
        <KitchenDashboard />
      )}

      <footer className="page-footer">{t('footer')}</footer>
    </div>
  );
}
