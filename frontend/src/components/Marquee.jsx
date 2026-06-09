import React from 'react';

// Infinite scrolling band — a signature buckssauce-style strip. Duplicated row
// translates -50% for a seamless loop. Pauses on reduced-motion via CSS.
export default function Marquee({ items, reverse = false }) {
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className={`marquee-track ${reverse ? 'rev' : ''}`}>
        {row.map((it, i) => (
          <span className="marquee-item" key={i}>
            <span className="marquee-emoji">{it.e}</span>
            {it.t}
            <span className="marquee-star">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
