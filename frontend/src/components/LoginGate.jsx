import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AuroraBackground from './AuroraBackground';
import { loadConfig, loginMicrosoft, loginDemo } from '../auth';

const DISH_IMG =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=560&h=560&q=80';

const spring = { stiffness: 120, damping: 16, mass: 0.6 };

export default function LoginGate({ onLogin }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [azure, setAzure] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [imgOk, setImgOk] = useState(true);

  // mouse parallax (normalized -0.5..0.5)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), spring);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), spring);
  const gx = useSpring(useTransform(mx, [-0.5, 0.5], [-22, 22]), spring);
  const gy = useSpring(useTransform(my, [-0.5, 0.5], [-18, 18]), spring);

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

  const chips = [
    { e: '🍕', cls: 'k1', z: 90 },
    { e: '🍮', cls: 'k2', z: 130 },
    { e: '🥗', cls: 'k3', z: 70 },
    { e: '🌶️', cls: 'k4', z: 110 }
  ];

  return (
    <div className="login-gate" dir={ar ? 'rtl' : 'ltr'} onMouseMove={onMove} onMouseLeave={onLeave}>
      <AuroraBackground variant="night" />

      <button className="login-lang" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')}>
        {ar ? 'EN' : 'عربي'}
      </button>

      <div className="login-split">
        {/* ---- Cinematic visual stage ---- */}
        <div className="login-visual">
          <motion.img
            src="/LOGO.png"
            alt="Egyptian Food Bank"
            className="login-logo"
            initial={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />

          <div className="dish-perspective">
            <motion.div className="dish-tilt" style={{ rotateX: rotX, rotateY: rotY }}>
              {/* rotating glow ring (sits behind, depth) */}
              <motion.span
                className="dish-ring"
                style={{ translateZ: -80 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              />
              {/* steam */}
              <svg className="dish-steam" viewBox="0 0 200 120" aria-hidden="true">
                {[60, 100, 140].map((x, i) => (
                  <motion.path
                    key={x}
                    d={`M${x} 110 q -12 -22 0 -44 q 12 -22 0 -44`}
                    fill="none"
                    stroke="rgba(255,255,255,.65)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.65, 0], y: [12, -34] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
                  />
                ))}
              {/* floating plate */}
              </svg>
              <motion.div
                className="dish-plate"
                style={{ translateZ: 10 }}
                initial={{ opacity: 0, scale: 0.6, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, ...{ type: 'spring', stiffness: 90, damping: 12 } }}
              >
                <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '100%', height: '100%' }}>
                  {imgOk ? (
                    <img src={DISH_IMG} alt="" onError={() => setImgOk(false)} draggable="false" />
                  ) : (
                    <div className="dish-fallback">🍲</div>
                  )}
                </motion.div>
              </motion.div>

              {/* parallax ingredient chips at varying depths */}
              {chips.map((c, i) => (
                <motion.span
                  key={c.e}
                  className={`dish-chip ${c.cls}`}
                  style={{ translateZ: c.z }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1, y: [0, i % 2 ? -10 : 10, 0] }}
                  transition={{
                    opacity: { delay: 0.5 + i * 0.1 },
                    scale: { delay: 0.5 + i * 0.1, type: 'spring', stiffness: 200, damping: 12 },
                    y: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }
                  }}
                >
                  {c.e}
                </motion.span>
              ))}
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

        {/* ---- Sign-in card ---- */}
        <motion.div
          className="login-card glass-dark"
          style={{ x: gx, y: gy }}
          initial={{ opacity: 0, x: ar ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
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
