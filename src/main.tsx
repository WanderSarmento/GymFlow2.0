import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign environment-related WebSocket errors that can occur in the preview proxy
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      event.reason.message?.includes('WebSocket') || 
      event.reason.message?.includes('failed to connect to websocket')
    )) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (event.message?.includes('WebSocket') || event.message?.includes('failed to connect to websocket')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
