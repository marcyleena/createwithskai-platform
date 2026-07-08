import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = type === 'error' ? '#b91c1c' : '#1C1A18';

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color: '#F5F0E8',
      padding: '12px 20px', borderRadius: 8,
      fontSize: 14, fontFamily: 'DM Sans, sans-serif',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      maxWidth: 320,
    }}>
      {message}
    </div>
  );
}
