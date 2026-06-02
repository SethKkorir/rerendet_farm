import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './context/AppContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

// Global handler to catch dynamic import failures (e.g. when a new deployment invalidates old chunk hashes)
// This forces a transparent page reload to download the newest frontend assets
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Failed to fetch dynamically imported module') || e.message.includes('dynamically imported module'))) {
    console.warn('🔄 Dynamic import failed. Forcing a hard page reload to fetch the latest assets...');
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && (e.reason.message.includes('Failed to fetch dynamically imported module') || e.reason.message.includes('dynamically imported module'))) {
    console.warn('🔄 Dynamic import promise rejected. Forcing page reload to fetch the latest assets...');
    window.location.reload();
  }
});

const GOOGLE_CLIENT_ID = "697141801323-d2uc6n2f7b2kcckpk1kk6he1du30l1kn.apps.googleusercontent.com";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppProvider>
          <App />
        </AppProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
