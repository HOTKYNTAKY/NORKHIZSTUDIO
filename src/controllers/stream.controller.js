/**
 * src/controllers/stream.controller.js
 * Public video catalog, interactive actions, Smart Online Link Resolver & Stream Proxy
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const VideoModel = require('../models/Video.model');
const db = require('../../config/database');
const appConfig = require('../../config/app.config');
const { sendJson, parseJsonBody, generateId } = require('../utils/helpers');

function convertKnownWatchUrl(rawUrl) {
  let url = String(rawUrl || '').trim();
  if (!url) return { url: '', mode: 'video' };

  // Extract src if user pasted <iframe src="...">
  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1].trim();
  }

  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    // Pornhub
    if (host.includes('pornhub.com')) {
      const vk = u.searchParams.get('viewkey');
      if (vk) return { url: `https://www.pornhub.com/embed/${vk}`, mode: 'iframe' };
      if (u.pathname.startsWith('/embed/')) return { url, mode: 'iframe' };
    }

    // XVideos
    if (host.includes('xvideos.com')) {
      if (u.pathname.startsWith('/embedframe/')) return { url, mode: 'iframe' };
      const xvDot = u.pathname.match(/^\/video\.([a-z0-9]+)\//i);
      if (xvDot) return { url: `https://www.xvideos.com/embedframe/${xvDot[1]}`, mode: 'iframe' };
      const xvNum = u.pathname.match(/^\/video(\d+)\//i);
      if (xvNum) return { url: `https://www.xvideos.com/embedframe/${xvNum[1]}`, mode: 'iframe' };
    }

    // XNXX
    if (host.includes('xnxx.com')) {
      if (u.pathname.startsWith('/embedframe/')) return { url, mode: 'iframe' };
      const xn = u.pathname.match(/^\/video-([a-z0-9]+)\//i);
      if (xn) return { url: `https://www.xnxx.com/embedframe/${xn[1]}`, mode: 'iframe' };
    }

    // xHamster
    if (host.includes('xhamster.')) {
      if (u.pathname.startsWith('/embed/')) return { url, mode: 'iframe' };
      const xh = u.pathname.match(/-([a-zA-Z0-9]+)$/);
      if (xh) return { url: `https://xhamster.com/embed/${xh[1]}`, mode: 'iframe' };
    }

    // SpankBang
    if (host.includes('spankbang.com')) {
      const sb = u.pathname.match(/^\/([a-z0-9]+)\/video\//i);
      if (sb) return { url: `https://spankbang.com/${sb[1]}/embed/`, mode: 'iframe' };
      if (u.pathname.includes('/embed')) return { url, mode: 'iframe' };
    }

    // Eporner
    if (host.includes('eporner.com')) {
      const ep = u.pathname.match(/\/(?:video-|hd-porn-)([a-zA-Z0-9]+)\//);
      if (ep) return { url: `https://www.eporner.com/embed/${ep[1]}/`, mode: 'iframe' };
      if (u.pathname.startsWith('/embed/')) return { url, mode: 'iframe' };
    }

    // RedTube
    if (host.includes('redtube.com')) {
      const rt = u.pathname.match(/^\/(\d+)/);
      if (rt) return { url: `https://embed.redtube.com/?id=${rt[1]}`, mode: 'iframe' };
    }

    // YouPorn
    if (host.includes('youporn.com')) {
      const yp = u.pathname.match(/\/watch\/(\d+)/);
      if (yp) return { url: `https://www.youporn.com/embed/${yp[1]}/`, mode: 'iframe' };
    }

    // Streamtape / Doodstream / Filemoon / VOE
    if (
      host.includes('streamtape.') ||
      host.includes('dood') ||
      host.includes('filemoon.') ||
      host.includes('voe.sx')
    ) {
      const embedUrl = url.replace(/\/(v|d)\//, '/e/');
      return { url: embedUrl, mode: 'iframe' };
    }

    // Google Drive
    if (host.includes('drive.google.com')) {
      const gd = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (gd) return { url: `https://drive.google.com/file/d/${gd[1]}/preview`, mode: 'iframe' };
    }

    // YouTube
    if (host.includes('youtube.com') && u.searchParams.get('v')) {
      return { url: `https://www.youtube.com/embed/${u.searchParams.get('v')}`, mode: 'iframe' };
    }
    if (host.includes('youtu.be')) {
      return { url: `https://www.youtube.com/embed${u.pathname}`, mode: 'iframe' };
    }

    // Aparat
    if (host.includes('aparat.com')) {
      const ap = u.pathname.match(/^\/v\/([a-zA-Z0-9]+)/);
      if (ap) {
        return {
          url: `https://www.aparat.com/video/video/embed/videohash/${ap[1]}/vt/frame`,
          mode: 'iframe'
        };
      }
    }

    const cleanPath = u.pathname.toLowerCase();
    if (
      cleanPath.endsWith('.mp4') ||
      cleanPath.endsWith('.webm') ||
      cleanPath.endsWith('.m3u8') ||
      cleanPath.endsWith('.mov') ||
      cleanPath.endsWith('.mkv') ||
      url.includes('.m3u8')
    ) {
      return { url, mode: 'video' };
    }

    if (cleanPath.includes('/embed') || cleanPath.includes('/e/') || cleanPath.includes('/player')) {
      return { url, mode: 'iframe' };
    }
  } catch (_) {}

  return { url, mode: 'auto' };
}

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

  static resolveOnlineUrl(req, res, queryParams) {
    const rawUrl = queryParams.get('url') || '';
    const converted = convertKnownWatchUrl(rawUrl);
    if (converted.mode !== 'auto') {
      return sendJson(res, 200, {
        success: true,
        resolvedUrl: converted.url,
        mode: converted.mode,
        proxyUrl: `/api/stream/proxy?url=${encodeURIComponent(converted.url)}`
      });
    }

    // Probe the URL headers / first 32KB to see if it's a direct video stream or HTML page with og:video
    try {
      const parsed = new URL(converted.url);
      const client = parsed.protocol === 'https:' ? https : http;
      const probeReq = client.get(
        converted.url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Range: 'bytes=0-32768'
          },
          timeout: 4500
        },
        (probeRes) => {
          const ct = String(probeRes.headers['content-type'] || '').toLowerCase();
          if (
            ct.includes('video/') ||
            ct.includes('application/octet-stream') ||
            ct.includes('mpegurl')
          ) {
            probeReq.destroy();
            return sendJson(res, 200, {
              success: true,
              resolvedUrl: converted.url,
              mode: 'video',
              proxyUrl: `/api/stream/proxy?url=${encodeURIComponent(converted.url)}`
            });
          }

          let htmlChunk = '';
          probeRes.on('data', (d) => {
            if (htmlChunk.length < 32768) htmlChunk += d.toString('utf8');
          });
          probeRes.on('end', () => {
            // Look for direct mp4 / m3u8 or og:video or twitter:player inside HTML
            const mp4Match =
              htmlChunk.match(/property=["']og:video(?::secure_url|:url)?["']\s+content=["']([^"']+)["']/i) ||
              htmlChunk.match(/<source[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i) ||
              htmlChunk.match(/["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8)(?:\?[^"'\s]*)?)["']/i);

            if (mp4Match && mp4Match[1]) {
              const extracted = mp4Match[1].replace(/&amp;/g, '&');
              return sendJson(res, 200, {
                success: true,
                resolvedUrl: extracted,
                mode: extracted.includes('.mp4') || extracted.includes('.m3u8') ? 'video' : 'iframe',
                proxyUrl: `/api/stream/proxy?url=${encodeURIComponent(extracted)}`
              });
            }

            const playerMatch = htmlChunk.match(
              /name=["']twitter:player["']\s+content=["']([^"']+)["']/i
            );
            if (playerMatch && playerMatch[1]) {
              return sendJson(res, 200, {
                success: true,
                resolvedUrl: playerMatch[1].replace(/&amp;/g, '&'),
                mode: 'iframe'
              });
            }

            return sendJson(res, 200, {
              success: true,
              resolvedUrl: converted.url,
              mode: 'iframe'
            });
          });
        }
      );

      probeReq.on('error', () => {
        return sendJson(res, 200, {
          success: true,
          resolvedUrl: converted.url,
          mode: 'iframe'
        });
      });
    } catch (_) {
      return sendJson(res, 200, {
        success: true,
        resolvedUrl: converted.url,
        mode: 'iframe'
      });
    }
  }

  static proxyExternalStream(req, res, queryParams) {
    const targetUrl = queryParams.get('url') || '';
    if (!targetUrl.startsWith('http')) {
      return sendJson(res, 400, { success: false, message: 'Invalid stream URL' });
    }

    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: `${parsed.protocol}//${parsed.host}/`
      };
      if (req.headers.range) {
        headers.Range = req.headers.range;
      }

      const proxyReq = client.get(targetUrl, { headers }, (proxyRes) => {
        // Handle redirects (301, 302, 307, 308)
        if (
          [301, 302, 303, 307, 308].includes(proxyRes.statusCode) &&
          proxyRes.headers.location
        ) {
          const redirected = new URL(proxyRes.headers.location, targetUrl).toString();
          queryParams.set('url', redirected);
          return StreamController.proxyExternalStream(req, res, queryParams);
        }

        const outHeaders = {
          'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        };
        if (proxyRes.headers['content-length']) {
          outHeaders['Content-Length'] = proxyRes.headers['content-length'];
        }
        if (proxyRes.headers['content-range']) {
          outHeaders['Content-Range'] = proxyRes.headers['content-range'];
        }

        res.writeHead(proxyRes.statusCode || 200, outHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        if (!res.headersSent) {
          sendJson(res, 502, { success: false, message: err.message });
        }
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
