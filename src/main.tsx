import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './LanguageContext';
import { FirebaseProvider } from './FirebaseContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Quiet benign warnings and idle stream aborts in production/preview frames
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const isBenignFirestoreLog = (msg: string) => {
    const m = msg.toLowerCase();
    return (
      m.includes("disconnecting idle stream") ||
      m.includes("grpcconnection rpc") ||
      m.includes("listen") && m.includes("cancelled") ||
      m.includes("timed out waiting for new targets") ||
      m.includes("could not reach cloud firestore backend") ||
      m.includes("client is offline") ||
      m.includes("code=unavailable") ||
      m.includes("offline mode") ||
      m.includes("[vite] failed to connect to websocket")
    );
  };

  const parseArgs = (args: any[]): string => {
    return args.map(arg => {
      try {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        if (arg && typeof arg === 'object') {
          return arg.message || arg.code || JSON.stringify(arg);
        }
        return String(arg);
      } catch (e) {
        return '';
      }
    }).join(' ');
  };
  
  console.error = (...args) => {
    const msg = parseArgs(args);
    if (isBenignFirestoreLog(msg)) {
      return; // Absorb harmless connection restabilization messages
    }
    originalError(...args);
  };

  console.warn = (...args) => {
    const msg = parseArgs(args);
    if (isBenignFirestoreLog(msg)) {
      return; // Absorb benign web logs
    }
    originalWarn(...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseProvider>
        <LanguageProvider>
          <HelmetProvider>
            <App />
          </HelmetProvider>
        </LanguageProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  </StrictMode>,
);
