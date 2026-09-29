/**
 * public/js/age-gate.js
 * 18+ Age Verification Gate & VIP 1-Month Subscription Manager (200,000 Toman)
 */

window.VelvetToast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast-msg';
    if (type === 'success') el.style.borderLeftColor = '#10b981';
    if (type === 'warning') el.style.borderLeftColor = '#f59e0b';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }
};

window.AgeGateManager = {
  init(siteConfig = {}) {
    const backdrop = document.getElementById('ageGateBackdrop');
    if (!backdrop) return;

    const licenseNumEl = document.getElementById('ageGateLicenseNum');
    if (licenseNumEl && siteConfig.licenseNumber) {
      licenseNumEl.textContent = siteConfig.licenseNumber;
    }

    const verified = localStorage.getItem('vv_age_verified_18') === 'true';
    if (siteConfig.ageGateEnabled === false || verified) {
      backdrop.style.display = 'none';
    } else {
      backdrop.style.display = 'flex';
    }

    const enterBtn = document.getElementById('btnAgeEnter');
    if (enterBtn) {
      enterBtn.onclick = () => {
        localStorage.setItem('vv_age_verified_18', 'true');
        backdrop.style.display = 'none';
        window.VelvetToast.show('تایید سنی +18 انجام شد. خوش آمدید!', 'success');
      };
    }

    const exitBtn = document.getElementById('btnAgeExit');
    if (exitBtn) {
      exitBtn.onclick = () => {
        window.location.href = 'https://www.google.com';
      };
    }
  }
};

window.VipSubscriptionManager = {
  pendingVideoId: null,

  hasActiveSubscription() {
    const until = parseInt(localStorage.getItem('vv_vip_active_until') || '0', 10);
    return until > Date.now();
  },

  getRemainingDays() {
    const until = parseInt(localStorage.getItem('vv_vip_active_until') || '0', 10);
    if (until <= Date.now()) return 0;
    return Math.max(1, Math.ceil((until - Date.now()) / (86400 * 1000)));
  },

  updateHeaderBadge() {
    const btn = document.getElementById('headerVipStatusBtn');
    const subCfg = window.VelvetApp?.config?.vipSubscription || {};
    const priceText = subCfg.priceText || '۲۰۰,۰۰۰ تومان';

    if (!btn) return;
    if (this.hasActiveSubscription()) {
      const days = this.getRemainingDays();
      btn.innerHTML = `👑 اشتراک VIP فعال (${days} روز)`;
      btn.style.borderColor = '#10b981';
      btn.style.color = '#34d399';
    } else {
      btn.innerHTML = `💎 اشتراک یک‌ماهه (${priceText})`;
    }
  },

  openModal(lockedVideo = null) {
    this.pendingVideoId = lockedVideo ? lockedVideo.id : null;
    const backdrop = document.getElementById('vipSubscriptionModalBackdrop');
    const root = document.getElementById('vipSubscriptionModalContent');
    if (!backdrop || !root) return;

    const subCfg = window.VelvetApp?.config?.vipSubscription || {};
    const planTitle = subCfg.planTitle || 'اشتراک ویژه یک‌ماهه (VIP)';
    const priceText = subCfg.priceText || '۲۰۰,۰۰۰ تومان';
    const paymentInfo =
      subCfg.paymentInfo ||
      'با تهیه اشتراک ویژه یک‌ماهه به تمامی ویدیوهای پرمیوم و اختصاصی 4K بدون هیچ محدودیتی دسترسی خواهید داشت.';
    const paymentUrl = subCfg.paymentUrl || '';
    const cardNumber = subCfg.cardNumber || '';
    const supportTelegram = subCfg.supportTelegram || '';
    const isActive = this.hasActiveSubscription();

    root.innerHTML = `
      <div class="admin-login-box" style="max-width:520px;border-color:#f59e0b;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="color:#fcd34d;font-size:20px;display:flex;align-items:center;gap:8px;">
            <span>👑 ${planTitle}</span>
          </h2>
          <button onclick="window.VipSubscriptionManager.closeModal()" class="player-close-btn">بستن ✕</button>
        </div>

        ${
          lockedVideo
            ? `
          <div style="background:rgba(225,29,72,0.14);border:1px solid rgba(225,29,72,0.4);border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#fda4af;">
            🔒 ویدیوی <strong>«${lockedVideo.title}»</strong> مخصوص اعضای پرمیوم (VIP) است. برای تماشای این ویدیو و تمام ویدیوهای پرمیوم، اشتراک یک‌ماهه تهیه نمایید.
          </div>
        `
            : ''
        }

        <!-- Pricing Plan Box -->
        <div style="background:linear-gradient(135deg, rgba(245,158,11,0.16), rgba(225,29,72,0.14));border:1px solid rgba(245,158,11,0.45);border-radius:16px;padding:20px;text-align:center;margin-bottom:18px;">
          <div style="font-size:13px;color:#fcd34d;font-weight:700;margin-bottom:4px;">پکیج کامل دسترسی ۳۰ روزه به تمام ویدیوهای VIP</div>
          <div style="font-size:30px;font-weight:900;color:#fff;margin:6px 0;">${priceText}</div>
          <div style="font-size:12.5px;color:#d4d4d8;line-height:1.6;margin-top:8px;">
            ${paymentInfo}
          </div>
          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:#34d399;font-weight:700;">
            <span>✓ باز شدن تمام فیلم‌های پرمیوم</span>
            <span>✓ پخش آنلاین 4K بدون محدودیت</span>
            <span>✓ اعتبار ۳۰ روز کامل</span>
          </div>
        </div>

        ${
          isActive
            ? `
          <div style="background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.4);border-radius:12px;padding:14px;text-align:center;color:#34d399;font-weight:700;margin-bottom:14px;">
            ✅ اشتراک ویژه شما در حال حاضر فعال است (${this.getRemainingDays()} روز باقی‌مانده)
          </div>
        `
            : ''
        }

        <!-- Payment Methods (if configured by Admin) -->
        ${
          paymentUrl || cardNumber || supportTelegram
            ? `
          <div style="background:#0b0b14;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px;margin-bottom:18px;font-size:13px;line-height:1.9;">
            <div style="color:#fcd34d;font-weight:800;margin-bottom:6px;">💳 روش خرید و دریافت کد اشتراک یک‌ماهه:</div>
            ${
              cardNumber
                ? `<div>شماره کارت جهت واریز: <code style="color:#fff;font-size:14px;direction:ltr;display:inline-block;background:#181828;padding:2px 8px;border-radius:6px;">${cardNumber}</code></div>`
                : ''
            }
            ${
              supportTelegram
                ? `<div>آیدی پشتیبانی (جهت دریافت آنی کد اشتراک): <strong style="color:#34d399;direction:ltr;display:inline-block;">${supportTelegram}</strong></div>`
                : ''
            }
            ${
              paymentUrl
                ? `<a href="${paymentUrl}" target="_blank" rel="noopener noreferrer" class="btn-admin-gold" style="display:block;text-align:center;text-decoration:none;margin-top:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;">🔗 پرداخت آنلاین و خرید اشتراک (${priceText})</a>`
                : ''
            }
          </div>
        `
            : ''
        }

        <!-- Redeem VIP Subscription Code Form -->
        <form onsubmit="window.VipSubscriptionManager.redeemCode(event)" style="background:#0b0b14;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px;">
          <label class="admin-label" style="margin-bottom:8px;">
            <span>🔑 کد اشتراک ویژه (VIP Code) دارید؟ اینجا وارد کنید:</span>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input
              id="vipCodeRedeemInput"
              type="text"
              class="admin-input"
              style="flex:1;direction:ltr;text-align:center;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;"
              placeholder="VIP-XXXX-XXX"
              required
            />
            <button type="submit" class="btn-admin-gold" style="padding:12px 20px;">
              فعال‌سازی اشتراک
            </button>
          </div>
        </form>
      </div>
    `;

    backdrop.classList.add('open');
  },

  closeModal() {
    const backdrop = document.getElementById('vipSubscriptionModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  },

  async redeemCode(e) {
    e.preventDefault();
    const code = document.getElementById('vipCodeRedeemInput').value.trim();
    if (!code) return;

    const res = await fetch('/api/vip/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!data.success) {
      window.VelvetToast.show(data.message || 'کد اشتراک نامعتبر است.', 'warning');
      return;
    }

    const expiresMs = data.expiresAt
      ? new Date(data.expiresAt).getTime()
      : Date.now() + 30 * 86400 * 1000;
    localStorage.setItem('vv_vip_active_until', String(expiresMs));
    localStorage.setItem('vv_vip_code', data.code);

    this.updateHeaderBadge();
    this.closeModal();
    window.VelvetToast.show(data.message, 'success');

    if (this.pendingVideoId) {
      const vidId = this.pendingVideoId;
      this.pendingVideoId = null;
      window.VideoPlayerModal.open(vidId);
    }
  }
};
