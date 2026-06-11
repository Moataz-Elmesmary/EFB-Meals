import React, { useState, useMemo, useRef, useEffect } from 'react';

// Searchable single-select dropdown. options: [{ value, label }]
export default function Combobox({ value, onChange, options, placeholder = '' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options.slice(0, 80);
    return options.filter((o) => o.label.toLowerCase().includes(term)).slice(0, 80);
  }, [options, q]);

  return (
    <div className="combobox" ref={ref}>
      <input
        className="combobox-input"
        value={open ? q : selected ? selected.label : ''}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => { setOpen(true); setQ(''); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
      />
      <span className="combobox-caret">▾</span>
      {open && (
        <div className="combobox-list">
          {filtered.length === 0 ? (
            <div className="combobox-item muted">—</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.value}
                className={`combobox-item ${o.value === value ? 'sel' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
