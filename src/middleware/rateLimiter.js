/**
 * src/middleware/rateLimiter.js
 * In-memory IP rate limiter for anti-scraping and brute-force defense
 */
const securityConfig = require('../../config/security.config');
const { getClientIp, sendJson } = require('../utils/helpers');

const ipBuckets = new Map();

function checkRateLimit(req, res) {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = securityConfig.rateLimitWindowMs;
  const maxReqs = securityConfig.rateLimitMaxRequests;

  let record = ipBuckets.get(ip);
  if (!record || now - record.start > windowMs) {
    record = { start: now, count: 1 };
    ipBuckets.set(ip, record);
    return true;
  }

  record.count += 1;
  if (record.count > maxReqs) {
    sendJson(res, 429, {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address. Please wait a moment.'
    });
    return false;
  }

  return true;
}

module.exports = { checkRateLimit };
