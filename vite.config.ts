import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer'),
  // .env files live at the project root, not under src/renderer/. Without this
  // override, Vite would look for src/renderer/.env.production and miss it.
  envDir: __dirname,
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, 'src/renderer/features'),
      '@shared': path.resolve(__dirname, 'src/renderer/shared'),
      '@app': path.resolve(__dirname, 'src/renderer'),
      '@ipc': path.resolve(__dirname, 'src/ipc'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
