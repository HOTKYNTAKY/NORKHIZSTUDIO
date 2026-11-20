/* گلیستا — صفحه محصول: گالری، رنگ/سایز/تعداد، علاقه‌مندی، سبد خرید */
'use strict';

(async function initProduct() {
  const params = new URLSearchParams(location.search);
  const slug = params.get('p') || '';
  const root = document.getElementById('productRoot');

  if (!slug) {
    root.innerHTML = notFound('شناسه محصول مشخص نیست.');
    return;
  }

  let data;
  try {
    data = await apiGet('/api/products/' + encodeURIComponent(slug));
  } catch (err) {
    root.innerHTML = notFound(err.message || 'محصول پیدا نشد.');
    return;
  }

  const p = data.product;
  const cat = data.category;
  const crumbs = data.breadcrumbs || [];
  document.title = `${p.name} | گلیستا`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && p.description) metaDesc.content = p.description.slice(0, 160);

  // نان‌ریزها
  document.getElementById('crumbs').innerHTML =
    `<a href="/">خانه</a>` +
    crumbs.map((c) => `<span class="sep">/</span><a href="/category.html?c=${encodeURIComponent(c.slug)}">${esc(c.name)}</a>`).join('') +
    `<span class="sep">/</span><span>${esc(p.name)}</span>`;

  // حالت انتخاب
  const sel = { color: p.colors?.length ? p.colors[0].name : '', size: p.sizes?.length ? p.sizes[0] : '', qty: 1 };
  const off = p.discountPrice > 0 && p.discountPrice < p.price;
  const unit = priceOf(p);
  const out = p.stock === 0;

  root.innerHTML = `
  <div class="p-grid">
    <div class="gallery">
      <div class="g-main">
        <img id="gMain" src="${esc(p.images?.[0] || '')}" alt="${esc(p.name)}">
        ${p.images?.length > 1 ? '<span class="zoom-hint">برای مشاهده زوایای دیگر، تصاویر کوچک را بزنید</span>' : ''}
      </div>
      <div class="g-thumbs" id="gThumbs">
        ${(p.images || []).map((src, i) =>
          `<button class="${i === 0 ? 'active' : ''}" data-i="${i}" aria-label="تصویر ${faNum(i + 1)}"><img src="${esc(src)}" alt=""></button>`).join('')}
      </div>
    </div>

    <div class="p-info">
      <div class="p-cat-line">
        ${crumbs.length ? `<a href="/category.html?c=${encodeURIComponent(crumbs[0].slug)}">${esc(crumbs[0].name)}</a>` : ''}
        ${crumbs.length > 1 ? `<span>·</span><a href="/category.html?c=${encodeURIComponent(crumbs[crumbs.length - 1].slug)}">${esc(crumbs[crumbs.length - 1].name)}</a>` : ''}
        ${p.featured ? '<span class="badge" style="background:var(--rose-soft);color:var(--rose);padding:3px 11px;border-radius:999px;font-size:11.5px">محصول ویژه</span>' : ''}
      </div>
      <h1>${esc(p.name)}</h1>

      <div class="p-price-box">
        <span class="now">${money(unit)}</span>
        ${off ? `<span class="was">${money(p.price)}</span>
          <span class="save">${faNum(Math.round((1 - p.discountPrice / p.price) * 100))}٪ تخفیف</span>` : ''}
        <span class="unit">${p.stock === -1 ? 'سفارشی · قیمت از' : 'به ازای هر عدد'}</span>
      </div>

      <div class="stock-line">
        ${out
          ? '<span class="stock-pill out">ناموجود</span>'
          : p.stock > 0 && p.stock <= 5
            ? `<span class="stock-pill low">فقط ${faNum(p.stock)} عدد باقی مانده</span>`
            : `<span class="stock-pill in">موجود در انبار${p.stock === -1 ? ' · تولید سفارشی' : ''}</span>`}
        ${off ? `<span style="color:var(--muted);font-size:13px">قیمت قبلی: ${money(p.price)}</span>` : ''}
      </div>

      <p class="p-desc">${esc(p.description || '')}</p>

      ${p.colors?.length ? `
      <div class="opt-group">
        <div class="og-label">رنگ: <span class="sel" id="colorSel">${esc(sel.color)}</span></div>
        <div class="swatches" id="swatches">
          ${p.colors.map((c, i) => `
            <button class="swatch ${i === 0 ? 'active' : ''}" data-color="${esc(c.name)}">
              ${c.hex ? `<span class="dot" style="background:${esc(c.hex)}"></span>` : ''}
              ${esc(c.name)}
            </button>`).join('')}
        </div>
      </div>` : ''}

      ${p.sizes?.length ? `
      <div class="opt-group">
        <div class="og-label">سایز: <span class="sel" id="sizeSel">${esc(sel.size)}</span></div>
        <div class="size-btns" id="sizeBtns">
          ${p.sizes.map((s, i) => `<button class="size-btn ${i === 0 ? 'active' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>
      </div>` : ''}

      <div class="qty-row">
        <div class="og-label" style="margin:0">تعداد:</div>
        <div class="qty">
          <button type="button" id="qMinus" aria-label="کاهش">−</button>
          <input type="number" id="qInput" value="1" min="1" max="${p.stock >= 0 ? p.stock : 99}" aria-label="تعداد">
          <button type="button" id="qPlus" aria-label="افزایش">＋</button>
        </div>
        <span class="unit" id="lineTotal" style="color:var(--muted);font-size:13.5px"></span>
      </div>

      <div class="buy-row">
        <button class="btn btn-primary btn-lg" id="addBtn" ${out ? 'disabled' : ''}>
          ${out ? 'ناموجود' : 'افزودن به سبد خرید'}
        </button>
        <button class="wish-btn ${isWished(p.id) ? 'on' : ''}" id="wishBtn" data-wish="${esc(p.id)}" aria-label="علاقه‌مندی‌ها" title="افزودن به علاقه‌مندی‌ها">
          ${isWished(p.id) ? ICONS.heart : ICONS.heartOutline}
        </button>
      </div>

      <ul class="p-notes">
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18.5" r="1.4"/><circle cx="17.5" cy="18.5" r="1.4"/></svg>
          ارسال به سراسر ایران · بسته‌بندی ضدضربه هدیه</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>
          ضمانت کیفیت گل‌ها و ماندگاری سال‌ها</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>
          پرداخت در محل یا کارت به کارت</li>
      </ul>
    </div>
  </div>`;

  /* ── گالری ── */
  const gMain = document.getElementById('gMain');
  document.getElementById('gThumbs')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    gMain.src = p.images[Number(b.dataset.i)];
    $$('#gThumbs button').forEach((x) => x.classList.toggle('active', x === b));
  });

  /* ── رنگ / سایز ── */
  document.getElementById('swatches')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    sel.color = b.dataset.color;
    $$('#swatches .swatch').forEach((x) => x.classList.toggle('active', x === b));
    document.getElementById('colorSel').textContent = sel.color;
  });
  document.getElementById('sizeBtns')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    sel.size = b.dataset.size;
    $$('#sizeBtns .size-btn').forEach((x) => x.classList.toggle('active', x === b));
    document.getElementById('sizeSel').textContent = sel.size;
  });

  /* ── تعداد ── */
  const qInput = document.getElementById('qInput');
  const maxQty = p.stock >= 0 ? Math.max(1, p.stock) : 99;
  function setQty(v) {
    sel.qty = Math.min(maxQty, Math.max(1, v || 1));
    qInput.value = sel.qty;
    document.getElementById('lineTotal').textContent = `جمع: ${money(unit * sel.qty)}`;
  }
  document.getElementById('qMinus').addEventListener('click', () => setQty(sel.qty - 1));
  document.getElementById('qPlus').addEventListener('click', () => setQty(sel.qty + 1));
  qInput.addEventListener('change', () => setQty(parseInt(qInput.value, 10)));
  setQty(1);

  /* ── افزودن به سبد ── */
  document.getElementById('addBtn').addEventListener('click', (e) => {
    if (out) return;
    if (p.colors?.length && !sel.color) { toast('لطفاً رنگ را انتخاب کنید', 'err'); return; }
    if (p.sizes?.length && !sel.size) { toast('لطفاً سایز را انتخاب کنید', 'err'); return; }
    addToCart({
      id: p.id, slug: p.slug, name: p.name, image: p.images?.[0] || '',
      price: unit, qty: sel.qty, color: sel.color, size: sel.size,
    });
    const btn = e.currentTarget;
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ به سبد خرید اضافه شد';
    toast('به سبد خرید اضافه شد', 'ok', '<a href="/cart.html">رفتن به سبد خرید</a>');
    setTimeout(() => { btn.innerHTML = orig; }, 1800);
  });

  /* ── محصولات مرتبط ── */
  if (data.related?.length) {
    const sec = document.getElementById('relatedSec');
    sec.hidden = false;
    document.getElementById('relatedGrid').innerHTML = data.related.map((r) => productCard(r)).join('');
  }

  function notFound(msg) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <h3>${esc(msg)}</h3>
        <p>شاید محصول حذف شده یا آدرس نادرست باشد.</p>
        <a class="btn btn-primary" href="/category.html">مشاهده همه محصولات</a>
      </div>`;
  }
})();
