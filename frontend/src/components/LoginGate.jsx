import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AuroraBackground from './AuroraBackground';
import { loadConfig, loginMicrosoft, loginDemo } from '../auth';

// A real plated-dish photo in a circular frame, floating over a rotating glow
// ring with rising steam and orbiting ingredients. Falls back to a gradient +
// emoji if the image can't load (offline / blocked network).
const DISH_IMG =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=520&h=520&q=80';

function HeroDish() {
  const [imgOk, setImgOk] = useState(true);
  return (
    <motion.div
      className="hero-dish"
      initial={{ opacity: 0, scale: 0.78, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ease: [0.34, 1.56, 0.64, 1], duration: 1 }}
    >
      <motion.span
        className="dish-ring"
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      />
      {/* steam */}
      <svg className="dish-steam" viewBox="0 0 200 120" aria-hidden="true">
        {[60, 100, 140].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 110 q -12 -22 0 -44 q 12 -22 0 -44`}
            fill="none"
            stroke="rgba(255,255,255,.7)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0], y: [10, -34] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
          />
        ))}
      </svg>

      <motion.div
        className="dish-plate"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {imgOk ? (
          <img src={DISH_IMG} alt="" onError={() => setImgOk(false)} draggable="false" />
        ) : (
          <div className="dish-fallback">🍲</div>
        )}
      </motion.div>

      {['🍅', '🌿', '🍋', '🌶️'].map((e, i) => (
        <motion.span
          key={e}
          className="dish-orbit"
          animate={{ rotate: 360 }}
          transition={{ duration: 18 + i * 5, repeat: Infinity, ease: 'linear' }}
        >
          <span style={{ transform: `rotate(${i * 90}deg) translateX(168px)` }}>{e}</span>
        </motion.span>
      ))}
    </motion.div>
  );
}

export default function LoginGate({ onLogin }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [azure, setAzure] = useState(null);
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
      onLogin(await loginDemo(email.trim()));
    } catch (e2) {
      setErr(e2.response?.data?.error || t('error'));
      setBusy(false);
    }
  };

  return (
    <div className="login-gate" dir={ar ? 'rtl' : 'ltr'}>
      <AuroraBackground variant="night" />

      <button className="login-lang" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')}>
        {ar ? 'EN' : 'عربي'}
      </button>

      <div className="login-split">
        {/* Visual stage */}
        <div className="login-visual">
          <motion.div
            className="login-eyebrow"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {t('eyebrow')}
          </motion.div>
          <HeroDish />
          <motion.h2
            className="login-tagline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {t('heroTitlePre')} <span className="accent">{t('heroTitleAccent')}</span>
          </motion.h2>
        </div>

        {/* Sign-in card */}
        <motion.div
          className="login-card glass-dark"
          initial={{ opacity: 0, x: ar ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
            <button className="btn btn-light btn-block" onClick={doMicrosoft} disabled={busy || azure === null}>
              {busy ? <span className="spinner spinner-dark" /> : <MsLogo />} {t('login')}
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
              <button className="btn btn-orange btn-block" type="submit" disabled={busy}>
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
