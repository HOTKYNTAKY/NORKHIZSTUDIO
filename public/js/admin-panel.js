/**
 * public/js/admin-panel.js
 * Ultra-Clean Secret Admin Panel (3x Tap on Brand Name | Password: eiman1387)
 * Online Stream Link Only + Description + Category Picker + 1-Month 200,000 Toman VIP Subscription Manager
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
  uploadedThumbBase64: '',
  uploadedThumbName: '',

  registerBrandTap(e) {
    if (e) e.preventDefault();
    this.brandTapCount = (this.brandTapCount || 0) + 1;
    if (this.brandTapTimer) {
      clearTimeout(this.brandTapTimer);
    }
    if (this.brandTapCount === 2) {
      window.VelvetToast.show('🔐 یک ضربه دیگر برای باز شدن پنل مدیریت...');
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
    }, 2500);
  },

  init() {
    const footerTrigger = document.getElementById('footerStealthTrigger');
    if (footerTrigger) {
      footerTrigger.onclick = (e) => this.registerBrandTap(e);
    }

    // 2. Keyboard shortcut fallback: Ctrl + Shift + A
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.openVault();
      }
    });

    // 3. Direct stealth URL fallback (/vault-x9-control or ?admin=vault)
    const p = window.location.pathname;
    const q = new URLSearchParams(window.location.search);
    if (p.includes('vault') || q.get('admin') === 'vault') {
      setTimeout(() => this.openVault(), 300);
    }
  },

  async autoUnlockWithKey(secretKey) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.token = data.token;
        localStorage.setItem('vv_admin_token', data.token);
      }
    } catch (_) {}
    await this.openVault();
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
          رمز عبور مدیریت را جهت افزودن ویدیو با لینک آنلاین، نوشتن توضیحات و مدیریت اشتراک‌ها وارد کنید.
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
    this.uploadedThumbBase64 = '';
    this.activeTab = 'add-video';
    this.renderDashboardView();

    setTimeout(() => {
      const titleEl = document.getElementById('newVidTitle');
      const descEl = document.getElementById('newVidDesc');
      const perfEl = document.getElementById('newVidPerformer');
      const urlEl = document.getElementById('newVidStreamUrl');
      const qualEl = document.getElementById('newVidQuality');
      const durEl = document.getElementById('newVidDuration');
      const accessEl = document.getElementById('newVidAccessType');
      const featEl = document.getElementById('newVidFeatured');

      if (titleEl) titleEl.value = vid.title || '';
      if (descEl) descEl.value = vid.description || '';
      if (perfEl) perfEl.value = vid.performer || '';
      if (urlEl) urlEl.value = vid.streamUrl || '';
      if (qualEl) qualEl.value = vid.quality || '4K UHD';
      if (durEl) durEl.value = vid.duration || '35:00';
      if (accessEl) accessEl.value = vid.isVip ? 'vip' : 'free';
      if (featEl) featEl.checked = Boolean(vid.isFeatured);
    }, 50);
  },

  renderDashboardView() {
    const root = document.getElementById('adminVaultContent');
    if (!root || !this.dashboardData) return;

    const { stats, settings, vipCodes = [], videos, categories, performers } = this.dashboardData;

    root.innerHTML = `
      <div class="admin-dashboard-container">
        <div class="admin-header">
          <div>
            <h2 style="color:#fff;font-size:19px;display:flex;align-items:center;gap:8px;">
              <span>🎬 پنل مدیریت سایت (${settings.siteName})</span>
            </h2>
            <p style="font-size:12px;color:#a1a1aa;margin-top:3px;">
              اشتراک ویژه فعال: <strong style="color:#fcd34d;">یک‌ماهه ${settings.vipPriceText || '۲۰۰,۰۰۰ تومان'}</strong>
            </p>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.SecretAdminVault.logout()" class="btn-admin-danger">قفل پنل</button>
            <button onclick="window.SecretAdminVault.closeVault()" class="player-close-btn">بستن ✕</button>
          </div>
        </div>

        <div class="admin-nav-tabs">
          <button class="admin-tab-btn ${this.activeTab === 'add-video' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('add-video')">
            ${this.editingVideoId ? '✏️ ویرایش ویدیو' : '➕ افزودن ویدیو (لینک آنلاین)'}
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'manage-videos' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('manage-videos')">
            🎞️ لیست ویدیوها (${videos.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'vip-subs' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('vip-subs')">
            👑 اشتراک پرمیوم ۲۰۰ هزار تومان (${vipCodes.length})
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
          <div id="adminTabDynamicBody">
            ${this.renderTabBody(this.activeTab)}
          </div>
        </div>
      </div>
    `;

    this.bindFileUploadListeners();
  },

  renderTabBody(tab) {
    const { stats, ffmpeg, settings, vipCodes = [], videos, categories, performers } = this.dashboardData;

    // =========================================================================
    // TAB 1: ADD / EDIT VIDEO WITH ONLINE LINK, DESCRIPTION & CATEGORIES
    // =========================================================================
    if (tab === 'add-video') {
      return `
        <form onsubmit="window.SecretAdminVault.handleSaveVideo(event)">

          <!-- گام ۱: لینک پخش آنلاین ویدیو -->
          <div class="admin-step-card" style="border-color:rgba(225,29,72,0.4);">
            <div class="admin-step-header">
              <div class="admin-step-num">۱</div>
              <div class="admin-step-title">🔗 لینک پخش آنلاین ویدیو (Online Stream / Embed Link)</div>
              ${
                this.editingVideoId
                  ? `<button type="button" onclick="window.SecretAdminVault.switchTab('add-video', true)" class="btn-admin-danger" style="margin-right:auto;">لغو ویرایش</button>`
                  : ''
              }
            </div>

            <div class="admin-form-group full">
              <label class="admin-label">
                <span>لینک پخش آنلاین ویدیو را اینجا قرار دهید *</span>
              </label>
              <input
                id="newVidStreamUrl"
                type="text"
                class="admin-input"
                style="direction:ltr;font-size:14.5px;border-color:rgba(225,29,72,0.5);"
                placeholder="https://... (لینک مستقیم MP4/M3U8، یا لینک صفحه/Embed سایت‌ها)"
                required
              />
              <div style="font-size:12px;color:#a1a1aa;margin-top:6px;line-height:1.6;">
                💡 <strong>پشتیبانی هوشمند از تمام لینک‌ها:</strong> می‌توانید لینک مستقیم (<code>.mp4</code> / <code>.m3u8</code>)، لینک تماشا یا Embed سایت‌ها (مثل Pornhub, XVideos, XNXX, xHamster, SpankBang, Streamtape, Doodstream, Google Drive و ...) یا کد <code>&lt;iframe&gt;</code> را مستقیم کپی کنید.
              </div>
            </div>
          </div>

          <!-- گام ۲: عنوان، توضیحات کامل و نام بازیگر -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۲</div>
              <div class="admin-step-title">📝 عنوان، توضیحات ویدیو و نام بازیگر</div>
            </div>

            <div class="admin-form-grid">
              <div class="admin-form-group">
                <label class="admin-label">عنوان ویدیو *</label>
                <input id="newVidTitle" class="admin-input" placeholder="عنوان ویدیو را بنویسید..." required />
              </div>

              <div class="admin-form-group">
                <label class="admin-label">نام بازیگر / مدل (Performer) *</label>
                <input id="newVidPerformer" class="admin-input" list="performerSuggestions" placeholder="مثال: Eva Laurent" value="Eva Laurent" required />
                <datalist id="performerSuggestions">
                  ${performers.map((p) => `<option value="${p.name}"></option>`).join('')}
                </datalist>
              </div>

              <div class="admin-form-group full">
                <label class="admin-label">
                  <span>توضیحات کامل ویدیو (Description) *</span>
                </label>
                <textarea id="newVidDesc" rows="3" class="admin-textarea" placeholder="توضیحات ویدیو را اینجا بنویسید (این متن روی کارت ویدیو و زیر پلیر نمایش داده می‌شود)..." required></textarea>
              </div>
            </div>
          </div>

          <!-- گام ۳: انتخاب دسته‌بندی مورد نظر -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۳</div>
              <div class="admin-step-title">🏷️ انتخاب دسته‌بندی مورد نظر (English Categories)</div>
            </div>

            <div style="margin-bottom:8px;font-size:12.5px;color:#d4d4d8;">
              دسته‌بندی‌های انتخاب‌شده (برای حذف روی هر کدام بزنید):
            </div>
            <div id="selectedCatsBar" class="selected-cats-bar">
              ${this.renderSelectedCategoryBadges()}
            </div>

            <div class="cat-picker-toolbar">
              <input
                id="catFilterSearchInput"
                type="text"
                class="admin-input"
                style="flex:1;min-width:180px;direction:ltr;"
                placeholder="🔍 جستجوی دسته‌بندی (مثلاً MILF, Latina, Anal, 4K, POV)..."
                oninput="window.SecretAdminVault.filterCategoryChips(this.value)"
              />
              <div style="display:flex;gap:6px;flex:1;min-width:210px;">
                <input
                  id="quickNewCatInput"
                  type="text"
                  class="admin-input"
                  style="direction:ltr;"
                  placeholder="+ نام دسته‌بندی جدید..."
                />
                <button type="button" onclick="window.SecretAdminVault.quickAddCategoryInline()" class="btn-admin-edit" style="white-space:nowrap;">
                  ➕ ساخت دسته‌بندی
                </button>
              </div>
            </div>

            <div style="font-size:12px;color:#a1a1aa;margin-bottom:8px;">
              روی هر دسته‌بندی در لیست زیر بزنید تا انتخاب (`✓`) شود:
            </div>
            <div id="catChipsContainer" class="cat-chips-container">
              ${this.renderCategoryChipsList()}
            </div>
          </div>

          <!-- گام ۴: نوع دسترسی (پرمیوم ۲۰۰ هزار تومانی یا رایگان)، کاور و کیفیت -->
          <div class="admin-step-card">
            <div class="admin-step-header">
              <div class="admin-step-num">۴</div>
              <div class="admin-step-title">👑 نوع دسترسی (پرمیوم یا رایگان)، کاور و کیفیت</div>
            </div>

            <div class="admin-form-grid">
              <div class="admin-form-group">
                <label class="admin-label" style="color:#fcd34d;">نوع دسترسی ویدیو (رایگان یا اشتراکی)</label>
                <select id="newVidAccessType" class="admin-select" style="border-color:rgba(245,158,11,0.5);font-weight:700;">
                  <option value="free">🔓 رایگان (پخش آزاد برای همه مشتریان)</option>
                  <option value="vip">👑 پرمیوم VIP (نیازمند اشتراک یک‌ماهه ۲۰۰,۰۰۰ تومان)</option>
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-label">کیفیت و مدت زمان</label>
                <div style="display:flex;gap:8px;">
                  <select id="newVidQuality" class="admin-select" style="flex:1;">
                    <option value="4K UHD">💎 4K Ultra HD</option>
                    <option value="1080p HD">🔥 1080p Full HD</option>
                    <option value="VR 360°">🥽 VR 360°</option>
                    <option value="720p HD">📹 720p HD</option>
                  </select>
                  <input id="newVidDuration" class="admin-input" style="width:110px;direction:ltr;text-align:center;" placeholder="35:00" value="35:00" />
                </div>
              </div>

              <div class="admin-form-group">
                <label class="admin-label">تصویر کاور ویدیو (اختیاری — از گالری گوشی)</label>
                <input id="newVidThumbInput" type="file" accept="image/*" class="admin-input" />
                <small id="newVidThumbStatus" style="color:#a1a1aa;font-size:11.5px;">
                  اگر عکسی انتخاب نکنید، پوستر نئونی 4K به صورت خودکار ساخته می‌شود.
                </small>
                <img id="newVidThumbPreview" style="display:none;margin-top:8px;max-height:95px;border-radius:8px;" />
              </div>

              <div class="admin-form-group">
                <label class="admin-label">یا لینک مستقیم عکس کاور (اختیاری)</label>
                <input id="newVidThumbUrl" class="admin-input" style="direction:ltr;" placeholder="https://.../cover.jpg" />
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#fda4af;font-weight:700;margin-top:10px;font-size:13px;">
                  <input id="newVidFeatured" type="checkbox" checked style="width:17px;height:17px;" />
                  <span>🌟 نمایش در بنر بزرگ بالای صفحه اول</span>
                </label>
              </div>
            </div>

            <button type="submit" class="btn-admin-gold" style="width:100%;margin-top:14px;font-size:16px;">
              ${this.editingVideoId ? '💾 ذخیره تغییرات ویدیو' : '🚀 ثبت و انتشار فوری ویدیو در سایت'}
            </button>
          </div>
        </form>
      `;
    }

    // =========================================================================
    // TAB 2: MANAGE VIDEOS LIST
    // =========================================================================
    if (tab === 'manage-videos') {
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <h3 style="color:#fff;">🎞️ لیست ویدیوهای سایت (${videos.length})</h3>
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
                    ${
                      v.isVip
                        ? '<span class="badge-vip">👑 پرمیوم (۲۰۰ هزار تومان)</span>'
                        : '<span style="background:rgba(16,185,129,0.2);color:#34d399;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:800;">🔓 رایگان</span>'
                    }
                    <strong style="color:#fff;font-size:14.5px;direction:ltr;">${v.title}</strong>
                  </div>
                  <div style="font-size:12.5px;color:#a1a1aa;margin-bottom:6px;">
                    ${v.description || 'بدون توضیحات'}
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:11.5px;">
                    <span style="color:#fda4af;">⭐ ${v.performer}</span>
                    <span>•</span>
                    <span style="color:#34d399;">🏷️ ${(v.categories || []).join(' , ')}</span>
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
    // TAB 3: VIP SUBSCRIPTION MANAGER (1-MONTH 200,000 TOMAN)
    // =========================================================================
    if (tab === 'vip-subs') {
      return `
        <div class="admin-form-grid">
          <!-- ساخت کد اشتراک یک‌ماهه -->
          <div class="admin-step-card" style="border-color:rgba(245,158,11,0.4);">
            <h3 style="color:#fcd34d;margin-bottom:10px;">🔑 ساخت کد اشتراک یک‌ماهه جدید (۳۰ روزه)</h3>
            <p style="font-size:12.5px;color:#a1a1aa;margin-bottom:14px;">
              وقتی مشتری مبلغ اشتراک (${settings.vipPriceText || '۲۰۰,۰۰۰ تومان'}) را پرداخت کرد، با زدن دکمه زیر یک کد اشتراک ۳۰ روزه بسازید و به مشتری بدهید.
            </p>
            <form onsubmit="window.SecretAdminVault.handleCreateVipCode(event)">
              <div class="admin-form-group">
                <label class="admin-label">کد دلخواه (خالی بگذارید تا خودکار ساخته شود)</label>
                <input id="newVipCustomCode" class="admin-input" style="direction:ltr;text-transform:uppercase;" placeholder="مثال: VIP-ALI-1405 (اختیاری)" />
              </div>
              <div class="admin-form-group">
                <label class="admin-label">یادداشت / نام مشتری</label>
                <input id="newVipNote" class="admin-input" placeholder="مثال: اشتراک یک‌ماهه ۲۰۰ هزار تومانی" value="اشتراک یک‌ماهه ۲۰۰,۰۰۰ تومان" />
              </div>
              <button type="submit" class="btn-admin-gold" style="width:100%;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;">
                ➕ تولید کد اشتراک یک‌ماهه (۳۰ روزه)
              </button>
            </form>
          </div>

          <!-- تنظیمات قیمت و شماره کارت / درگاه پرداخت -->
          <div class="admin-step-card">
            <h3 style="color:#fff;margin-bottom:10px;">💳 تنظیمات تعرفه اشتراک و اطلاعات پرداخت</h3>
            <form onsubmit="window.SecretAdminVault.handleSaveVipSettings(event)">
              <div class="admin-form-group">
                <label class="admin-label">مبلغ اشتراک یک‌ماهه</label>
                <input id="vipSetPrice" class="admin-input" value="${settings.vipPriceText || '۲۰۰,۰۰۰ تومان'}" required />
              </div>
              <div class="admin-form-group">
                <label class="admin-label">شماره کارت بانکی (جهت نمایش به مشتری)</label>
                <input id="vipSetCard" class="admin-input" style="direction:ltr;" placeholder="6037-XXXX-XXXX-XXXX" value="${settings.vipCardNumber || ''}" />
              </div>
              <div class="admin-form-group">
                <label class="admin-label">آیدی تلگرام / پشتیبانی (جهت ارسال فیش و دریافت کد)</label>
                <input id="vipSetTelegram" class="admin-input" style="direction:ltr;" placeholder="@YourSupportID" value="${settings.vipSupportTelegram || ''}" />
              </div>
              <div class="admin-form-group">
                <label class="admin-label">لینک درگاه پرداخت آنلاین (اختیاری)</label>
                <input id="vipSetPayUrl" class="admin-input" style="direction:ltr;" placeholder="https://..." value="${settings.vipPaymentUrl || ''}" />
              </div>
              <button type="submit" class="btn-admin-gold" style="width:100%;">
                💾 ذخیره تنظیمات اشتراک
              </button>
            </form>
          </div>
        </div>

        <div class="admin-step-card">
          <h3 style="color:#fcd34d;margin-bottom:14px;">📋 لیست کدهای اشتراک فعال (${vipCodes.length})</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>کد اشتراک VIP</th>
                  <th>توضیحات</th>
                  <th>مدت اعتبار</th>
                  <th>تاریخ انقضا</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                ${vipCodes
                  .map(
                    (c) => `
                  <tr>
                    <td>
                      <code style="background:#1e1e30;color:#fcd34d;padding:4px 10px;border-radius:6px;font-size:14px;font-weight:800;direction:ltr;display:inline-block;">${c.code}</code>
                    </td>
                    <td>${c.note || '-'}</td>
                    <td>${c.durationDays || 30} روزه</td>
                    <td style="direction:ltr;">${new Date(c.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <button class="btn-admin-danger" onclick="window.SecretAdminVault.handleDeleteVipCode('${c.id}')">حذف</button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // TAB 4: ENGLISH CATEGORIES MANAGER
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
    // TAB 5: PERFORMERS / PORNSTARS MANAGER
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
    // TAB 6: SETTINGS & SERVER TELEMETRY
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
      ? categories.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q)
        )
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

  bindFileUploadListeners() {
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
    const accessType = document.getElementById('newVidAccessType')?.value || 'free';
    const thumbUrlInput = document.getElementById('newVidThumbUrl')?.value.trim() || '';

    const payload = {
      title: document.getElementById('newVidTitle').value.trim(),
      performer: document.getElementById('newVidPerformer').value.trim(),
      description: document.getElementById('newVidDesc').value.trim(),
      streamUrl: document.getElementById('newVidStreamUrl').value.trim(),
      quality: document.getElementById('newVidQuality').value,
      duration: document.getElementById('newVidDuration').value.trim(),
      isVip: accessType === 'vip',
      isFeatured: document.getElementById('newVidFeatured').checked,
      categories: this.selectedCategories.length ? this.selectedCategories : ['4K Ultra HD'],
      thumbnail: thumbUrlInput || undefined,
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
      this.uploadedThumbBase64 = '';
      window.VelvetToast.show(data.message, 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
      this.switchTab('manage-videos');
    } else {
      window.VelvetToast.show(data.message || 'خطا در ذخیره ویدیو', 'warning');
    }
  },

  async handleCreateVipCode(e) {
    e.preventDefault();
    const code = document.getElementById('newVipCustomCode')?.value.trim() || '';
    const note = document.getElementById('newVipNote')?.value.trim() || 'اشتراک یک‌ماهه ۲۰۰,۰۰۰ تومان';

    const res = await fetch('/api/admin/vip-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify({ code, note, durationDays: 30 })
    });
    const data = await res.json();
    if (data.success) {
      window.VelvetToast.show(data.message, 'success');
      await this.loadDashboard();
    }
  },

  async handleDeleteVipCode(id) {
    await fetch(`/api/admin/vip-codes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': this.token }
    });
    await this.loadDashboard();
  },

  async handleSaveVipSettings(e) {
    e.preventDefault();
    const payload = {
      vipPriceText: document.getElementById('vipSetPrice').value.trim(),
      vipCardNumber: document.getElementById('vipSetCard').value.trim(),
      vipSupportTelegram: document.getElementById('vipSetTelegram').value.trim(),
      vipPaymentUrl: document.getElementById('vipSetPayUrl').value.trim()
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
