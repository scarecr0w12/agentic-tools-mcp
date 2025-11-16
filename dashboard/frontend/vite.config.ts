/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const API = process.env.VITE_PROXY_API ?? 'http://localhost:4800';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': API,
      '/ws': {
        target: API,
        ws: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
});
