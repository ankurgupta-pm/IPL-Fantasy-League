import React, { useState, useEffect, useRef } from 'react';

// Searchable player combobox dropdown
export function PlayerSearchCombobox({ value, onSelect, playerMaster }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length >= 1
    ? playerMaster
        .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20)
    : playerMaster.slice(0, 20);

  const handleSelect = (p) => {
    setQuery(p.name);
    setOpen(false);
    onSelect(p);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Type to search player..."
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500"
        autoComplete="off"
        data-testid="player-search-input"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((p, i) => (
            <button
              key={`${p.id || p.name}-${i}`}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors border-b border-slate-800 last:border-0"
              data-testid={`player-option-${i}`}
            >
              <div className="text-sm text-white font-medium">{p.name}</div>
              <div className="text-xs text-slate-400">{p.franchise} · {p.role}</div>
            </button>
          )) : (
            <div className="px-3 py-4 text-center text-slate-500 text-sm">
              No match for "{query}". Add them in Settings → Player Config.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerSearchCombobox;
