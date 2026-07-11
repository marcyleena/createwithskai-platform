import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@createwithskai/auth';
import { supabase, getHubOrigin } from '@createwithskai/api';
import { loadStorage, saveStorage, STORAGE_KEY, ALERTS_KEY, ALERTS_SEEN_KEY } from './utils';
import Onboarding from './Onboarding';
import Settings from './Settings';
import Toast from './Toast';
import HomeTab from './tabs/HomeTab';
import GrowthTab from './tabs/GrowthTab';
import IntelTab from './tabs/IntelTab';
import ContentTab from './tabs/ContentTab';
import StudioTab from './tabs/StudioTab';
import LibraryTab from './tabs/LibraryTab';

const TABS = ['Home', 'Growth', 'Intel', 'Content', 'Studio', 'Library'];

function hasUnread() {
  const seenAt = loadStorage(ALERTS_SEEN_KEY, 0);
  const alerts = loadStorage(ALERTS_KEY, []);
  return alerts.some(a => (a.timestamp || 0) > seenAt);
}

// Anthropic/Apify keys used to be typed into Onboarding/Settings and saved
// alongside the brand blob in localStorage. They now live in Supabase
// (set once, from the hub dashboard) and get merged onto `brand` here, so
// every tab's existing `brand.anthropicKey` / `brand.apifyKey` reads keep
// working unchanged.
function useApiCredentials(userId) {
  const [credentials, setCredentials] = useState({ anthropicKey: '', apifyKey: '' });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from('user_credentials')
      .select('provider, value')
      .eq('user_id', userId)
      .eq('credential_type', 'api_key')
      .in('provider', ['anthropic', 'apify'])
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next = {};
        for (const row of data) {
          if (row.provider === 'anthropic') next.anthropicKey = row.value?.api_key || '';
          if (row.provider === 'apify') next.apifyKey = row.value?.api_key || '';
        }
        setCredentials(next);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return credentials;
}

export default function App() {
  const { user } = useAuth();
  const credentials = useApiCredentials(user?.id);
  const [brand, setBrand] = useState(() => loadStorage(STORAGE_KEY, null));
  const [activeTab, setActiveTab] = useState('Home');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [studioPrompt, setStudioPrompt] = useState('');
  const [unreadAlerts, setUnreadAlerts] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const handleOnboardingComplete = (data) => {
    setBrand(data);
  };

  const handleSettingsSave = (data) => {
    setBrand(data);
    setShowSettings(false);
    showToast('Settings saved');
  };

  const handleNavigate = (action) => {
    if (action.tab === 'Studio' && action.prompt) {
      setStudioPrompt(action.prompt);
    }
    handleTabChange(action.tab);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Home') {
      saveStorage(ALERTS_SEEN_KEY, Date.now());
      setUnreadAlerts(false);
    }
  };

  const handleAlertsGenerated = useCallback(() => {
    setUnreadAlerts(true);
  }, []);

  if (!brand) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Tabs get the brand blob merged with the live Supabase-backed keys;
  // Settings/localStorage only ever deal with the plain brand fields.
  const brandForTabs = { ...brand, ...credentials };
  const accent = brand.accent || '#6366f1';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: 'DM Sans, sans-serif',
      color: '#1C1A18',
    }}>
      {/* Nav */}
      <header style={{
        background: '#FDFAF5',
        borderBottom: '1px solid rgba(201,191,168,0.38)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <a href={getHubOrigin()} title="Back to Hub" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#C9BFA8',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
          marginRight: 20,
          flexShrink: 0,
        }}>
          <HomeIcon />
        </a>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Georgia, serif', fontSize: 14, color: '#fff', marginRight: 12, flexShrink: 0,
        }}>
          {(brand.name || 'C')[0].toUpperCase()}
        </div>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1C1A18', marginRight: 28, whiteSpace: 'nowrap' }}>
          Creator HQ
        </span>

        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTabChange(tab)} style={{
              padding: '6px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${accent}` : '2px solid transparent',
              color: activeTab === tab ? '#1C1A18' : '#C9BFA8',
              fontSize: 14,
              fontWeight: activeTab === tab ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              height: 56,
              transition: 'color 0.15s',
              position: 'relative',
            }}>
              {tab}
              {tab === 'Home' && unreadAlerts && (
                <span style={{
                  position: 'absolute', top: 10, right: 4,
                  width: 6, height: 6, borderRadius: '50%',
                  background: accent, display: 'block',
                }} />
              )}
            </button>
          ))}
        </nav>

        <button onClick={() => setShowSettings(true)} title="Settings" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#C9BFA8', fontSize: 18, padding: '4px 8px',
          display: 'flex', alignItems: 'center',
        }}>
          <GearIcon />
        </button>
      </header>

      {/* Main */}
      <main style={{ padding: '32px 28px', maxWidth: 1000, margin: '0 auto' }}>
        {activeTab === 'Home' && (
          <HomeTab brand={brandForTabs} onNavigate={handleNavigate} showToast={showToast} />
        )}
        {activeTab === 'Growth' && (
          <GrowthTab brand={brandForTabs} showToast={showToast} />
        )}
        {activeTab === 'Intel' && (
          <IntelTab brand={brandForTabs} showToast={showToast} onAlertsGenerated={handleAlertsGenerated} />
        )}
        {activeTab === 'Content' && (
          <ContentTab
            brand={brandForTabs}
            showToast={showToast}
            onNavigateToStudio={(post) => {
              setStudioPrompt(
                `Expand on this top-performing post for ${brand.name} (${brand.niche}):\n\nFormat: ${post.format}\nHook: "${post.hook}"\nEngagement score: ${post.likes + post.comments * 3 + (post.saves || 0) * 5}\n\nWrite a full caption, image direction, and 3 hook variations.`
              );
              setActiveTab('Studio');
            }}
          />
        )}
        {activeTab === 'Studio' && (
          <StudioTab
            brand={brandForTabs}
            showToast={showToast}
            initialPrompt={studioPrompt}
          />
        )}
        {activeTab === 'Library' && (
          <LibraryTab brand={brandForTabs} showToast={showToast} />
        )}
      </main>

      {showSettings && (
        <Settings
          brand={brand}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
