/**
 * src/services/security.service.js
 * Stealth Admin Vault session registry, key validation & audit protection
 */
const db = require('../../config/database');
const securityConfig = require('../../config/security.config');

// In-memory active admin sessions
const activeSessions = new Map();

class SecurityService {
  static verifyAdminCredentials(secretKey, pin) {
    const settings = db.getState().settings;
    const validKey = settings.adminSecretKey || securityConfig.adminSecretKey;
    const validPin = settings.adminMasterPin || securityConfig.adminMasterPin;

    const keyMatch = String(secretKey || '').trim() === validKey;
    const pinMatch = !pin || String(pin).trim() === validPin;

    if (!keyMatch || !pinMatch) {
      return null;
    }

    const token = securityConfig.generateSessionToken(validKey);
    const expiresAt = Date.now() + securityConfig.sessionTtlHours * 3600 * 1000;
    activeSessions.set(token, { createdAt: Date.now(), expiresAt });
    return { token, expiresAt };
  }

  static isValidSession(req) {
    const token =
      req.headers['x-admin-token'] ||
      (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    const directKey = req.headers['x-admin-key'];

    const settings = db.getState().settings;
    const validKey = settings.adminSecretKey || securityConfig.adminSecretKey;

    if (directKey && directKey === validKey) {
      return true;
    }

    if (!token) return false;
    const session = activeSessions.get(token);
    if (!session) return false;

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return false;
    }
    return true;
  }

  static revokeSession(token) {
    activeSessions.delete(token);
  }
}

module.exports = SecurityService;
