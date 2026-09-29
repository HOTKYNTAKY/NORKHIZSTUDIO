/**
 * public/js/admin-panel.js
 * Stealth Secret Admin Vault Panel (Ctrl+Shift+A / 5x Shield Click / /vault-x9-control)
 */

window.SecretAdminVault = {
  token: localStorage.getItem('vv_admin_token') || '',
  activeTab: 'add-video',
  dashboardData: null,
  shieldClicks: 0,
  uploadedVideoBase64: '',
  uploadedVideoName: '',
  uploadedThumbBase64: '',
  uploadedThumbName: '',

  init() {
    // 1. Keyboard shortcut: Ctrl + Shift + A or Alt + A
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        this.openVault();
      }
    });

    // 2. Check URL path or query parameter for stealth access
    const p = window.location.pathname;
    const q = new URLSearchParams(window.location.search);
    if (p.includes('vault') || q.get('admin') === 'vault') {
      setTimeout(() => this.openVault(), 400);
    }

    // 3. Footer 5x click trigger
    const shield = document.getElementById('footerStealthTrigger');
    if (shield) {
      shield.onclick = () => {
        this.shieldClicks += 1;
        if (this.shieldClicks >= 5) {
          this.shieldClicks = 0;
          this.openVault();
        } else {
          window.VelvetToast.show(`پنل مخفی ادمین: ${5 - this.shieldClicks} کلیک دیگر...`);
        }
      };
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
    window.VelvetToast.show('از پنل مخفی ادمین خارج شدید.');
  },

  fillDemoCredentials() {
    const keyInp = document.getElementById('adminSecretKeyInput');
    const pinInp = document.getElementById('adminPinInput');
    if (keyInp) keyInp.value = 'VAULT-ADMIN-2026';
    if (pinInp) pinInp.value = '8899';
  },

  async submitLogin(e) {
    e.preventDefault();
    const secretKey = document.getElementById('adminSecretKeyInput').value.trim();
    const pin = document.getElementById('adminPinInput').value.trim();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey, pin })
    });
    const data = await res.json();
    if (!data.success) {
      window.VelvetToast.show(data.message || 'خطا در احراز هویت ادمین', 'warning');
      return;
    }

    this.token = data.token;
    localStorage.setItem('vv_admin_token', data.token);
    window.VelvetToast.show(data.message, 'success');
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
          <h2 style="color:#fcd34d;font-size:20px;">🔐 پنل مخفی مدیریت (Stealth Admin Vault)</h2>
          <button onclick="window.SecretAdminVault.closeVault()" class="player-close-btn">بستن ✕</button>
        </div>
        <p style="color:#a1a1aa;font-size:13px;margin-bottom:20px;">
          این بخش مخصوص مدیر سرور اوبونتو جهت افزودن ویدیو، مدیریت دسته‌بندی‌های خارجی (English) و تنظیمات مجوز رسمی است.
        </p>
        <form onsubmit="window.SecretAdminVault.submitLogin(event)">
          <div class="admin-form-group">
            <label class="admin-label">کلید امنیتی ادمین (ADMIN_SECRET_KEY)</label>
            <input id="adminSecretKeyInput" type="password" class="admin-input" placeholder="VAULT-ADMIN-2026" required />
          </div>
          <div class="admin-form-group">
            <label class="admin-label">پین کد مستر (ADMIN_MASTER_PIN)</label>
            <input id="adminPinInput" type="password" class="admin-input" placeholder="8899" required />
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
            <button type="submit" class="btn-admin-gold" style="flex:1;">ورود به پنل مخفی</button>
            <button type="button" onclick="window.SecretAdminVault.fillDemoCredentials()" class="btn-secondary-glass" style="font-family:var(--font-fa);font-size:12.5px;">
              🔑 جایگذاری خودکار رمز پیش‌فرض
            </button>
          </div>
        </form>
        <div style="margin-top:18px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12px;color:#a1a1aa;">
          💡 رمز پیش‌فرض در فایل <code>.env</code> و اسکریپت <code>install.sh</code>: <br/>
          Secret Key: <code style="color:#fcd34d;">VAULT-ADMIN-2026</code> | PIN: <code style="color:#fcd34d;">8899</code>
        </div>
      </div>
    `;
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    this.renderDashboardView();
  },

  renderDashboardView() {
    const root = document.getElementById('adminVaultContent');
    if (!root || !this.dashboardData) return;

    const { stats, ffmpeg, settings, videos, categories, performers } = this.dashboardData;

    root.innerHTML = `
      <div class="admin-dashboard-container">
        <div class="admin-header">
          <div>
            <h2 style="color:#fcd34d;font-size:21px;display:flex;align-items:center;gap:10px;">
              <span>🛡️ پنل مخفی مدیریت سرور و محتوا (VELVETVAULT STEALTH ADMIN)</span>
            </h2>
            <p style="font-size:12.5px;color:#a1a1aa;margin-top:4px;">
              مجوز فعال: <strong style="color:#34d399;">${settings.licenseNumber}</strong> | مسیر مخفی: <code style="color:#fda4af;">${settings.stealthAdminPath}</code>
            </p>
          </div>
          <div style="display:flex;gap:10px;">
            <button onclick="window.SecretAdminVault.logout()" class="btn-admin-danger">خروج امن</button>
            <button onclick="window.SecretAdminVault.closeVault()" class="player-close-btn">بازگشت به سایت ✕</button>
          </div>
        </div>

        <div class="admin-nav-tabs">
          <button class="admin-tab-btn ${this.activeTab === 'add-video' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('add-video')">
            ➕ افزودن ویدیو جدید (Add Video)
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'manage-videos' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('manage-videos')">
            🎬 مدیریت ویدیوها (${videos.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'categories' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('categories')">
            🏷️ دسته‌بندی‌های انگلیسی (${categories.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'performers' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('performers')">
            ⭐ بازیگران و مدل‌ها (${performers.length})
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'server' ? 'active' : ''}" onclick="window.SecretAdminVault.switchTab('server')">
            🖥️ وضعیت سرور Ubuntu و تنظیمات مجوز
          </button>
        </div>

        <div class="admin-body">
          <!-- Top Summary Stats -->
          <div class="admin-stats-grid">
            <div class="admin-stat-card">
              <div class="admin-stat-label">کل ویدیوهای سایت</div>
              <div class="admin-stat-value">${stats.catalog.totalVideos}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-label">دسته‌بندی‌های خارجی (English)</div>
              <div class="admin-stat-value" style="color:#fda4af;">${stats.catalog.totalCategories}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-label">مجموع بازدیدها (Total Views)</div>
              <div class="admin-stat-value" style="color:#34d399;">${stats.catalog.totalViews.toLocaleString()}</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-label">مصرف رم سرور Ubuntu</div>
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

    if (tab === 'add-video') {
      return `
        <h3 style="margin-bottom:18px;color:#fff;">➕ آپلود و انتشار ویدیو جدید در سایت</h3>
        <form onsubmit="window.SecretAdminVault.handleCreateVideo(event)">
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label class="admin-label">عنوان ویدیو (به انگلیسی یا فارسی)</label>
              <input id="newVidTitle" class="admin-input" placeholder="e.g. Exclusive 4K Penthouse Suite — Episode V" required />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">نام بازیگر / مدل (Performer / Star)</label>
              <input id="newVidPerformer" class="admin-input" list="performerSuggestions" placeholder="e.g. Eva Laurent" required />
              <datalist id="performerSuggestions">
                ${performers.map((p) => `<option value="${p.name}"></option>`).join('')}
              </datalist>
            </div>

            <div class="admin-form-group">
              <label class="admin-label">آپلود فایل ویدیو از سیستم (.mp4 / .webm) — اختیاری</label>
              <input id="newVidFileInput" type="file" accept="video/mp4,video/webm" class="admin-input" />
              <small id="newVidFileStatus" style="color:#34d399;font-size:11.5px;"></small>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">یا لینک مستقیم ویدیو / استریم HLS (.mp4 / .m3u8)</label>
              <input id="newVidStreamUrl" class="admin-input" placeholder="https://.../video.mp4 (در صورت خالی بودن، استریم پیش‌فرض قرار می‌گیرد)" />
            </div>

            <div class="admin-form-group">
              <label class="admin-label">آپلود تصویر کاور (Thumbnail) — اختیاری</label>
              <input id="newVidThumbInput" type="file" accept="image/*" class="admin-input" />
              <small id="newVidThumbStatus" style="color:#34d399;font-size:11.5px;">در صورت عدم آپلود، پوستر نئونی 4K به صورت خودکار ساخته می‌شود.</small>
            </div>
            <div class="admin-form-group">
              <label class="admin-label">کیفیت و مدت زمان</label>
              <div style="display:flex;gap:10px;">
                <select id="newVidQuality" class="admin-select" style="flex:1;">
                  <option value="4K UHD">4K UHD (2160p)</option>
                  <option value="1080p HD">1080p Full HD</option>
                  <option value="VR 360°">VR 360° Stereoscopic</option>
                  <option value="720p HD">720p HD</option>
                </select>
                <input id="newVidDuration" class="admin-input" style="width:120px;" placeholder="36:20" value="38:15" />
              </div>
            </div>

            <div class="admin-form-group full">
              <label class="admin-label">انتخاب دسته‌بندی‌های خارجی (English Categories — امکان انتخاب چندگانه)</label>
              <div class="admin-cat-checkbox-grid">
                ${categories
                  .map(
                    (c, idx) => `
                  <label class="cat-check-item">
                    <input type="checkbox" name="newVidCatCheck" value="${c.name}" ${idx < 2 ? 'checked' : ''} />
                    <span>${c.name}</span>
                  </label>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="admin-form-group full">
              <label class="admin-label">توضیحات ویدیو (Description)</label>
              <textarea id="newVidDesc" rows="3" class="admin-textarea" placeholder="توضیحات صحنه، کیفیت فیلمبرداری و جزئیات..."></textarea>
            </div>

            <div class="admin-form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:#fcd34d;font-weight:700;">
                <input id="newVidVip" type="checkbox" checked />
                <span>نشان ویژه VIP Exclusive</span>
              </label>
            </div>
            <div class="admin-form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:#fda4af;font-weight:700;">
                <input id="newVidFeatured" type="checkbox" checked />
                <span>نمایش در بنر اصلی بالای سایت (Hero Spotlight)</span>
              </label>
            </div>
          </div>

          <button type="submit" class="btn-admin-gold" style="margin-top:10px;">
            🚀 ثبت و انتشار فوری ویدیو در سایت
          </button>
        </form>
      `;
    }

    if (tab === 'manage-videos') {
      return `
        <h3 style="margin-bottom:16px;color:#fff;">🎬 لیست تمام ویدیوهای موجود در سایت</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>عنوان ویدیو</th>
                <th>بازیگر (Performer)</th>
                <th>کیفیت</th>
                <th>دسته‌بندی‌ها (English)</th>
                <th>بازدید</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              ${videos
                .map(
                  (v) => `
                <tr>
                  <td style="font-weight:700;color:#fff;direction:ltr;text-align:left;">${v.title}</td>
                  <td style="color:#fda4af;">${v.performer}</td>
                  <td><span class="badge-quality">${v.quality}</span></td>
                  <td style="direction:ltr;font-size:11.5px;color:#a1a1aa;">${(v.categories || []).slice(0, 4).join(', ')}</td>
                  <td>${(v.views || 0).toLocaleString()}</td>
                  <td>${v.isVip ? '<span class="badge-vip">VIP</span>' : 'Public'}</td>
                  <td>
                    <button class="btn-admin-danger" onclick="window.SecretAdminVault.handleDeleteVideo('${v.id}')">حذف ویدیو</button>
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

    if (tab === 'categories') {
      return `
        <div class="admin-form-grid" style="margin-bottom:24px;">
          <div class="admin-stat-card" style="grid-column:1 / -1;">
            <h3 style="margin-bottom:14px;color:#fcd34d;">➕ افزودن دسته‌بندی انگلیسی جدید (Add English Category)</h3>
            <form onsubmit="window.SecretAdminVault.handleCreateCategory(event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
              <div style="flex:1;min-width:200px;">
                <label class="admin-label">نام دسته‌بندی به انگلیسی (English Name)</label>
                <input id="newCatName" class="admin-input" style="width:100%;direction:ltr;" placeholder="e.g. Wet Look & Shower" required />
              </div>
              <div style="width:180px;">
                <label class="admin-label">گروه (Group)</label>
                <select id="newCatGroup" class="admin-select" style="width:100%;">
                  <option value="Popular">Popular</option>
                  <option value="International">International</option>
                  <option value="Appearance">Appearance</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Production">Production</option>
                </select>
              </div>
              <div style="width:130px;">
                <label class="admin-label">نشان (Badge)</label>
                <input id="newCatBadge" class="admin-input" style="width:100%;direction:ltr;" placeholder="HOT / 4K / VIP" value="HOT" />
              </div>
              <button type="submit" class="btn-admin-gold">افزودن دسته‌بندی</button>
            </form>
          </div>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>نام انگلیسی (English Category)</th>
                <th>اسلاگ (Slug)</th>
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
                  <td style="direction:ltr;color:#a1a1aa;">/${c.slug}</td>
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

    if (tab === 'performers') {
      return `
        <div class="admin-stat-card" style="margin-bottom:24px;">
          <h3 style="margin-bottom:14px;color:#fcd34d;">➕ افزودن بازیگر / مدل جدید (Add Verified Star)</h3>
          <form onsubmit="window.SecretAdminVault.handleCreatePerformer(event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
            <div style="flex:1;min-width:200px;">
              <label class="admin-label">نام کامل بازیگر (English)</label>
              <input id="newPerfName" class="admin-input" style="width:100%;direction:ltr;" placeholder="e.g. Aria Valencia" required />
            </div>
            <div style="width:180px;">
              <label class="admin-label">کشور (Country)</label>
              <input id="newPerfCountry" class="admin-input" style="width:100%;direction:ltr;" placeholder="Spain" required />
            </div>
            <div style="width:160px;">
              <label class="admin-label">نشان (Badge)</label>
              <input id="newPerfBadge" class="admin-input" style="width:100%;direction:ltr;" value="VIP STAR" />
            </div>
            <button type="submit" class="btn-admin-gold">ثبت بازیگر</button>
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
                <th>تعداد ویدیو</th>
                <th>عملیات</th>
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
                  <td>${p.videosCount}</td>
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

    // Server & License Settings Tab
    return `
      <div class="admin-form-grid">
        <div class="admin-stat-card">
          <h3 style="color:#fcd34d;margin-bottom:14px;">📜 تنظیمات مجوز رسمی کشوری و امنیت پنل مخفی</h3>
          <form onsubmit="window.SecretAdminVault.handleUpdateSettings(event)">
            <div class="admin-form-group">
              <label class="admin-label">نام برند سایت</label>
              <input id="setSiteName" class="admin-input" value="${settings.siteName}" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">شماره مجوز رسمی کشوری (Official License Number)</label>
              <input id="setLicenseNum" class="admin-input" style="direction:ltr;" value="${settings.licenseNumber}" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">نهاد صادرکننده مجوز</label>
              <input id="setLicenseAuth" class="admin-input" value="${settings.licenseAuthority}" />
            </div>
            <div class="admin-form-group">
              <label class="admin-label">تغییر کلید امنیتی پنل مخفی (ADMIN_SECRET_KEY)</label>
              <input id="setAdminKey" class="admin-input" style="direction:ltr;" placeholder="در صورت تمایل به تغییر وارد کنید..." />
            </div>
            <div class="admin-form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input id="setAgeGate" type="checkbox" ${settings.ageGateEnabled ? 'checked' : ''} />
                <span>فعال بودن پنجره تایید سنی +18 در بدو ورود</span>
              </label>
            </div>
            <button type="submit" class="btn-admin-gold">ذخیره تنظیمات سایت و مجوز</button>
          </form>
        </div>

        <div class="admin-stat-card">
          <h3 style="color:#34d399;margin-bottom:14px;">🖥️ وضعیت زنده سرور اوبونتو (Ubuntu Server Telemetry)</h3>
          <div style="font-size:13px;line-height:2;color:#d4d4d8;">
            <div><strong>Hostname:</strong> <code>${stats.server.hostname}</code></div>
            <div><strong>OS Kernel:</strong> <code>${stats.server.platform}</code></div>
            <div><strong>CPU Cores:</strong> ${stats.server.cpus} Cores (${stats.server.cpuModel})</div>
            <div><strong>Load Average:</strong> ${stats.server.loadAvg.join(' / ')}</div>
            <div><strong>Memory Usage:</strong> ${stats.server.memory.usedMb} MB / ${stats.server.memory.totalMb} MB (${stats.server.memory.percent}%)</div>
            <div><strong>Node.js Engine:</strong> ${stats.server.nodeVersion}</div>
            <div><strong>FFmpeg Transcoder:</strong> <span style="color:#fcd34d;">${ffmpeg.version}</span></div>
          </div>

          <h4 style="margin-top:20px;margin-bottom:10px;color:#fda4af;">📋 آخرین لاگ‌های امنیتی سرور (Audit Logs)</h4>
          <div style="max-height:200px;overflow-y:auto;background:#090910;padding:10px;border-radius:8px;font-size:11.5px;direction:ltr;font-family:monospace;">
            ${(stats.recentLogs || [])
              .map(
                (l) =>
                  `<div style="margin-bottom:6px;color:#a1a1aa;"><span style="color:#34d399;">[${l.timestamp.slice(11, 19)}]</span> <strong style="color:#fff;">${l.action}</strong>: ${l.details}</div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  },

  bindFileUploadListeners() {
    const vidInput = document.getElementById('newVidFileInput');
    if (vidInput) {
      vidInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.uploadedVideoName = file.name;
        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedVideoBase64 = reader.result;
          const st = document.getElementById('newVidFileStatus');
          if (st) st.textContent = `✅ فایل ویدیو آماده آپلود: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
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
          if (st) st.textContent = `✅ تصویر کاور آماده آپلود: ${file.name}`;
        };
        reader.readAsDataURL(file);
      };
    }
  },

  async handleCreateVideo(e) {
    e.preventDefault();
    const checkedCats = Array.from(document.querySelectorAll('input[name="newVidCatCheck"]:checked')).map(
      (el) => el.value
    );

    const payload = {
      title: document.getElementById('newVidTitle').value.trim(),
      performer: document.getElementById('newVidPerformer').value.trim(),
      streamUrl: document.getElementById('newVidStreamUrl').value.trim(),
      quality: document.getElementById('newVidQuality').value,
      duration: document.getElementById('newVidDuration').value.trim(),
      description: document.getElementById('newVidDesc').value.trim(),
      isVip: document.getElementById('newVidVip').checked,
      isFeatured: document.getElementById('newVidFeatured').checked,
      categories: checkedCats.length ? checkedCats : ['4K Ultra HD'],
      videoFileData: this.uploadedVideoBase64 || undefined,
      videoFileName: this.uploadedVideoName || undefined,
      thumbnailFileData: this.uploadedThumbBase64 || undefined,
      thumbnailFileName: this.uploadedThumbName || undefined
    };

    const res = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.token
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      this.uploadedVideoBase64 = '';
      this.uploadedThumbBase64 = '';
      window.VelvetToast.show(data.message, 'success');
      await this.loadDashboard();
      if (window.VelvetApp) window.VelvetApp.loadInitialData();
      this.switchTab('manage-videos');
    } else {
      window.VelvetToast.show(data.message || 'خطا در ثبت ویدیو', 'warning');
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
      window.VelvetToast.show(`دسته‌بندی انگلیسی ${payload.name} اضافه شد!`, 'success');
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
