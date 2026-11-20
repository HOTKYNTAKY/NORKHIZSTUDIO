/* گلیستا — صفحه دسته‌بندی / جست‌وجو / لیست محصولات */
'use strict';

(async function initCategory() {
  const params = new URLSearchParams(location.search);
  const catSlug = params.get('c') || '';
  const q = (params.get('q') || '').trim();
  let sort = params.get('sort') || 'default';
  let page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  const grid = document.getElementById('grid');
  const pager = document.getElementById('pager');
  const chipsHost = document.getElementById('chips');
  const countLabel = document.getElementById('countLabel');
  const sortSel = document.getElementById('sortSel');
  sortSel.value = sort;

  // همه‌چیز را از سرور بگیر: درخت دسته‌ها + لیست محصولات
  let tree = [];
  try { tree = (await apiGet('/api/categories')).items; } catch { /* آفلاین */ }

  // فعال‌کردن نویگیشن هدر
  const navKey = !catSlug && !q ? 'all' : catSlug;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));

  function findCat(slug) {
    for (const m of tree) {
      if (m.slug === slug) return m;
      const k = m.children.find((c) => c.slug === slug);
      if (k) return { ...k, _main: m };
    }
    return null;
  }

  /* ── هدر صفحه ── */
  const cat = catSlug ? findCat(catSlug) : null;
  const heroArt = document.getElementById('heroArt');
  const heroImg = document.getElementById('heroImg');

  if (q) {
    document.getElementById('heroKicker').textContent = 'جست‌وجو';
    document.getElementById('heroTitle').textContent = `نتایج برای «${q}»`;
    document.getElementById('heroDesc').textContent = 'محصولاتی که با عبارت جست‌وجوی شما مطابقت دارند.';
    document.title = `جست‌وجو: ${q} | گلیستا`;
    setCrumb([{ t: 'جست‌وجو' }]);
  } else if (cat && !cat.parent) {
    // دسته اصلی
    document.getElementById('heroKicker').textContent = 'دسته اصلی';
    document.getElementById('heroTitle').textContent = cat.name;
    document.getElementById('heroDesc').textContent = cat.description || `مجموعه ${cat.name} در گلیستا`;
    document.title = `${cat.name} | گلیستا`;
    if (cat.image) { heroImg.src = cat.image; heroImg.alt = cat.name; heroArt.hidden = false; document.getElementById('catHero').classList.remove('plain'); }
    setCrumb([{ t: cat.name }]);
  } else if (cat) {
    // زیردسته
    const main = cat._main;
    document.getElementById('heroKicker').textContent = main ? main.name : 'محصولات';
    document.getElementById('heroTitle').textContent = cat.name;
    document.getElementById('heroDesc').textContent = cat.description || `خرید آنلاین ${cat.name} با کیفیت تضمینی`;
    document.title = `${cat.name} | گلیستا`;
    const img = cat.image || (main && main.image);
    if (img) { heroImg.src = img; heroImg.alt = cat.name; heroArt.hidden = false; document.getElementById('catHero').classList.remove('plain'); }
    setCrumb(main ? [{ t: main.name, s: main.slug }, { t: cat.name }] : [{ t: cat.name }]);
  } else {
    document.title = 'همه محصولات | گلیستا';
    setCrumb([{ t: 'همه محصولات' }]);
  }

  function setCrumb(parts) {
    const host = document.getElementById('crumbs');
    host.innerHTML = `<a href="/">خانه</a>` + parts.map((p) =>
      `<span class="sep">/</span>` + (p.s ? `<a href="/category.html?c=${encodeURIComponent(p.s)}">${esc(p.t)}</a>` : `<span>${esc(p.t)}</span>`)
    ).join('');
  }

  /* ── چیپس زیردسته‌ها ── */
  function renderChips() {
    let items = [];
    if (q) {
      items = [{ slug: '', name: 'همه نتایج' }];
    } else if (!catSlug) {
      items = [{ slug: '', name: 'همه محصولات' },
        ...tree.filter((m) => m.active !== false).map((m) => ({ slug: m.slug, name: m.name }))];
    } else if (cat && !cat.parent) {
      items = [{ slug: cat.slug, name: 'همه ' + cat.name },
        ...(cat.children || []).filter((c) => c.active !== false).map((c) => ({ slug: c.slug, name: c.name }))];
    } else if (cat && cat._main) {
      items = [{ slug: cat._main.slug, name: cat._main.name },
        ...(cat._main.children || []).filter((c) => c.active !== false).map((c) => ({ slug: c.slug, name: c.name }))];
    }
    chipsHost.innerHTML = items.map((it) => {
      const active = it.slug === catSlug;
      const href = it.slug ? `/category.html?c=${encodeURIComponent(it.slug)}` : (q ? '/category.html' : '/category.html');
      return `<a class="chip ${active ? 'active' : ''}" href="${href}">${esc(it.name)}</a>`;
    }).join('');
  }
  renderChips();

  /* ── بارگذاری محصولات ── */
  async function load() {
    const qs = new URLSearchParams();
    if (catSlug) qs.set('category', catSlug);
    if (q) qs.set('q', q);
    if (sort !== 'default') qs.set('sort', sort);
    qs.set('page', String(page));
    qs.set('limit', '24');

    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>در حال بارگذاری…</p></div>';
    try {
      const data = await apiGet('/api/products?' + qs.toString());
      countLabel.textContent = faNum(data.total) + ' محصول';
      if (!data.items.length) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 21s-7-4.4-9.2-8.6C1.1 9 3 5.5 6.4 5.5c2 0 3.4 1.1 4.2 2.3.8-1.2 2.2-2.3 4.2-2.3 3.4 0 5.3 3.5 3.6 6.9C19 16.6 12 21 12 21z"/></svg>
            <h3>محصولی پیدا نشد</h3>
            <p>${q ? 'عبارت دیگری را امتحان کنید.' : 'به‌زودی محصولات جدید اضافه می‌شوند.'}</p>
            <a class="btn btn-primary" href="/category.html">مشاهده همه محصولات</a>
          </div>`;
        pager.innerHTML = '';
        return;
      }
      // برچسب دسته روی کارت‌ها
      const catNames = {};
      tree.forEach((m) => { catNames[m.slug] = m.name; (m.children || []).forEach((c) => { catNames[c.slug] = c.name; }); });
      grid.innerHTML = data.items.map((p) => productCard(p, { catLabel: catNames[p.category] || '' })).join('');
      renderPager(data.page, data.pages);
    } catch (err) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <h3>خطا در دریافت محصولات</h3><p>${esc(err.message)}</p>
        </div>`;
      countLabel.textContent = '';
    }
  }

  function renderPager(cur, pages) {
    if (pages <= 1) { pager.innerHTML = ''; return; }
    let html = `<button ${cur <= 1 ? 'disabled' : ''} data-p="${cur - 1}">›</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class="${i === cur ? 'active' : ''}" data-p="${i}">${faNum(i)}</button>`;
    }
    html += `<button ${cur >= pages ? 'disabled' : ''} data-p="${cur + 1}">‹</button>`;
    pager.innerHTML = html;
  }
  pager.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b || b.disabled) return;
    page = Number(b.dataset.p);
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  sortSel.addEventListener('change', () => { sort = sortSel.value; page = 1; load(); });

  await load();
})();
