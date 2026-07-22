import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { loadStorage, saveStorage, CONTENT_PLAN_KEY, CONTENT_PERF_KEY, engagementScore, callClaude } from '../utils';
import SaveToLibrary from '../SaveToLibrary';

const PLAN_VIEW_KEY = 'creator_hq_plan_view';

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

const PILLARS = ['Education', 'Entertainment', 'Inspiration', 'Promotion', 'Personal'];
const FORMATS = ['Reel', 'Carousel', 'Static', 'Story', 'Live'];
const STATUSES = ['Idea', 'Drafted', 'Ready', 'Posted'];

const STATUS_COLORS = {
  Idea:    '#C9BFA8',
  Drafted: '#4f6d8a',
  Ready:   '#2d7d5e',
  Posted:  '#6366f1',
};

const FORMAT_COLORS = {
  Reel:     '#d47dbc',
  Carousel: '#c4821a',
  Static:   '#4f6d8a',
  Story:    '#2d7d5e',
  Live:     '#6366f1',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

// Modal for viewing/editing a single planned post
function PostModal({ post, onClose, onUpdate, onDelete, accent, pillarColor }) {
  const [form, setForm] = useState({ ...post });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(28,26,24,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: '#FDFAF5', borderRadius: 14, padding: 28,
        width: '100%', maxWidth: 480,
        border: '1px solid rgba(201,191,168,0.38)',
        maxHeight: '90vh', overflowY: 'auto',
        fontFamily: 'DM Sans, sans-serif',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#1C1A18', margin: 0, fontWeight: 400 }}>Edit Post</h3>
          <button onClick={onClose} title="Close" aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#C9BFA8' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status || 'Idea'} onChange={e => set('status', e.target.value)} style={inputStyle}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Format</label>
            <select value={form.format} onChange={e => set('format', e.target.value)} style={inputStyle}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pillar</label>
            <select value={form.pillar} onChange={e => set('pillar', e.target.value)} style={inputStyle}>
              {PILLARS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Hook</label>
          <input value={form.hook} onChange={e => set('hook', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes</label>
          <input value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={inputStyle} placeholder="Ideas, references..." />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onUpdate(form); onClose(); }} style={{
            flex: 1, padding: '10px 0', background: accent, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Save</button>
          <button onClick={() => { onDelete(post.id); onClose(); }} style={{
            padding: '10px 16px', background: 'transparent',
            border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8,
            fontSize: 14, color: '#C9BFA8', cursor: 'pointer',
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// Calendar grid component
function CalendarView({ plan, accent, onPostClick, today }) {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

  // Build day grid: pad start with nulls for first weekday offset
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // Index posts by YYYY-MM-DD date string
  const postsByDate = {};
  for (const p of plan) {
    if (p.date) {
      if (!postsByDate[p.date]) postsByDate[p.date] = [];
      postsByDate[p.date].push(p);
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button onClick={prevMonth} title="Previous month" aria-label="Previous month" style={navBtnStyle}>&#8249;</button>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#1C1A18', minWidth: 160, textAlign: 'center' }}>
          {monthName} {year}
        </span>
        <button onClick={nextMonth} title="Next month" aria-label="Next month" style={navBtnStyle}>&#8250;</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding: '6px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#C9BFA8', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} style={{ minHeight: 90, background: 'rgba(201,191,168,0.08)', borderRadius: 6 }} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const posts = postsByDate[dateStr] || [];

          return (
            <div key={dateStr} style={{
              minHeight: 90, background: '#FDFAF5',
              border: `1px solid ${isToday ? accent : 'rgba(201,191,168,0.28)'}`,
              borderRadius: 6, padding: '6px 5px',
              boxShadow: isToday ? `0 0 0 1px ${accent}` : 'none',
            }}>
              <div style={{
                fontSize: 12, fontWeight: isToday ? 700 : 400,
                color: isToday ? '#fff' : '#1C1A18',
                background: isToday ? accent : 'transparent',
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 4,
              }}>
                {day}
              </div>
              {posts.slice(0, 3).map(p => (
                <button key={p.id} onClick={() => onPostClick(p)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                  background: `${FORMAT_COLORS[p.format] || '#888'}14`,
                  border: `1px solid ${FORMAT_COLORS[p.format] || '#888'}30`,
                  borderRadius: 4, padding: '3px 5px', marginBottom: 3,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: STATUS_COLORS[p.status || 'Idea'],
                  }} />
                  {/* Format tag */}
                  <span style={{ fontSize: 9, fontWeight: 700, color: FORMAT_COLORS[p.format] || '#888', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {p.format}
                  </span>
                  {/* Warning for flagged */}
                  {p.flagged && <span style={{ fontSize: 9, color: '#c4821a', flexShrink: 0 }}>!</span>}
                  {/* Hook truncated */}
                  <span style={{ fontSize: 10, color: '#1C1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'DM Sans, sans-serif' }}>
                    {p.hook}
                  </span>
                </button>
              ))}
              {posts.length > 3 && (
                <div style={{ fontSize: 10, color: '#C9BFA8', paddingLeft: 2 }}>+{posts.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ContentTab({ brand, showToast, onNavigateToStudio }) {
  const [sub, setSub] = useState('Plan');
  const [plan, setPlan] = useState(() => loadStorage(CONTENT_PLAN_KEY, []));
  const [perf, setPerf] = useState(() => loadStorage(CONTENT_PERF_KEY, []));
  const [gapResult, setGapResult] = useState('');
  const [regenResult, setRegenResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [planView, setPlanView] = useState(() => loadStorage(PLAN_VIEW_KEY, 'List'));
  const [selectedPost, setSelectedPost] = useState(null);
  const [visiblePlanCount, setVisiblePlanCount] = useState(20);

  const today = new Date();

  const [planForm, setPlanForm] = useState({ date: '', format: 'Reel', pillar: 'Education', hook: '', notes: '', status: 'Idea' });
  const [perfForm, setPerfForm] = useState({ date: '', format: 'Reel', hook: '', likes: '', comments: '', saves: '' });

  const switchView = (v) => {
    setPlanView(v);
    saveStorage(PLAN_VIEW_KEY, v);
  };

  const addPlan = () => {
    if (!planForm.hook) return;
    const entry = { ...planForm, id: Date.now(), flagged: false, likes: 0, comments: 0, saves: 0, status: planForm.status || 'Idea' };
    const updated = [entry, ...plan];
    setPlan(updated);
    saveStorage(CONTENT_PLAN_KEY, updated);
    setPlanForm({ date: '', format: 'Reel', pillar: 'Education', hook: '', notes: '', status: 'Idea' });
    showToast('Post planned');
  };

  const deletePlan = (id) => {
    const updated = plan.filter(p => p.id !== id);
    setPlan(updated);
    saveStorage(CONTENT_PLAN_KEY, updated);
  };

  const updatePlan = (updatedPost) => {
    const updated = plan.map(p => p.id === updatedPost.id ? updatedPost : p);
    setPlan(updated);
    saveStorage(CONTENT_PLAN_KEY, updated);
    showToast('Post updated');
  };

  const toggleFlag = (id) => {
    const updated = plan.map(p => p.id === id ? { ...p, flagged: !p.flagged } : p);
    setPlan(updated);
    saveStorage(CONTENT_PLAN_KEY, updated);
  };

  const changeStatus = (id, status) => {
    const updated = plan.map(p => p.id === id ? { ...p, status } : p);
    setPlan(updated);
    saveStorage(CONTENT_PLAN_KEY, updated);
  };

  const addPerf = () => {
    if (!perfForm.hook) return;
    const entry = {
      ...perfForm, id: Date.now(),
      likes: Number(perfForm.likes) || 0,
      comments: Number(perfForm.comments) || 0,
      saves: Number(perfForm.saves) || 0,
    };
    const updated = [...perf, entry].sort((a, b) => engagementScore(b) - engagementScore(a));
    setPerf(updated);
    saveStorage(CONTENT_PERF_KEY, updated);
    setPerfForm({ date: '', format: 'Reel', hook: '', likes: '', comments: '', saves: '' });
    showToast('Post logged');
  };

  const deletePerf = (id) => {
    const updated = perf.filter(p => p.id !== id);
    setPerf(updated);
    saveStorage(CONTENT_PERF_KEY, updated);
  };

  const runGapAnalysis = async () => {
    if (!brand.anthropicKey) { showToast('Anthropic key missing -- add it in your dashboard', 'error'); return; }
    setLoading(true);
    try {
      const planSummary = plan.map(p => `[${p.format}] ${p.pillar}: "${p.hook}"${p.flagged ? ' (FLAGGED)' : ''}`).join('\n') || 'No planned posts yet.';
      const perfSummary = perf.slice(0, 10).map(p => `[${p.format}] "${p.hook}" - Score: ${engagementScore(p)} (L:${p.likes} C:${p.comments} S:${p.saves})`).join('\n') || 'No performance data yet.';
      const result = await callClaude(brand.anthropicKey, [{
        role: 'user',
        content: `You are auditing the content strategy for ${brand.name}, a ${brand.niche} Instagram creator.\n\nContent Plan:\n${planSummary}\n\nTop Performing Posts:\n${perfSummary}\n\nWrite a concise audit with exactly four sections:\n\n**What's Working**\n[2-3 bullet points]\n\n**Gaps In Your Plan**\n[2-3 bullet points]\n\n**Replace Immediately**\n[Specific planned posts to cut or rework]\n\n**Priority This Week**\n[Top 1-2 content priorities]\n\nBe direct and specific to ${brand.name}'s niche.`,
      }], 900);
      setGapResult(result);

      const lowScorePosts = plan.filter(p => !p.flagged && p.hook.length < 30);
      if (lowScorePosts.length) {
        const flagged = plan.map(p =>
          lowScorePosts.find(l => l.id === p.id) ? { ...p, flagged: true } : p
        );
        setPlan(flagged);
        saveStorage(CONTENT_PLAN_KEY, flagged);
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runRegen = async () => {
    if (!brand.anthropicKey) { showToast('Anthropic key missing -- add it in your dashboard', 'error'); return; }
    if (!perf.length) { showToast('Log some posts in Performance first', 'error'); return; }
    setLoading(true);
    try {
      const top = perf.slice(0, 3).map(p => `[${p.format}] "${p.hook}" - Score: ${engagementScore(p)}`).join('\n');
      const result = await callClaude(brand.anthropicKey, [{
        role: 'user',
        content: `You are a content strategist for ${brand.name}, a ${brand.niche} creator.\n\nTop performing posts:\n${top}\n\nFor each top post, provide:\n1. A format pivot (e.g., turn a Static into a Reel)\n2. Three fresh hook variations\n3. An OpenArt AI image prompt for the visual\n4. A HeyGen avatar script hook (one sentence)\n\nKeep it specific to ${brand.name}'s aesthetic and niche.`,
      }], 1000);
      setRegenResult(result);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const pillarColor = (pillar) => {
    const colors = { Education: '#4f6d8a', Entertainment: '#d47dbc', Inspiration: '#2d7d5e', Promotion: '#c4821a', Personal: '#6366f1' };
    return colors[pillar] || brand.accent;
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <SubTabs tabs={['Plan', 'Performance', 'Gap Analysis', 'Regenerate']} active={sub} onChange={setSub} accent={brand.accent} />

      {sub === 'Plan' && (
        <div>
          {/* Add post form */}
          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#1C1A18', margin: '0 0 16px', fontWeight: 400 }}>Add Planned Post</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={planForm.date} onChange={e => setPlanForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Format</label>
                <select value={planForm.format} onChange={e => setPlanForm(f => ({ ...f, format: e.target.value }))} style={inputStyle}>
                  {FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pillar</label>
                <select value={planForm.pillar} onChange={e => setPlanForm(f => ({ ...f, pillar: e.target.value }))} style={inputStyle}>
                  {PILLARS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={planForm.status} onChange={e => setPlanForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Hook / Caption start</label>
              <input value={planForm.hook} onChange={e => setPlanForm(f => ({ ...f, hook: e.target.value }))} style={inputStyle} placeholder="First line of caption..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Notes</label>
              <input value={planForm.notes} onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Ideas, references..." />
            </div>
            <button onClick={addPlan} style={btnStyle(brand.accent)}>Add to Plan</button>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {['List', 'Calendar'].map(v => (
              <button key={v} onClick={() => switchView(v)} style={{
                padding: '7px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: planView === v ? brand.accent : 'transparent',
                color: planView === v ? '#fff' : '#1C1A18',
                border: `1px solid ${planView === v ? brand.accent : 'rgba(201,191,168,0.38)'}`,
                fontFamily: 'DM Sans, sans-serif', fontWeight: planView === v ? 700 : 400,
              }}>{v}</button>
            ))}
          </div>

          {/* Status legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] }} />
                <span style={{ fontSize: 12, color: '#C9BFA8' }}>{s}</span>
              </div>
            ))}
          </div>

          {/* List view */}
          {planView === 'List' && (
            <div>
              {plan.length === 0 && <div style={emptyStyle}>No posts planned yet.</div>}
              {plan.slice(0, visiblePlanCount).map(p => (
                <div key={p.id} style={{
                  background: '#FDFAF5', border: `1px solid ${p.flagged ? '#c4821a' : 'rgba(201,191,168,0.38)'}`,
                  borderRadius: 10, padding: '14px 18px', marginBottom: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      {/* Status dot + selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[p.status || 'Idea'], flexShrink: 0 }} />
                        <select
                          value={p.status || 'Idea'}
                          onChange={e => changeStatus(p.id, e.target.value)}
                          style={{ fontSize: 11, color: STATUS_COLORS[p.status || 'Idea'], fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                        >
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: `${pillarColor(p.pillar)}18`, color: pillarColor(p.pillar) }}>{p.pillar}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: `${FORMAT_COLORS[p.format] || '#888'}18`, color: FORMAT_COLORS[p.format] || '#888' }}>{p.format}</span>
                      {p.flagged && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#c4821a18', color: '#c4821a' }}>NEEDS WORK</span>}
                      {p.date && <span style={{ fontSize: 12, color: '#C9BFA8' }}>{p.date}</span>}
                    </div>
                    <div style={{ fontSize: 14, color: '#1C1A18' }}>{p.hook}</div>
                    {p.notes && <div style={{ fontSize: 12, color: '#C9BFA8', marginTop: 3 }}>{p.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                    <button onClick={() => setSelectedPost(p)} style={deleteBtnStyle}>Edit</button>
                    <button onClick={() => toggleFlag(p.id)} style={{ ...deleteBtnStyle, color: p.flagged ? '#c4821a' : '#C9BFA8' }}>
                      {p.flagged ? 'Unflag' : 'Flag'}
                    </button>
                    <button onClick={() => deletePlan(p.id)} style={deleteBtnStyle}>Delete</button>
                  </div>
                </div>
              ))}
              {plan.length > visiblePlanCount && (
                <button onClick={() => setVisiblePlanCount(v => v + 20)} style={{
                  width: '100%', padding: '10px 0', background: 'transparent',
                  border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: '#1C1A18', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}>Load more</button>
              )}
            </div>
          )}

          {/* Calendar view */}
          {planView === 'Calendar' && (
            <CalendarView
              plan={plan}
              accent={brand.accent}
              onPostClick={setSelectedPost}
              today={today}
            />
          )}
        </div>
      )}

      {sub === 'Performance' && (
        <div>
          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#1C1A18', margin: '0 0 16px', fontWeight: 400 }}>Log Post Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={perfForm.date} onChange={e => setPerfForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Format</label>
                <select value={perfForm.format} onChange={e => setPerfForm(f => ({ ...f, format: e.target.value }))} style={inputStyle}>
                  {FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Hook</label>
              <input value={perfForm.hook} onChange={e => setPerfForm(f => ({ ...f, hook: e.target.value }))} style={inputStyle} placeholder="First line or topic..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[['Likes', 'likes'], ['Comments', 'comments'], ['Saves', 'saves']].map(([l, k]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <input type="number" value={perfForm[k]} onChange={e => setPerfForm(f => ({ ...f, [k]: e.target.value }))} style={inputStyle} placeholder="0" />
                </div>
              ))}
            </div>
            <button onClick={addPerf} style={btnStyle(brand.accent)}>Log Post</button>
          </div>

          <div style={{ fontSize: 12, color: '#C9BFA8', marginBottom: 12 }}>Ranked by engagement score (likes + comments x3 + saves x5)</div>
          {perf.length === 0 && <div style={emptyStyle}>No posts logged yet.</div>}
          {perf.map((p, rank) => (
            <div key={p.id} style={{
              background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
              borderRadius: 10, padding: '14px 18px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: rank < 3 ? brand.accent : 'rgba(201,191,168,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: rank < 3 ? '#fff' : '#C9BFA8', flexShrink: 0,
                }}>#{rank + 1}</div>
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(201,191,168,0.18)', color: '#1C1A18', fontWeight: 700 }}>{p.format}</span>
                    {p.date && <span style={{ fontSize: 12, color: '#C9BFA8' }}>{p.date}</span>}
                  </div>
                  <div style={{ fontSize: 14, color: '#1C1A18' }}>{p.hook}</div>
                  <div style={{ fontSize: 12, color: '#C9BFA8', marginTop: 3 }}>
                    {p.likes}L / {p.comments}C / {p.saves}S &middot; Score: {engagementScore(p)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => onNavigateToStudio && onNavigateToStudio(p)} style={{ ...btnStyle(brand.accent), padding: '6px 12px', fontSize: 12 }}>Build this</button>
                <button onClick={() => deletePerf(p.id)} style={deleteBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === 'Gap Analysis' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <button onClick={runGapAnalysis} disabled={loading} style={{ ...btnStyle(brand.accent), opacity: loading ? 0.65 : 1 }}>
              {loading ? 'Analyzing...' : 'Run Gap Analysis'}
            </button>
            <p style={{ color: '#C9BFA8', fontSize: 13, marginTop: 10 }}>
              Claude audits your content plan and performance data. Weak posts are auto-flagged in Plan tab.
            </p>
          </div>
          {gapResult && (
            <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 24 }}>
              <ReactMarkdown components={mdComponents}>{gapResult}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {sub === 'Regenerate' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <button onClick={runRegen} disabled={loading} style={{ ...btnStyle(brand.accent), opacity: loading ? 0.65 : 1 }}>
              {loading ? 'Generating...' : 'Regenerate Top Performers'}
            </button>
            <p style={{ color: '#C9BFA8', fontSize: 13, marginTop: 10 }}>
              Claude generates format pivots, hook variations, OpenArt AI and HeyGen prompts for your top posts.
            </p>
          </div>
          {regenResult && (
            <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <SaveToLibrary content={regenResult} accent={brand.accent} onSaved={() => showToast('Saved to Library')} />
              </div>
              <ReactMarkdown components={mdComponents}>{regenResult}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Post edit modal — shared between list and calendar */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          accent={brand.accent}
          pillarColor={pillarColor}
          onClose={() => setSelectedPost(null)}
          onUpdate={updatePlan}
          onDelete={deletePlan}
        />
      )}
    </div>
  );
}

const navBtnStyle = {
  background: 'none', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 6,
  width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#1C1A18',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'DM Sans, sans-serif',
};
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
