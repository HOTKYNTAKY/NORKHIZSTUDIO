/* ============================================================
   NORKHIZ STUDIO — app.js
   Common UI: hero slider, video cards, mobile nav, search focus
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Sample data (placeholder — replaced by API in production) ---------- */
  const categories = [
    { title: 'آماتور', count: '۱۴۲ فیلم', color: '#ff0055', thumb: 'linear-gradient(135deg,#2a0033,#ff0055)' },
    { title: 'لسبیان', count: '۹۸ فیلم', color: '#8a1cff', thumb: 'linear-gradient(135deg,#1a0a2e,#8a1cff)' },
    { title: 'موتور / آナル', count: '۸۷ فیلم', color: '#ff6b00', thumb: 'linear-gradient(135deg,#4a1a00,#ff6b00)' },
    { title: 'میلف (MILF)', count: '۶۴ فیلم', color: '#d4af37', thumb: 'linear-gradient(135deg,#3a2a00,#d4af37)' },
    { title: 'آسیایی', count: '۱۱۲ فیلم', color: '#00d2ff', thumb: 'linear-gradient(135deg,#001a33,#00d2ff)' },
    { title: 'ایرانی / پارسی', count: '۵۶ فیلم', color: '#ff4d88', thumb: 'linear-gradient(135deg,#2e001a,#ff4d88)' },
    { title: 'گروهی', count: '۴۳ فیلم', color: '#a855f7', thumb: 'linear-gradient(135deg,#3b0764,#a855f7)' },
    { title: 'VIP / پریمیوم', count: '۳۱ فیلم', color: '#fbbf24', thumb: 'linear-gradient(135deg,#453a00,#fbbf24)' },
  ];

  const videos = [
    {
      id: 'v1', title: 'شب طلایی — Visconti و Lila', views: '۵۰۴،۱۲۳',
      duration: '۳۱ دقیقه', quality: '۴K UHD', tags: ['آماتور', 'HD', 'VIP'],
      thumb: 'linear-gradient(135deg,#141420,#ff005522)', rating: 9.8
    },
    {
      id: 'v2', title: 'شبهای تهران — م nested پARSI', views: '۳۸۹،۰۱۲',
      duration: '۲۲ دقیقه', quality: '۱۰۸۰p', tags: ['ایرانی / پارسی', 'HD'],
      thumb: 'linear-gradient(135deg,#141420,#8a1cff22)', rating: 9.4
    },
    {
      id: 'v3', title: 'لجن و طلا —душе', views: '۲۱۵،۶۷۰',
      duration: '۴۴ دقیقه', quality: '۴K UHD', tags: ['لسبیان', 'VIP', 'HD'],
      thumb: 'linear-gradient(135deg,#141420,#d4af3722)', rating: 9.1
    },
    {
      id: 'v4', title: 'شب لولیتا — MILF اراکی', views: '۴۴۱،۹۰۰',
      duration: '۳۸ دقیقه', quality: '۴K UHD', tags: ['میلف (MILF)', 'HD'],
      thumb: 'linear-gradient(135deg,#141420,#ff6b0022)', rating: 9.6
    },
    {
      id: 'v5', title: 'silk — دیده-ban', views: '۱۶۷،۴۵۰',
      duration: '۱۹ دقیقه', quality: '۷۲۰p', tags: ['آماتور', 'HD'],
      thumb: 'linear-gradient(135deg,#141420,#00d2ff22)', rating: 8.9
    },
    {
      id: 'v6', title: 'سفر به تокиو', views: '۲۹۸،۳۳۰',
      duration: '۲۷ دقیقه', quality: '۱۰۸۰p', tags: ['آسیایی', 'HD'],
      thumb: 'linear-gradient(135deg,#141420,#a855f722)', rating: 9.0
    },
  ];

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function formatNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ---------- Hero slider ---------- */
  function initHero() {
    const slides = $$('.hero-slide');
    const dotsContainer = $('#heroDots');
    if (!slides.length || !dotsContainer) return;

    let current = 0;
    const total = slides.length;

    // build dots
    slides.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'hero-dot' + (i === 0 ? ' active' : '');
      d.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(d);
    });

    const dots = $$('.hero-dot');

    function goTo(index) {
      current = (index + total) % total;
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function next() { goTo(current + 1); }

    let timer = setInterval(next, 5000);

    // pause on hover
    const hero = $('.hero');
    if (hero) {
      hero.addEventListener('mouseenter', () => clearInterval(timer));
      hero.addEventListener('mouseleave', () => { timer = setInterval(next, 5000); });
    }
  }

  /* ---------- Render category cards ---------- */
  function renderCategories() {
    const grid = $('#catGrid');
    if (!grid) return;
    grid.innerHTML = categories.map(c => `
      <article class="cat-card glass" onclick="location.href='categories.html#${c.title}'">
        <div class="cat-thumb" style="background:${c.thumb};"><div style="opacity:0"></div></div>
        <div class="cat-overlay">
          <div>
            <div class="cat-title" style="color:${c.color};">${c.title}</div>
            <div class="cat-count">${c.count}</div>
          </div>
        </div>
        <div class="cat-body"><div class="cat-desc">محتوای پربیننده در دسته ${c.title} با کیفیت بالا.</div></div>
      </article>
    `).join('');
  }

  /* ---------- Render video grid ---------- */
  function renderVideos(containerId, list = videos) {
    const grid = $(containerId);
    if (!grid) return;
    grid.innerHTML = list.map(v => `
      <article class="card-wrap">
        <div class="card-film glass" onclick="location.href='video.html?id=${v.id}'">
          <div class="card-thumb" style="background:${v.thumb};">
            <div class="card-badge badge hd">${v.quality}</div>
            <div class="card-play"><div class="card-play__icon">▶</div></div>
          </div>
          <div class="card-body">
            <div class="card-title">${v.title}</div>
            <div class="card-meta">
              <span>👁 ${formatNum(parseInt(v.views.replace(/[^0-9]/g,'')))}</span>
              <span>•</span>
              <span>${v.duration}</span>
              <span>•</span>
              <span>⭐ ${v.rating}</span>
            </div>
            <div class="video-tags" style="margin-top:8px;">
              ${v.tags.map(t => `<a href="#">${t}</a>`).join('')}
            </div>
          </div>
        </div>
      </article>
    `).join('');
  }

  /* ---------- Mobile hamburger ---------- */
  function initMobileNav() {
    // create toggle button
    const nav = $('.nav-menu');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.innerHTML = '☰';
    btn.setAttribute('aria-label', 'منو');
    btn.style.display = 'none';
    const headerActions = $('.header-actions');
    if (headerActions) headerActions.insertAdjacentElement('beforebegin', btn);

    function toggle() { nav.classList.toggle('open'); }
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

    // hide on resize > 768
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) nav.classList.remove('open');
    });
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
    // show toggle only on small screens
    function update() { btn.style.display = window.innerWidth <= 768 ? 'grid' : 'none'; }
    update(); window.addEventListener('resize', update);

    // open styles injected
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width:768px){.nav-menu{position:fixed;inset:72px 0 0 0;background:var(--surface-3);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--glass-border);flex-direction:column;padding:24px;gap:0;transform:translatex(100%);transition:transform .35s ease;box-shadow:var(--shadow-soft);z-index:105;}.nav-menu.open{transform:translatex(0);}.nav-menu a{width:100%;text-align:right;padding:14px;border-radius:12px;}.mega-panel{position:static;margin:12px 0 0;width:100%;box-shadow:none;border:none;background:transparent;}}
    `;
    document.head.appendChild(style);
  }

  /* ---------- Header search focus ---------- */
  function initSearch() {
    $$('.header-search input').forEach(input => {
      input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
      input.addEventListener('blur', () => input.parentElement.classList.remove('focused'));
    });
    const style = document.createElement('style');
    style.textContent = `.header-search.focused{ border-color:var(--neon-pink-soft); box-shadow:0 0 0 4px var(--neon-pink-glow); border-radius:14px; padding:4px; }`;
    document.head.appendChild(style);
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHero();
    renderCategories();
    renderVideos('#videoGrid');
    renderVideos('#searchResults');
    renderVideos('#dashboardGrid');
    renderVideos('#relatedGrid');
    initMobileNav();
    initSearch();
  });

  // expose for inline onclick
  window.formatNum = formatNum;

})();