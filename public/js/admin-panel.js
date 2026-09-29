/**
 * public/js/admin-panel.js
 * Ultra-Clean Secret Admin Panel (3x Tap on Brand Name | Password: eiman1387)
 * Features organized step-by-step Video Upload, Description, Interactive Category Picker & Edit Mode
 */

window.SecretAdminVault = {
  token: localStorage.getItem('vv_admin_token') || '',
  activeTab: 'add-video',
  dashboardData: null,
  brandTapCount: 0,
  brandTapTimer: null,

  // Form State for Add / Edit Video
  editingVideoId: null,
  selectedCategories: ['4K Ultra HD', 'Exclusive VIP'],
  categorySearchFilter: '',
  uploadedVideoBase64: '',
  uploadedVideoName: '',
  uploadedThumbBase64: '',
  uploadedThumbName: '',

  init() {
    // 1. 3x Tap on Site Name / Brand Logo to open Secret Admin Panel
    const brandTrigger = document.getElementById('brandLogoTrigger') || document.getElementById('headerBrandName');
    if (brandTrigger) {
      brandTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.brandTapCount += 1;

        if (this.brandTapTimer) {
          clearTimeout(this.brandTapTimer);
        }

        if (this.brandTapCount >= 3) {
          this.brandTapCount = 0;
          this.openVault();
          return;
        }

        this.brandTapTimer = setTimeout(() => {
          if (this.brandTapCount === 1 && window.VelvetApp) {
            window.VelvetApp.switchView('discover');
          }
          this.brandTapCount = 0;
        }, 650);
      });
    }

    // 2. Keyboard shortcut fallback: Ctrl + Shift + A
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.openVault();
      }
    });

    // 3. Direct stealth URL fallback (/vault-x9-control)
    const p = window.location.pathname;
    const q = new URLSearchParams(window.location.search);
    if (p.includes('vault') || q.get('admin') === 'vault') {
      setTimeout(() => this.openVault(), 400);
    }
  },

  async openVault() {
    const backdrop = document.getElementById('adminVaultBackdrop');
    if (!backdrop) return;
    backdrop.classList.add('open');

    if (this.token) {
      const ok = await this.loadDashboard();
      if (ok) return;
    }
    this.renderLoginView();
  },

  closeVault() {
    const backdrop = document.getElementById('adminVaultBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  },

  logout() {
    this.token = '';
    localStorage.removeItem('vv_admin_token');
    this.renderLoginView();
    window.VelvetToast.show('پنل مدیریت قفل شد.');
  },

  async submitLogin(e) {
    e.preventDefault();
    const secretKey = document.getElementById('adminSecretKeyInput').value.trim();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey })
    });
    const data = await res.json();
    if (!data.success) {
      window.VelvetToast.show('رمز عبور وارد شده اشتباه است!', 'warning');
      return;
    }

    this.token = data.token;
    localStorage.setItem('vv_admin_token', data.token);
    window.VelvetToast.show('خوش آمدید! پنل مدیریت باز شد.', 'success');
    await this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'X-Admin-Token': this.token }
      });
      if (res.status === 401) {
        this.token = '';
        localStorage.removeItem('vv_admin_token');
        return false;
      }
      const data = await res.json();
      if (!data.success) return false;

      this.dashboardData = data;
      this.renderDashboardView();
      return true;
    } catch (_) {
      return false;
    }
  },

  renderLoginView() {
    const root = document.getElementById('adminVaultContent');
    if (!root) return;
    root.innerHTML = `
      <div class="admin-login-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <h2 style="color:#fff;font-size:19px;">🔐 ورود به پنل مخفی مدیریت</h2>
          <button onclick="window.SecretAdminVault.closeVault()" class="player-close-btn">بستن ✕</button>
        </div>
        <p style="color:#a1a1aa;font-size:13px;margin-bottom:20px;">
          رمز عبور مدیریت را جهت افزودن ویدیو، نوشتن توضیحات و مدیریت دسته‌بندی‌ها وارد کنید.
        </p>
        <form onsubmit="window.SecretAdminVault.submitLogin(event)">
          <div class="admin-form-group">
            <label class="admin-label">رمز عبور ادمین</label>
            <input id="adminSecretKeyInput" type="password" class="admin-input" style="direction:ltr;text-align:center;font-size:17px;letter-spacing:2px;" placeholder="•••••••••" required autofocus />
          </div>
          <button type="submit" class="btn-admin-gold" style="width:100%;margin-top:12px;">
            ورود به پنل مدیریت
          </button>
        </form>
      </div>
    `;
  },

  switchTab(tabName, resetEdit = true) {
    if (resetEdit && tabName === 'add-video') {
      this.editingVideoId = null;
      this.uploadedVideoBase64 = '';
      this.uploadedThumbBase64 = '';
      this.selectedCategories = ['4K Ultra HD', 'Exclusive VIP'];
    }
    this.activeTab = tabName;
    this.renderDashboardView();
  },

  startEditVideo(videoId) {
    const vid = (this.dashboardData?.videos || []).find((v) => v.id === videoId);
    if (!vid) return;
    this.editingVideoId = vid.id;
    this.selectedCategories = [...(vid.categories || ['4K Ultra HD'])];
    this.uploadedVideoBase64 = '';
    this.uploadedThumbBase64 = '';
    this.activeTab = 'add-video';
    this.renderDashboardView();

    // Populate fields with existing video data
    setTimeout(() => {
      const titleEl = document.getElementById('newVidTitle');
      const descEl = document.getElementById('newVidDesc');
      const perfEl = document.getElementById('newVidPerformer');
      const urlEl = document.getElementById('newVidStreamUrl');
      const qualEl = document.getElementById('newVidQuality');
      const durEl = document.getElementById('newVidDuration');
      const vipEl = document.getElementById('newVidVip');
      const featEl = document.getElementById('newVidFeatured');

      if (titleEl) titleEl.value = vid.title || '';
      if (descEl) descEl.value = vid.description || '';
      if (perfEl) perfEl.value = vid.performer || '';
      if (urlEl) urlEl.value = vid.streamUrl || '';
      if (qualEl) qualEl.value = vid.quality || '4K UHD';
      if (durEl) durEl.value = vid.duration || '35:00';
      if (vipEl) vipEl.checked = Boolean(vid.isVip);
      if (featEl) featEl.checked = Boolean(vid.isFeatured);
    }, 50);
  },

  renderDashboardView() {
    const root = document.getElementById('adminVaultContent');
    if (!root || !this.dashboardData) return;

    const { stats, settings, videos, categories, performers } = this.dashboardData;

    root.innerHTML = `
      <div class="admin-dashboard-container">
        <div class="admin-header">
          <div>
            <h2 style="color:#fff;font-size:19px;display:flex;align-items:center;gap:8px;">
              <span>🎬 پنل مدیریت محتوا و ویدیوها (${settings.siteName})</span>
            </h2>
            <p style="font-size:12px;color:#a1a1aa;margin-top:3px;">
              مجوز رسمی: <strong style="color:#34d399;">${settings.licenseNumber}</strong>
            </p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.SecretAdminVault.logout()" class="btn-admin-danger">قفل پنل</button>
            <button onclick="window.SecretAdminVault.closeVault()" class="player-close-btn">بستن ✕</button>
          </div>
        </div>

        <div class="admin-nav-tabs">
          <button class="admin-tab-btn ${this.activeTab === 'add-video' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('add-video')">
            ${this.editingVideoId ? '✏️ ویرایش ویدیو' : '➕ افزودن ویدیو جدید'}
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'manage-videos' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('manage-videos')">
            🎞️ لیست ویدیوها (${videos.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'categories' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('categories')">
            🏷️ دسته‌بندی‌ها (${categories.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'performers' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('performers')">
            ⭐ بازیگران (${performers.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'server' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('server')">
            ⚙️ تنظیمات سایت
          </button>
        </div>

        <div class="admin-body">
          <div class="admin-stats-grid">
            <div class="admin-stat-card">
              <div class="admin-stat-label">تعداد ویدیوها</div>
              <div class="admin-stat-value">${stats.catalog.totalVideos}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-label">دسته‌بندی‌ها</div>
              <div class="admin-stat-value" style="color:#fda4af;">${stats.catalog.totalCategories}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-label">کل بازدیدها</div>
              <div class="admin-stat-value" style="color:#34d399;">${stats.catalog.totalViews.toLocaleString()}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-label">رم سرور Ubuntu</div>
              <div class="admin-stat-value" style="color:#fcd34d;">${stats.server.memory.percent}%</div>
            </div>
          </div>

          <div id="adminTabDynamicBody">
            ${this.renderTabBody(this.activeTab)}
          </div>
        </div>
      </div>
    `;

    this.bindFileUploadListeners();
  },

  renderTabBody(tab) {
    const { stats, ffmpeg, settings, videos, categories, performers } = this.dashboardData;

    // =========================================================================
    // TAB 1: ULTRA-CLEAN ADD / EDIT VIDEO FORM
    // =========================================================================
    if (tab === 'add-video') {
      return `
        <form onsubmit="window.SecretAdminVault.handleSaveVideo(event)">

          <!-- گام ۱: عنوان، توضیحات و بازیگر -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۱</div>
              <div class="admin-step-title">مشخصات اصلی و توضیحات ویدیو</div>
              ${
                this.editingVideoId
                  ? `<button type="button" onclick="window.SecretAdminVault.switchTab('add-video', true)" class="btn-admin-danger" style="margin-right:auto;">لغو ویرایش</button>`
                  : ''
              }
            </div>

            <div class="admin-form-grid">
              <div class="admin-form-group">
                <label class="admin-label">
                  <span>عنوان ویدیو (Title) *</span>
                </label>
                <input id="newVidTitle" class="admin-input" placeholder="مثال: Midnight Velvet Suite — 4K Exclusive" required />
              </div>

              <div class="admin-form-group">
                <label class="admin-label">
                  <span>نام بازیگر یا مدل (Performer) *</span>
                </label>
                <input id="newVidPerformer" class="admin-input" list="performerSuggestions" placeholder="مثال: Eva Laurent" required />
                <datalist id="performerSuggestions">
                  ${performers.map((p) => `<option value="${p.name}"></option>`).join('')}
                </datalist>
              </div>

              <div class="admin-form-group full">
                <label class="admin-label">
                  <span>توضیحات کامل ویدیو (Description) *</span>
                  <span style="font-size:11.5px;color:#a1a1aa;">زیر پلیر ویدیو و در بنر اصلی نمایش داده می‌شود</span>
                </label>
                <textarea id="newVidDesc" rows="3" class="admin-textarea" placeholder="توضیحات کامل درباره داستان ویدیو، کیفیت فیلمبرداری، ستارگان حاضر در صحنه و جزئیات را اینجا بنویسید..." required></textarea>
              </div>
            </div>
          </div>

          <!-- گام ۲: انتخاب دسته‌بندی مورد نظر (Interactive Category Selector) -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۲</div>
              <div class="admin-step-title">انتخاب دسته‌بندی‌های ویدیو (Categories)</div>
            </div>

            <div style="margin-bottom:8px;font-size:12.5px;color:#d4d4d8;">
              دسته‌بندی‌های انتخاب‌شده برای این ویدیو (برای حذف روی هر کدام بزنید):
            </div>
            <div id="selectedCatsBar" class="selected-cats-bar">
              ${this.renderSelectedCategoryBadges()}
            </div>

            <!-- جستجوی سریع یا افزودن دسته‌بندی جدید در لحظه -->
            <div class="cat-picker-toolbar">
              <input
                id="catFilterSearchInput"
                type="text"
                class="admin-input"
                style="flex:1;min-width:180px;direction:ltr;"
                placeholder="🔍 Search category (e.g. MILF, Latina, Anal, 4K, POV)..."
                oninput="window.SecretAdminVault.filterCategoryChips(this.value)"
              />
              <div style="display:flex;gap:6px;flex:1;min-width:220px;">
                <input
                  id="quickNewCatInput"
                  type="text"
                  class="admin-input"
                  style="direction:ltr;"
                  placeholder="+ New English Category..."
                />
                <button type="button" onclick="window.SecretAdminVault.quickAddCategoryInline()" class="btn-admin-edit" style="white-space:nowrap;">
                  ➕ افزودن سریع
                </button>
              </div>
            </div>

            <div style="font-size:12px;color:#a1a1aa;margin-bottom:8px;">
              روی هر دسته‌بندی در لیست زیر ضربه بزنید تا به ویدیو اضافه یا کم شود:
            </div>
            <div id="catChipsContainer" class="cat-chips-container">
              ${this.renderCategoryChipsList()}
            </div>
          </div>

          <!-- گام ۳: آپلود فایل ویدیو و تصویر کاور -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۳</div>
              <div class="admin-step-title">فایل ویدیو و تصویر کاور (Thumbnail)</div>
            </div>

            <div class="admin-form-grid">
              <div class="upload-box-card">
                <div style="font-size:24px;margin-bottom:6px;">📹</div>
                <div style="font-weight:800;color:#fff;margin-bottom:6px;font-size:14px;">
                  ۱. انتخاب فایل ویدیو از گالری گوشی یا کامپیوتر
                </div>
                <input id="newVidFileInput" type="file" accept="video/mp4,video/webm,video/quicktime" class="admin-input" style="margin-bottom:8px;" />
                <div id="newVidFileStatus" style="color:#34d399;font-size:12px;margin-bottom:10px;"></div>

                <div style="font-size:12px;color:#a1a1aa;margin:8px 0;">— یا وارد کردن لینک مستقیم ویدیو —</div>
                <input id="newVidStreamUrl" class="admin-input" style="direction:ltr;" placeholder="https://example.com/video.mp4" />
              </div>

              <div class="upload-box-card">
                <div style="font-size:24px;margin-bottom:6px;">🖼️</div>
                <div style="font-weight:800;color:#fff;margin-bottom:6px;font-size:14px;">
                  ۲. انتخاب تصویر کاور ویدیو (Thumbnail)
                </div>
                <input id="newVidThumbInput" type="file" accept="image/*" class="admin-input" style="margin-bottom:8px;" />
                <div id="newVidThumbStatus" style="color:#a1a1aa;font-size:12px;">
                  در صورت انتخاب نکردن عکس، پوستر نئونی 4K با عنوان ویدیو به صورت خودکار ساخته می‌شود.
                </div>
                <img id="newVidThumbPreview" style="display:none;margin:10px auto 0;max-height:110px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);" />
              </div>
            </div>
          </div>

          <!-- گام ۴: کیفیت، زمان و نحوه نمایش -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۴</div>
              <div class="admin-step-title">کیفیت پخش، مدت زمان و جایگاه نمایش</div>
            </div>

            <div class="admin-form-grid">
              <div class="admin-form-group">
                <label class="admin-label">کیفیت ویدیو (Quality Badge)</label>
                <select id="newVidQuality" class="admin-select">
                  <option value="4K UHD">💎 4K Ultra HD (2160p)</option>
                  <option value="1080p HD">🔥 1080p Full HD (60FPS)</option>
                  <option value="VR 360°">🥽 VR 360° Stereoscopic</option>
                  <option value="720p HD">📹 720p HD</option>
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-label">مدت زمان ویدیو (Duration)</label>
                <input id="newVidDuration" class="admin-input" style="direction:ltr;text-align:center;" placeholder="38:15" value="38:15" />
              </div>

              <div class="admin-form-group">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:#fcd34d;font-weight:700;padding:10px;background:#0c0c16;border-radius:10px;border:1px solid rgba(245,158,11,0.25);">
                  <input id="newVidVip" type="checkbox" checked style="width:18px;height:18px;" />
                  <span>👑 درج نشان ویژه VIP Exclusive روی ویدیو</span>
                </label>
              </div>

              <div class="admin-form-group">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:#fda4af;font-weight:700;padding:10px;background:#0c0c16;border-radius:10px;border:1px solid rgba(225,29,72,0.25);">
                  <input id="newVidFeatured" type="checkbox" checked style="width:18px;height:18px;" />
                  <span>🌟 نمایش در بنر بزرگ بالای صفحه اول (Spotlight)</span>
                </label>
              </div>
            </div>

            <button type="submit" class="btn-admin-gold" style="width:100%;margin-top:12px;font-size:16px;">
              ${this.editingVideoId ? '💾 ذخیره تغییرات ویدیو' : '🚀 ثبت و انتشار فوری ویدیو در سایت'}
            </button>
          </div>
        </form>
      `;
    }

    // =========================================================================
    // TAB 2: CLEAN VIDEO LIST WITH EDIT & DELETE
    // =========================================================================
    if (tab === 'manage-videos') {
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <h3 style="color:#fff;">🎞️ لیست ویدیوهای منتشر شده (${videos.length})</h3>
          <button class="btn-admin-gold" style="padding:9px 18px;font-size:13px;" onclick="window.SecretAdminVault.switchTab('add-video', true)">
            ➕ افزودن ویدیو جدید
          </button>
        </div>

        <div class="admin-video-list">
          ${videos
            .map(
              (v) => `
            <div class="admin-video-row">
              <div class="admin-video-row-info">
                <img src="${v.thumbnail}" alt="${v.title}" class="admin-video-thumb" />
                <div style="min-width:0;flex:1;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                    <span class="badge-quality">${v.quality}</span>
                    ${v.isVip ? '<span class="badge-vip">VIP</span>' : ''}
                    <strong style="color:#fff;font-size:14.5px;direction:ltr;">${v.title}</strong>
                  </div>
                  <div style="font-size:12.5px;color:#a1a1aa;margin-bottom:6px;display: -webkit-box;-webkit-line-clamp: 1;-webkit-box-orient: vertical;overflow: hidden;">
                    ${v.description || 'بدون توضیحات'}
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:11.5px;">
                    <span style="color:#fda4af;">⭐ ${v.performer}</span>
                    <span>•</span>
                    <span style="color:#34d399;">🏷️ ${(v.categories || []).join(' , ')}</span>
                    <span>•</span>
                    <span style="color:#a1a1aa;">👁️ ${(v.views || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div style="display:flex;gap:8px;">
                <button class="btn-admin-edit" onclick="window.SecretAdminVault.startEditVideo('${v.id}')">
                  ✏️ ویرایش
                </button>
                <button class="btn-admin-danger" onclick="window.SecretAdminVault.handleDeleteVideo('${v.id}')">
                  🗑️ حذف
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    // =========================================================================
    // TAB 3: ENGLISH CATEGORIES MANAGER
    // =========================================================================
    if (tab === 'categories') {
      return `
        <div class="admin-step-card">
          <h3 style="margin-bottom:14px;color:#fff;">➕ افزودن دسته‌بندی انگلیسی جدید</h3>
          <form onsubmit="window.SecretAdminVault.handleCreateCategory(event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
            <div style="flex:1;min-width:200px;">
              <label class="admin-label">نام دسته‌بندی (به انگلیسی)</label>
              <input id="newCatName" class="admin-input" style="direction:ltr;" placeholder="e.g. Wet Look & Shower" required />
            </div>
            <div style="width:170px;">
              <label class="admin-label">گروه</label>
              <select id="newCatGroup" class="admin-select">
                <option value="Popular">Popular</option>
                <option value="International">International</option>
                <option value="Appearance">Appearance</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Production">Production</option>
              </select>
            </div>
            <div style="width:120px;">
              <label class="admin-label">نشان</label>
              <input id="newCatBadge" class="admin-input" style="direction:ltr;" value="HOT" />
            </div>
            <button type="submit" class="btn-admin-gold" style="padding:12px 20px;">افزودن</button>
          </form>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>نام دسته‌بندی (English)</th>
                <th>گروه</th>
                <th>نشان</th>
                <th>تعداد ویدیو</th>
                <th>حذف</th>
              </tr>
            </thead>
            <tbody>
              ${categories
                .map(
                  (c) => `
                <tr>
                  <td style="font-weight:800;color:#fff;direction:ltr;">${c.name}</td>
                  <td>${c.group}</td>
                  <td><span class="cat-pill-badge">${c.badge || '-'}</span></td>
                  <td>${c.count || 0}</td>
                  <td>
                    <button class="btn-admin-danger" onclick="window.SecretAdminVault.handleDeleteCategory('${c.id}')">حذف</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // =========================================================================
    // TAB 4: PERFORMERS / PORNSTARS MANAGER
    // =========================================================================
    if (tab === 'performers') {
      return `
        <div class="admin-step-card">
          <h3 style="margin-bottom:14px;color:#fff;">➕ افزودن بازیگر / مدل جدید</h3>
          <form onsubmit="window.SecretAdminVault.handleCreatePerformer(event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
            <div style="flex:1;min-width:200px;">
              <label class="admin-label">نام کامل بازیگر (English)</label>
              <input id="newPerfName" class="admin-input" style="direction:ltr;" placeholder="e.g. Aria Valencia" required />
            </div>
            <div style="width:160px;">
              <label class="admin-label">کشور</label>
              <input id="newPerfCountry" class="admin-input" style="direction:ltr;" placeholder="Spain" required />
            </div>
            <div style="width:150px;">
              <label class="admin-label">نشان</label>
              <input id="newPerfBadge" class="admin-input" style="direction:ltr;" value="VIP STAR" />
            </div>
            <button type="submit" class="btn-admin-gold" style="padding:12px 20px;">ثبت بازیگر</button>
          </form>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>رتبه</th>
                <th>نام بازیگر</th>
                <th>کشور</th>
                <th>نشان</th>
                <th>حذف</th>
              </tr>
            </thead>
            <tbody>
              ${performers
                .map(
                  (p) => `
                <tr>
                  <td>#${p.rank}</td>
                  <td style="font-weight:800;color:#fff;direction:ltr;">${p.name}</td>
                  <td>${p.country}</td>
                  <td><span class="badge-vip">${p.badge}</span></td>
                  <td>
                    <button class="btn-admin-danger" onclick="window.SecretAdminVault.handleDeletePerformer('${p.id}')">حذف</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // =========================================================================
    // TAB 5: SETTINGS & SERVER TELEMETRY
    // =========================================================================
    return `
      <div class="admin-form-grid">
        <div class="admin-step-card">
          <h3 style="color:#fff;margin-bottom:14px;">📜 تنظیمات مجوز رسمی کشوری و رمز پنل</h3>
          <form onsubmit="window.SecretAdminVault.handleUpdateSettings(event)">
            <div class="admin-form-group">
              <label class="admin-label">نام برند سایت</label>
              <input id="setSiteName" class="admin-input" value="${settings.siteName}" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">شماره مجوز رسمی کشوری</label>
              <input id="setLicenseNum" class="admin-input" style="direction:ltr;" value="${settings.licenseNumber}" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">نهاد صادرکننده مجوز</label>
              <input id="setLicenseAuth" class="admin-input" value="${settings.licenseAuthority}" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">تغییر رمز پنل مخفی (فعلی: eiman1387)</label>
              <input id="setAdminKey" class="admin-input" style="direction:ltr;" placeholder="فقط در صورت تمایل به تغییر وارد کنید..." />
            </div>
            <div class="admin-form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input id="setAgeGate" type="checkbox" ${settings.ageGateEnabled ? 'checked' : ''} />
                <span>فعال بودن پنجره تایید سنی +18 در بدو ورود</span>
              </label>
            </div>
            <button type="submit" class="btn-admin-gold" style="width:100%;">ذخیره تنظیمات سایت</button>
          </form>
        </div>

        <div class="admin-step-card">
          <h3 style="color:#34d399;margin-bottom:14px;">🖥️ وضعیت زنده سرور اوبونتو</h3>
          <div style="font-size:13px;line-height:2.1;color:#d4d4d8;">
            <div><strong>Hostname:</strong> <code>${stats.server.hostname}</code></div>
            <div><strong>OS Kernel:</strong> <code>${stats.server.platform}</code></div>
            <div><strong>CPU Cores:</strong> ${stats.server.cpus} Cores</div>
            <div><strong>Memory Usage:</strong> ${stats.server.memory.usedMb} MB / ${stats.server.memory.totalMb} MB (${stats.server.memory.percent}%)</div>
            <div><strong>Node.js Engine:</strong> ${stats.server.nodeVersion}</div>
            <div><strong>FFmpeg Transcoder:</strong> <span style="color:#fcd34d;">${ffmpeg.version}</span></div>
          </div>
        </div>
      </div>
    `;
  },

  // ===========================================================================
  // INTERACTIVE CATEGORY PICKER HELPERS
  // ===========================================================================
  renderSelectedCategoryBadges() {
    if (!this.selectedCategories.length) {
      return `<span style="color:#a1a1aa;font-size:12.5px;">هیچ دسته‌بندی انتخاب نشده است — از لیست پایین انتخاب کنید.</span>`;
    }
    return this.selectedCategories
      .map(
        (cat) => `
      <span class="selected-cat-badge" onclick="window.SecretAdminVault.toggleCategorySelection('${cat.replace(/'/g, "\\'")}')">
        <span>✓ ${cat}</span>
        <span style="opacity:0.8;font-size:11px;">✕</span>
      </span>
    `
      )
      .join('');
  },

  renderCategoryChipsList() {
    const categories = this.dashboardData?.categories || [];
    const q = (this.categorySearchFilter || '').toLowerCase().trim();
    const filtered = q
      ? categories.filter((c) => c.name.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q))
      : categories;

    return filtered
      .map((c) => {
        const isSelected = this.selectedCategories.some(
          (sel) => sel.toLowerCase() === c.name.toLowerCase()
        );
        return `
          <div
            class="cat-select-chip ${isSelected ? 'selected' : ''}"
            onclick="window.SecretAdminVault.toggleCategorySelection('${c.name.replace(/'/g, "\\'")}')"
          >
            <span>${isSelected ? '✓' : '+'}</span>
            <span>${c.name}</span>
          </div>
        `;
      })
      .join('');
  },

  toggleCategorySelection(catName) {
    const idx = this.selectedCategories.findIndex(
      (c) => c.toLowerCase() === catName.toLowerCase()
    );
    if (idx === -1) {
      this.selectedCategories.push(catName);
    } else {
      this.selectedCategories.splice(idx, 1);
    }
    this.refreshCategoryPickerUI();
  },

  filterCategoryChips(query) {
    this.categorySearchFilter = query;
    const container = document.getElementById('catChipsContainer');
    if (container) {
      container.innerHTML = this.renderCategoryChipsList();
    }
  },

  refreshCategoryPickerUI() {
    const bar = document.getElementById('selectedCatsBar');
    if (bar) bar.innerHTML = this.renderSelectedCategoryBadges();
    const container = document.getElementById('catChipsContainer');
    if (container) container.innerHTML = this.renderCategoryChipsList();
  },

  async quickAddCategoryInline() {
    const inp = document.getElementById('quickNewCatInput');
    if (!inp) return;
    const name = inp.value.trim();
    if (!name) return;

    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify({ name, group: 'Popular', badge: 'NEW' })
    });
    const data = await res.json();
    if (data.success && data.category) {
      inp.value = '';
      this.dashboardData.categories.unshift(data.category);
      if (!this.selectedCategories.includes(data.category.name)) {
        this.selectedCategories.push(data.category.name);
      }
      this.refreshCategoryPickerUI();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
      window.VelvetToast.show(`دسته‌بندی "${data.category.name}" اضافه و انتخاب شد!`, 'success');
    }
  },

  // ===========================================================================
  // FILE UPLOAD & AUTO-DURATION LISTENERS
  // ===========================================================================
  bindFileUploadListeners() {
    const vidInput = document.getElementById('newVidFileInput');
    if (vidInput) {
      vidInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.uploadedVideoName = file.name;
        const st = document.getElementById('newVidFileStatus');
        if (st) st.textContent = '⏳ در حال آماده‌سازی فایل ویدیو...';

        // Auto-detect video duration using temporary object URL
        try {
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.onloadedmetadata = () => {
            window.URL.revokeObjectURL(tempVideo.src);
            const totalSec = Math.round(tempVideo.duration || 0);
            if (totalSec > 0) {
              const mins = Math.floor(totalSec / 60);
              const secs = String(totalSec % 60).padStart(2, '0');
              const durInp = document.getElementById('newVidDuration');
              if (durInp) durInp.value = `${mins}:${secs}`;
            }
          };
          tempVideo.src = URL.createObjectURL(file);
        } catch (_) {}

        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedVideoBase64 = reader.result;
          if (st) {
            st.textContent = `✅ ویدیو آماده انتشار: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
          }
        };
        reader.readAsDataURL(file);
      };
    }

    const thumbInput = document.getElementById('newVidThumbInput');
    if (thumbInput) {
      thumbInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.uploadedThumbName = file.name;
        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedThumbBase64 = reader.result;
          const st = document.getElementById('newVidThumbStatus');
          if (st) st.textContent = `✅ کاور انتخاب شد: ${file.name}`;
          const prev = document.getElementById('newVidThumbPreview');
          if (prev) {
            prev.src = reader.result;
            prev.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      };
    }
  },

  async handleSaveVideo(e) {
    e.preventDefault();
    const payload = {
      title: document.getElementById('newVidTitle').value.trim(),
      performer: document.getElementById('newVidPerformer').value.trim(),
      description: document.getElementById('newVidDesc').value.trim(),
      streamUrl: document.getElementById('newVidStreamUrl').value.trim(),
      quality: document.getElementById('newVidQuality').value,
      duration: document.getElementById('newVidDuration').value.trim(),
      isVip: document.getElementById('newVidVip').checked,
      isFeatured: document.getElementById('newVidFeatured').checked,
      categories: this.selectedCategories.length ? this.selectedCategories : ['4K Ultra HD'],
      videoFileData: this.uploadedVideoBase64 || undefined,
      videoFileName: this.uploadedVideoName || undefined,
      thumbnailFileData: this.uploadedThumbBase64 || undefined,
      thumbnailFileName: this.uploadedThumbName || undefined
    };

    const isEdit = Boolean(this.editingVideoId);
    const endpoint = isEdit
      ? `/api/admin/videos/${encodeURIComponent(this.editingVideoId)}`
      : '/api/admin/videos';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      this.editingVideoId = null;
      this.uploadedVideoBase64 = '';
      this.uploadedThumbBase64 = '';
      window.VelvetToast.show(data.message, 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
      this.switchTab('manage-videos');
    } else {
      window.VelvetToast.show(data.message || 'خطا در ذخیره ویدیو', 'warning');
    }
  },

  async handleDeleteVideo(id) {
    const res = await fetch(`/api/admin/videos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': this.token }
    });
    const data = await res.json();
    if (data.success) {
      window.VelvetToast.show('ویدیو حذف شد.', 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
    }
  },

  async handleCreateCategory(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('newCatName').value.trim(),
      group: document.getElementById('newCatGroup').value,
      badge: document.getElementById('newCatBadge').value.trim()
    };
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.VelvetToast.show(`دسته‌بندی ${payload.name} اضافه شد!`, 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
    }
  },

  async handleDeleteCategory(id) {
    await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': this.token }
    });
    await this.loadDashboard();
    if (window.VelvetApp) window.VelvetApp.loadInitialData();
  },

  async handleCreatePerformer(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('newPerfName').value.trim(),
      country: document.getElementById('newPerfCountry').value.trim(),
      badge: document.getElementById('newPerfBadge').value.trim()
    };
    const res = await fetch('/api/admin/performers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.VelvetToast.show(`بازیگر ${payload.name} اضافه شد!`, 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
    }
  },

  async handleDeletePerformer(id) {
    await fetch(`/api/admin/performers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': this.token }
    });
    await this.loadDashboard();
    if (window.VelvetApp) window.VelvetApp.loadInitialData();
  },

  async handleUpdateSettings(e) {
    e.preventDefault();
    const payload = {
      siteName: document.getElementById('setSiteName').value.trim(),
      licenseNumber: document.getElementById('setLicenseNum').value.trim(),
      licenseAuthority: document.getElementById('setLicenseAuth').value.trim(),
      adminSecretKey: document.getElementById('setAdminKey').value.trim() || undefined,
      ageGateEnabled: document.getElementById('setAgeGate').checked
    };
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      window.VelvetToast.show(data.message, 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
    }
  }
};
