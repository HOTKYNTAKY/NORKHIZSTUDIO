/**
 * public/js/player.js
 * Smart Online Video Player Modal (Direct MP4/WebM, HLS .m3u8, Server Proxy & Online Embed Iframe)
 * Enforces 1-Month VIP Subscription (200,000 Toman) on Premium Videos
 */

window.VideoPlayerModal = {
  currentVideo: null,
  isTheater: false,
  currentMode: 'video', // 'video' | 'proxy' | 'iframe'
  hlsInstance: null,
  resolvedInfo: null,

  async open(videoId) {
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}`);
      const data = await res.json();
      if (!data.success || !data.video) {
        window.VelvetToast.show('ویدیو مورد نظر یافت نشد.', 'warning');
        return;
      }

      const v = data.video;

      // Check if video is Premium (VIP) and user does not have an active 1-Month Subscription
      const isAdminLoggedIn = Boolean(localStorage.getItem('vv_admin_token'));
      const hasVipSub =
        window.VipSubscriptionManager && window.VipSubscriptionManager.hasActiveSubscription();

      if (v.isVip && !hasVipSub && !isAdminLoggedIn) {
        window.VipSubscriptionManager.openModal(v);
        return;
      }

      this.currentVideo = v;
      const backdrop = document.getElementById('playerModalBackdrop');
      backdrop.classList.add('open');

      await this.renderModal(v, data.comments || [], data.related || []);

      // Record view asynchronously & add to local watch history
      fetch(`/api/videos/${encodeURIComponent(videoId)}/view`, { method: 'POST' }).catch(() => {});
      if (window.VelvetApp) {
        window.VelvetApp.addToHistory(v.id);
      }
    } catch (err) {
      window.VelvetToast.show('خطا در بارگذاری پلیر ویدیو', 'warning');
    }
  },

  close() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    const videoEl = document.getElementById('html5VideoPlayer');
    if (videoEl) {
      videoEl.onerror = null;
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
    }
    const iframeEl = document.getElementById('iframeVideoPlayer');
    if (iframeEl) {
      iframeEl.src = 'about:blank';
      iframeEl.style.display = 'none';
    }
    const backdrop = document.getElementById('playerModalBackdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
    }
  },

  async loadStreamIntoStage(rawUrl) {
    const extLink = document.getElementById('directStreamExternalLink');
    if (extLink) extLink.href = rawUrl || '#';

    // Ask backend resolver for the best playback mode (video, proxy, or iframe embed)
    try {
      const res = await fetch(`/api/stream/resolve?url=${encodeURIComponent(rawUrl)}`);
      const info = await res.json();
      if (info && info.success) {
        this.resolvedInfo = info;
        if (extLink) extLink.href = info.resolvedUrl || rawUrl;
        if (info.mode === 'iframe') {
          this.activateIframeMode(info.resolvedUrl);
          return;
        }
        this.activateVideoMode(info.resolvedUrl, info.proxyUrl);
        return;
      }
    } catch (_) {}

    this.activateVideoMode(rawUrl, `/api/stream/proxy?url=${encodeURIComponent(rawUrl)}`);
  },

  activateVideoMode(streamUrl, fallbackProxyUrl = '') {
    this.currentMode = 'video';
    const videoEl = document.getElementById('html5VideoPlayer');
    const iframeEl = document.getElementById('iframeVideoPlayer');
    const nativeCtrl = document.getElementById('nativeVideoControlsGroup');
    const speedCtrl = document.getElementById('nativeSpeedControlsGroup');

    if (iframeEl) {
      iframeEl.src = 'about:blank';
      iframeEl.style.display = 'none';
    }
    if (nativeCtrl) nativeCtrl.style.display = 'flex';
    if (speedCtrl) speedCtrl.style.display = 'flex';

    if (!videoEl) return;
    videoEl.style.display = 'block';
    videoEl.removeAttribute('poster');

    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    // Handle HLS (.m3u8) streams
    if (streamUrl.includes('.m3u8') && window.Hls && window.Hls.isSupported()) {
      this.hlsInstance = new window.Hls();
      this.hlsInstance.loadSource(streamUrl);
      this.hlsInstance.attachMedia(videoEl);
      this.hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
      return;
    }

    let triedProxy = false;
    videoEl.onerror = () => {
      if (!triedProxy && fallbackProxyUrl && !streamUrl.startsWith('/api/stream/proxy')) {
        triedProxy = true;
        this.currentMode = 'proxy';
        videoEl.src = fallbackProxyUrl;
        videoEl.play().catch(() => {});
      } else {
        // Fallback to online Embed Iframe if URL is an online player page rather than raw video
        this.activateIframeMode(streamUrl);
      }
    };

    videoEl.src = streamUrl;
    videoEl.play().catch(() => {});
  },

  activateIframeMode(streamUrl) {
    this.currentMode = 'iframe';
    const videoEl = document.getElementById('html5VideoPlayer');
    const iframeEl = document.getElementById('iframeVideoPlayer');
    const nativeCtrl = document.getElementById('nativeVideoControlsGroup');
    const speedCtrl = document.getElementById('nativeSpeedControlsGroup');

    if (videoEl) {
      videoEl.onerror = null;
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.style.display = 'none';
    }
    if (nativeCtrl) nativeCtrl.style.display = 'none';
    if (speedCtrl) speedCtrl.style.display = 'none';

    if (iframeEl) {
      iframeEl.style.display = 'block';
      iframeEl.src = streamUrl;
    }
  },

  switchPlayerMode() {
    if (!this.currentVideo) return;
    const targetUrl = this.resolvedInfo?.resolvedUrl || this.currentVideo.streamUrl;
    const proxyUrl =
      this.resolvedInfo?.proxyUrl || `/api/stream/proxy?url=${encodeURIComponent(targetUrl)}`;

    if (this.currentMode === 'video') {
      this.currentMode = 'proxy';
      const videoEl = document.getElementById('html5VideoPlayer');
      const iframeEl = document.getElementById('iframeVideoPlayer');
      if (iframeEl) iframeEl.style.display = 'none';
      if (videoEl) {
        videoEl.style.display = 'block';
        videoEl.onerror = null;
        videoEl.src = proxyUrl;
        videoEl.play().catch(() => {});
      }
      window.VelvetToast.show('حالت پخش ۲: پروکسی سرور (مناسب لینک‌های دارای محدودیت)');
    } else if (this.currentMode === 'proxy') {
      this.activateIframeMode(targetUrl);
      window.VelvetToast.show('حالت پخش ۳: پلیر صفحه آنلاین (Iframe Embed)');
    } else {
      this.activateVideoMode(targetUrl, proxyUrl);
      window.VelvetToast.show('حالت پخش ۱: پلیر مستقیم ویدیو');
    }
  },

  async renderModal(v, comments, related) {
    const titleHeader = document.getElementById('playerTopTitle');
    const mainTitle = document.getElementById('playerVideoTitle');
    const descEl = document.getElementById('playerVideoDesc');
    const metaEl = document.getElementById('playerVideoMeta');
    const catsEl = document.getElementById('playerVideoCategories');
    const likeCountEl = document.getElementById('playerLikeCount');
    const favBtnEl = document.getElementById('btnPlayerFav');

    if (titleHeader) {
      titleHeader.innerHTML = `<span class="badge-quality">${v.quality || '4K UHD'}</span> ${
        v.isVip ? '<span class="badge-vip">👑 VIP</span>' : ''
      } <span>${v.title}</span>`;
    }
    if (mainTitle) mainTitle.textContent = v.title;
    if (descEl) descEl.textContent = v.description || '';
    if (metaEl) {
      metaEl.innerHTML = `
        <span>⭐ <strong>${v.performer || 'Studio Star'}</strong></span>
        <span>•</span>
        <span>👁️ ${(v.views || 0).toLocaleString()} Views</span>
        <span>•</span>
        <span>⏱️ ${v.duration || '35:00'}</span>
        <span>•</span>
        <span class="rating-positive">🔥 ${v.rating || 98}% Rating</span>
      `;
    }
    if (likeCountEl) {
      likeCountEl.textContent = (v.likes || 0).toLocaleString();
    }

    if (favBtnEl && window.VelvetApp) {
      const isFav = window.VelvetApp.isFavorite(v.id);
      favBtnEl.textContent = isFav ? '❤️ در علاقه‌مندی‌ها' : '🤍 افزودن به علاقه‌مندی';
    }

    if (catsEl) {
      catsEl.innerHTML = (v.categories || [])
        .map(
          (c) =>
            `<button class="cat-pill" onclick="window.VideoPlayerModal.close(); window.VelvetApp.selectCategory('${c.replace(/'/g, "\\'")}')">${c}</button>`
        )
        .join('');
    }

    this.renderComments(comments);
    this.renderRelated(related);
    await this.loadStreamIntoStage(v.streamUrl);
  },

  setSpeed(rate, btnEl) {
    const videoEl = document.getElementById('html5VideoPlayer');
    if (videoEl) videoEl.playbackRate = rate;
    document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    window.VelvetToast.show(`سرعت پخش: ${rate}x`);
  },

  skip(seconds) {
    const videoEl = document.getElementById('html5VideoPlayer');
    if (videoEl) {
      videoEl.currentTime = Math.max(0, videoEl.currentTime + seconds);
    }
  },

  toggleTheater() {
    this.isTheater = !this.isTheater;
    const layout = document.getElementById('playerLayoutGrid');
    if (layout) {
      layout.classList.toggle('theater', this.isTheater);
    }
  },

  async togglePiP() {
    const videoEl = document.getElementById('html5VideoPlayer');
    if (!videoEl) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoEl.requestPictureInPicture) {
        await videoEl.requestPictureInPicture();
      }
    } catch (_) {
      window.VelvetToast.show('حالت تصویر در تصویر در مرورگر شما پشتیبانی نمی‌شود.');
    }
  },

  async likeCurrentVideo() {
    if (!this.currentVideo) return;
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(this.currentVideo.id)}/like`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('playerLikeCount').textContent = data.likes.toLocaleString();
        document.getElementById('btnPlayerLike').classList.add('liked');
        window.VelvetToast.show('لایک شما ثبت شد! 🔥', 'success');
      }
    } catch (_) {}
  },

  toggleFavoriteCurrent() {
    if (!this.currentVideo || !window.VelvetApp) return;
    const added = window.VelvetApp.toggleFavorite(this.currentVideo.id);
    const favBtnEl = document.getElementById('btnPlayerFav');
    if (favBtnEl) {
      favBtnEl.textContent = added ? '❤️ در علاقه‌مندی‌ها' : '🤍 افزودن به علاقه‌مندی';
    }
  },

  renderComments(comments) {
    const listEl = document.getElementById('playerCommentsList');
    if (!listEl) return;
    if (!comments.length) {
      listEl.innerHTML = `<p style="color:#71717a;font-size:13px;">اولین نفری باشید که برای این ویدیو نظر ثبت می‌کند.</p>`;
      return;
    }
    listEl.innerHTML = comments
      .map(
        (c) => `
      <div class="comment-item">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;">
          <strong style="color:#fda4af;">👤 ${c.user}</strong>
          <span style="color:#71717a;">${new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="color:#e4e4e7;font-size:13.5px;">${c.text}</div>
      </div>
    `
      )
      .join('');
  },

  async submitComment(e) {
    e.preventDefault();
    if (!this.currentVideo) return;
    const userInp = document.getElementById('commentUserInput');
    const textInp = document.getElementById('commentTextInput');
    const text = textInp.value.trim();
    if (!text) return;

    const res = await fetch(`/api/videos/${encodeURIComponent(this.currentVideo.id)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userInp.value.trim() || 'VIP_Viewer',
        text
      })
    });
    const data = await res.json();
    if (data.success) {
      textInp.value = '';
      this.open(this.currentVideo.id);
      window.VelvetToast.show('نظر شما با موفقیت ثبت شد!', 'success');
    }
  },

  renderRelated(related) {
    const container = document.getElementById('playerRelatedList');
    if (!container) return;
    container.innerHTML = related
      .map(
        (r) => `
      <div class="related-item" onclick="window.VideoPlayerModal.open('${r.id}')">
        <div class="related-thumb">
          <img src="${r.thumbnail}" alt="${r.title}" />
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.title}</div>
          <div style="font-size:11.5px;color:#fda4af;">${r.performer}</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">${r.quality} • ${r.isVip ? '👑 پرمیوم' : 'رایگان'}</div>
        </div>
      </div>
    `
      )
      .join('');
  }
};
