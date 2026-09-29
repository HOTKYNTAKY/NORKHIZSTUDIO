/**
 * public/js/app.js
 * Main Frontend Application Controller for VelvetVault Pro
 */

window.VelvetApp = {
  config: {},
  categories: [],
  performers: [],
  videos: [],
  featuredVideos: [],
  featuredIndex: 0,
  activeView: 'discover',
  selectedCategory: 'ALL',
  selectedPerformer: '',
  selectedGroup: 'ALL',
  searchQuery: '',
  sortBy: 'latest',
  favorites: JSON.parse(localStorage.getItem('vv_favorites') || '[]'),
  history: JSON.parse(localStorage.getItem('vv_history') || '[]'),

  async init() {
    await this.loadInitialData();
    window.AgeGateManager.init(this.config);
    window.SecretAdminVault.init();
    this.bindSearchEvents();
  },

  async loadInitialData() {
    try {
      const [cfgRes, catRes, perfRes, vidRes] = await Promise.all([
        fetch('/api/system/config'),
        fetch('/api/categories'),
        fetch('/api/performers'),
        fetch('/api/videos')
      ]);

      const cfgData = await cfgRes.json();
      const catData = await catRes.json();
      const perfData = await perfRes.json();
      const vidData = await vidRes.json();

      if (cfgData.success) {
        this.config = cfgData.config;
        this.updateHeaderCompliance();
      }
      if (catData.success) {
        this.categories = catData.categories || [];
        this.renderCategoriesRibbon();
      }
      if (perfData.success) {
        this.performers = perfData.performers || [];
      }
      if (vidData.success) {
        this.videos = vidData.videos || [];
        this.featuredVideos = vidData.featured?.length ? vidData.featured : this.videos.slice(0, 4);
      }

      this.renderCurrentView();
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  },

  updateHeaderCompliance() {
    const licBadge = document.getElementById('topLicenseNumber');
    if (licBadge && this.config.licenseNumber) {
      licBadge.textContent = `دارای مجوز رسمی کشوری: ${this.config.licenseNumber}`;
    }
    const brandNameEl = document.getElementById('headerBrandName');
    if (brandNameEl && this.config.siteName) {
      brandNameEl.innerHTML = `${this.config.siteName} <span class="badge-18">18+ PRO</span>`;
    }
  },

  bindSearchEvents() {
    const searchInp = document.getElementById('globalSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        if (this.activeView !== 'discover') {
          this.switchView('discover', false);
        } else {
          this.renderCurrentView();
        }
      });
    }
  },

  renderCategoriesRibbon() {
    const ribbon = document.getElementById('englishCategoriesRibbon');
    if (!ribbon) return;

    const allBtn = `
      <button class="cat-pill ${this.selectedCategory === 'ALL' ? 'active' : ''}" onclick="window.VelvetApp.selectCategory('ALL')">
        🔥 All Categories (${this.categories.length})
      </button>
    `;

    const pills = this.categories
      .map((c) => {
        const isActive = this.selectedCategory.toLowerCase() === c.name.toLowerCase();
        const badgeHtml = c.badge ? `<span class="cat-pill-badge">${c.badge}</span>` : '';
        return `
          <button class="cat-pill ${isActive ? 'active' : ''}" onclick="window.VelvetApp.selectCategory('${c.name.replace(/'/g, "\\'")}')">
            <span>${c.name}</span>
            ${badgeHtml}
          </button>
        `;
      })
      .join('');

    ribbon.innerHTML = allBtn + pills;
  },

  selectCategory(catName) {
    this.selectedCategory = catName;
    this.selectedPerformer = '';
    this.activeView = 'discover';
    this.updateNavTabsUI();
    this.renderCategoriesRibbon();
    this.renderCurrentView();
  },

  selectPerformer(perfName) {
    this.selectedPerformer = perfName;
    this.selectedCategory = 'ALL';
    this.activeView = 'discover';
    this.updateNavTabsUI();
    this.renderCategoriesRibbon();
    this.renderCurrentView();
  },

  switchView(viewName, resetFilters = true) {
    this.activeView = viewName;
    if (resetFilters) {
      this.selectedPerformer = '';
      if (viewName === '4k') {
        this.selectedCategory = '4K Ultra HD';
      } else if (viewName === 'vr') {
        this.selectedCategory = 'VR Porn 360°';
      } else if (viewName === 'vip') {
        this.selectedCategory = 'Exclusive VIP';
      } else if (viewName === 'discover') {
        this.selectedCategory = 'ALL';
      }
    }
    this.updateNavTabsUI();
    this.renderCategoriesRibbon();
    this.renderCurrentView();
  },

  updateNavTabsUI() {
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === this.activeView);
    });
  },

  changeSort(val) {
    this.sortBy = val;
    this.renderCurrentView();
  },

  nextHeroSlide() {
    if (!this.featuredVideos.length) return;
    this.featuredIndex = (this.featuredIndex + 1) % this.featuredVideos.length;
    this.renderCurrentView();
  },

  getFilteredVideos() {
    let list = [...this.videos];

    if (this.selectedCategory && this.selectedCategory !== 'ALL') {
      const target = this.selectedCategory.toLowerCase();
      list = list.filter((v) =>
        (v.categories || []).some((c) => c.toLowerCase() === target)
      );
    }

    if (this.selectedPerformer) {
      const p = this.selectedPerformer.toLowerCase();
      list = list.filter((v) => (v.performer || '').toLowerCase() === p);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((v) => {
        const hay = [
          v.title,
          v.description,
          v.performer,
          ...(v.categories || []),
          ...(v.tags || [])
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (this.sortBy === 'views') {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (this.sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (this.sortBy === 'likes') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list;
  },

  renderCurrentView() {
    const mainEl = document.getElementById('mainViewContainer');
    if (!mainEl) return;

    if (this.activeView === 'categories') {
      mainEl.innerHTML = this.renderAllCategoriesDirectory();
      return;
    }

    if (this.activeView === 'performers') {
      mainEl.innerHTML = this.renderPerformersDirectory();
      return;
    }

    if (this.activeView === 'library') {
      mainEl.innerHTML = this.renderLibraryView();
      return;
    }

    if (this.activeView === 'ubuntu') {
      mainEl.innerHTML = this.renderUbuntuGuideView();
      return;
    }

    // Default: Discover / Filtered Videos View
    const filtered = this.getFilteredVideos();
    const showHero =
      this.activeView === 'discover' &&
      this.selectedCategory === 'ALL' &&
      !this.selectedPerformer &&
      !this.searchQuery &&
      this.featuredVideos.length > 0;

    const heroHtml = showHero ? this.renderHeroSpotlight() : '';

    let headingTitle = '🔥 Latest Adult 4K & HD Releases';
    if (this.selectedPerformer) {
      headingTitle = `⭐ Performer: ${this.selectedPerformer}`;
    } else if (this.selectedCategory !== 'ALL') {
      headingTitle = `🏷️ Category: ${this.selectedCategory}`;
    } else if (this.searchQuery) {
      headingTitle = `🔍 Search Results for "${this.searchQuery}"`;
    }

    mainEl.innerHTML = `
      ${heroHtml}

      <div class="section-header-bar">
        <div class="section-title-group">
          <h2 class="section-title">${headingTitle}</h2>
          <span class="section-count-badge">${filtered.length} Videos</span>
          ${
            this.selectedCategory !== 'ALL' || this.selectedPerformer
              ? `<button class="top-util-btn" onclick="window.VelvetApp.selectCategory('ALL')">نمایش همه (Reset Filter ✕)</button>`
              : ''
          }
        </div>

        <div class="filter-controls">
          <select class="sort-select" onchange="window.VelvetApp.changeSort(this.value)">
            <option value="latest" ${this.sortBy === 'latest' ? 'selected' : ''}>جدیدترین (Latest Releases)</option>
            <option value="views" ${this.sortBy === 'views' ? 'selected' : ''}>پربازدیدترین (Most Viewed)</option>
            <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>بالاترین امتیاز (Top Rated)</option>
            <option value="likes" ${this.sortBy === 'likes' ? 'selected' : ''}>محبوب‌ترین (Most Liked)</option>
          </select>
          <button class="top-util-btn" onclick="window.VelvetApp.switchView('categories')">
            📂 مشاهده همه ${this.categories.length} دسته‌بندی خارجی
          </button>
        </div>
      </div>

      ${
        filtered.length
          ? `<div class="video-grid">${filtered.map((v) => this.renderVideoCard(v)).join('')}</div>`
          : `
        <div style="text-align:center;padding:60px 20px;background:#11111c;border-radius:16px;border:1px solid rgba(255,255,255,0.07);">
          <h3 style="margin-bottom:10px;color:#fda4af;">ویدیویی در این دسته‌بندی یافت نشد</h3>
          <p style="color:#a1a1aa;margin-bottom:20px;font-family:var(--font-fa);">
            می‌توانید از طریق پنل مخفی ادمین (Ctrl + Shift + A) ویدیوی جدید به دسته‌بندی <strong>${this.selectedCategory}</strong> اضافه کنید.
          </p>
          <button class="btn-primary-play" onclick="window.VelvetApp.selectCategory('ALL')">نمایش همه ویدیوها</button>
        </div>
      `
      }
    `;
  },

  renderHeroSpotlight() {
    const feat = this.featuredVideos[this.featuredIndex % this.featuredVideos.length] || this.videos[0];
    if (!feat) return '';

    return `
      <section class="hero-spotlight">
        <div class="hero-content">
          <div class="hero-badges">
            <span class="hero-tag-vip">👑 VIP EXCLUSIVE</span>
            <span class="hero-tag-4k">${feat.quality} • ${feat.fps || '60FPS'}</span>
            <span class="license-pill">✅ دارای مجوز رسمی ۱۸+</span>
          </div>
          <h1 class="hero-title">${feat.title}</h1>
          <p class="hero-desc">${feat.description}</p>
          <div class="hero-meta">
            <span>⭐ Performer: <strong style="color:#fda4af;">${feat.performer}</strong></span>
            <span>⏱️ Duration: <strong>${feat.duration}</strong></span>
            <span>👁️ <strong>${(feat.views || 0).toLocaleString()}</strong> Views</span>
            <span class="rating-positive">🔥 ${feat.rating}% Liked</span>
          </div>
          <div class="hero-actions">
            <button class="btn-primary-play" onclick="window.VideoPlayerModal.open('${feat.id}')">
              <span>▶</span>
              <span>پخش آنلاین 4K (Watch Full Stream)</span>
            </button>
            <button class="btn-secondary-glass" onclick="window.VelvetApp.nextHeroSlide()">
              صحنه ویژه بعدی ⏭
            </button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-poster-card" onclick="window.VideoPlayerModal.open('${feat.id}')">
            <img src="${feat.thumbnail}" alt="${feat.title}" />
            <div class="hero-play-overlay">
              <div class="pulse-play-circle">▶</div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  renderVideoCard(v) {
    const cats = (v.categories || []).slice(0, 3);
    return `
      <article class="video-card" onclick="window.VideoPlayerModal.open('${v.id}')">
        <div class="video-thumb-wrap">
          <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" />
          <div class="thumb-badges-top">
            <span class="badge-quality">${v.quality || '4K UHD'}</span>
            ${v.isVip ? '<span class="badge-vip">VIP</span>' : ''}
          </div>
          <span class="thumb-duration">${v.duration || '35:00'}</span>
          <div class="thumb-hover-play">
            <div class="thumb-play-icon">▶</div>
          </div>
        </div>
        <div class="video-card-body">
          <div class="video-card-performer">
            <span>⭐ ${v.performer || 'Verified Star'}</span>
          </div>
          <h3 class="video-card-title">${v.title}</h3>
          ${
            v.description
              ? `<p style="font-size:12px;color:#a1a1aa;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${v.description}</p>`
              : ''
          }
          <div class="video-card-cats">
            ${cats.map((c) => `<span class="mini-cat-tag">${c}</span>`).join('')}
          </div>
          <div class="video-card-footer">
            <span>👁️ ${(v.views || 0).toLocaleString()}</span>
            <span class="rating-positive">👍 ${v.rating || 98}%</span>
            <span>❤️ ${(v.likes || 0).toLocaleString()}</span>
          </div>
        </div>
      </article>
    `;
  },

  setCategoryGroup(grp) {
    this.selectedGroup = grp;
    this.renderCurrentView();
  },

  renderAllCategoriesDirectory() {
    const groups = ['ALL', 'Popular', 'International', 'Appearance', 'Fantasy', 'Production'];
    const filteredCats =
      this.selectedGroup === 'ALL'
        ? this.categories
        : this.categories.filter((c) => c.group === this.selectedGroup);

    return `
      <div class="section-header-bar">
        <div>
          <h2 class="section-title">📂 All English Adult Categories (${filteredCats.length})</h2>
          <p style="color:#a1a1aa;font-size:13.5px;margin-top:4px;font-family:var(--font-fa);">
            تمامی دسته‌بندی‌های بین‌المللی به زبان انگلیسی — روی هر دسته‌بندی کلیک کنید تا ویدیوهای آن نمایش داده شود.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${groups
            .map(
              (g) => `
            <button class="cat-pill ${this.selectedGroup === g ? 'active' : ''}" onclick="window.VelvetApp.setCategoryGroup('${g}')">
              ${g}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="categories-directory-grid">
        ${filteredCats
          .map(
            (c) => `
          <div class="category-dir-card" onclick="window.VelvetApp.selectCategory('${c.name.replace(/'/g, "\\'")}')">
            <div class="cat-dir-info">
              <h4>${c.name}</h4>
              <span>${c.group}</span>
            </div>
            <div class="cat-dir-right">
              ${c.badge ? `<span class="badge-vip">${c.badge}</span>` : ''}
              <span class="cat-dir-count">${c.count || 0} Videos</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },

  renderPerformersDirectory() {
    return `
      <div class="section-header-bar">
        <div>
          <h2 class="section-title">⭐ Verified Pornstars & Studio Models (${this.performers.length})</h2>
          <p style="color:#a1a1aa;font-size:13.5px;margin-top:4px;font-family:var(--font-fa);">
            فهرست ستارگان و مدل‌های رسمی استودیو — برای مشاهده فیلم‌های هر بازیگر روی کارت آن کلیک کنید.
          </p>
        </div>
      </div>

      <div class="performers-grid">
        ${this.performers
          .map((p) => {
            const initials = p.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2);
            const bgGrad = p.palette
              ? `linear-gradient(135deg, ${p.palette[0]}, ${p.palette[1]})`
              : 'linear-gradient(135deg, #e11d48, #4c0519)';
            return `
              <div class="performer-card" onclick="window.VelvetApp.selectPerformer('${p.name.replace(/'/g, "\\'")}')">
                <span class="performer-rank-badge">RANK #${p.rank}</span>
                <div class="performer-avatar" style="background:${bgGrad};">${initials}</div>
                <h3 style="color:#fff;font-size:18px;font-weight:800;margin-bottom:4px;">${p.name}</h3>
                <div style="color:#fda4af;font-size:12.5px;margin-bottom:12px;">🌍 ${p.country} • ${p.badge}</div>
                <div style="display:flex;justify-content:center;gap:14px;font-size:12px;color:#d4d4d8;border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;">
                  <span>🎬 ${p.videosCount} Videos</span>
                  <span>👁️ ${p.views}</span>
                  <span class="rating-positive">🔥 ${p.rating}%</span>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  },

  renderLibraryView() {
    const favVideos = this.videos.filter((v) => this.favorites.includes(v.id));
    const histVideos = this.videos.filter((v) => this.history.includes(v.id));

    return `
      <div class="section-header-bar">
        <h2 class="section-title">❤️ ویدیوهای مورد علاقه من (My Favorites — ${favVideos.length})</h2>
      </div>
      ${
        favVideos.length
          ? `<div class="video-grid" style="margin-bottom:40px;">${favVideos.map((v) => this.renderVideoCard(v)).join('')}</div>`
          : `<p style="color:#a1a1aa;margin-bottom:40px;font-family:var(--font-fa);">هنوز ویدیویی به لیست علاقه‌مندی‌ها اضافه نکرده‌اید.</p>`
      }

      <div class="section-header-bar">
        <h2 class="section-title">🕒 تاریخچه تماشا (Watch History — ${histVideos.length})</h2>
      </div>
      ${
        histVideos.length
          ? `<div class="video-grid">${histVideos.map((v) => this.renderVideoCard(v)).join('')}</div>`
          : `<p style="color:#a1a1aa;font-family:var(--font-fa);">تاریخچه تماشای شما خالی است.</p>`
      }
    `;
  },

  renderUbuntuGuideView() {
    return `
      <div class="ubuntu-guide-box fa-text">
        <h2 style="color:#fcd34d;font-size:24px;margin-bottom:10px;">
          🐧 راهنمای نصب خودکار روی سرور اوبونتو (Ubuntu 20.04 / 22.04 / 24.04 LTS)
        </h2>
        <p style="color:#d4d4d8;font-size:14px;margin-bottom:18px;">
          تمام فایل‌های نصبی سرور اوبونتو، کانفیگ Nginx برای استریم 4K، تبدیل‌کننده FFmpeg HLS و سرویس Systemd در پوشه پروژه آماده شده است.
        </p>

        <h3 style="color:#fda4af;font-size:16px;margin-top:16px;">۱. دستور نصب تک‌خطی روی سرور Ubuntu (با دسترسی root):</h3>
        <div class="code-terminal" style="direction:ltr;text-align:left;">
chmod +x install.sh<br/>
sudo bash install.sh --domain stream.yourdomain.com --port 3000 --admin-key VAULT-ADMIN-2026
        </div>

        <h3 style="color:#fda4af;font-size:16px;margin-top:16px;">۲. نحوه ورود به پنل مخفی ادمین (Stealth Admin Panel):</h3>
        <ul style="color:#d4d4d8;font-size:14px;line-height:2;padding-right:20px;">
          <li><strong>روش اول (کیبورد):</strong> در هر جای سایت کلیدهای ترکیبی <code style="color:#fcd34d;">Ctrl + Shift + A</code> (یا <code>Alt + A</code>) را فشار دهید.</li>
          <li><strong>روش دوم (آدرس مخفی):</strong> آدرس <code style="color:#fcd34d;">/vault-x9-control</code> یا <code>/?admin=vault</code> را باز کنید.</li>
          <li><strong>روش سوم (مخفی در فوتر):</strong> ۵ بار متوالی روی نشان مجوز رسمی در پایین صفحه کلیک کنید.</li>
          <li><strong>رمز پیش‌فرض:</strong> کلید امنیتی: <code style="color:#34d399;">VAULT-ADMIN-2026</code> | پین کد: <code style="color:#34d399;">8899</code></li>
        </ul>

        <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn-admin-gold" onclick="window.SecretAdminVault.openVault()">
            🔐 باز کردن پنل مخفی ادمین همین حالا
          </button>
          <button class="btn-secondary-glass" onclick="window.VelvetApp.switchView('discover')">
            بازگشت به صفحه اصلی ویدیوها
          </button>
        </div>
      </div>
    `;
  },

  isFavorite(videoId) {
    return this.favorites.includes(videoId);
  },

  toggleFavorite(videoId) {
    const idx = this.favorites.indexOf(videoId);
    let added = false;
    if (idx === -1) {
      this.favorites.unshift(videoId);
      added = true;
      window.VelvetToast.show('به لیست علاقه‌مندی‌ها اضافه شد ❤️', 'success');
    } else {
      this.favorites.splice(idx, 1);
      window.VelvetToast.show('از لیست علاقه‌مندی‌ها حذف شد.');
    }
    localStorage.setItem('vv_favorites', JSON.stringify(this.favorites));
    return added;
  },

  addToHistory(videoId) {
    this.history = [videoId, ...this.history.filter((id) => id !== videoId)].slice(0, 30);
    localStorage.setItem('vv_history', JSON.stringify(this.history));
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.VelvetApp.init();
});
