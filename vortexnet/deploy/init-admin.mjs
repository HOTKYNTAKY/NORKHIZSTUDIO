// Initialize only an unconfigured installation; never overwrite an existing password.
import fs from 'node:fs';
import crypto from 'node:crypto';
const file = process.argv[2];
const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
if (password.length < 10) throw new Error('Admin password must be at least 10 characters');
const config = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
if (!config.adminPassHash) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  config.adminPassHash = `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`;
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
