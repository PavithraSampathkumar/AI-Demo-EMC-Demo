import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In local dev, forward /api calls to the Express server on port 5000,
    // so the frontend can use the same relative URLs as in production.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
