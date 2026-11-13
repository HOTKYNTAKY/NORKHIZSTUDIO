import crypto from 'node:crypto';

const password = process.env.ADMIN_PASSWORD || '';
if (password.length < 12 || password.length > 200) {
  console.error('Password must be between 12 and 200 characters.');
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64);
process.stdout.write(`scrypt:${salt.toString('base64url')}:${hash.toString('base64url')}\n`);
