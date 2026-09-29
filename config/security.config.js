/**
 * config/security.config.js
 * Stealth Admin Vault authentication & security configuration
 */
const crypto = require('crypto');

module.exports = {
  // Secret Password for the Hidden Admin Panel
  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'eiman1387',
  stealthAdminPath: process.env.ADMIN_STEALTH_PATH || '/vault-x9-control',
  sessionTtlHours: parseInt(process.env.ADMIN_SESSION_TTL_HOURS || '24', 10),

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '250', 10),

  // Helper to generate signed admin session token
  generateSessionToken(secretKey) {
    const payload = `${secretKey}:${Date.now()}:${crypto.randomBytes(12).toString('hex')}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
};
