import { useState } from 'react';
import {
  loadStorage, SNAPSHOTS_KEY, ALERTS_KEY, INTEL_KEY,
  CONTENT_PERF_KEY, LIBRARY_KEY, formatNumber,
} from '../utils';

const ACTIONS = [
  { label: 'Log snapshot', tab: 'Growth', sub: 'Snapshots' },
  { label: 'Run niche intel', tab: 'Intel', sub: 'Run Analysis' },
  { label: 'Plan content', tab: 'Content', sub: 'Plan' },
  { label: 'Write caption', tab: 'Studio', prompt: 'Write a compelling Instagram caption for my brand.' },
  { label: 'Image prompt', tab: 'Studio', prompt: 'Write a detailed AI image generation prompt for my brand aesthetic.' },
  { label: 'Develop persona', tab: 'Studio', prompt: 'Help me develop a detailed persona and backstory for my virtual influencer.' },
];

const ALERT_STYLES = {
  spike:        { bg: null, label: 'Engagement Spike' },
  format_shift: { bg: '#4f6d8a18', color: '#4f6d8a', label: 'Format Shift' },
  reactivated:  { bg: 'rgba(201,191,168,0.18)', color: '#C9BFA8', label: 'Reactivated' },
};

function buildExport(brand, snapshots, intel, perfPosts, libraryItems, alerts) {
  const lines = [];
  const line = (s = '') => lines.push(s);

  // ── Brand Snapshot ──────────────────────────────────────────────
  line('═══════════════════════════════════════');
  line('CREATOR HQ EXPORT — ' + new Date().toLocaleDateString());
  line('═══════════════════════════════════════');
  line();
  line('BRAND SNAPSHOT');
  line('───────────────────────────────────────');
  line('Name:  ' + brand.name);
  line('Niche: ' + brand.niche);

  const latest = snapshots[snapshots.length - 1];
  const prev   = snapshots[snapshots.length - 2];

  if (latest) {
    line('Followers: ' + formatNumber(latest.followers) + (latest.date ? '  (as of ' + latest.date + ')' : ''));
    if (prev && prev.followers != null && latest.followers != null) {
      const delta = latest.followers - prev.followers;
      const sign  = delta >= 0 ? '+' : '';
      line('Growth since last snapshot: ' + sign + formatNumber(delta) + ' followers');
    }
    if (latest.following != null) line('Following: ' + formatNumber(latest.following));
    if (latest.posts     != null) line('Posts:     ' + formatNumber(latest.posts));
  } else {
    line('Followers: not yet logged — data still being collected.');
  }

  // ── Recent Performance ──────────────────────────────────────────
  if (perfPosts.length > 0) {
    line();
    line('RECENT PERFORMANCE  (top 3 posts)');
    line('───────────────────────────────────────');
    perfPosts.slice(0, 3).forEach((p, i) => {
      line((i + 1) + '. ' + (p.format || 'Post') + (p.hook ? ' — "' + p.hook + '"' : ''));
      const stats = [];
      if (p.likes    != null) stats.push('Likes: '    + formatNumber(p.likes));
      if (p.comments != null) stats.push('Comments: ' + formatNumber(p.comments));
      if (p.saves    != null) stats.push('Saves: '    + formatNumber(p.saves));
      if (p.views    != null && p.views > 0) stats.push('Views: ' + formatNumber(p.views));
      if (stats.length) line('   ' + stats.join('  ·  '));
    });
  }

  // ── Competitor Intel ────────────────────────────────────────────
  const intelResults = intel?.results?.filter(r => r.posts && r.posts.length > 0) || [];
  if (intelResults.length > 0) {
    line();
    line('COMPETITOR INTEL  (latest scrape: ' + (intel.date || '—') + ')');
    line('───────────────────────────────────────');
    intelResults.forEach(r => {
      const platform = r.platform ? r.platform.charAt(0).toUpperCase() + r.platform.slice(1) : 'Instagram';
      line('@' + r.handle + '  [' + platform + ']' + (r.niche ? '  (' + r.niche + ')' : ''));
      const top = r.posts.reduce((best, p) =>
        ((p.likes || 0) + (p.comments || 0)) > ((best.likes || 0) + (best.comments || 0)) ? p : best
      , r.posts[0]);
      const stats = ['Likes: ' + formatNumber(top.likes), 'Comments: ' + formatNumber(top.comments)];
      if (top.views > 0) stats.push('Views: ' + formatNumber(top.views));
      line('  Top post (' + (top.type || 'Post') + '): ' + (top.hook || '(no caption)'));
      line('  ' + stats.join('  ·  '));
    });

    if (alerts.length > 0) {
      line();
      line('Active trend alerts:');
      alerts.slice(0, 3).forEach(a => line('  • ' + a.message));
    }
  }

  // ── Library Highlights ──────────────────────────────────────────
  if (libraryItems.length > 0) {
    line();
    line('LIBRARY HIGHLIGHTS  (3 most recent saves)');
    line('───────────────────────────────────────');
    libraryItems.slice(0, 3).forEach((item, i) => {
      line((i + 1) + '. [' + item.category + ']  ' + (item.label || item.content?.substring(0, 60) || ''));
    });
  }

  // ── Closing prompt ──────────────────────────────────────────────
  line();
  line('───────────────────────────────────────');
  line("Here's my latest Creator HQ data. Based on this, what stands out to you? Feel free to ask me questions or suggest what we should focus on.");

  return lines.join('\n');
}

export default function HomeTab({ brand, onNavigate, showToast }) {
  const [exportText, setExportText] = useState('');
  const [showExport, setShowExport] = useState(false);

  const snapshots   = loadStorage(SNAPSHOTS_KEY, []);
  const alerts      = loadStorage(ALERTS_KEY, []);
  const intel       = loadStorage(INTEL_KEY, null);
  const perfPosts   = loadStorage(CONTENT_PERF_KEY, [])
    .slice()
    .sort((a, b) => ((b.likes || 0) + (b.comments || 0) * 3 + (b.saves || 0) * 5) - ((a.likes || 0) + (a.comments || 0) * 3 + (a.saves || 0) * 5));
  const libraryItems = loadStorage(LIBRARY_KEY, [])
    .slice()
    .sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved));

  const recent      = snapshots.slice(-3).reverse();
  const latest      = snapshots[snapshots.length - 1];
  const recentAlerts = alerts.slice(0, 3);

  const handleExport = () => {
    const text = buildExport(brand, snapshots, intel, perfPosts, libraryItems, alerts);
    setExportText(text);
    setShowExport(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      showToast('Copied! Paste this into Skai to continue the conversation.');
    });
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Hero card */}
      <div style={{
        background: brand.accent, borderRadius: 16, padding: '36px 36px 32px',
        marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
        }} />
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>
          AI-Powered Studio
        </p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 36, color: '#fff', margin: '0 0 6px', fontWeight: 400 }}>
          {brand.name}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', margin: '0 0 24px', fontSize: 15 }}>
          {brand.niche}
        </p>
        {latest && (
          <div style={{ display: 'inline-block' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 48, color: '#fff', fontWeight: 400, lineHeight: 1 }}>
              {formatNumber(latest.followers)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginLeft: 8 }}>followers</span>
          </div>
        )}
        {!latest && (
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>Log your first snapshot to see follower count</p>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18', margin: '0 0 14px', fontWeight: 400 }}>
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {ACTIONS.map(action => (
            <button key={action.label} onClick={() => onNavigate(action)} style={{
              padding: '14px 12px', background: '#FDFAF5',
              border: '1px solid rgba(201,191,168,0.38)', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#1C1A18',
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {action.label}
            </button>
          ))}
          <button onClick={handleExport} style={{
            padding: '14px 12px', background: '#FDFAF5',
            border: '1px solid rgba(201,191,168,0.38)', borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: '#1C1A18',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            Export data for Skai
          </button>
        </div>
      </div>

      {/* Export preview */}
      {showExport && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18', margin: 0, fontWeight: 400 }}>
              Export Preview
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCopy} style={{
                padding: '8px 18px', background: brand.accent, color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>
                Copy to Clipboard
              </button>
              <button onClick={() => setShowExport(false)} style={{
                padding: '8px 14px', background: 'transparent',
                border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8,
                fontSize: 13, color: '#C9BFA8', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Dismiss
              </button>
            </div>
          </div>
          <pre style={{
            background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
            borderRadius: 12, padding: '20px 22px',
            fontSize: 12.5, lineHeight: 1.7, color: '#1C1A18',
            fontFamily: 'DM Mono, Menlo, monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 420, overflowY: 'auto', margin: 0,
          }}>
            {exportText}
          </pre>
        </div>
      )}

      {/* Trend Alerts */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18', margin: '0 0 14px', fontWeight: 400 }}>
          Trend Alerts
        </h3>
        {recentAlerts.length === 0 ? (
          <div style={emptyStyle}>
            No new trends detected since your last check. Run analysis again next week to keep this updated.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentAlerts.map(alert => {
              const s = ALERT_STYLES[alert.type] || ALERT_STYLES.reactivated;
              const tagBg    = s.bg    || `${brand.accent}18`;
              const tagColor = s.color || brand.accent;
              return (
                <div key={alert.id} style={{
                  background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
                  borderRadius: 10, padding: '14px 18px',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                    background: tagBg, color: tagColor,
                    letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0, marginTop: 2,
                  }}>
                    {s.label}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.5 }}>{alert.message}</div>
                    <div style={{ fontSize: 12, color: '#C9BFA8', marginTop: 4 }}>{alert.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent snapshots */}
      <div>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18', margin: '0 0 14px', fontWeight: 400 }}>
          Recent Snapshots
        </h3>
        {recent.length === 0 ? (
          <div style={emptyStyle}>No snapshots yet. Log your first snapshot in the Growth tab.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((s, i) => (
              <div key={i} style={{
                background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)',
                borderRadius: 10, padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#1C1A18' }}>{formatNumber(s.followers)}</span>
                  <span style={{ color: '#C9BFA8', fontSize: 13, marginLeft: 6 }}>followers</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#C9BFA8' }}>{s.date}</div>
                  {s.notes && <div style={{ fontSize: 13, color: '#1C1A18', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const emptyStyle = {
  padding: '20px 18px', background: '#FDFAF5',
  border: '1px solid rgba(201,191,168,0.18)', borderRadius: 10,
  color: '#C9BFA8', fontSize: 14,
};
