/**
 * src/models/Analytics.model.js
 * Platform telemetry, view statistics, and Ubuntu server metrics
 */
const os = require('os');
const db = require('../../config/database');

class AnalyticsModel {
  static getDashboardStats() {
    const state = db.getState();
    const totalVideos = state.videos.length;
    const totalCategories = state.categories.length;
    const totalPerformers = state.performers.length;
    const vipVideos = state.videos.filter((v) => v.isVip).length;
    const totalViews = state.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = state.videos.reduce((sum, v) => sum + (v.likes || 0), 0);

    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const usedMemMb = totalMemMb - freeMemMb;
    const memUsagePercent = Math.round((usedMemMb / Math.max(1, totalMemMb)) * 100);

    return {
      catalog: {
        totalVideos,
        vipVideos,
        totalCategories,
        totalPerformers,
        totalViews,
        totalLikes,
        totalComments: (state.comments || []).length
      },
      server: {
        hostname: os.hostname(),
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        nodeVersion: process.version,
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Ubuntu Virtual CPU',
        loadAvg: os.loadavg().map((n) => n.toFixed(2)),
        uptimeHours: (os.uptime() / 3600).toFixed(1),
        memory: {
          totalMb: totalMemMb,
          usedMb: usedMemMb,
          freeMb: freeMemMb,
          percent: memUsagePercent
        }
      },
      license: {
        active: state.settings.licenseActive,
        number: state.settings.licenseNumber,
        authority: state.settings.licenseAuthority
      },
      recentLogs: (state.auditLogs || []).slice(0, 20)
    };
  }
}

module.exports = AnalyticsModel;
