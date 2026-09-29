/**
 * src/services/ffmpeg.service.js
 * FFmpeg probe & HLS transcoding integration service for Ubuntu Server
 */
const { exec } = require('child_process');
const path = require('path');

class FfmpegService {
  static checkInstalled() {
    return new Promise((resolve) => {
      exec('ffmpeg -version', (err, stdout) => {
        if (err) {
          return resolve({ installed: false, version: 'FFmpeg not detected in PATH (Install via install.sh)' });
        }
        const firstLine = (stdout || '').split('\n')[0] || 'FFmpeg installed';
        resolve({ installed: true, version: firstLine.trim() });
      });
    });
  }

  static triggerHlsTranscode(inputFilePath, videoId) {
    return new Promise((resolve) => {
      const scriptPath = path.resolve(__dirname, '..', '..', 'deploy', 'scripts', 'transcode-hls.sh');
      exec(`bash "${scriptPath}" "${inputFilePath}" "${videoId}"`, (err, stdout, stderr) => {
        if (err) {
          return resolve({
            success: false,
            message: 'Direct MP4 streaming enabled (HLS transcoding skipped)',
            error: stderr || err.message
          });
        }
        resolve({
          success: true,
          manifestUrl: `/uploads/hls/${videoId}/master.m3u8`,
          output: stdout
        });
      });
    });
  }
}

module.exports = FfmpegService;
