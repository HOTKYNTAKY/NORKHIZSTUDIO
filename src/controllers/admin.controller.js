/**
 * src/controllers/admin.controller.js
 * Full CRUD controller for the Secret Admin Panel (Videos, Categories, Performers, Settings, Uploads)
 */
const VideoModel = require('../models/Video.model');
const CategoryModel = require('../models/Category.model');
const PerformerModel = require('../models/Performer.model');
const AnalyticsModel = require('../models/Analytics.model');
const StorageService = require('../services/storage.service');
const FfmpegService = require('../services/ffmpeg.service');
const db = require('../../config/database');
const { sendJson, parseJsonBody, getClientIp } = require('../utils/helpers');

class AdminController {
  static async getDashboard(req, res) {
    const stats = AnalyticsModel.getDashboardStats();
    const ffmpegStatus = await FfmpegService.checkInstalled();
    const state = db.getState();

    return sendJson(res, 200, {
      success: true,
      stats,
      ffmpeg: ffmpegStatus,
      settings: {
        siteName: state.settings.siteName,
        siteTagline: state.settings.siteTagline,
        licenseActive: state.settings.licenseActive,
        licenseNumber: state.settings.licenseNumber,
        licenseAuthority: state.settings.licenseAuthority,
        ageGateEnabled: state.settings.ageGateEnabled,
        minimumAge: state.settings.minimumAge,
        stealthAdminPath: state.settings.stealthAdminPath,
        announcementBanner: state.settings.announcementBanner
      },
      videos: state.videos,
      categories: state.categories,
      performers: state.performers
    });
  }

  static async createVideo(req, res) {
    try {
      const body = await parseJsonBody(req);
      const ip = getClientIp(req);

      let streamUrl = body.streamUrl || '';
      let thumbnail = body.thumbnail || '';

      // If admin uploaded a video file via base64 dataUrl
      if (body.videoFileData && body.videoFileData.startsWith('data:')) {
        const savedVideo = StorageService.saveBase64File(
          body.videoFileData,
          'video',
          body.videoFileName || 'uploaded-video.mp4'
        );
        streamUrl = savedVideo.publicUrl;
      }

      // If admin uploaded a thumbnail image via base64 dataUrl
      if (body.thumbnailFileData && body.thumbnailFileData.startsWith('data:')) {
        const savedThumb = StorageService.saveBase64File(
          body.thumbnailFileData,
          'thumbnail',
          body.thumbnailFileName || 'poster.jpg'
        );
        thumbnail = savedThumb.publicUrl;
      }

      const created = VideoModel.create({
        ...body,
        streamUrl,
        thumbnail
      });

      db.addAuditLog('VIDEO_CREATED', ip, `Added video: "${created.title}" (${created.quality})`);
      return sendJson(res, 201, {
        success: true,
        video: created,
        message: 'ویدیو جدید با موفقیت به کاتالوگ سایت اضافه شد!'
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  static async updateVideo(req, res, videoId) {
    try {
      const body = await parseJsonBody(req);
      const ip = getClientIp(req);

      if (body.thumbnailFileData && body.thumbnailFileData.startsWith('data:')) {
        const savedThumb = StorageService.saveBase64File(
          body.thumbnailFileData,
          'thumbnail',
          body.thumbnailFileName || 'poster.jpg'
        );
        body.thumbnail = savedThumb.publicUrl;
      }

      const updated = VideoModel.update(videoId, body);
      if (!updated) {
        return sendJson(res, 404, { success: false, message: 'Video not found' });
      }

      db.addAuditLog('VIDEO_UPDATED', ip, `Updated video: "${updated.title}"`);
      return sendJson(res, 200, {
        success: true,
        video: updated,
        message: 'اطلاعات ویدیو بروزرسانی شد.'
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  static async deleteVideo(req, res, videoId) {
    const ip = getClientIp(req);
    const deleted = VideoModel.delete(videoId);
    if (!deleted) {
      return sendJson(res, 404, { success: false, message: 'Video not found' });
    }
    db.addAuditLog('VIDEO_DELETED', ip, `Deleted video ID: ${videoId}`);
    return sendJson(res, 200, {
      success: true,
      message: 'ویدیو با موفقیت حذف شد.'
    });
  }

  static async createCategory(req, res) {
    try {
      const body = await parseJsonBody(req);
      const ip = getClientIp(req);
      const category = CategoryModel.create(body);
      db.addAuditLog('CATEGORY_CREATED', ip, `Created English category: ${category.name}`);
      return sendJson(res, 201, {
        success: true,
        category,
        message: `Category "${category.name}" added successfully.`
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  static async deleteCategory(req, res, categoryId) {
    const ip = getClientIp(req);
    const ok = CategoryModel.delete(categoryId);
    if (!ok) {
      return sendJson(res, 404, { success: false, message: 'Category not found' });
    }
    db.addAuditLog('CATEGORY_DELETED', ip, `Deleted category ID: ${categoryId}`);
    return sendJson(res, 200, { success: true, message: 'Category removed.' });
  }

  static async createPerformer(req, res) {
    try {
      const body = await parseJsonBody(req);
      const ip = getClientIp(req);
      const performer = PerformerModel.create(body);
      db.addAuditLog('PERFORMER_CREATED', ip, `Added performer: ${performer.name}`);
      return sendJson(res, 201, {
        success: true,
        performer,
        message: `Performer "${performer.name}" added.`
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  static async deletePerformer(req, res, performerId) {
    const ip = getClientIp(req);
    const ok = PerformerModel.delete(performerId);
    if (!ok) {
      return sendJson(res, 404, { success: false, message: 'Performer not found' });
    }
    db.addAuditLog('PERFORMER_DELETED', ip, `Deleted performer ID: ${performerId}`);
    return sendJson(res, 200, { success: true, message: 'Performer removed.' });
  }

  static async updateSettings(req, res) {
    try {
      const body = await parseJsonBody(req);
      const ip = getClientIp(req);
      const state = db.getState();

      if (body.siteName !== undefined) state.settings.siteName = String(body.siteName).trim();
      if (body.siteTagline !== undefined) state.settings.siteTagline = String(body.siteTagline).trim();
      if (body.licenseNumber !== undefined) state.settings.licenseNumber = String(body.licenseNumber).trim();
      if (body.licenseAuthority !== undefined) state.settings.licenseAuthority = String(body.licenseAuthority).trim();
      if (body.licenseActive !== undefined) state.settings.licenseActive = Boolean(body.licenseActive);
      if (body.ageGateEnabled !== undefined) state.settings.ageGateEnabled = Boolean(body.ageGateEnabled);
      if (body.announcementBanner !== undefined) state.settings.announcementBanner = String(body.announcementBanner).trim();
      if (body.adminSecretKey && String(body.adminSecretKey).trim().length >= 4) {
        state.settings.adminSecretKey = String(body.adminSecretKey).trim();
      }
      if (body.adminMasterPin && String(body.adminMasterPin).trim().length >= 3) {
        state.settings.adminMasterPin = String(body.adminMasterPin).trim();
      }

      db.save();
      db.addAuditLog('SETTINGS_UPDATED', ip, 'Updated site settings, license or security key');

      return sendJson(res, 200, {
        success: true,
        settings: state.settings,
        message: 'تنظیمات سایت، مجوز رسمی و کلید امنیتی با موفقیت ذخیره شد.'
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }
}

module.exports = AdminController;
