import React from 'react';

// Premium aurora background: large, heavily-blurred colour orbs drifting over a
// base wash, with a fine film-grain overlay. Pure CSS = GPU-cheap and crisp.
// variant 'night' → deep emerald cinematic stage (login)
// variant 'day'   → light, subtle ambient wash (app)
export default function AuroraBackground({ variant = 'day' }) {
  return (
    <div className={`aurora aurora-${variant}`} aria-hidden="true">
      <span className="aurora-orb o1" />
      <span className="aurora-orb o2" />
      <span className="aurora-orb o3" />
      <span className="aurora-orb o4" />
      <span className="aurora-grain" />
    </div>
  );
}
