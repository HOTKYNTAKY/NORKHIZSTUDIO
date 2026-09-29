/**
 * src/services/storage.service.js
 * Media file storage manager for uploaded videos & custom thumbnails
 */
const fs = require('fs');
const path = require('path');
const appConfig = require('../../config/app.config');
const { slugify } = require('../utils/helpers');

class StorageService {
  static ensureDirectories() {
    [
      appConfig.media.uploadDir,
      appConfig.media.videosDir,
      appConfig.media.thumbnailsDir,
      appConfig.media.hlsDir
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  static saveBase64File(dataUrl, type = 'thumbnail', originalName = 'file') {
    this.ensureDirectories();
    const matches = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 file data');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let ext = '.bin';
    if (mimeType.includes('mp4')) ext = '.mp4';
    else if (mimeType.includes('webm')) ext = '.webm';
    else if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';

    const safeBase = slugify(path.basename(originalName, path.extname(originalName)));
    const fileName = `${safeBase}-${Date.now()}${ext}`;
    const targetDir = type === 'video' ? appConfig.media.videosDir : appConfig.media.thumbnailsDir;
    const subFolder = type === 'video' ? 'videos' : 'thumbnails';
    const fullPath = path.join(targetDir, fileName);

    fs.writeFileSync(fullPath, buffer);
    return {
      fileName,
      fullPath,
      sizeBytes: buffer.length,
      publicUrl: `/uploads/${subFolder}/${fileName}`
    };
  }
}

module.exports = StorageService;
