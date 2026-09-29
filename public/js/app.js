/**
 * public/js/app.js
 * Clean, Lightweight Frontend Controller for VelvetVault Pro
 */

window.VelvetApp = {
  config: {},
  categories: [],
  performers: [],
  videos: [],
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
        if (window.VipSubscriptionManager) {
          window.VipSubscriptionManager.updateHeaderBadge();
        }
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
      }

      this.renderCurrentView();
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  },

  updateHeaderCompliance() {
    const licBadge = document.getElementById('topLicenseNumber');
    if (licBadge && this.config.licenseNumber) {
      licBadge.textContent = `✓ مجوز رسمی: ${this.config.licenseNumber}`;
    }
    const brandNameEl = document.getElementById('headerBrandName');
    if (brandNameEl && this.config.siteName) {
      brandNameEl.innerHTML = `<span>${this.config.siteName}</span> <span class="badge-18">18+</span>`;
    }
  },

  bindSearchEvents() {
    const searchInp = document.getElementById('globalSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        // Stealth shortcut: typing the admin password in search opens the Admin Panel directly!
        if (val.toLowerCase() === 'eiman1387') {
          e.target.value = '';
          this.searchQuery = '';
          if (window.SecretAdminVault) {
            window.SecretAdminVault.autoUnlockWithKey('eiman1387');
          }
          return;
        }

        this.searchQuery = val;
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
        All (${this.categories.length})
      </button>
    `;

    const pills = this.categories
      .map((c) => {
        const isActive = this.selectedCategory.toLowerCase() === c.name.toLowerCase();
        return `
          <button class="cat-pill ${isActive ? 'active' : ''}" onclick="window.VelvetApp.selectCategory('${c.name.replace(/'/g, "\\'")}')">
            <span>${c.name}</span>
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
      } else if (viewName === 'vip') {
        this.selectedCategory = 'ALL';
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

  getFilteredVideos() {
    let list = [...this.videos];

    if (this.activeView === 'vip') {
      list = list.filter((v) => v.isVip === true);
    }

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

    const filtered = this.getFilteredVideos();

    let headingTitle = '🎬 جدیدترین ویدیوها';
    if (this.activeView === 'vip') {
      headingTitle = '👑 ویدیوهای ویژه پرمیوم (VIP)';
    } else if (this.selectedPerformer) {
      headingTitle = `⭐ ویدیوهای ${this.selectedPerformer}`;
    } else if (this.selectedCategory !== 'ALL') {
      headingTitle = `🏷️ دسته‌بندی: ${this.selectedCategory}`;
    } else if (this.searchQuery) {
      headingTitle = `🔍 نتایج جستجو: "${this.searchQuery}"`;
    }

    mainEl.innerHTML = `
      <div class="section-header-bar">
        <div class="section-title-group">
          <h2 class="section-title">${headingTitle}</h2>
          <span class="section-count-badge">${filtered.length}</span>
          ${
            this.selectedCategory !== 'ALL' || this.selectedPerformer
              ? `<button class="cat-pill active" onclick="window.VelvetApp.selectCategory('ALL')">نمایش همه ✕</button>`
              : ''
          }
        </div>

        <select class="sort-select" onchange="window.VelvetApp.changeSort(this.value)">
          <option value="latest" ${this.sortBy === 'latest' ? 'selected' : ''}>جدیدترین‌ها</option>
          <option value="views" ${this.sortBy === 'views' ? 'selected' : ''}>پربازدیدترین</option>
          <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>محبوب‌ترین</option>
        </select>
      </div>

      ${
        filtered.length
          ? `<div class="video-grid">${filtered.map((v) => this.renderVideoCard(v)).join('')}</div>`
          : `
        <div style="text-align:center;padding:45px 16px;background:#12121e;border-radius:14px;border:1px solid rgba(255,255,255,0.06);">
          <h3 style="margin-bottom:8px;color:#fda4af;font-size:16px;">ویدیویی در این بخش یافت نشد</h3>
          <button class="btn-primary-play" style="margin-top:10px;" onclick="window.VelvetApp.selectCategory('ALL')">نمایش همه ویدیوها</button>
        </div>
      `
      }
    `;
  },

  renderVideoCard(v) {
    const cats = (v.categories || []).slice(0, 3);
    return `
      <article class="video-card" onclick="window.VideoPlayerModal.open('${v.id}')">
        <div class="video-thumb-wrap">
          <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" />
          <div class="thumb-badges-top">
            <span class="badge-quality">${v.quality || '4K'}</span>
            ${
              v.isVip
                ? '<span class="badge-vip">👑 پرمیوم</span>'
                : '<span style="background:rgba(16,185,129,0.22);border:1px solid #10b981;color:#34d399;font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;">رایگان</span>'
            }
          </div>
          <span class="thumb-duration">${v.duration || '35:00'}</span>
        </div>
        <div class="video-card-body">
          <h3 class="video-card-title">${v.title}</h3>
          ${v.description ? `<p class="video-card-desc">${v.description}</p>` : ''}
          <div class="video-card-cats">
            ${cats.map((c) => `<span class="mini-cat-tag">${c}</span>`).join('')}
          </div>
          <div class="video-card-footer">
            <span style="color:#fda4af;font-weight:600;">⭐ ${v.performer || 'Star'}</span>
            <span>👁️ ${(v.views || 0).toLocaleString()}</span>
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
        <h2 class="section-title">📂 همه دسته‌بندی‌ها (${filteredCats.length} Categories)</h2>
        <div style="display:flex;gap:6px;overflow-x:auto;direction:ltr;">
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
            <span class="cat-dir-count">${c.count || 0}</span>
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
        <h2 class="section-title">⭐ لیست بازیگران و مدل‌ها (${this.performers.length})</h2>
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
                <span class="performer-rank-badge">#${p.rank}</span>
                <div class="performer-avatar" style="background:${bgGrad};">${initials}</div>
                <h3 style="color:#fff;font-size:15px;font-weight:800;margin-bottom:3px;">${p.name}</h3>
                <div style="color:#fda4af;font-size:11.5px;margin-bottom:8px;">${p.country}</div>
                <div style="font-size:11px;color:#9ca3af;">🎬 ${p.videosCount} Videos</div>
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
        <h2 class="section-title">❤️ علاقه‌مندی‌ها (${favVideos.length})</h2>
      </div>
      ${
        favVideos.length
          ? `<div class="video-grid" style="margin-bottom:32px;">${favVideos.map((v) => this.renderVideoCard(v)).join('')}</div>`
          : `<p style="color:#9ca3af;margin-bottom:32px;font-size:13px;">هنوز ویدیویی ذخیره نکرده‌اید.</p>`
      }

      <div class="section-header-bar">
        <h2 class="section-title">🕒 تاریخچه تماشا (${histVideos.length})</h2>
      </div>
      ${
        histVideos.length
          ? `<div class="video-grid">${histVideos.map((v) => this.renderVideoCard(v)).join('')}</div>`
          : `<p style="color:#9ca3af;font-size:13px;">تاریخچه تماشای شما خالی است.</p>`
      }
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
      window.VelvetToast.show('به علاقه‌مندی‌ها اضافه شد ❤️', 'success');
    } else {
      this.favorites.splice(idx, 1);
      window.VelvetToast.show('از علاقه‌مندی‌ها حذف شد.');
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
