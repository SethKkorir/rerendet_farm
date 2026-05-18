import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './context/AppContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

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
