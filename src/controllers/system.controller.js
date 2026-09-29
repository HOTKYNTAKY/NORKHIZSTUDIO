/**
 * src/controllers/system.controller.js
 * Public system configuration, Official License badge data & Ubuntu health check
 */
const db = require('../../config/database');
const appConfig = require('../../config/app.config');
const { sendJson } = require('../utils/helpers');

class SystemController {
  static getHealth(req, res) {
    return sendJson(res, 200, {
      status: 'ONLINE',
      app: appConfig.appName,
      version: appConfig.version,
      timestamp: new Date().toISOString()
    });
  }

  static getPublicConfig(req, res) {
    const state = db.getState();
    const s = state.settings;

    return sendJson(res, 200, {
      success: true,
      config: {
        siteName: s.siteName,
        siteTagline: s.siteTagline,
        licenseActive: s.licenseActive,
        licenseNumber: s.licenseNumber,
        licenseAuthority: s.licenseAuthority,
        complianceCode: appConfig.license.complianceCode,
        ageGateEnabled: s.ageGateEnabled,
        minimumAge: s.minimumAge,
        announcementBanner: s.announcementBanner,
        stealthAdminPath: s.stealthAdminPath,
        totalCategories: state.categories.length,
        totalVideos: state.videos.length,
        totalPerformers: state.performers.length
      }
    });
  }
}

module.exports = SystemController;
