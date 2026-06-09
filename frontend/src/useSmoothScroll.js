import { useEffect } from 'react';
import Lenis from 'lenis';

// Lenis smooth scrolling — the buttery glide behind premium sites like
// buckssauce. Exposes the instance on window.__lenis for programmatic scrollTo,
// and disables itself when the user prefers reduced motion.
export default function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, lerp: 0.09 });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, [enabled]);
}

export function smoothScrollTo(target) {
  if (window.__lenis) window.__lenis.scrollTo(target, { offset: -20 });
  else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
}
