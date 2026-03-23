import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { store } from './store';

// Expose store globally in dev so Playwright and browser DevTools can
// read state and call actions without React hooks.
//   window.__frontier.getState()
//   window.__frontier.getState().setAutoPlay(true)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__frontier = store;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
