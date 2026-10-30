import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // "/" locally; the GitHub Pages workflow sets VITE_BASE=/<repo>/ for the static demo build.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4173 },
});
