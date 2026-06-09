import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AuroraBackground from './AuroraBackground';

const FOODS = ['🍅', '🥬', '🧀', '🍗', '🌶️', '🍞', '🍋'];

// Appetizing ~3s intro splash: logo reveal, ingredients popping onto the table,
// and a filling progress bar.
export default function BootSplash() {
  const { t } = useTranslation();
  return (
    <div className="boot">
      <AuroraBackground variant="night" />
      <div className="boot-inner">
        <motion.img
          src="/LOGO.png"
          alt="Egyptian Food Bank"
          className="boot-logo"
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="boot-foods">
          {FOODS.map((f, i) => (
            <motion.span
              key={f}
              initial={{ opacity: 0, y: 34, scale: 0 }}
              animate={{ opacity: 1, y: [34, -8, 0], scale: 1 }}
              transition={{ delay: 0.4 + i * 0.16, type: 'spring', stiffness: 240, damping: 12 }}
            >
              {f}
            </motion.span>
          ))}
        </div>

        <div className="boot-bar">
          <motion.span initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.6, ease: 'easeInOut' }} />
        </div>

        <motion.div className="boot-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {t('prep')}
        </motion.div>
      </div>
    </div>
  );
}
