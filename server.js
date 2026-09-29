/**
 * server.js
 * VELVETVAULT PRO — Main Enterprise VOD Streaming & Secret Admin Server
 * Designed for Ubuntu Server LTS + Live Browser Preview
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const appConfig = require('./config/app.config');
const db = require('./config/database');
const StorageService = require('./src/services/storage.service');
const { attachComplianceHeaders } = require('./src/middleware/ageGate');
const { checkRateLimit } = require('./src/middleware/rateLimiter');
const { handleApiRoutes } = require('./src/routes/api.routes');
const { handleAdminRoutes } = require('./src/routes/admin.routes');
const { handleStreamRoutes } = require('./src/routes/stream.routes');
const { sendJson } = require('./src/utils/helpers');
const logger = require('./src/utils/logger');

StorageService.ensureDirectories();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t'
};

const PUBLIC_DIR = path.resolve(__dirname, 'public');

function serveStaticFile(req, res, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  // Support HTTP 206 Range Requests for video files
  if ((ext === '.mp4' || ext === '.webm') && req.headers.range) {
    const fileSize = stat.size;
    const parts = req.headers.range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return true;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    attachComplianceHeaders(res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-Admin-Key'
      });
      return res.end();
    }

    if (!checkRateLimit(req, res)) {
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const queryParams = parsedUrl.searchParams;

    // 1. Stream routes (/api/stream/*)
    if (handleStreamRoutes(req, res, pathname)) {
      return;
    }

    // 2. Secret Admin API routes (/api/admin/*)
    if (await handleAdminRoutes(req, res, pathname)) {
      return;
    }

    // 3. Public API routes (/api/*)
    if (pathname.startsWith('/api/')) {
      const handled = await handleApiRoutes(req, res, pathname, queryParams);
      if (handled !== false) return;
      return sendJson(res, 404, { success: false, error: 'API_ENDPOINT_NOT_FOUND', path: pathname });
    }

    // 4. Stealth Admin Route (e.g. /vault-x9-control) -> serves index.html which auto-opens Secret Admin Vault
    const stealthPath = db.getState().settings.stealthAdminPath || '/vault-x9-control';
    if (pathname === stealthPath || pathname === '/vault-admin') {
      const indexFile = path.join(PUBLIC_DIR, 'index.html');
      return serveStaticFile(req, res, indexFile);
    }

    // 5. Static files in /public
    let safeRelPath = pathname === '/' ? '/index.html' : pathname;
    safeRelPath = path.normalize(safeRelPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const targetFile = path.join(PUBLIC_DIR, safeRelPath);

    if (serveStaticFile(req, res, targetFile)) {
      return;
    }

    // Fallback to SPA index.html
    const fallbackIndex = path.join(PUBLIC_DIR, 'index.html');
    if (serveStaticFile(req, res, fallbackIndex)) {
      return;
    }

    sendJson(res, 404, { success: false, message: 'Resource not found' });
  } catch (err) {
    logger.error('Server request error', { error: err.message, url: req.url });
    if (!res.headersSent) {
      sendJson(res, 500, { success: false, message: 'Internal Server Error' });
    }
  }
});

server.listen(appConfig.port, appConfig.host, () => {
  const settings = db.getState().settings;
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  🔥 ${appConfig.appName} v${appConfig.version} — STREAMING ENGINE ONLINE          ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Listening on        : http://${appConfig.host}:${appConfig.port}                          ║`);
  console.log(`║  📜 Official License    : ${settings.licenseNumber.padEnd(42)}║`);
  console.log(`║  🔐 Stealth Admin Route : ${settings.stealthAdminPath.padEnd(42)}║`);
  console.log(`║  🔑 Default Admin Key   : ${settings.adminSecretKey.padEnd(42)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
});
