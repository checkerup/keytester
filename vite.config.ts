import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:31337',
      '/ws': {
        target: 'ws://localhost:31337',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
});