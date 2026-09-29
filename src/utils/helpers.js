/**
 * src/utils/helpers.js
 * Utility functions for slug generation, request body parsing, and HTTP responses
 */
const crypto = require('crypto');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `item-${Date.now()}`;
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-Admin-Key',
    'X-Adult-Rating': 'RTA-5042-1996-1400-1577-RTA'
  });
  res.end(body);
}

function parseJsonBody(req, maxBytes = 100 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload Too Large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return resolve({});
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

module.exports = {
  slugify,
  generateId,
  sendJson,
  parseJsonBody,
  getClientIp
};
