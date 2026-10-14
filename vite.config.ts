/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { Plugin } from 'vite';

// Forwards /__csm/* to the csm service socket so the UI can be developed in a normal browser.
function csmProxy(): Plugin {
  return {
    name: 'csm-socket-proxy',
    configureServer(server) {
      const socketPath =
        process.env.CSM_SOCKET ||
        path.join(process.env.CSM_HOME || path.join(os.homedir(), '.csm'), 'csm.sock');
      server.middlewares.use('/__csm', (req, res) => {
        const upstream = http.request(
          {
            socketPath,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: 'csm' },
          },
          (up) => {
            res.writeHead(up.statusCode ?? 502, up.headers);
            up.pipe(res);
          },
        );
        upstream.on('error', (e) => {
          res.statusCode = 502;
          res.end(
            JSON.stringify({ error: `csm service unreachable at ${socketPath}: ${e.message}` }),
          );
        });
        req.pipe(upstream);
      });
    },
  };
}

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), csmProxy()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
});
