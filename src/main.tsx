import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './utils/registerIcons';
import { debugLog } from './utils/debugLog';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      debugLog.warn('auth', 'sw_register', `Service worker registration failed: ${msg}`);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
