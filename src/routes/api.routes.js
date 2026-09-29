/**
 * src/routes/api.routes.js
 * Public API Router (Catalog, English Categories, Performers, Config, Auth)
 */
const StreamController = require('../controllers/stream.controller');
const CategoryController = require('../controllers/category.controller');
const SystemController = require('../controllers/system.controller');
const AuthController = require('../controllers/auth.controller');

async function handleApiRoutes(req, res, pathname, queryParams) {
  const method = req.method.toUpperCase();

  // System & Compliance endpoints
  if (pathname === '/api/system/health' && method === 'GET') {
    return SystemController.getHealth(req, res);
  }
  if (pathname === '/api/system/config' && method === 'GET') {
    return SystemController.getPublicConfig(req, res);
  }

  // Categories & Performers (English)
  if (pathname === '/api/categories' && method === 'GET') {
    return CategoryController.listCategories(req, res, queryParams);
  }
  if (pathname === '/api/performers' && method === 'GET') {
    return CategoryController.listPerformers(req, res);
  }

  // Videos Catalog
  if (pathname === '/api/videos' && method === 'GET') {
    return StreamController.listVideos(req, res, queryParams);
  }

  // Video Actions: /api/videos/:id, /api/videos/:id/view, /api/videos/:id/like, /api/videos/:id/comments
  const videoActionMatch = pathname.match(/^\/api\/videos\/([^/]+)(?:\/(view|like|comments))?$/);
  if (videoActionMatch) {
    const videoId = decodeURIComponent(videoActionMatch[1]);
    const subAction = videoActionMatch[2];

    if (!subAction && method === 'GET') {
      return StreamController.getVideoDetail(req, res, videoId);
    }
    if (subAction === 'view' && method === 'POST') {
      return StreamController.recordView(req, res, videoId);
    }
    if (subAction === 'like' && method === 'POST') {
      return StreamController.recordLike(req, res, videoId);
    }
    if (subAction === 'comments' && method === 'POST') {
      return StreamController.addComment(req, res, videoId);
    }
  }

  // Admin Vault Login & Verification
  if (pathname === '/api/auth/login' && method === 'POST') {
    return AuthController.login(req, res);
  }
  if (pathname === '/api/auth/verify' && method === 'GET') {
    return AuthController.verify(req, res);
  }

  return false;
}

module.exports = { handleApiRoutes };
