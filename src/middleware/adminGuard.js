/**
 * src/middleware/adminGuard.js
 * Middleware to protect secret admin routes
 */
const SecurityService = require('../services/security.service');
const { sendJson, getClientIp } = require('../utils/helpers');
const logger = require('../utils/logger');

function requireAdmin(req, res) {
  if (!SecurityService.isValidSession(req)) {
    const ip = getClientIp(req);
    logger.security('Unauthorized attempt to access Secret Admin API', { ip, url: req.url });
    sendJson(res, 401, {
      success: false,
      error: 'UNAUTHORIZED_ADMIN_VAULT',
      message: 'کلید امنیتی پنل مخفی ادمین نامعتبر است یا منقضی شده است.'
    });
    return false;
  }
  return true;
}

module.exports = { requireAdmin };
