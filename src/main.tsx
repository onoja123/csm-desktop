import React from 'react';
import ReactDOM from 'react-dom/client';
import { installBrowserShim } from '@/lib/browser-shim';
import { App } from './App';
import '@/design/base.css';
import '@/design/app.css';

installBrowserShim();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
