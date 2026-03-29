import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './LanguageContext';
import { FirebaseProvider } from './FirebaseContext';
import { ErrorBoundary } from './components/ErrorBoundary';

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
