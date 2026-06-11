import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './styles.css';

// Prevent the mouse wheel from silently changing focused number inputs
// (typing 5000 then scrolling turned it into 4999.98).
document.addEventListener(
  'wheel',
  () => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT' && el.type === 'number') el.blur();
  },
  { passive: true }
);

createRoot(document.getElementById('root')).render(<App />);
