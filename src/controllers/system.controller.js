/**
 * src/controllers/system.controller.js
 * Public system configuration, Official License badge data, VIP Subscription Verification & Health Check
 */
const db = require('../../config/database');
const appConfig = require('../../config/app.config');
const { sendJson, parseJsonBody } = require('../utils/helpers');

class SystemController {
  static getHealth(req, res) {
    return sendJson(res, 200, {
      status: 'ONLINE',
      app: appConfig.appName,
      version: appConfig.version,
      timestamp: new Date().toISOString()
    });
  }

  static getPublicConfig(req, res) {
    const state = db.getState();
    const s = state.settings;

    return sendJson(res, 200, {
      success: true,
      config: {
        siteName: s.siteName,
        siteTagline: s.siteTagline,
        licenseActive: s.licenseActive,
        licenseNumber: s.licenseNumber,
        licenseAuthority: s.licenseAuthority,
        complianceCode: appConfig.license.complianceCode,
        ageGateEnabled: s.ageGateEnabled,
        minimumAge: s.minimumAge,
        announcementBanner: s.announcementBanner,
        stealthAdminPath: s.stealthAdminPath,
        totalCategories: state.categories.length,
        totalVideos: state.videos.length,
        totalPerformers: state.performers.length,
        vipSubscription: {
          planTitle: s.vipPlanTitle || 'اشتراک ویژه یک‌ماهه (VIP)',
          priceText: s.vipPriceText || '۲۰۰,۰۰۰ تومان',
          durationDays: s.vipDurationDays || 30,
          paymentInfo:
            s.vipPaymentInfo ||
            'با تهیه اشتراک ویژه یک‌ماهه (۲۰۰,۰۰۰ تومان) به تمام ویدیوهای پرمیوم با کیفیت 4K دسترسی نامحدود خواهید داشت.',
          paymentUrl: s.vipPaymentUrl || '',
          cardNumber: s.vipCardNumber || '',
          supportTelegram: s.vipSupportTelegram || ''
        }
      }
    });
  }

  static async verifyVipCode(req, res) {
    try {
      const body = await parseJsonBody(req);
      const codeInput = String(body.code || '').trim().toUpperCase();
      if (!codeInput) {
        return sendJson(res, 400, {
          success: false,
          message: 'لطفاً کد اشتراک VIP را وارد کنید.'
        });
      }

      const state = db.getState();
      const found = (state.vipCodes || []).find(
        (c) => String(c.code || '').toUpperCase() === codeInput
      );

      if (!found) {
        return sendJson(res, 401, {
          success: false,
          message: 'کد اشتراک وارد شده معتبر نیست!'
        });
      }

      if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
        return sendJson(res, 401, {
          success: false,
          message: 'مهلت یک‌ماهه این کد اشتراک به پایان رسیده است.'
        });
      }

      return sendJson(res, 200, {
        success: true,
        code: found.code,
        expiresAt: found.expiresAt,
        message: '🎉 اشتراک ویژه یک‌ماهه (VIP) شما با موفقیت فعال شد! اکنون به تمام ویدیوهای پرمیوم دسترسی دارید.'
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }
}

module.exports = SystemController;
