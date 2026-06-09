import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import FluidBackground from './FluidBackground';
import { loadConfig, loginMicrosoft, loginDemo } from '../auth';

// Animated central "hero dish": a steaming plate that floats over a glowing ring.
function HeroDish() {
  return (
    <motion.div
      className="login-dish"
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ease: [0.34, 1.56, 0.64, 1], duration: 0.9 }}
    >
      <div className="dish-glow" />
      <motion.svg
        viewBox="0 0 240 200"
        className="dish-svg"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <radialGradient id="plate" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#eef6f3" />
            <stop offset="100%" stopColor="#cfe3dc" />
          </radialGradient>
          <linearGradient id="food" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8a3d" />
            <stop offset="100%" stopColor="#d65300" />
          </linearGradient>
        </defs>
        {/* steam */}
        {[80, 120, 160].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 70 q -10 -18 0 -36 q 10 -18 0 -36`}
            fill="none"
            stroke="rgba(255,255,255,.85)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 0.8, 0], y: [-4, -26, -44] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          />
        ))}
        {/* plate */}
        <ellipse cx="120" cy="150" rx="105" ry="34" fill="rgba(8,30,28,.18)" />
        <ellipse cx="120" cy="142" rx="105" ry="34" fill="url(#plate)" stroke="#cfe3dc" strokeWidth="2" />
        <ellipse cx="120" cy="140" rx="74" ry="22" fill="#f6faf8" />
        {/* food mound */}
        <path d="M70 140 Q120 92 170 140 Z" fill="url(#food)" />
        <circle cx="104" cy="128" r="9" fill="#ffd9bf" />
        <circle cx="134" cy="124" r="8" fill="#70C16F" />
        <circle cx="120" cy="134" r="7" fill="#D1B671" />
      </motion.svg>
      {/* orbiting mini food */}
      {['🍅', '🌿', '🍋'].map((e, i) => (
        <motion.span
          key={e}
          className="dish-orbit"
          style={{ ['--i']: i }}
          animate={{ rotate: 360 }}
          transition={{ duration: 16 + i * 4, repeat: Infinity, ease: 'linear' }}
        >
          <span style={{ display: 'inline-block', transform: `rotate(${i * 120}deg) translateX(130px)` }}>{e}</span>
        </motion.span>
      ))}
    </motion.div>
  );
}

export default function LoginGate({ onLogin }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [azure, setAzure] = useState(null); // null = loading
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    loadConfig()
      .then((c) => setAzure(c.azureEnabled))
      .catch(() => setAzure(false));
  }, []);

  const doMicrosoft = async () => {
    setErr(null);
    setBusy(true);
    try {
      await loginMicrosoft();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const doDemo = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      const user = await loginDemo(email.trim());
      onLogin(user);
    } catch (e2) {
      setErr(e2.response?.data?.error || t('error'));
      setBusy(false);
    }
  };

  return (
    <div className="login-gate" dir={ar ? 'rtl' : 'ltr'}>
      <FluidBackground intensity={1.1} />
      <button className="login-lang" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')}>
        {ar ? 'EN' : 'عربي'}
      </button>

      <div className="login-stage">
        <HeroDish />

        <motion.div
          className="login-card glass"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="login-brand">
            <span className="brand-badge">🍽️</span>
            <div>
              EFB Meals
              <small>{t('brandSub')}</small>
            </div>
          </div>
          <h1 className="login-title">{t('loginWelcome')}</h1>
          <p className="login-sub">{t('loginSub')}</p>

          {azure !== false && (
            <button className="btn btn-primary btn-block" onClick={doMicrosoft} disabled={busy || azure === null}>
              {busy ? <span className="spinner" /> : <MsLogo />} {t('login')}
            </button>
          )}

          {azure === false && (
            <form onSubmit={doDemo} className="demo-form">
              <div className="demo-note">{t('demoNote')}</div>
              <div className="field">
                <label>{t('emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  placeholder="name@efb.eg"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? <span className="spinner" /> : '🔓'} {t('enter')}
              </button>
            </form>
          )}

          {err && <div className="alert alert-error" style={{ marginTop: 14 }}>⚠️ {err}</div>}
          <div className="login-foot">{t('loginSecure')}</div>
        </motion.div>
      </div>
    </div>
  );
}

function MsLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
