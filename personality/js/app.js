/*
 * منطق رابط کاربری «مسیر بهبود و دلبستگی»
 * - ذخیره‌ی خودکار پیشرفت در localStorage (فقط در مرورگر کاربر)
 * - سه نما: معرفی، آزمون، نتیجه
 * - تأیید «شروع دوباره» داخل صفحه انجام می‌شود (بدون window.confirm)
 */
(function () {
  'use strict';

  var C = window.PERSONALITY_CONTENT;
  var E = window.PERSONALITY_ENGINE;

  var STORAGE_KEY = 'kavosh-shakhsiat:v1';
  var QUESTIONS = C.QUESTIONS;
  var TOTAL = QUESTIONS.length;

  var nf = new Intl.NumberFormat('fa-IR');
  function fa(n) { return nf.format(n); }
  function pct(n) { return fa(n) + '٪'; }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- ذخیره‌سازی ----------
  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !s.answers || typeof s.answers !== 'object') return null;
      if (typeof s.index !== 'number' || s.index < 0 || s.index >= TOTAL) s.index = 0;
      return s;
    } catch (e) { return null; }
  }

  var state = loadState() || { view: 'intro', index: 0, answers: {} };

  function saveState() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* حالت خصوصی */ }
  }

  function answeredCount() {
    return QUESTIONS.filter(function (q) { return typeof state.answers[q.id] === 'number'; }).length;
  }
  function isDone() { return E.isComplete(state.answers); }

  function resetState(view) {
    state = { view: view || 'intro', index: 0, answers: {} };
    saveState();
  }

  // ---------- عناصر DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var views = { intro: $('view-intro'), quiz: $('view-quiz'), result: $('view-result') };
  var el = {
    progressChip: $('progressChip'),
    progressBar: document.getElementById('progressBar'),
    progressWrap: document.querySelector('.progress'),
    qCounter: $('qCounter'),
    qPercent: $('qPercent'),
    questionCard: $('questionCard'),
    questionText: $('questionText'),
    options: $('options'),
    btnPrev: $('btnPrev'),
    btnNext: $('btnNext'),
    btnStart: $('btnStart'),
    btnResume: $('btnResume'),
    resultRoot: $('resultRoot')
  };

  function titleFor(name) {
    if (name === 'quiz') return 'آزمون — سؤال ' + fa(state.index + 1) + ' از ' + fa(TOTAL);
    if (name === 'result') return 'نتیجه‌ی تحلیل تو — مسیر بهبود و دلبستگی';
    return 'مسیر بهبود و دلبستگی — آزمون ۳۰ سؤالی';
  }

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    el.progressChip.hidden = name !== 'quiz';
    state.view = name;
    saveState();
    window.scrollTo(0, 0);
    document.title = titleFor(name);
  }

  // ---------- آزمون ----------
  function updateProgress() {
    var answered = answeredCount();
    var answeredPct = Math.round((answered / TOTAL) * 100);
    var current = state.index + (typeof state.answers[QUESTIONS[state.index].id] === 'number' ? 1 : 0);
    el.progressBar.style.width = ((current / TOTAL) * 100).toFixed(1) + '%';
    el.progressWrap.setAttribute('aria-valuenow', String(answered));
    el.qPercent.textContent = pct(answeredPct);
    el.progressChip.textContent = fa(answeredPct) + '٪ کامل';
  }

  function renderQuestion() {
    var q = QUESTIONS[state.index];
    var chosen = state.answers[q.id];

    el.qCounter.textContent = 'سؤال ' + fa(state.index + 1) + ' از ' + fa(TOTAL);
    el.questionText.textContent = q.text;
    updateProgress();

    el.options.innerHTML = '';
    q.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(chosen === i));
      btn.innerHTML = '<span class="key">' + fa(i + 1) + '</span><span>' + esc(opt.text) + '</span>';
      btn.addEventListener('click', function () { choose(i); });
      el.options.appendChild(btn);
    });

    el.btnPrev.disabled = state.index === 0;
    el.btnNext.disabled = typeof chosen !== 'number';
    el.btnNext.textContent = state.index === TOTAL - 1 ? 'مشاهده‌ی نتیجه' : 'سؤال بعدی';

    el.questionCard.style.animation = 'none';
    void el.questionCard.offsetWidth;
    el.questionCard.style.animation = '';

    document.title = titleFor('quiz');
    saveState();
  }

  function choose(i) {
    var q = QUESTIONS[state.index];
    state.answers[q.id] = i;
    el.options.querySelectorAll('.option').forEach(function (b, idx) {
      b.setAttribute('aria-checked', String(idx === i));
    });
    el.btnNext.disabled = false;
    updateProgress();
    saveState();
    // فوکوس را آزاد می‌کنیم تا میانبرهای کیبورد همیشه فعال بمانند
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
      document.activeElement.blur();
    }
  }

  function next() {
    if (typeof state.answers[QUESTIONS[state.index].id] !== 'number') return;
    if (state.index < TOTAL - 1) {
      state.index += 1;
      renderQuestion();
    } else {
      finish();
    }
  }

  function prev() {
    if (state.index === 0) return;
    state.index -= 1;
    renderQuestion();
  }

  function startQuiz(at) {
    state.index = typeof at === 'number' ? at : state.index;
    show('quiz');
    renderQuestion();
  }

  function finish() {
    renderResult();
    show('result');
  }

  // تأیید درون‌صفحه‌ای (بدون window.confirm، چون بعضی مرورگرها/پیش‌نمایش‌ها آن را مسدود می‌کنند):
  // کلیک اول دکمه را «تأیید» می‌کند و کلیک دوم عملیات را انجام می‌دهد؛ اگر تأیید نشود، بعد از ۵ ثانیه برمی‌گردد.
  function confirmClick(button, needsConfirm, armedLabel, action) {
    var idle = '';
    var armed = false;
    var timer = null;
    function disarm() {
      clearTimeout(timer);
      armed = false;
      button.classList.remove('is-armed');
      if (idle) button.textContent = idle;
    }
    button.addEventListener('click', function () {
      if (!needsConfirm()) { disarm(); action(); return; }
      if (armed) { disarm(); action(); return; }
      idle = button.textContent;
      armed = true;
      button.classList.add('is-armed');
      button.textContent = armedLabel;
      timer = setTimeout(disarm, 5000);
    });
  }

  el.btnPrev.addEventListener('click', prev);
  el.btnNext.addEventListener('click', next);

  el.btnResume.addEventListener('click', function () {
    startQuiz(state.index);
  });

  confirmClick(
    el.btnStart,
    function () { return answeredCount() > 0; },
    'مطمئنی؟ دوباره بزن تا پاسخ‌های قبلی پاک شوند',
    function () { resetState('quiz'); startQuiz(0); }
  );

  // کلیدهای میانبر: ۱ تا ۴ برای انتخاب، جهت‌نماها برای حرکت (در RTL: راست = قبلی، چپ = بعدی)
  document.addEventListener('keydown', function (e) {
    if (state.view !== 'quiz' || e.ctrlKey || e.metaKey || e.altKey) return;
    var onBody = e.target === document || e.target === document.body || e.target === document.documentElement;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && QUESTIONS[state.index].options[n - 1]) {
      choose(n - 1);
    } else if (e.key === 'ArrowRight' && onBody) {
      prev();
    } else if (e.key === 'ArrowLeft' && onBody && !el.btnNext.disabled) {
      next();
    } else if (e.key === 'Enter' && onBody && !el.btnNext.disabled) {
      e.preventDefault();
      next();
    }
  });

  document.querySelector('[data-action="home"]').addEventListener('click', function (e) {
    e.preventDefault();
    showIntro();
  });

  function showIntro() {
    var hasProgress = answeredCount() > 0 && !isDone();
    el.btnResume.hidden = !hasProgress;
    el.btnStart.textContent = hasProgress ? 'شروع دوباره' : 'شروع آزمون';
    show('intro');
  }

  // ---------- نتیجه ----------
  function radarSVG(dims) {
    var cx = 180, cy = 180, R = 104, n = dims.length;
    function point(i, r) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function poly(fn) {
      return dims.map(function (d, i) { return fn(d, i).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
    }
    var grid = [0.25, 0.5, 0.75, 1].map(function (f) {
      return '<polygon class="radar-grid" points="' + poly(function (d, i) { return point(i, R * f); }) + '"/>';
    }).join('');
    var axes = dims.map(function (d, i) {
      var p = point(i, R);
      return '<line class="radar-axis" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>';
    }).join('');
    var radius = function (d) { return R * Math.max(d.pct, 4) / 100; };
    var shape = '<polygon class="radar-shape" points="' + poly(function (d, i) { return point(i, radius(d)); }) + '"/>';
    var dots = dims.map(function (d, i) {
      var p = point(i, radius(d));
      return '<circle class="radar-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" stroke="' + d.info.color + '"/>';
    }).join('');
    var labels = dims.map(function (d, i) {
      var p = point(i, R + 30);
      var anchor = Math.abs(p[0] - cx) < 4 ? 'middle' : (p[0] > cx ? 'start' : 'end');
      return '<text class="radar-label" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 5).toFixed(1) +
        '" text-anchor="' + anchor + '" fill="' + d.info.color + '">' + esc(d.info.radar) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 360 360" role="img" aria-label="نمودار شش بُعد">' +
      '<defs><linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#7c3aed" stop-opacity="0.30"/>' +
      '<stop offset="100%" stop-color="#ec4899" stop-opacity="0.22"/></linearGradient></defs>' +
      grid + axes + shape + dots + labels + '</svg>';
  }

  function dimCard(d) {
    var strengths = d.text.strengths.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var growth = d.text.growth.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var riskNote = d.info.direction === 'risk' ? '<span class="dir-note">هرچه پایین‌تر، بهتر</span>' : '';
    return '' +
      '<article class="card trait" style="--c:' + d.info.color + '">' +
      '  <div class="trait-head">' +
      '    <div><h3>' + esc(d.info.name) + '</h3><p>' + esc(d.info.short) + '</p></div>' +
      '    <div class="score">' + pct(d.pct) + '</div>' +
      '  </div>' +
      '  <div class="bar" role="img" aria-label="' + esc(d.info.name) + ': ' + pct(d.pct) + '"><span data-w="' + d.pct + '"></span></div>' +
      '  <span class="level-badge">' + esc(d.levelLabel) + '</span> ' + riskNote +
      '  <p class="desc">' + esc(d.text.desc) + '</p>' +
      '  <div class="trait-lists">' +
      '    <div class="h-good"><h4>نقاط قوت</h4><ul>' + strengths + '</ul></div>' +
      '    <div class="h-bad"><h4>نقاط نیازمند توجه</h4><ul>' + growth + '</ul></div>' +
      '  </div>' +
      '  <p class="tip"><strong>پیشنهاد:</strong> ' + esc(d.text.tip) + '</p>' +
      '</article>';
  }

  function safetyBox(status) {
    if (status === 'none') return '';
    var s = C.SUPPORT[status];
    return '' +
      '<section class="card safety ' + (status === 'urgent' ? 'urgent' : '') + '" role="alert">' +
      '  <h2>' + esc(s.title) + '</h2>' +
      '  <p>' + esc(s.body) + '</p>' +
      '  <ul>' + s.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
      '</section>';
  }

  function renderResult() {
    var report = E.buildReport(state.answers);
    var p = report.pattern;

    el.resultRoot.innerHTML =
      safetyBox(report.safety) +
      '<section class="card result-hero" aria-labelledby="resultTitle">' +
      '  <p class="eyebrow">الگوی دلبستگی و مسیر بهبود تو</p>' +
      '  <h1 id="resultTitle">' + esc(p.name) + '</h1>' +
      '  <p>' + esc(p.intro) + '</p>' +
      '  <div class="chips">' + p.keywords.map(function (k) { return '<span class="chip">' + esc(k) + '</span>'; }).join('') + '</div>' +
      '</section>' +

      '<div class="result-grid">' +
      '  <div class="two-col">' +
      '    <section class="card panel" aria-labelledby="radarTitle">' +
      '      <h2 id="radarTitle">نمای کلی</h2>' +
      '      <p class="sub">هر گوشه یک بُعد است. در «نگرانی» و «فاصله‌گیری»، نقطه‌ی پایین‌تر بهتر است.</p>' +
      '      <div class="radar-wrap">' + radarSVG(report.dims) + '</div>' +
      '    </section>' +
      '    <section class="card panel" aria-labelledby="analysisTitle">' +
      '      <h2 id="analysisTitle">تحلیل تو</h2>' +
      '      <p class="sub">خلاصه‌ای شخصی‌سازی‌شده بر اساس پاسخ‌های تو</p>' +
      '      <div class="analysis">' + report.analysis.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
      '    </section>' +
      '  </div>' +
      '  <div class="two-col">' +
      '    <section class="card panel" aria-labelledby="goodTitle">' +
      '      <h2 id="goodTitle">نقاط قوت تو</h2>' +
      '      <p class="sub">از سالم‌ترین بخش‌های تجربه‌ات</p>' +
      '      <ul class="summary-list good">' + report.strengths.map(function (s) {
        return '<li><small>' + esc(s.dim) + '</small>' + esc(s.text) + '</li>';
      }).join('') + '</ul>' +
      '    </section>' +
      '    <section class="card panel" aria-labelledby="growTitle">' +
      '      <h2 id="growTitle">نقاط نیازمند توجه</h2>' +
      '      <p class="sub">چیزهایی که با آگاهی و حمایت می‌توانی آرام‌آرام تغییر بدهی</p>' +
      '      <ul class="summary-list grow">' + report.growth.map(function (s) {
        return '<li><small>' + esc(s.dim) + '</small>' + esc(s.text) + '</li>';
      }).join('') + '</ul>' +
      '    </section>' +
      '  </div>' +
      '  <section aria-label="جزئیات ابعاد"><div class="traits">' + report.dims.map(dimCard).join('') + '</div></section>' +
      '</div>' +

      '<div class="result-actions">' +
      '  <button class="btn btn-primary" id="btnPrint" type="button">ذخیره یا چاپ نتیجه</button>' +
      '  <button class="btn btn-ghost" id="btnRetake" type="button">آزمون دوباره</button>' +
      '  <button class="btn btn-ghost" id="btnBackIntro" type="button">صفحه اصلی</button>' +
      '</div>' +
      '<p class="disclaimer">' + esc(C.NOTE) + '</p>';

    document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });
    confirmClick(
      document.getElementById('btnRetake'),
      function () { return true; },
      'مطمئنی؟ دوباره بزن تا آزمون از اول شروع شود',
      function () { resetState('quiz'); startQuiz(0); }
    );
    document.getElementById('btnBackIntro').addEventListener('click', function () { showIntro(); });

    requestAnimationFrame(function () {
      el.resultRoot.querySelectorAll('.bar span').forEach(function (s) {
        s.style.width = s.getAttribute('data-w') + '%';
      });
    });
  }

  // ---------- شروع ----------
  function boot() {
    if (isDone() && (state.view === 'result' || state.view === 'quiz')) {
      renderResult();
      show('result');
      return;
    }
    if (state.view === 'quiz') {
      startQuiz(state.index);
      return;
    }
    showIntro();
  }

  boot();
})();
