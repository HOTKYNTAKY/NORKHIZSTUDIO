/*
 * موتور محاسبه‌ی نتایج (بدون وابستگی به DOM — قابل تست با Node)
 *
 * ورودی: answers = { [questionId]: indexOfChosenOption }  (از 0 تا 3)
 * خروجی: گزارش کامل (ابعاد، الگوی دلبستگی، نقاط قوت/رشد، تحلیل، وضعیت ایمنی)
 */
(function (root) {
  'use strict';

  var content = (typeof module !== 'undefined' && module.exports)
    ? require('./content.js')
    : root.PERSONALITY_CONTENT;

  var LOW_MAX = 40;   // کمتر از این = سطح پایین
  var HIGH_MIN = 60;  // بیشتر از این = سطح بالا

  function levelOf(pct) {
    if (pct < LOW_MAX) return 'low';
    if (pct > HIGH_MIN) return 'high';
    return 'mid';
  }

  // مجموع امتیازهای n سؤال (از n تا 4n) به درصد ۰ تا ۱۰۰
  function toPercent(raw, count) {
    var min = count * 1;
    var max = count * 4;
    return Math.round(((raw - min) / (max - min)) * 100);
  }

  // «سلامت» هر بُعد: در ابعاد ریسکی، پایین‌بودن بهتر است
  function healthOf(dim) {
    return dim.info.direction === 'risk' ? 100 - dim.pct : dim.pct;
  }

  function computeDimensions(answers) {
    var result = {};
    content.DIMENSION_ORDER.forEach(function (key) {
      result[key] = { key: key, raw: 0, count: 0, answered: 0, pct: 50, level: 'mid' };
    });

    content.QUESTIONS.forEach(function (q) {
      var d = result[q.dim];
      d.count += 1;
      var idx = answers[q.id];
      if (typeof idx === 'number' && q.options[idx]) {
        d.raw += q.options[idx].score;
        d.answered += 1;
      }
    });

    content.DIMENSION_ORDER.forEach(function (key) {
      var d = result[key];
      d.pct = d.answered ? toPercent(d.raw, d.answered) : 50;
      d.level = levelOf(d.pct);
      d.info = content.DIMENSIONS[key];
      d.text = content.DIM_TEXT[key][d.level];
      d.levelLabel = d.info.levelLabels[d.level];
      d.health = healthOf(d);
    });
    return result;
  }

  // الگوی دلبستگی بر اساس ANX (نگرانی) و AVO (فاصله‌گیری)
  function pickPattern(dims) {
    var anx = dims.ANX.pct;
    var avo = dims.AVO.pct;
    if (anx > HIGH_MIN && avo > HIGH_MIN) return content.PATTERNS.fearful;
    if (anx > HIGH_MIN) return content.PATTERNS.anxious;
    if (avo > HIGH_MIN) return content.PATTERNS.avoidant;
    if (anx < LOW_MAX && avo < LOW_MAX) return content.PATTERNS.secure;
    return content.PATTERNS.mixed;
  }

  // وضعیت ایمنی از سؤال مربوط به خودآسیبی (امتیاز ۱ = خطر فوری، ۲ = نگران‌کننده)
  function safetyStatus(answers) {
    var status = 'none';
    content.QUESTIONS.forEach(function (q) {
      if (!q.safety) return;
      var idx = answers[q.id];
      if (typeof idx !== 'number' || !q.options[idx]) return;
      var s = q.options[idx].score;
      if (s === 1) status = 'urgent';
      else if (s === 2 && status !== 'urgent') status = 'gentle';
    });
    return status;
  }

  function isComplete(answers) {
    return content.QUESTIONS.every(function (q) {
      var idx = answers[q.id];
      return typeof idx === 'number' && !!q.options[idx];
    });
  }

  function buildReport(answers) {
    var dims = computeDimensions(answers);
    var ordered = content.DIMENSION_ORDER.map(function (k) { return dims[k]; });

    // نقاط قوت: از سالم‌ترین ابعاد
    var byHealth = ordered.slice().sort(function (a, b) { return b.health - a.health; });
    var strengths = [];
    byHealth.slice(0, 3).forEach(function (d) {
      d.text.strengths.slice(0, 2).forEach(function (s) {
        strengths.push({ dim: d.info.name, text: s });
      });
    });

    // نقاط رشد: از ابعادی که سلامت‌شان پایین است
    var needWork = ordered
      .filter(function (d) { return d.health < 60; })
      .sort(function (a, b) { return a.health - b.health; });
    var growth = [];
    needWork.slice(0, 3).forEach(function (d) {
      d.text.growth.slice(0, 2).forEach(function (g) {
        growth.push({ dim: d.info.name, text: g });
      });
    });
    if (growth.length === 0) {
      growth.push({ dim: 'کلی', text: 'در بیشتر ابعاد وضعیت نسبتاً خوبی داری. حفظ این تعادل و ادامه‌ی گفتگو با خودت مهم است.' });
    }

    // اولویت رشد: پایین‌ترین سلامت
    var priority = byHealth[byHealth.length - 1];
    var pattern = pickPattern(dims);
    var safety = safetyStatus(answers);

    // بخش تحلیل
    var famSelf = (dims.FAM.health < 40 ? 1 : 0) + (dims.SELF.health < 40 ? 1 : 0);
    var famSelfText;
    if (famSelf === 2) {
      famSelfText = 'احساس کم‌پذیرشی در خانواده و ارزش شخصی ضعیف‌تر، معمولاً باعث می‌شود بعد از جدایی، ماجرا را «تقصیر خودم بود» بفهمی. این تفسیر شاید دردناک‌تر از واقعیت باشد؛ پایان یک رابطه، لزوماً حکم ارزش تو نیست.';
    } else if (famSelf === 1) {
      famSelfText = 'یکی از دو بُعد «ارزش شخصی» یا «پذیرش در خانواده» بیشتر زیر فشار است. همین می‌تواند روی نحوه‌ی تفسیر جدایی و انتظار از رابطه‌ی بعدی اثر بگذارد.';
    } else {
      famSelfText = 'با وجود زخم‌های گذشته، احساس ارزش و پذیرش در تو تا حد خوبی پایدار است. این پایه‌ی مناسبی برای رابطه‌ی سالم بعدی است.';
    }

    var analysis = [
      pattern.intro,
      famSelfText,
      'اولویت رشد تو «' + priority.info.name + '» است. ' + priority.text.tip
    ];

    var needsProfessional = dims.HEAL.health < 40 || safety !== 'none';
    if (needsProfessional) {
      analysis.push('زخم‌هایی مثل این، معمولاً با کمک یک روان‌درمانگر یا مشاور بهتر پردازش می‌شوند. این یک نشانه‌ی ضعف نیست؛ انتخاب آگاهانه‌ی کسی است که می‌خواهد زودتر آرام شود.');
    }

    return {
      complete: isComplete(answers),
      dims: ordered,
      pattern: pattern,
      strongest: byHealth[0],
      priority: priority,
      strengths: strengths,
      growth: growth,
      analysis: analysis,
      safety: safety,
      needsProfessional: needsProfessional
    };
  }

  var api = {
    LOW_MAX: LOW_MAX,
    HIGH_MIN: HIGH_MIN,
    levelOf: levelOf,
    toPercent: toPercent,
    computeDimensions: computeDimensions,
    pickPattern: pickPattern,
    safetyStatus: safetyStatus,
    isComplete: isComplete,
    buildReport: buildReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PERSONALITY_ENGINE = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
