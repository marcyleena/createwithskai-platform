import { useState } from 'react';
import { loadStorage, saveStorage, LIBRARY_KEY, LIBRARY_CATEGORIES } from './utils';

export default function SaveToLibrary({ content, accent, onSaved }) {
  const [open, setOpen] = useState(false);

  const save = (category) => {
    const item = {
      id: Date.now(),
      category,
      label: content.replace(/[#*>\n]/g, ' ').trim().substring(0, 50),
      content,
      dateSaved: new Date().toLocaleDateString(),
    };
    const existing = loadStorage(LIBRARY_KEY, []);
    saveStorage(LIBRARY_KEY, [item, ...existing]);
    setOpen(false);
    if (onSaved) onSaved();
  };

  if (!content) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '6px 14px', background: 'transparent',
          border: '1px solid rgba(201,191,168,0.38)', borderRadius: 6,
          fontSize: 12, cursor: 'pointer', color: '#1C1A18',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Save to Library
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
            background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
            borderRadius: 10, padding: '10px 8px', minWidth: 160,
            boxShadow: '0 4px 20px rgba(28,26,24,0.12)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9BFA8', letterSpacing: 1, textTransform: 'uppercase', padding: '2px 8px 8px' }}>
              Save as
            </div>
            {LIBRARY_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => save(cat)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', background: 'none', border: 'none',
                  fontSize: 13, color: '#1C1A18', cursor: 'pointer',
                  borderRadius: 6, fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${accent}14`; e.currentTarget.style.color = accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#1C1A18'; }}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
