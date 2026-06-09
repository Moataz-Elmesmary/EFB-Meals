import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import RequestForm from './RequestForm';
import KitchenDashboard from './components/KitchenDashboard';
import LoginGate from './components/LoginGate';
import AuroraBackground from './components/AuroraBackground';
import { getMeals } from './api';
import { restoreSession, logout } from './auth';

function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay, ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [meals, setMeals] = useState([]);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState('request'); // 'request' | 'kitchen'

  useEffect(() => {
    restoreSession()
      .then((u) => setUser(u))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (user) getMeals().then(setMeals).catch(() => setMeals([]));
  }, [user]);

  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [ar, i18n.language]);

  const doLogout = async () => {
    await logout();
    setUser(null);
  };

  const scrollToForm = () => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });

  if (booting) {
    return (
      <div className="boot">
        <AuroraBackground variant="night" />
        <div className="boot-inner"><span className="dish-spin">🍽️</span></div>
      </div>
    );
  }

  if (!user) return <LoginGate onLogin={setUser} />;

  return (
    <div className="app-shell">
      <div className="ambient"><AuroraBackground variant="day" /></div>

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
          <div className="user-chip" title={user.email}>
            <span className="avatar">{(user.name || user.email || '?')[0].toUpperCase()}</span>
            <span className="user-name">{user.name}</span>
            <button className="logout-btn" onClick={doLogout} title={t('logout')}>⎋</button>
          </div>
        </div>
      </header>

      {view === 'request' ? (
        <>
          <section className="hero">
            <div className="container hero-grid">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1] }}>
                <span className="eyebrow">{t('eyebrow')}</span>
                <h1 className="hero-title">
                  {t('heroTitlePre')} <span className="accent">{t('heroTitleAccent')}</span>
                </h1>
                <p className="hero-text">{t('heroText')}</p>
                <div className="cta-row">
                  <button className="btn btn-orange" onClick={scrollToForm}>🍴 {t('ctaOrder')}</button>
                </div>
                <div className="stats">
                  <div className="stat"><div className="num">{meals.length}</div><div className="lbl">{t('statMeals')}</div></div>
                  <div className="stat"><div className="num">⚡</div><div className="lbl">{t('statFast')}</div></div>
                  <div className="stat"><div className="num">🌍</div><div className="lbl">{t('statBilingual')}</div></div>
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

          <section className="section" id="order">
            <div className="container">
              <Reveal>
                <div className="section-head">
                  <div>
                    <h2 className="section-title">🍱 {t('menuTitle')}</h2>
                    <p className="section-sub">{t('menuSub')}</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <RequestForm meals={meals} user={user} />
              </Reveal>
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
