import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AuroraBackground from './AuroraBackground';
import { loadConfig, loginMicrosoft, loginDemo } from '../auth';

const spring = { stiffness: 120, damping: 16, mass: 0.6 };
const ORBIT = ['🍕', '🍮', '🥗', '🌶️', '🍗', '🥑'];

export default function LoginGate({ onLogin }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [azure, setAzure] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // mouse parallax (normalized -0.5..0.5) → 3D tilt of the centre stage
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), spring);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), spring);

  useEffect(() => {
    loadConfig().then((c) => setAzure(c.azureEnabled)).catch(() => setAzure(false));
  }, []);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

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
    <div className="login-gate" dir={ar ? 'rtl' : 'ltr'} onMouseMove={onMove} onMouseLeave={onLeave}>
      <AuroraBackground variant="night" />

      <button className="login-lang" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')}>
        {ar ? 'EN' : 'عربي'}
      </button>

      <div className="login-split">
        {/* ---- Centre stage: glowing EFB emblem + orbiting ingredients ---- */}
        <div className="login-visual">
          <div className="dish-perspective">
            <motion.div className="dish-tilt" style={{ rotateX: rotX, rotateY: rotY }}>
              <motion.span
                className="dish-ring"
                style={{ translateZ: -80 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              />

              <motion.div
                className="dish-emblem"
                style={{ translateZ: 20 }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 90, damping: 12 }}
              >
                <motion.img
                  src="/LOGO.png"
                  alt="Egyptian Food Bank"
                  className="emblem-logo"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>

              {/* ingredients orbiting the emblem */}
              <motion.div
                className="dish-orbitring"
                style={{ translateZ: 60 }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{
                  opacity: { delay: 0.4, duration: 0.6 },
                  scale: { delay: 0.4, type: 'spring', stiffness: 140, damping: 14 },
                  rotate: { duration: 22, repeat: Infinity, ease: 'linear' }
                }}
              >
                {ORBIT.map((e, i) => (
                  <span
                    key={e}
                    className="orbit-slot"
                    style={{ transform: `rotate(${(360 / ORBIT.length) * i}deg) translateY(calc(var(--orbit-r) * -1))` }}
                  >
                    <motion.span
                      className="orbit-emoji"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                    >
                      {e}
                    </motion.span>
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>

          <motion.h2
            className="login-tagline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            {t('heroTitlePre')} <span className="accent">{t('heroTitleAccent')}</span>
          </motion.h2>
        </div>

        {/* ---- Sign-in card (stable) ---- */}
        <motion.div
          className="login-card glass-dark"
          initial={{ opacity: 0, x: ar ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="login-brand">
            <img className="brand-logo" src="/LOGO.png" alt="EFB" />
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
                <input type="email" value={email} placeholder="name@efb.eg" onChange={(e) => setEmail(e.target.value)} required />
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
