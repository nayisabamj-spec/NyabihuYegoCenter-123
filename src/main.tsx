import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle dynamic Vite chunk loading errors automatically on new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[App] New version deployed. Reloading latest assets...', event);
  window.location.reload();
});

// Forcefully unregister ALL old/broken Service Workers and clear caches
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[App] Successfully unregistered legacy Service Worker:', registration.scope);
          }
        }).catch((err) => {
          console.warn('[App] Error unregistering Service Worker:', err);
        });
      }
    }).catch(() => {});
  }

  // Clear all Cache Storage instances
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key).then(() => {
          console.log('[App] Purged legacy cache storage:', key);
        }).catch(() => {});
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
