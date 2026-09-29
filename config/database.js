/**
 * config/database.js
 * Persistent JSON-backed NoSQL/Document Storage Engine with Atomic Writes & Auto-Seeding
 */
const fs = require('fs');
const path = require('path');
const appConfig = require('./app.config');
const securityConfig = require('./security.config');
const {
  ENGLISH_CATEGORIES,
  VERIFIED_PERFORMERS,
  INITIAL_VIDEOS
} = require('./categories.seed');

const DB_FILE = path.resolve(__dirname, '..', 'data', 'db.json');

class DatabaseEngine {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        this.data.settings.adminSecretKey = 'Vx#9Qm!72Lz@4Rk$';
        // Ensure new fields exist on upgraded databases
        if (!this.data.settings.vipPriceText) {
          this.data.settings.vipPriceText = '۲۰۰,۰۰۰ تومان';
          this.data.settings.vipDurationDays = 30;
          this.data.settings.vipPlanTitle = 'اشتراک ویژه یک‌ماهه (VIP)';
          this.data.settings.vipPaymentInfo = 'جهت دریافت آنی کد اشتراک یک‌ماهه (۲۰۰ هزار تومان) از طریق درگاه یا پشتیبانی اقدام نمایید.';
          this.data.settings.vipPaymentUrl = '';
          this.data.settings.vipCardNumber = '';
          this.data.settings.vipSupportTelegram = '';
        }
        if (!Array.isArray(this.data.vipCodes)) {
          this.data.vipCodes = [
            {
              id: 'vip-default-1',
              code: 'VIP-2026',
              note: 'کد اشتراک تست یک‌ماهه',
              durationDays: 30,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString()
            }
          ];
        }
      } catch (err) {
        console.error('[DB] Corrupted db.json, re-initializing with seed data:', err.message);
        this.seedDefault();
      }
    } else {
      this.seedDefault();
    }
  }

  seedDefault() {
    this.data = {
      settings: {
        siteName: 'VELVETVAULT',
        siteTagline: 'Licensed 18+ Adult Cinema & 4K VOD Network',
        licenseActive: appConfig.license.active,
        licenseNumber: appConfig.license.registrationNumber,
        licenseAuthority: appConfig.license.authority,
        ageGateEnabled: appConfig.license.ageGateEnabled,
        minimumAge: appConfig.license.minimumAge,
        adminSecretKey: 'Vx#9Qm!72Lz@4Rk$',
        stealthAdminPath: securityConfig.stealthAdminPath,
        announcementBanner: 'Official Licensed 18+ Adult Entertainment Portal • New 4K 60FPS & VR Streams Added Daily',
        allowComments: true,
        allowDownloads: true,
        // VIP 1-Month 200,000 Toman Subscription Settings
        vipPriceText: '۲۰۰,۰۰۰ تومان',
        vipDurationDays: 30,
        vipPlanTitle: 'اشتراک ویژه یک‌ماهه (VIP)',
        vipPaymentInfo: 'با تهیه اشتراک ویژه یک‌ماهه (۲۰۰,۰۰۰ تومان) به تمام ویدیوهای پرمیوم با کیفیت 4K دسترسی نامحدود خواهید داشت.',
        vipPaymentUrl: '',
        vipCardNumber: '',
        vipSupportTelegram: ''
      },
      vipCodes: [
        {
          id: 'vip-default-1',
          code: 'VIP-2026',
          note: 'کد اشتراک یک‌ماهه پیش‌فرض',
          durationDays: 30,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString()
        }
      ],
      categories: ENGLISH_CATEGORIES,
      performers: VERIFIED_PERFORMERS,
      videos: INITIAL_VIDEOS,
      comments: [
        {
          id: 'cmt-1',
          videoId: 'vid-1001',
          user: 'VIP_Member_99',
          text: 'Incredible 4K 60FPS bitrate and lighting. Best studio quality on the platform!',
          createdAt: '2026-09-29T10:15:00Z'
        },
        {
          id: 'cmt-2',
          videoId: 'vid-1001',
          user: 'CinemaLover_X',
          text: 'Eva Laurent never disappoints. Smooth streaming with zero buffering.',
          createdAt: '2026-09-29T12:40:00Z'
        }
      ],
      auditLogs: [
        {
          id: 'log-init',
          action: 'SYSTEM_INITIALIZED',
          ip: '127.0.0.1',
          details: 'VelvetVault Ubuntu Streaming Engine initialized with Official License & 50 English Categories',
          timestamp: new Date().toISOString()
        }
      ],
      analytics: {
        totalViews: 5745100,
        activeStreams: 142,
        bandwidthUsedGb: 1840.5
      }
    };
    this.save();
  }

  save() {
    try {
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to save database:', err.message);
    }
  }

  getState() {
    return this.data;
  }

  addAuditLog(action, ip, details) {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      ip: ip || 'unknown',
      details,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 150) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 150);
    }
    this.save();
    return entry;
  }
}

module.exports = new DatabaseEngine();
