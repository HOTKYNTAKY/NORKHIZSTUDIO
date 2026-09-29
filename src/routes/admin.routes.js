/**
 * src/routes/admin.routes.js
 * Protected Secret Admin Panel API Router
 */
const AdminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/adminGuard');

async function handleAdminRoutes(req, res, pathname) {
  if (!pathname.startsWith('/api/admin')) {
    return false;
  }

  // Enforce Admin Vault authentication
  if (!requireAdmin(req, res)) {
    return true;
  }

  const method = req.method.toUpperCase();

  if (pathname === '/api/admin/dashboard' && method === 'GET') {
    await AdminController.getDashboard(req, res);
    return true;
  }

  if (pathname === '/api/admin/videos' && method === 'POST') {
    await AdminController.createVideo(req, res);
    return true;
  }

  const videoIdMatch = pathname.match(/^\/api\/admin\/videos\/([^/]+)$/);
  if (videoIdMatch) {
    const videoId = decodeURIComponent(videoIdMatch[1]);
    if (method === 'PUT') {
      await AdminController.updateVideo(req, res, videoId);
      return true;
    }
    if (method === 'DELETE') {
      await AdminController.deleteVideo(req, res, videoId);
      return true;
    }
  }

  if (pathname === '/api/admin/categories' && method === 'POST') {
    await AdminController.createCategory(req, res);
    return true;
  }

  const catIdMatch = pathname.match(/^\/api\/admin\/categories\/([^/]+)$/);
  if (catIdMatch && method === 'DELETE') {
    await AdminController.deleteCategory(req, res, decodeURIComponent(catIdMatch[1]));
    return true;
  }

  if (pathname === '/api/admin/performers' && method === 'POST') {
    await AdminController.createPerformer(req, res);
    return true;
  }

  const perfIdMatch = pathname.match(/^\/api\/admin\/performers\/([^/]+)$/);
  if (perfIdMatch && method === 'DELETE') {
    await AdminController.deletePerformer(req, res, decodeURIComponent(perfIdMatch[1]));
    return true;
  }

  if (pathname === '/api/admin/settings' && method === 'PUT') {
    await AdminController.updateSettings(req, res);
    return true;
  }

  return false;
}

module.exports = { handleAdminRoutes };
