import { useState } from 'react';
import {
  loadStorage, saveStorage,
  SNAPSHOTS_KEY, JOURNAL_KEY, PROFILE_KEY,
  MILESTONE_VALUES, formatNumber,
} from '../utils';

const JOURNAL_CATEGORIES = ['Strategy', 'Win', 'Lesson', 'Pivot', 'Goal'];

export default function GrowthTab({ brand, showToast }) {
  const [sub, setSub] = useState('Overview');
  const [snapshots, setSnapshots] = useState(() => loadStorage(SNAPSHOTS_KEY, []));
  const [journal, setJournal] = useState(() => loadStorage(JOURNAL_KEY, []));
  const [liveProfile, setLiveProfile] = useState(() => loadStorage(PROFILE_KEY, null));
  const [refreshing, setRefreshing] = useState(false);

  const [snapForm, setSnapForm] = useState({ followers: '', following: '', posts: '', notes: '' });
  const [journalForm, setJournalForm] = useState({ text: '', category: 'Strategy' });

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const refreshInstagram = async () => {
    if (!brand.apifyKey) { showToast('Apify key missing -- add it in your dashboard', 'error'); return; }
    if (!brand.handle) { showToast('Instagram handle missing in Settings', 'error'); return; }
    setRefreshing(true);
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${brand.apifyKey}&timeout=60`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [brand.handle] }),
        }
      );
      if (!res.ok) throw new Error(`Apify responded with ${res.status}`);
      const items = await res.json();
      const raw = Array.isArray(items) ? items[0] : null;
      if (!raw) throw new Error('No profile data returned');
      const profile = {
        followers: raw.followersCount ?? raw.followers ?? 0,
        following: raw.followsCount ?? raw.following ?? 0,
        posts: raw.postsCount ?? raw.posts ?? 0,
        bio: raw.biography ?? raw.bio ?? '',
        refreshedAt: new Date().toLocaleString(),
      };
      setLiveProfile(profile);
      saveStorage(PROFILE_KEY, profile);
      showToast('Instagram profile refreshed');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const saveSnapshot = () => {
    if (!snapForm.followers) return;
    const s = { ...snapForm, date: new Date().toLocaleDateString(), followers: Number(snapForm.followers), following: Number(snapForm.following), posts: Number(snapForm.posts) };
    const updated = [...snapshots, s];
    setSnapshots(updated);
    saveStorage(SNAPSHOTS_KEY, updated);
    setSnapForm({ followers: '', following: '', posts: '', notes: '' });
    showToast('Snapshot saved');
  };

  const deleteSnapshot = (i) => {
    const updated = snapshots.filter((_, idx) => idx !== i);
    setSnapshots(updated);
    saveStorage(SNAPSHOTS_KEY, updated);
  };

  const saveJournal = () => {
    if (!journalForm.text) return;
    const entry = { ...journalForm, date: new Date().toLocaleDateString(), id: Date.now() };
    const updated = [entry, ...journal];
    setJournal(updated);
    saveStorage(JOURNAL_KEY, updated);
    setJournalForm({ text: '', category: 'Strategy' });
    showToast('Journal entry saved');
  };

  const deleteJournal = (id) => {
    const updated = journal.filter(e => e.id !== id);
    setJournal(updated);
    saveStorage(JOURNAL_KEY, updated);
  };

  // Prefer live profile data for current counts; fall back to last snapshot
  const displayFollowers = liveProfile?.followers ?? latest?.followers ?? 0;
  const displayFollowing = liveProfile?.following ?? latest?.following;
  const displayPosts = liveProfile?.posts ?? latest?.posts;
  const followerCount = displayFollowers;
  const diff = latest && prev ? latest.followers - prev.followers : null;

  const tabs = ['Overview', 'Snapshots', 'Milestones', 'Journal'];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <SubTabs tabs={tabs} active={sub} onChange={setSub} accent={brand.accent} />

      {sub === 'Overview' && (
        <div>
          {/* Profile card */}
          <div style={{
            background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
            borderRadius: 14, padding: 24, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: brand.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Georgia, serif', fontSize: 26, color: '#fff', flexShrink: 0,
            }}>
              {(brand.name || 'B')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1C1A18' }}>{brand.name}</div>
              <div style={{ color: '#C9BFA8', fontSize: 14 }}>@{brand.handle} &middot; {brand.niche}</div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'Followers', value: formatNumber(displayFollowers), accent: true },
              { label: 'Following', value: formatNumber(displayFollowing) },
              { label: 'Posts', value: formatNumber(displayPosts) },
              { label: 'Growth', value: diff !== null ? (diff >= 0 ? '+' : '') + formatNumber(diff) : '—' },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{
                background: accent ? brand.accent : '#FDFAF5',
                border: `1px solid ${accent ? 'transparent' : 'rgba(201,191,168,0.38)'}`,
                borderRadius: 12, padding: '18px 16px',
              }}>
                <div style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.75)' : '#C9BFA8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: accent ? '#fff' : '#1C1A18' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Refresh button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <button onClick={refreshInstagram} disabled={refreshing} style={{
              padding: '9px 18px', background: 'transparent',
              border: `1px solid ${brand.accent}`, borderRadius: 8,
              color: brand.accent, fontSize: 13, fontWeight: 700,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              opacity: refreshing ? 0.65 : 1,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <RefreshIcon spinning={refreshing} />
              {refreshing ? 'Refreshing...' : 'Refresh Instagram'}
            </button>
            {liveProfile?.refreshedAt && (
              <span style={{ fontSize: 12, color: '#C9BFA8' }}>
                Last refreshed {liveProfile.refreshedAt}
              </span>
            )}
          </div>

          {/* Ratio bar */}
          {displayFollowers > 0 && displayFollowing > 0 && (
            <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#C9BFA8', marginBottom: 8 }}>Follower / Following Ratio</div>
              <div style={{ height: 8, background: 'rgba(201,191,168,0.28)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: brand.accent,
                  width: `${Math.min(100, (displayFollowers / (displayFollowers + displayFollowing)) * 100)}%`,
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#C9BFA8' }}>
                <span>{formatNumber(displayFollowers)} followers</span>
                <span>{formatNumber(displayFollowing)} following</span>
              </div>
            </div>
          )}

          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.18)', borderRadius: 12, padding: 20, color: '#C9BFA8', fontSize: 14 }}>
            Log snapshots over time to unlock engagement rate and top post analytics.
          </div>
        </div>
      )}

      {sub === 'Snapshots' && (
        <div>
          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#1C1A18', margin: '0 0 18px', fontWeight: 400 }}>Log Snapshot</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Followers', key: 'followers' },
                { label: 'Following', key: 'following' },
                { label: 'Posts', key: 'posts' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" value={snapForm[key]} onChange={e => setSnapForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle} placeholder="0" />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Notes</label>
              <input type="text" value={snapForm.notes} onChange={e => setSnapForm(f => ({ ...f, notes: e.target.value }))}
                style={inputStyle} placeholder="Optional notes..." />
            </div>
            <button onClick={saveSnapshot} style={btnStyle(brand.accent)}>Save Snapshot</button>
          </div>

          <div>
            {snapshots.length === 0 && <div style={emptyStyle}>No snapshots yet.</div>}
            {[...snapshots].reverse().map((s, i) => (
              <div key={i} style={{
                background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
                borderRadius: 10, padding: '14px 18px', marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1C1A18' }}>{formatNumber(s.followers)}</span>
                      <span style={{ color: '#C9BFA8', fontSize: 13, marginLeft: 5 }}>followers</span>
                    </span>
                    {s.following > 0 && (
                      <span>
                        <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18' }}>{formatNumber(s.following)}</span>
                        <span style={{ color: '#C9BFA8', fontSize: 13, marginLeft: 5 }}>following</span>
                      </span>
                    )}
                    {s.posts > 0 && (
                      <span>
                        <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18' }}>{formatNumber(s.posts)}</span>
                        <span style={{ color: '#C9BFA8', fontSize: 13, marginLeft: 5 }}>posts</span>
                      </span>
                    )}
                  </div>
                  {s.notes && <div style={{ fontSize: 13, color: '#1C1A18', marginTop: 4 }}>{s.notes}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#C9BFA8' }}>{s.date}</span>
                  <button onClick={() => deleteSnapshot(snapshots.length - 1 - i)} style={deleteBtnStyle}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === 'Milestones' && (
        <div>
          <p style={{ color: '#C9BFA8', fontSize: 14, marginBottom: 20 }}>
            Milestones unlock as your follower count grows.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {MILESTONE_VALUES.map(m => {
              const achieved = followerCount >= m;
              return (
                <div key={m} style={{
                  background: '#FDFAF5',
                  border: `2px solid ${achieved ? brand.accent : 'rgba(201,191,168,0.38)'}`,
                  borderRadius: 12, padding: '20px 18px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: achieved ? brand.accent : '#C9BFA8', marginBottom: 4 }}>
                    {formatNumber(m)}
                  </div>
                  <div style={{ fontSize: 13, color: achieved ? '#1C1A18' : '#C9BFA8', fontWeight: achieved ? 600 : 400 }}>
                    {achieved ? 'Achieved' : 'Locked'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sub === 'Journal' && (
        <div>
          <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: '#1C1A18', margin: '0 0 16px', fontWeight: 400 }}>Strategy Log</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Category</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {JOURNAL_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setJournalForm(f => ({ ...f, category: c }))}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                      background: journalForm.category === c ? brand.accent : 'transparent',
                      color: journalForm.category === c ? '#fff' : '#1C1A18',
                      border: `1px solid ${journalForm.category === c ? brand.accent : 'rgba(201,191,168,0.38)'}`,
                      fontFamily: 'DM Sans, sans-serif',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Entry</label>
              <textarea value={journalForm.text} onChange={e => setJournalForm(f => ({ ...f, text: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What did you learn or decide today?" />
            </div>
            <button onClick={saveJournal} style={btnStyle(brand.accent)}>Save Entry</button>
          </div>

          {journal.length === 0 && <div style={emptyStyle}>No journal entries yet.</div>}
          {journal.map(e => (
            <div key={e.id} style={{
              background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
              borderRadius: 10, padding: '14px 18px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  color: brand.accent, background: `${brand.accent}18`, padding: '3px 10px', borderRadius: 20,
                }}>{e.category}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#C9BFA8' }}>{e.date}</span>
                  <button onClick={() => deleteJournal(e.id)} style={deleteBtnStyle}>Delete</button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#1C1A18', lineHeight: 1.6 }}>{e.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubTabs({ tabs, active, onChange, accent }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(201,191,168,0.38)', paddingBottom: 0 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: '8px 16px', background: 'none', border: 'none',
          borderBottom: active === t ? `2px solid ${accent}` : '2px solid transparent',
          color: active === t ? '#1C1A18' : '#C9BFA8',
          fontSize: 14, fontWeight: active === t ? 700 : 400, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', marginBottom: -1,
          transition: 'color 0.15s',
        }}>{t}</button>
      ))}
    </div>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
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
