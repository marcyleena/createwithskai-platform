import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, RequireAuth } from '@createwithskai/auth'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RequireAuth>
        <App />
      </RequireAuth>
    </AuthProvider>
  </StrictMode>,
)
