import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { AuthProvider, RequireAuth } from '@createwithskai/auth'
import './index.css'
import App from './App.jsx'

// VITE_SENTRY_DSN is left as an empty placeholder until a real project DSN
// is configured -- Sentry.init() with a falsy dsn safely disables the SDK
// rather than throwing, so this is a no-op until then.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
})

function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F0E8', textAlign: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif',
    }}>
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1C1A18', marginBottom: 8 }}>
          Something went wrong.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(28,26,24,0.7)' }}>
          Please refresh the page. The error has been reported.
        </p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        <RequireAuth>
          <App />
        </RequireAuth>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
