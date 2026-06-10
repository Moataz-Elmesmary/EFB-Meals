import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AuroraBackground from './AuroraBackground';
import Marquee from './Marquee';

const FOODS = [
  { e: '🍗', t: 'Char-grilled' }, { e: '🥗', t: 'Fresh salads' }, { e: '🍕', t: 'Stone-baked' },
  { e: '🍛', t: 'Home-style' }, { e: '🍮', t: 'Sweet treats' }, { e: '☕', t: 'Hot & fresh' }
];

// Brief loading state: a plate with a fork & spoon spinning, a caption, and the
// food marquee strip at the bottom.
export default function BootSplash() {
  const { t } = useTranslation();
  return (
    <div className="boot">
      <AuroraBackground variant="night" />
      <div className="boot-inner">
        <motion.svg
          width="120" height="120" viewBox="0 0 120 120" className="boot-plate"
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
        <div className="boot-text">{t('prep')}</div>
      </div>
      <div className="boot-marquee">
        <Marquee items={FOODS} />
      </div>
    </div>
  );
}
