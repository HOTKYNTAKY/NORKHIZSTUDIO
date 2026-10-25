/* ============================================================
   NORKHIZ STUDIO — player.js
   HLS video player via hls.js + quality/captions controls
   ============================================================ */

(function () {
  'use strict';

  const video = $('#mainVideo') || document.getElementById('mainVideo');
  if (!video) return;

  // ---------- Demo HLS playlist (replace with real /stream/:id.m3u8 from PHP API) ----------
  const HLS_SRC = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'; // public demo HLS

  const qualitySelect = $('.quality-select');
  const captionSelect = $('.captions-select');
  const favBtn = $('#favBtn');

  let hls = null;
  let currentQualityIdx = 0;

  // ---------- Favorites toggle ----------
  function toggleFav() {
    const isOn = favBtn.classList.toggle('active');
    const icon = favBtn.querySelector('span:first-child');
    if (isOn) {
      icon.textContent = '❤️';
      favBtn.style.color = 'var(--neon-pink)';
      favBtn.querySelector('span:last-child').textContent = 'حذف از علاقه‌مندی‌ها';
    } else {
      icon.textContent = '♡';
      favBtn.style.color = '';
      favBtn.querySelector('span:last-child').textContent = 'علاقه‌مندی';
    }
  }
  if (favBtn) favBtn.addEventListener('click', toggleFav);

  // ---------- HLS setup ----------
  function setupHLS(src) {
    if (hls) { hls.destroy(); hls = null; }
    if (!Hls) {
      console.warn('hls.js not loaded — native fallback');
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      } else {
        showPlayerError('پخش HLS پشتیبانی نمی‌شود.');
      }
      return;
    }
    hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      populateQuality(data.levels);
      if (currentQualityIdx < data.levels.length) {
        hls.currentLevel = currentQualityIdx;
      }
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('HLS error:', data.type, data.details);
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            showPlayerError('خطا در پخش ویدیو. لطفاً صفحه راRefresh کنید.');
        }
      }
    });
  }

  function populateQuality(levels) {
    if (!qualitySelect) return;
    qualitySelect.innerHTML = levels.map((l, i) => {
      const h = l.height ? `${l.height}p` : 'Auto';
      return `<option value="${i}">${h} — ${Math.round(l.bitrate / 1000)} kbps</option>`;
    }).join('');
    qualitySelect.addEventListener('change', (e) => {
      currentQualityIdx = parseInt(e.target.value);
      if (hls) hls.currentLevel = currentQualityIdx;
    });
  }

  // Captions (placeholder UI)
  if (captionSelect) {
    captionSelect.addEventListener('change', (e) => {
      const track = e.target.value;
      video.textTracks.forEach(t => { t.mode = 'disabled'; });
      if (track !== 'none') {
        // In production: add <track> element with .vtt file from API
        console.log('Caption requested:', track);
      }
    });
  }

  // ---------- Init ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupHLS(HLS_SRC));
  } else {
    setupHLS(HLS_SRC);
  }

  function showPlayerError(msg) {
    const wrap = document.getElementById('videoPlayer');
    if (!wrap) return;
    wrap.innerHTML = `
      <div style="width:100%;height:100%;display:grid;place-items:center;color:var(--text-muted);background:#000;border-radius:var(--border-radius-lg);">
        <div style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">&#x1F4A5;</div>
          <div style="font-weight:700;">خطای پخش ویدیو</div>
          <div style="font-size:0.9rem;margin-top:8px;opacity:0.8;">${msg}</div>
        </div>
      </div>`;
  }

  // shorthand $
  window.$ = window.$ || ((s, r = document) => r.querySelector(s));
})();