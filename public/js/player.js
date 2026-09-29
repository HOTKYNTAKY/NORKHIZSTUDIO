/**
 * public/js/player.js
 * Custom 4K HTML5 Video Player Modal with Quality Selector, Speed, PiP, Likes & Comments
 */

window.VideoPlayerModal = {
  currentVideo: null,
  isTheater: false,

  async open(videoId) {
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}`);
      const data = await res.json();
      if (!data.success || !data.video) {
        window.VelvetToast.show('ویدیو مورد نظر یافت نشد.', 'warning');
        return;
      }

      this.currentVideo = data.video;
      this.renderModal(data.video, data.comments || [], data.related || []);

      const backdrop = document.getElementById('playerModalBackdrop');
      backdrop.classList.add('open');

      // Record view asynchronously & add to local watch history
      fetch(`/api/videos/${encodeURIComponent(videoId)}/view`, { method: 'POST' }).catch(() => {});
      if (window.VelvetApp) {
        window.VelvetApp.addToHistory(data.video.id);
      }
    } catch (err) {
      window.VelvetToast.show('خطا در بارگذاری پلیر ویدیو', 'warning');
    }
  },

  close() {
    const videoEl = document.getElementById('html5VideoPlayer');
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
    }
    const backdrop = document.getElementById('playerModalBackdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
    }
  },

  renderModal(v, comments, related) {
    const videoEl = document.getElementById('html5VideoPlayer');
    const titleHeader = document.getElementById('playerTopTitle');
    const mainTitle = document.getElementById('playerVideoTitle');
    const descEl = document.getElementById('playerVideoDesc');
    const metaEl = document.getElementById('playerVideoMeta');
    const catsEl = document.getElementById('playerVideoCategories');
    const likeCountEl = document.getElementById('playerLikeCount');
    const favBtnEl = document.getElementById('btnPlayerFav');

    if (titleHeader) {
      titleHeader.innerHTML = `<span class="badge-quality">${v.quality || '4K UHD'}</span> <span>${v.title}</span>`;
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

    if (videoEl) {
      videoEl.poster = v.thumbnail || '';
      videoEl.src = v.streamUrl;
      videoEl.play().catch(() => {});
    }

    this.renderComments(comments);
    this.renderRelated(related);
  },

  setSpeed(rate, btnEl) {
    const videoEl = document.getElementById('html5VideoPlayer');
    if (videoEl) videoEl.playbackRate = rate;
    document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    window.VelvetToast.show(`سرعت پخش: ${rate}x`);
  },

  setQuality(label, btnEl) {
    const videoEl = document.getElementById('html5VideoPlayer');
    const currentTime = videoEl ? videoEl.currentTime : 0;
    document.querySelectorAll('.qual-btn').forEach((b) => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    if (videoEl && currentTime > 0) {
      videoEl.currentTime = currentTime;
    }
    window.VelvetToast.show(`کیفیت استریم تغییر یافت به: ${label}`, 'success');
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
          <div style="font-size:11px;color:#71717a;margin-top:2px;">${r.quality} • ${r.duration}</div>
        </div>
      </div>
    `
      )
      .join('');
  }
};
