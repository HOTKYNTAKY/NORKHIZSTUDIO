/**
 * src/controllers/stream.controller.js
 * Public video catalog, interactive actions (views, likes, comments) & HTTP 206 Range Streaming
 */
const fs = require('fs');
const path = require('path');
const VideoModel = require('../models/Video.model');
const db = require('../../config/database');
const appConfig = require('../../config/app.config');
const { sendJson, parseJsonBody, generateId } = require('../utils/helpers');

class StreamController {
  static listVideos(req, res, queryParams) {
    const filters = {
      category: queryParams.get('category') || '',
      performer: queryParams.get('performer') || '',
      quality: queryParams.get('quality') || '',
      vip: queryParams.get('vip') || '',
      search: queryParams.get('search') || '',
      sort: queryParams.get('sort') || 'latest'
    };

    const videos = VideoModel.findAll(filters);
    const state = db.getState();

    return sendJson(res, 200, {
      success: true,
      total: videos.length,
      videos,
      featured: state.videos.filter((v) => v.isFeatured)
    });
  }

  static getVideoDetail(req, res, videoId) {
    const video = VideoModel.findById(videoId);
    if (!video) {
      return sendJson(res, 404, { success: false, message: 'Video not found' });
    }
    const state = db.getState();
    const comments = (state.comments || []).filter((c) => c.videoId === video.id);
    const related = state.videos
      .filter((v) => v.id !== video.id)
      .slice(0, 6);

    return sendJson(res, 200, {
      success: true,
      video,
      comments,
      related
    });
  }

  static recordView(req, res, videoId) {
    const updated = VideoModel.incrementView(videoId);
    if (!updated) {
      return sendJson(res, 404, { success: false, message: 'Video not found' });
    }
    return sendJson(res, 200, { success: true, views: updated.views });
  }

  static recordLike(req, res, videoId) {
    const updated = VideoModel.toggleLike(videoId);
    if (!updated) {
      return sendJson(res, 404, { success: false, message: 'Video not found' });
    }
    return sendJson(res, 200, { success: true, likes: updated.likes });
  }

  static async addComment(req, res, videoId) {
    try {
      const body = await parseJsonBody(req);
      const text = String(body.text || '').trim();
      const user = String(body.user || 'Anonymous_VIP').trim();
      if (!text) {
        return sendJson(res, 400, { success: false, message: 'متن نظر نمی‌تواند خالی باشد.' });
      }

      const state = db.getState();
      const comment = {
        id: generateId('cmt'),
        videoId,
        user: user.slice(0, 32),
        text: text.slice(0, 500),
        createdAt: new Date().toISOString()
      };
      state.comments.unshift(comment);
      db.save();

      return sendJson(res, 201, {
        success: true,
        comment
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  static streamLocalFile(req, res, filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(appConfig.media.videosDir, safeName);

    if (!fs.existsSync(filePath)) {
      return sendJson(res, 404, { success: false, message: 'Stream file not found on server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }
}

module.exports = StreamController;
