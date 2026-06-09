import React, { useRef, useEffect } from 'react';

// Premium flowing-liquid background: soft additive gradient blobs drifting in
// the EFB palette (emerald / orange / gold / cyan). Lightweight canvas, pauses
// when the tab is hidden and honours prefers-reduced-motion.
const PALETTE = [
  [8, 86, 72],     // emerald
  [255, 99, 0],    // orange
  [209, 182, 113], // gold
  [26, 200, 191],  // cyan
  [13, 128, 104]   // emerald-600
];

export default function FluidBackground({ intensity = 1, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const count = reduce ? 3 : 6;
    const blobs = Array.from({ length: count }, (_, i) => {
      const c = PALETTE[i % PALETTE.length];
      return {
        x: Math.random(),
        y: Math.random(),
        r: 0.28 + Math.random() * 0.25,
        dx: (Math.random() - 0.5) * 0.00018,
        dy: (Math.random() - 0.5) * 0.00018,
        ph: Math.random() * Math.PI * 2,
        color: c
      };
    });

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const base = Math.max(w, h);
      blobs.forEach((b) => {
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -0.2 || b.x > 1.2) b.dx *= -1;
        if (b.y < -0.2 || b.y > 1.2) b.dy *= -1;
        const wobble = reduce ? 0 : Math.sin(t * 0.006 + b.ph) * 0.05;
        const cx = (b.x + wobble) * w;
        const cy = (b.y + Math.cos(t * 0.005 + b.ph) * (reduce ? 0 : 0.04)) * h;
        const rad = b.r * base;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const [r, gg, bl] = b.color;
        g.addColorStop(0, `rgba(${r},${gg},${bl},${0.5 * intensity})`);
        g.addColorStop(0.5, `rgba(${r},${gg},${bl},${0.18 * intensity})`);
        g.addColorStop(1, `rgba(${r},${gg},${bl},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intensity]);

  return <canvas ref={ref} className={`fluid-bg ${className}`} aria-hidden="true" />;
}
