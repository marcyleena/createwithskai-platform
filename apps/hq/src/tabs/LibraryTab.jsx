import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { loadStorage, saveStorage, LIBRARY_KEY, LIBRARY_CATEGORIES } from '../utils';

const ALL = 'All';
const FILTERS = [ALL, ...LIBRARY_CATEGORIES];

const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 400, color: '#1C1A18', margin: '16px 0 6px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 400, color: '#1C1A18', margin: '14px 0 4px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1C1A18', margin: '12px 0 4px' }}>{children}</h3>,
  p: ({ children }) => <p style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.7, margin: '0 0 8px' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '0 0 8px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '0 0 8px' }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.7, marginBottom: 3 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
};

const CATEGORY_COLORS = {
  'Caption':       '#4f6d8a',
  'Hook':          '#d47dbc',
  'Image Prompt':  '#2d7d5e',
  'Bio':           '#c4821a',
  'Brief Insight': '#6366f1',
  'Other':         '#888',
};

export default function LibraryTab({ brand, showToast }) {
  const [items, setItems] = useState(() => loadStorage(LIBRARY_KEY, []));
  const [filter, setFilter] = useState(ALL);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  // Re-read from localStorage when the tab is mounted so newly saved items appear
  useEffect(() => {
    setItems(loadStorage(LIBRARY_KEY, []));
  }, []);

  const deleteItem = (id) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveStorage(LIBRARY_KEY, updated);
  };

  const copy = (content) => {
    navigator.clipboard.writeText(content).then(() => showToast('Copied to clipboard'));
  };

  const toggleExpand = (id) => {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  };

  const filtered = items.filter(item => {
    const matchesFilter = filter === ALL || item.category === filter;
    const matchesSearch = !search || item.content.toLowerCase().includes(search.toLowerCase()) || item.label.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const accent = brand.accent || '#6366f1';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: filter === f ? accent : 'transparent',
              color: filter === f ? '#fff' : '#1C1A18',
              border: `1px solid ${filter === f ? accent : 'rgba(201,191,168,0.38)'}`,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: filter === f ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search library..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', background: '#FDFAF5',
            border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8,
            fontSize: 14, color: '#1C1A18', fontFamily: 'DM Sans, sans-serif',
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.18)',
          borderRadius: 14, color: '#C9BFA8', fontSize: 14, lineHeight: 1.7,
        }}>
          Nothing saved yet. Save your favorite captions, hooks, and prompts from Studio, Regenerate, and Weekly Brief to build your personal library.
        </div>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <div style={{ padding: '24px', background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.18)', borderRadius: 14, color: '#C9BFA8', fontSize: 14 }}>
          No items match your search or filter.
        </div>
      )}

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(item => {
          const isExpanded = expanded[item.id];
          const color = CATEGORY_COLORS[item.category] || '#888';
          return (
            <div
              key={item.id}
              style={{
                background: '#FDFAF5',
                border: '1px solid rgba(201,191,168,0.38)',
                borderRadius: 12, padding: 20,
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                      background: `${color}18`, color,
                      letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: 12, color: '#C9BFA8' }}>{item.dateSaved}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', lineHeight: 1.4 }}>
                    {item.label}{item.label.length >= 50 ? '...' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => copy(item.content)} style={actionBtnStyle}>Copy</button>
                  <button onClick={() => deleteItem(item.id)} style={{ ...actionBtnStyle, color: '#C9BFA8' }}>Delete</button>
                </div>
              </div>

              {/* Content (expandable) */}
              <div style={{
                overflow: 'hidden',
                maxHeight: isExpanded ? 2000 : 72,
                transition: 'max-height 0.25s ease',
                maskImage: isExpanded ? 'none' : 'linear-gradient(to bottom, black 40%, transparent 100%)',
                WebkitMaskImage: isExpanded ? 'none' : 'linear-gradient(to bottom, black 40%, transparent 100%)',
              }}>
                <ReactMarkdown components={mdComponents}>{item.content}</ReactMarkdown>
              </div>

              <button
                onClick={() => toggleExpand(item.id)}
                style={{
                  marginTop: 8, background: 'none', border: 'none',
                  fontSize: 12, color: accent, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', padding: 0, fontWeight: 600,
                }}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const actionBtnStyle = {
  padding: '5px 12px', background: 'transparent',
  border: '1px solid rgba(201,191,168,0.38)', borderRadius: 6,
  fontSize: 12, cursor: 'pointer', color: '#1C1A18',
  fontFamily: 'DM Sans, sans-serif',
};
