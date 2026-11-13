import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(repoRoot, 'dist');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Build output not found. Run `npm run build` first.');
}

// This repository currently publishes GitHub Pages from main:/, so copy the
// production build to the root while keeping the maintainable source in app/.
fs.cpSync(dist, repoRoot, { recursive: true, force: true });
console.log('Published static build files to the repository root for GitHub Pages.');
