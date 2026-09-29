/**
 * src/controllers/auth.controller.js
 * Handles Secret Admin Vault authentication & session management
 */
const SecurityService = require('../services/security.service');
const db = require('../../config/database');
const { sendJson, parseJsonBody, getClientIp } = require('../utils/helpers');
const logger = require('../utils/logger');

class AuthController {
  static async login(req, res) {
    try {
      const body = await parseJsonBody(req);
      const ip = getClientIp(req);
      const session = SecurityService.verifyAdminCredentials(body.secretKey, body.pin);

      if (!session) {
        db.addAuditLog('ADMIN_LOGIN_FAILED', ip, 'Failed attempt to unlock Secret Admin Vault');
        logger.security('Failed admin login attempt', { ip });
        return sendJson(res, 401, {
          success: false,
          message: 'کلید امنیتی یا پین کد وارد شده اشتباه است!'
        });
      }

      db.addAuditLog('ADMIN_LOGIN_SUCCESS', ip, 'Secret Admin Vault unlocked successfully');
      logger.info('Admin logged in to Secret Vault', { ip });

      return sendJson(res, 200, {
        success: true,
        token: session.token,
        expiresAt: session.expiresAt,
        message: 'خوش آمدید! دسترسی به پنل مخفی مدیریت فعال شد.'
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  static async verify(req, res) {
    const valid = SecurityService.isValidSession(req);
    return sendJson(res, 200, {
      success: true,
      authenticated: valid
    });
  }
}

module.exports = AuthController;
