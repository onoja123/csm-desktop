import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { installBrowserShim } from '@/lib/browser-shim';
import { App } from './App';
import { MenuBar } from '@/screens/MenuBar';
import '@/design/base.css';
import '@/design/app.css';

installBrowserShim();

function windowLabel(): string {
  try {
    return getCurrentWindow().label;
  } catch {
    return 'main';
  }
}

const Root = windowLabel() === 'menubar' ? MenuBar : App;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
