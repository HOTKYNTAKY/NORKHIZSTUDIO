import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const dbPath = path.join(dataDir, 'newsroom.sqlite');
if (!fs.existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`);
const backupDir = path.join(dataDir, 'backups');
fs.mkdirSync(backupDir, { recursive: true, mode: 0o750 });
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const out = path.join(backupDir, `newsroom-${stamp}.sqlite`);
fs.copyFileSync(dbPath, out, fs.constants.COPYFILE_EXCL);
fs.chmodSync(out, 0o600);
console.log(`Backup saved: ${out}`);
