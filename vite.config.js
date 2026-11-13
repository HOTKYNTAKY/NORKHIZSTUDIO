import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(repoRoot, 'app');

export default defineConfig({
  root: appRoot,
  publicDir: path.resolve(appRoot, 'public'),
  // vortexnett.shop is a custom root domain, so assets are served from `/`.
  base: '/',
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true,
  },
  build: {
    outDir: path.resolve(repoRoot, 'dist'),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
