import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production the PHP API is served from the same origin as the site
// (/api/*). For local dev, set VITE_DEV_API_TARGET to a running PHP server
// (e.g. `php -S 127.0.0.1:8899` at the repo root) and Vite will proxy /api to
// it — so the app talks to a real local backend with no CORS hassle. If unset,
// the app simply falls back to its bundled content (content.js).
const API_TARGET = process.env.VITE_DEV_API_TARGET

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: API_TARGET
    ? { proxy: { '/api': { target: API_TARGET, changeOrigin: true } } }
    : undefined,
})
