import React, { useState } from 'react';

// Image with a graceful emoji+gradient fallback when the network blocks the
// remote photo (corporate firewall / offline). Keeps the layout intact.
export default function FoodImg({ src, emoji = '🍽️', alt = '', className = '' }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={`food-img ${className}`}>
      {ok ? (
        <img src={src} alt={alt} loading="lazy" draggable="false" onError={() => setOk(false)} />
      ) : (
        <span className="food-img-fallback">{emoji}</span>
      )}
    </div>
  );
}
