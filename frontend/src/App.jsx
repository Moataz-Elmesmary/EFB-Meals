import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import RequestForm from './RequestForm';
import KitchenDashboard from './components/KitchenDashboard';
import ReportsPage from './components/ReportsPage';
import MyRequests from './components/MyRequests';
import LoginGate from './components/LoginGate';
import BootSplash from './components/BootSplash';
import AuroraBackground from './components/AuroraBackground';
import Marquee from './components/Marquee';
import FoodImg from './components/FoodImg';
import { getMeals } from './api';
import { restoreSession, logout } from './auth';
import useSmoothScroll, { smoothScrollTo } from './useSmoothScroll';

const IMG = {
  hero: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&h=900&q=80',
  grill: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=400&h=400&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&h=400&q=80',
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&h=400&q=80'
};

function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay, ease: [0.22, 1, 0.36, 1], duration: 0.7 }}
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
  const [splash, setSplash] = useState(false); // food loader AFTER login
  const [view, setView] = useState('request');

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const yUp = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const yDown = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const yMid = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const rot = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useSmoothScroll(!!user && view === 'request');

  // Sign in (from restored session or LoginGate) → show the food loader briefly.
  const enter = (u) => {
    setUser(u);
    if (u) {
      setSplash(true);
      setTimeout(() => setSplash(false), 2200);
    }
  };

  useEffect(() => {
    restoreSession()
      .then(enter)
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

  const marqueeItems = [
    { e: '🍗', t: t('m1') }, { e: '🥗', t: t('m2') }, { e: '🍕', t: t('m3') },
    { e: '🍛', t: t('m4') }, { e: '🍮', t: t('m5') }, { e: '☕', t: t('m6') }
  ];

  // While restoring the session: neutral background only (no loader before login).
  if (booting) return <div className="boot"><AuroraBackground variant="night" /></div>;

  // Entry point is the login screen — no loader before it.
  if (!user) return <LoginGate onLogin={enter} />;

  // Food loader shows AFTER sign-in, then the app.
  if (splash) return <BootSplash />;

  return (
    <div className="app-shell">
      <div className="ambient"><AuroraBackground variant="day" /></div>

      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <img className="brand-logo" src="/logo-dark.jpg" alt="بنك الطعام المصري" />
            <div>EFB Meals<small>{t('brandSub')}</small></div>
          </div>
          <div className="spacer" />
          <nav className="nav-tabs">
            <button className={`nav-tab ${view === 'request' ? 'active' : ''}`} onClick={() => setView('request')}>{t('navRequest')}</button>
            <button className={`nav-tab ${view === 'mine' ? 'active' : ''}`} onClick={() => setView('mine')}>{t('navMine')}</button>
            <button className={`nav-tab ${view === 'kitchen' ? 'active' : ''}`} onClick={() => setView('kitchen')}>{t('navKitchen')}</button>
            <button className={`nav-tab ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>{t('navReports')}</button>
          </nav>
          <button className="lang-btn" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'عربي'}</button>
          <div className="user-chip" title={user.email}>
            <span className="avatar">{(user.name || user.email || '?')[0].toUpperCase()}</span>
            <span className="user-name">{user.name}</span>
            <button className="logout-btn" onClick={doLogout} title={t('logout')}>⎋</button>
          </div>
        </div>
      </header>

      {view === 'request' ? (
        <>
          <section className="hero hero-xl" ref={heroRef}>
            <div className="container hero-grid">
              <motion.div style={{ y: yMid }}>
                <motion.span className="eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  {t('eyebrow')}
                </motion.span>
                <motion.h1 className="display" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, ease: [0.22, 1, 0.36, 1] }}>
                  {t('heroTitlePre')} <span className="accent">{t('heroTitleAccent')}</span>
                </motion.h1>
                <motion.p className="hero-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  {t('heroText')}
                </motion.p>
                <motion.div className="cta-row" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <button className="btn btn-orange btn-lg" onClick={() => smoothScrollTo('#order')}>🍴 {t('ctaOrder')}</button>
                  <button className="btn btn-ghost btn-lg" onClick={() => smoothScrollTo('#how')}>{t('ctaHow')}</button>
                </motion.div>
              </motion.div>

              <motion.div className="hero-stage" style={{ opacity: fade }}>
                <motion.div className="hero-orb" style={{ rotate: rot }} />
                <motion.div style={{ y: yUp }} className="hero-main-img">
                  <FoodImg src={IMG.hero} emoji="🍛" alt="" />
                </motion.div>
                <motion.div className="food-chip c1" style={{ y: yDown }}><FoodImg src={IMG.pizza} emoji="🍕" /></motion.div>
                <motion.div className="food-chip c2" style={{ y: yUp }}><FoodImg src={IMG.dessert} emoji="🍮" /></motion.div>
                <motion.div className="food-chip c3" style={{ y: yMid }}><FoodImg src={IMG.grill} emoji="🍗" /></motion.div>
              </motion.div>
            </div>
          </section>

          <Marquee items={marqueeItems} />

          <section className="section" id="how">
            <div className="container">
              <Reveal>
                <div className="section-head center">
                  <div>
                    <h2 className="section-title big">{t('howTitle')}</h2>
                    <p className="section-sub">{t('howSub')}</p>
                  </div>
                </div>
              </Reveal>
              <div className="steps">
                {[1, 2, 3].map((n, i) => (
                  <Reveal key={n} delay={i * 0.08}>
                    <div className="step">
                      <div className="step-emoji">{['🧆', '👨‍🍳', '🚚'][i]}</div>
                      <div className="step-no">0{n}</div>
                      <h3>{t(`step${n}Title`)}</h3>
                      <p>{t(`step${n}Text`)}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="section" id="order">
            <div className="container">
              <Reveal>
                <div className="section-head">
                  <div>
                    <h2 className="section-title big">🍱 {t('menuTitle')}</h2>
                    <p className="section-sub">{t('menuSub')}</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.05}><RequestForm meals={meals} user={user} /></Reveal>
            </div>
          </section>

          <Marquee items={marqueeItems} reverse />
        </>
      ) : view === 'mine' ? (
        <MyRequests />
      ) : view === 'kitchen' ? (
        <KitchenDashboard />
      ) : (
        <ReportsPage />
      )}

      <footer className="page-footer">{t('footer')}</footer>
    </div>
  );
}
