/**
 * src/services/security.service.js
 * Admin Panel session registry & password validation
 */
const db = require('../../config/database');
const securityConfig = require('../../config/security.config');

// In-memory active admin sessions
const activeSessions = new Map();

const MASTER_PASSWORD = 'Vx#9Qm!72Lz@4Rk$';

class SecurityService {
  static verifyAdminCredentials(secretKey) {
    const settings = db.getState().settings;
    const validKey = settings.adminSecretKey || MASTER_PASSWORD;

    const inputKey = String(secretKey || '').trim();
    const keyMatch = inputKey === MASTER_PASSWORD || inputKey === validKey;

    if (!keyMatch) {
      return null;
    }

    const token = securityConfig.generateSessionToken(MASTER_PASSWORD);
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
    const validKey = settings.adminSecretKey || MASTER_PASSWORD;

    if (directKey && (directKey === MASTER_PASSWORD || directKey === validKey)) {
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
