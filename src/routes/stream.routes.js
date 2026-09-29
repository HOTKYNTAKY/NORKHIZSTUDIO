/**
 * src/routes/stream.routes.js
 * HTTP 206 Partial Content Range Video Streaming, Online Link Resolver & Stream Proxy Router
 */
const StreamController = require('../controllers/stream.controller');

function handleStreamRoutes(req, res, pathname, queryParams) {
  const method = req.method.toUpperCase();

  if (pathname === '/api/stream/resolve' && method === 'GET') {
    StreamController.resolveOnlineUrl(req, res, queryParams);
    return true;
  }

  if (pathname === '/api/stream/proxy' && method === 'GET') {
    StreamController.proxyExternalStream(req, res, queryParams);
    return true;
  }

  const match = pathname.match(/^\/api\/stream\/(.+)$/);
  if (match && method === 'GET') {
    const filename = decodeURIComponent(match[1]);
    StreamController.streamLocalFile(req, res, filename);
    return true;
  }
  return false;
}

module.exports = { handleStreamRoutes };
