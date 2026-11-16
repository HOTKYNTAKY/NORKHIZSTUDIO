// Apply the owner's requested payment card without touching other settings.
import fs from 'node:fs';
const file = process.argv[2];
if (!file) throw new Error('config.json path is required');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid config.json');
config.cardNumber = '6219861495616921';
config.cardName = 'ایمان دهقانی';
const tmp = `${file}.card-update.tmp`;
try {
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
} catch (e) { try { fs.unlinkSync(tmp); } catch {} throw e; }
