import { useState } from 'react';
import { STORAGE_KEY, saveStorage, ACCENT_PRESETS } from './utils';

export default function Settings({ brand, onSave, onClose }) {
  const [form, setForm] = useState({ ...brand });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    saveStorage(STORAGE_KEY, form);
    onSave(form);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(28,26,24,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#FDFAF5', borderRadius: 16, padding: '36px 32px',
        width: '100%', maxWidth: 460,
        border: '1px solid rgba(201,191,168,0.38)',
        maxHeight: '90vh', overflowY: 'auto',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#1C1A18', margin: 0 }}>Settings</h2>
          <button onClick={onClose} title="Close" aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#C9BFA8' }}>x</button>
        </div>

        {[
          { label: 'Brand Name', key: 'name', type: 'text' },
          { label: 'Instagram Handle', key: 'handle', type: 'text' },
          { label: 'Niche', key: 'niche', type: 'text' },
        ].map(({ label, key, type }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1A18', marginBottom: 6 }}>{label}</label>
            <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)} style={inputStyle} />
          </div>
        ))}

        <div style={{
          marginBottom: 24, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(201,191,168,0.14)', border: '1px solid rgba(201,191,168,0.38)',
        }}>
          <p style={{ fontSize: 12.5, color: '#1C1A18', margin: 0, lineHeight: 1.5 }}>
            Your Anthropic and Apify API keys are managed in{' '}
            <a href="https://createwithskai.cloud" style={{ color: form.accent || '#6366f1' }}>
              your dashboard
            </a>
            , not here.
          </p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1A18', marginBottom: 10 }}>Accent Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {ACCENT_PRESETS.map(p => (
              <button key={p.value} type="button" onClick={() => set('accent', p.value)} title={p.label}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: p.value,
                  border: form.accent === p.value ? '3px solid #1C1A18' : '2px solid transparent', cursor: 'pointer',
                }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" value={form.accent || '#6366f1'} onChange={e => set('accent', e.target.value)}
              style={{ ...inputStyle, width: 100 }} />
            <input type="color" value={form.accent || '#6366f1'} onChange={e => set('accent', e.target.value)}
              style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 2 }} />
            <div style={{ flex: 1, height: 36, borderRadius: 8, background: form.accent || '#6366f1', border: '1px solid rgba(201,191,168,0.38)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} style={{
            flex: 1, padding: '12px 0', background: form.accent || '#6366f1',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Save Changes</button>
          <button onClick={onClose} style={{
            padding: '12px 20px', background: 'transparent',
            color: '#1C1A18', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8, fontSize: 14, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', background: '#F5F0E8',
  border: '1px solid rgba(201,191,168,0.38)', borderRadius: 8,
  fontSize: 14, color: '#1C1A18', fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box', outline: 'none',
};
