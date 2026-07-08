import { useState } from 'react';
import { STORAGE_KEY, saveStorage, ACCENT_PRESETS } from './utils';

export default function Onboarding({ onComplete }) {
  const [form, setForm] = useState({
    name: '', handle: '', niche: '', accent: '#6366f1',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.handle || !form.niche) return;
    saveStorage(STORAGE_KEY, form);
    onComplete(form);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F0E8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: 24,
    }}>
      <div style={{
        background: '#FDFAF5', borderRadius: 16, padding: '48px 40px',
        width: '100%', maxWidth: 480,
        boxShadow: '0 2px 32px rgba(28,26,24,0.08)',
        border: '1px solid rgba(201,191,168,0.38)',
      }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#1C1A18', margin: '0 0 4px' }}>
          Creator HQ
        </h1>
        <p style={{ color: '#C9BFA8', fontSize: 14, margin: '0 0 32px' }}>
          Set up your brand to get started
        </p>

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Brand or Influencer Name', key: 'name', type: 'text', placeholder: 'e.g. Luna Solaris' },
            { label: 'Instagram Handle', key: 'handle', type: 'text', placeholder: 'e.g. lunasolaris (no @)' },
            { label: 'Niche', key: 'niche', type: 'text', placeholder: 'e.g. Virtual Fashion & Lifestyle' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1A18', marginBottom: 6 }}>
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          ))}

          <div style={{
            marginBottom: 28, padding: '12px 14px', borderRadius: 10,
            background: 'rgba(201,191,168,0.14)', border: '1px solid rgba(201,191,168,0.38)',
          }}>
            <p style={{ fontSize: 12.5, color: '#1C1A18', margin: 0, lineHeight: 1.5 }}>
              Your Anthropic and Apify API keys are managed in one place --{' '}
              <a href="https://createwithskai.cloud" style={{ color: form.accent }}>
                your dashboard
              </a>
              . Add them there and every Launchpad tool picks them up automatically.
            </p>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1A18', marginBottom: 12 }}>
              Accent Color
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {ACCENT_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('accent', p.value)}
                  title={p.label}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: p.value, border: form.accent === p.value ? '3px solid #1C1A18' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={form.accent}
                onChange={e => set('accent', e.target.value)}
                placeholder="#6366f1"
                style={{ ...inputStyle, width: 110 }}
              />
              <input
                type="color"
                value={form.accent}
                onChange={e => set('accent', e.target.value)}
                style={{ width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 2 }}
              />
              <div style={{
                flex: 1, height: 40, borderRadius: 8,
                background: form.accent,
                border: '1px solid rgba(201,191,168,0.38)',
              }} />
            </div>
          </div>

          <button type="submit" style={{
            width: '100%', padding: '14px 0',
            background: form.accent, color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            Launch Creator HQ
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  background: '#F5F0E8', border: '1px solid rgba(201,191,168,0.38)',
  borderRadius: 8, fontSize: 14, color: '#1C1A18',
  fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
  outline: 'none',
};
