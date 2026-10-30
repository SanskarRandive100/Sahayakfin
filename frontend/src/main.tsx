import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App'
import { SessionProvider } from './state/session'
import { ToastProvider } from './components/Toast'
import MockBadge from './components/MockBadge'
import BackendHealthBanner from './components/BackendHealthBanner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionProvider>
        <ToastProvider>
          <MockBadge />
          <BackendHealthBanner />
          <App />
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
