/*
 * موتور محاسبه‌ی نتایج (بدون وابستگی به DOM — قابل تست با Node)
 *
 * ورودی: answers = { [questionId]: indexOfChosenOption }  (از 0 تا 3)
 * خروجی: گزارش کامل شخصیت
 */
(function (root) {
  'use strict';

  var content = (typeof module !== 'undefined' && module.exports)
    ? require('./content.js')
    : root.PERSONALITY_CONTENT;

  var LOW_MAX = 40;   // کمتر از این = پایین
  var HIGH_MIN = 60;  // بیشتر از این = بالا

  function levelOf(pct) {
    if (pct < LOW_MAX) return 'low';
    if (pct > HIGH_MIN) return 'high';
    return 'mid';
  }

  // تبدیل مجموع امتیازهای ۶ سؤال هر بُعد (۶ تا ۲۴) به درصد (۰ تا ۱۰۰)
  function toPercent(raw, count) {
    var min = count * 1;
    var max = count * 4;
    return Math.round(((raw - min) / (max - min)) * 100);
  }

  function computeTraits(answers) {
    var result = {};
    content.TRAIT_ORDER.forEach(function (key) {
      result[key] = { key: key, raw: 0, count: 0, answered: 0, pct: 50, level: 'mid' };
    });

    content.QUESTIONS.forEach(function (q) {
      var t = result[q.trait];
      t.count += 1;
      var idx = answers[q.id];
      if (typeof idx === 'number' && q.options[idx]) {
        t.raw += q.options[idx].score;
        t.answered += 1;
      }
    });

    content.TRAIT_ORDER.forEach(function (key) {
      var t = result[key];
      // اگر سؤالی پاسخ داده نشده باشد، درصد را از پاسخ‌های موجود محاسبه می‌کنیم
      t.pct = t.answered ? toPercent(t.raw, t.answered) : 50;
      t.level = levelOf(t.pct);
      t.info = content.TRAITS[key];
      t.text = content.TRAIT_TEXT[key][t.level];
    });
    return result;
  }

  // نوع شخصیتی: بیشترین تطابق با وزن‌های هر نوع
  function pickArchetype(traits) {
    var ranked = content.ARCHETYPES.map(function (a) {
      var score = 0;
      Object.keys(a.weights).forEach(function (k) {
        score += a.weights[k] * ((traits[k].pct - 50) / 50);
      });
      return { archetype: a, score: score };
    });
    ranked.sort(function (x, y) { return y.score - x.score; });
    return ranked[0].archetype;
  }

  function isComplete(answers) {
    return content.QUESTIONS.every(function (q) {
      var idx = answers[q.id];
      return typeof idx === 'number' && !!q.options[idx];
    });
  }

  function buildReport(answers) {
    var traits = computeTraits(answers);

    // ترتیب ابعاد بر اساس شدت (فاصله از میانه ۵۰)
    var byExtreme = content.TRAIT_ORDER
      .map(function (k) { return traits[k]; })
      .sort(function (a, b) { return Math.abs(b.pct - 50) - Math.abs(a.pct - 50); });

    var strongest = byExtreme[0];
    var second = byExtreme[1];

    var strengths = [];
    var weaknesses = [];
    byExtreme.slice(0, 3).forEach(function (t) {
      t.text.strengths.slice(0, 2).forEach(function (s) {
        strengths.push({ trait: t.info.name, text: s });
      });
      t.text.weaknesses.slice(0, 1).forEach(function (w) {
        weaknesses.push({ trait: t.info.name, text: w });
      });
    });

    var archetype = pickArchetype(traits);

    var analysis = [
      archetype.intro,
      'بارزترین ویژگی شخصیتی تو «' + strongest.info.name + '» است؛ ' + strongest.text.desc,
      'برای رشد بیشتر، روی «' + second.info.name + '» تمرکز کن. ' + second.text.tip
    ];

    return {
      complete: isComplete(answers),
      traits: content.TRAIT_ORDER.map(function (k) { return traits[k]; }),
      archetype: archetype,
      strongest: strongest,
      second: second,
      strengths: strengths,
      weaknesses: weaknesses,
      analysis: analysis
    };
  }

  var api = {
    LOW_MAX: LOW_MAX,
    HIGH_MIN: HIGH_MIN,
    levelOf: levelOf,
    toPercent: toPercent,
    computeTraits: computeTraits,
    pickArchetype: pickArchetype,
    isComplete: isComplete,
    buildReport: buildReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PERSONALITY_ENGINE = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
