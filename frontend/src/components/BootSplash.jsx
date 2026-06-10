import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AuroraBackground from './AuroraBackground';

const FOODS = ['🍅', '🥬', '🧀', '🍗', '🌶️', '🍞', '🍋'];

// Post-login loader: spinning plate, ingredients popping in, and a filling bar.
export default function BootSplash() {
  const { t } = useTranslation();
  return (
    <div className="boot">
      <AuroraBackground variant="night" />
      <div className="boot-inner">
        <motion.svg
          width="110" height="110" viewBox="0 0 120 120" className="boot-plate"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        >
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".95">
            <line x1="20" y1="16" x2="20" y2="40" />
            <line x1="27" y1="16" x2="27" y2="40" />
            <line x1="13" y1="16" x2="13" y2="40" />
            <path d="M13 40 H27 V58 a3.5 3.5 0 0 1 -7 0 V40" />
            <line x1="20" y1="58" x2="20" y2="104" />
          </g>
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".95">
            <ellipse cx="100" cy="30" rx="11" ry="15" />
            <line x1="100" y1="45" x2="100" y2="104" />
          </g>
          <circle cx="60" cy="62" r="34" fill="rgba(255,255,255,.12)" stroke="#fff" strokeWidth="3" />
          <circle cx="60" cy="62" r="22" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
        </motion.svg>

        <div className="boot-foods">
          {FOODS.map((f, i) => (
            <motion.span
              key={f}
              initial={{ opacity: 0, y: 26, scale: 0 }}
              animate={{ opacity: 1, y: [26, -6, 0], scale: 1 }}
              transition={{ delay: 0.2 + i * 0.14, type: 'spring', stiffness: 240, damping: 12 }}
            >
              {f}
            </motion.span>
          ))}
        </div>

        <div className="boot-bar">
          <motion.span initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
        </div>

        <div className="boot-text">{t('prep')}</div>
      </div>
    </div>
  );
}
