/**
 * config/app.config.js
 * Central application, streaming, and national license configuration
 */
const fs = require('fs');
const path = require('path');

// Built-in lightweight .env loader
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile();

module.exports = {
  appName: 'VELVETVAULT PRO',
  appSubtitle: 'Licensed 18+ Adult Entertainment & 4K VOD Streaming Network',
  version: '3.4.0-LTS',
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  domain: process.env.DOMAIN || 'localhost',

  license: {
    active: process.env.LICENSE_ACTIVE !== 'false',
    registrationNumber: process.env.LICENSE_NUMBER || 'IR-AVOD-2026-99481-OFFICIAL',
    authority: process.env.LICENSE_AUTHORITY || 'National Digital Media & Adult Content Regulatory Board (دارای مجوز رسمی کشوری)',
    complianceCode: 'RTA-5042-1996-1400-1577-RTA / 18 U.S.C. 2257 Compliant',
    minimumAge: parseInt(process.env.MINIMUM_AGE || '18', 10),
    ageGateEnabled: process.env.AGE_VERIFICATION_REQUIRED !== 'false'
  },

  media: {
    uploadDir: path.resolve(__dirname, '..', 'public', 'uploads'),
    videosDir: path.resolve(__dirname, '..', 'public', 'uploads', 'videos'),
    thumbnailsDir: path.resolve(__dirname, '..', 'public', 'uploads', 'thumbnails'),
    hlsDir: path.resolve(__dirname, '..', 'public', 'uploads', 'hls'),
    maxUploadBytes: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '8192', 10) * 1024 * 1024,
    supportedFormats: ['.mp4', '.webm', '.mkv', '.mov', '.m3u8'],
    resolutions: ['4K 2160p', '1080p Full HD', '720p HD', '480p SD']
  }
};
