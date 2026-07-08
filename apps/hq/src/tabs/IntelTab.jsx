import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { loadStorage, saveStorage, COMPETITORS_KEY, INTEL_KEY, SCRAPE_HISTORY_KEY, ALERTS_KEY, NICHE_TEMPLATES, callClaude, detectTrends } from '../utils';
import SaveToLibrary from '../SaveToLibrary';

const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 400, color: '#1C1A18', margin: '20px 0 8px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 400, color: '#1C1A18', margin: '18px 0 6px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1A18', margin: '14px 0 4px' }}>{children}</h3>,
  p: ({ children }) => <p style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.7, margin: '0 0 10px' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '0 0 10px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '0 0 10px' }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.7, marginBottom: 4 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#1C1A18' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(201,191,168,0.38)', margin: '16px 0' }} />,
};

// Platform pill colors
const PLATFORM_STYLES = {
  instagram: { bg: '#e1306c18', color: '#e1306c', label: 'Instagram' },
  tiktok:    { bg: '#00f2ea18', color: '#010101', label: 'TikTok' },
};

function PlatformTag({ platform }) {
  const s = PLATFORM_STYLES[platform] || PLATFORM_STYLES.instagram;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color,
      letterSpacing: 0.5, textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  );
}

function PlatformToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(201,191,168,0.38)', flexShrink: 0 }}>
      {['instagram', 'tiktok'].map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: '9px 14px', border: 'none', cursor: 'pointer',
            background: value === p ? '#1C1A18' : '#F5F0E8',
            color: value === p ? '#fff' : '#C9BFA8',
            fontSize: 12, fontWeight: value === p ? 700 : 400,
            fontFamily: 'DM Sans, sans-serif',
            textTransform: 'capitalize',
          }}
        >
          {p === 'instagram' ? 'IG' : 'TT'}
        </button>
      ))}
    </div>
  );
}

function SubTabs({ tabs, active, onChange, accent }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(201,191,168,0.38)' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: '8px 16px', background: 'none', border: 'none',
          borderBottom: active === t ? `2px solid ${accent}` : '2px solid transparent',
          color: active === t ? '#1C1A18' : '#C9BFA8',
          fontSize: 14, fontWeight: active === t ? 700 : 400, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', marginBottom: -1,
        }}>{t}</button>
      ))}
    </div>
  );
}

export default function IntelTab({ brand, showToast, onAlertsGenerated }) {
  const [sub, setSub] = useState('Competitors');
  const [competitors, setCompetitors] = useState(() =>
    // Backfill platform field for any existing entries saved without it
    loadStorage(COMPETITORS_KEY, []).map(c => ({ platform: 'instagram', ...c }))
  );
  const [intel, setIntel] = useState(() => loadStorage(INTEL_KEY, null));
  const [addForm, setAddForm] = useState({ handle: '', niche: '', platform: 'instagram' });
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(false);

  const addCompetitor = () => {
    if (!addForm.handle) return;
    const updated = [...competitors, { ...addForm, id: Date.now() }];
    setCompetitors(updated);
    saveStorage(COMPETITORS_KEY, updated);
    setAddForm({ handle: '', niche: '', platform: 'instagram' });
    showToast('Competitor added');
  };

  const removeCompetitor = (id) => {
    const updated = competitors.filter(c => c.id !== id);
    setCompetitors(updated);
    saveStorage(COMPETITORS_KEY, updated);
  };

  const loadTemplate = (nicheKey) => {
    const handles = NICHE_TEMPLATES[nicheKey];
    const newOnes = handles
      .filter(h => !competitors.find(c => c.handle === h.replace('@', '')))
      .map(h => ({ handle: h.replace('@', ''), niche: nicheKey, platform: 'instagram', id: Date.now() + Math.random() }));
    const updated = [...competitors, ...newOnes];
    setCompetitors(updated);
    saveStorage(COMPETITORS_KEY, updated);
    showToast(`${nicheKey} template loaded`);
  };

  const runAnalysis = async () => {
    if (!competitors.length) { showToast('Add competitors first', 'error'); return; }
    if (!brand.apifyKey) { showToast('Apify key missing -- add it in your dashboard', 'error'); return; }
    if (!brand.anthropicKey) { showToast('Anthropic key missing -- add it in your dashboard', 'error'); return; }
    setLoading(true);
    setSub('Weekly Brief');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apifyKey: brand.apifyKey, handles: competitors, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scrape failed');

      const hasBothPlatforms = data.results.some(r => r.platform === 'instagram') &&
                               data.results.some(r => r.platform === 'tiktok');

      const postSummary = data.results.map(r =>
        `Account: @${r.handle} [${(r.platform || 'instagram').toUpperCase()}]${r.niche ? ` (${r.niche})` : ''}\n` +
        (r.posts || []).map(p => `  - [${p.type}] "${p.hook}" | Likes: ${p.likes}, Comments: ${p.comments}${p.views > 0 ? `, Views: ${p.views}` : ''}`).join('\n')
      ).join('\n\n');

      const platformNote = hasBothPlatforms
        ? '\n\nIMPORTANT: The data above comes from both Instagram and TikTok accounts. Where relevant, note any notable differences in what content styles or hook patterns seem to work differently between the two platforms.'
        : '';

      const brief = await callClaude(brand.anthropicKey, [
        {
          role: 'user',
          content: `You are a social media strategist for ${brand.name}, a ${brand.niche} creator.\n\nHere are recent posts from competitors over the past ${period}:\n\n${postSummary}${platformNote}\n\nWrite a strategic weekly brief that covers:\n1. Top-performing content patterns you noticed\n2. Hook styles that are working\n3. Content gaps you can exploit\n4. 3 specific content recommendations for ${brand.name}\n\nBe specific and actionable. Focus on what ${brand.name} should create this week.`,
        },
      ], 1200);

      const result = {
        date: new Date().toLocaleDateString(),
        period,
        brief,
        results: data.results,
      };
      setIntel(result);
      saveStorage(INTEL_KEY, result);

      // Save scrape history (keep last 8 entries)
      const newEntry = { date: result.date, accounts: data.results.map(r => ({ handle: r.handle, platform: r.platform, niche: r.niche, posts: r.posts || [] })) };
      const history = loadStorage(SCRAPE_HISTORY_KEY, []);
      const updatedHistory = [...history, newEntry].slice(-8);
      saveStorage(SCRAPE_HISTORY_KEY, updatedHistory);

      // Detect trends if we have a previous scrape to compare
      if (updatedHistory.length >= 2) {
        const prev = updatedHistory[updatedHistory.length - 2];
        const curr = updatedHistory[updatedHistory.length - 1];
        const newAlerts = detectTrends(prev, curr);
        if (newAlerts.length > 0) {
          const existingAlerts = loadStorage(ALERTS_KEY, []);
          saveStorage(ALERTS_KEY, [...newAlerts, ...existingAlerts].slice(0, 20));
          onAlertsGenerated?.(newAlerts.length);
        }
      }

      showToast('Analysis complete');
    } catch (e) {
      showToast(e.message, 'error');
      setSub('Run Analysis');
    } finally {
      setLoading(false);
    }
  };

  const igCount = competitors.filter(c => (c.platform || 'instagram') === 'instagram').length;
  const ttCount = competitors.filter(c => c.platform === 'tiktok').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <SubTabs tabs={['Competitors', 'Run Analysis', 'Weekly Brief']} active={sub} onChange={setSub} accent={brand.accent} />

      {sub === 'Competitors' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1A18', marginBottom: 8 }}>Load niche template</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(NICHE_TEMPLATES).map(n => (
                <button key={n} onClick={() => loadTemplate(n)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(201,191,168,0.38)',
                  color: '#1C1A18', fontFamily: 'DM Sans, sans-serif',
                }}>{n}</button>
              ))}
            </div>
          </div>

          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Handle (no @)</label>
                <input value={addForm.handle} onChange={e => setAddForm(f => ({ ...f, handle: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addCompetitor()}
                  style={inputStyle} placeholder="username" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Niche</label>
                <input value={addForm.niche} onChange={e => setAddForm(f => ({ ...f, niche: e.target.value }))}
                  style={inputStyle} placeholder="e.g. fashion" />
              </div>
              <div>
                <label style={labelStyle}>Platform</label>
                <PlatformToggle value={addForm.platform} onChange={p => setAddForm(f => ({ ...f, platform: p }))} />
              </div>
              <button onClick={addCompetitor} style={btnStyle(brand.accent)}>Add</button>
            </div>
          </div>

          {competitors.length === 0 && <div style={emptyStyle}>No competitors yet. Add accounts to track.</div>}

          {competitors.length > 0 && (
            <div style={{ fontSize: 12, color: '#C9BFA8', marginBottom: 10 }}>
              {igCount > 0 && `${igCount} Instagram`}{igCount > 0 && ttCount > 0 && ' · '}{ttCount > 0 && `${ttCount} TikTok`}
            </div>
          )}

          {competitors.map(c => (
            <div key={c.id} style={{
              background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
              borderRadius: 10, padding: '12px 18px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PlatformTag platform={c.platform || 'instagram'} />
                <span style={{ fontWeight: 600, color: '#1C1A18' }}>@{c.handle}</span>
                {c.niche && <span style={{ color: '#C9BFA8', fontSize: 13 }}>{c.niche}</span>}
              </div>
              <button onClick={() => removeCompetitor(c.id)} style={deleteBtnStyle}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {sub === 'Run Analysis' && (
        <div>
          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 28, maxWidth: 420 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#1C1A18', margin: '0 0 20px', fontWeight: 400 }}>Run Competitor Analysis</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Period</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['7d', '30d'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                    background: period === p ? brand.accent : 'transparent',
                    color: period === p ? '#fff' : '#1C1A18',
                    border: `1px solid ${period === p ? brand.accent : 'rgba(201,191,168,0.38)'}`,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: period === p ? 700 : 400,
                  }}>{p === '7d' ? '7 days' : '30 days'}</button>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#C9BFA8', marginBottom: 20 }}>
              Scrapes {igCount > 0 ? `${igCount} Instagram` : ''}{igCount > 0 && ttCount > 0 ? ' and ' : ''}{ttCount > 0 ? `${ttCount} TikTok` : ''} account{competitors.length !== 1 ? 's' : ''}, then Claude writes your weekly brief.
            </p>
            <button onClick={runAnalysis} disabled={loading} style={{
              ...btnStyle(brand.accent), opacity: loading ? 0.65 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      )}

      {sub === 'Weekly Brief' && (
        <div>
          {!intel && <div style={emptyStyle}>No analysis yet. Run competitor analysis first.</div>}
          {intel && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1C1A18', margin: '0 0 4px', fontWeight: 400 }}>Weekly Brief</h3>
                  <div style={{ fontSize: 13, color: '#C9BFA8' }}>{intel.date} &middot; {intel.period} window</div>
                </div>
                <SaveToLibrary content={intel.brief} accent={brand.accent} onSaved={() => showToast('Saved to Library')} />
              </div>

              <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 24, marginBottom: 24 }}>
                <ReactMarkdown components={mdComponents}>{intel.brief}</ReactMarkdown>
              </div>

              {intel.results && intel.results.map(r => (
                <div key={r.handle} style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <PlatformTag platform={r.platform || 'instagram'} />
                    <span style={{ fontWeight: 700, color: '#1C1A18' }}>@{r.handle}</span>
                    {r.niche && <span style={{ color: '#C9BFA8', fontWeight: 400, fontSize: 13 }}>{r.niche}</span>}
                  </div>
                  {r.error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{r.error}</div>}
                  {r.posts && r.posts.map((p, i) => (
                    <div key={i} style={{
                      borderTop: i > 0 ? '1px solid rgba(201,191,168,0.18)' : 'none',
                      paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0,
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: `${brand.accent}18`, color: brand.accent, letterSpacing: 0.5,
                        }}>{p.type}</span>
                        <span style={{ fontSize: 13, color: '#1C1A18' }}>{p.hook}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#C9BFA8', display: 'flex', gap: 14 }}>
                        <span>{p.likes} likes</span>
                        <span>{p.comments} comments</span>
                        {p.views > 0 && <span>{p.views.toLocaleString()} views</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1A18', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle = {
  width: '100%', padding: '9px 12px', background: '#F5F0E8',
  border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8,
  fontSize: 14, color: '#1C1A18', fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box', outline: 'none',
};
const emptyStyle = { padding: '20px 18px', background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.18)', borderRadius: 10, color: '#C9BFA8', fontSize: 14 };
const deleteBtnStyle = { background: 'none', border: 'none', color: '#C9BFA8', fontSize: 12, cursor: 'pointer', padding: '2px 6px', fontFamily: 'DM Sans, sans-serif' };
const btnStyle = (accent) => ({
  padding: '10px 20px', background: accent, color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
});
