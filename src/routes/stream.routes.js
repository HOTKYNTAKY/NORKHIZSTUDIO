/**
 * src/routes/stream.routes.js
 * HTTP 206 Partial Content Range Video Streaming Router
 */
const StreamController = require('../controllers/stream.controller');

function handleStreamRoutes(req, res, pathname) {
  const match = pathname.match(/^\/api\/stream\/(.+)$/);
  if (match && req.method.toUpperCase() === 'GET') {
    const filename = decodeURIComponent(match[1]);
    StreamController.streamLocalFile(req, res, filename);
    return true;
  }
  return false;
}

module.exports = { handleStreamRoutes };
