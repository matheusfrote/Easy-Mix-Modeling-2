import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Automatically handle Vite asset preload failures (e.g. after fresh deployments or server warmup)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error encountered, reloading window to fetch fresh assets...', event);
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

