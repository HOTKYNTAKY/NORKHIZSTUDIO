/**
 * src/utils/logger.js
 * Structured access & security logger for Ubuntu Server logs
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const ACCESS_LOG = path.join(LOG_DIR, 'access.log');

function writeLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  try {
    fs.appendFileSync(ACCESS_LOG, line, 'utf8');
  } catch (_) {
    // Ignore file write errors in read-only environments
  }
}

module.exports = {
  info: (msg, meta) => writeLog('info', msg, meta),
  warn: (msg, meta) => writeLog('warn', msg, meta),
  error: (msg, meta) => writeLog('error', msg, meta),
  security: (msg, meta) => writeLog('security', msg, meta)
};
