/* ═══════════════════════════════════════════════════════
   گلیستا — هسته مشترک فروشگاه
   سبد خرید · علاقه‌مندی‌ها · هدر · کارت محصول · API
   ═══════════════════════════════════════════════════════ */
'use strict';

const CART_KEY = 'gl_cart_v1';
const WISH_KEY = 'gl_wishlist_v1';

/* ── ابزارها ── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function money(n) {
  return Number(n || 0).toLocaleString('fa-IR') + ' تومان';
}
function priceOf(p) {
  return p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
}
function faNum(n) { return Number(n || 0).toLocaleString('fa-IR'); }

function toast(msg, kind = '', linkHtml = '') {
  let host = $('#toast');
  if (!host) { host = document.createElement('div'); host.id = 'toast'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = esc(msg) + (linkHtml ? ' ' + linkHtml : '');
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 320); }, 3400);
}

async function apiGet(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطا در ارتباط با سرور');
  return data;
}
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطا در ارتباط با سرور');
  return data;
}

/* ── سبد خرید ── */
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function setCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateBadges();
}
function cartCount() { return getCart().reduce((s, i) => s + i.qty, 0); }
function cartKey(it) { return [it.id, it.color || '', it.size || ''].join('|'); }
function addToCart(item) {
  const cart = getCart();
  const key = cartKey(item);
  const found = cart.find((c) => cartKey(c) === key);
  if (found) found.qty = Math.min(99, found.qty + item.qty);
  else cart.push({ ...item, key });
  setCart(cart);
}
function setCartQty(key, qty) {
  const cart = getCart();
  const it = cart.find((c) => c.key === key || cartKey(c) === key);
  if (!it) return;
  if (qty <= 0) return removeFromCart(key);
  it.qty = Math.min(99, qty);
  setCart(cart);
}
function removeFromCart(key) {
  setCart(getCart().filter((c) => c.key !== key && cartKey(c) !== key));
}
function cartTotals(shippingCost = 0) {
  const items = getCart();
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = items.length && shippingCost > 0 ? shippingCost : 0;
  return { subtotal, shipping, total: subtotal + shipping, count: items.reduce((s, i) => s + i.qty, 0) };
}

/* ── علاقه‌مندی‌ها ── */
function getWish() {
  try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; }
}
function setWish(ids) {
  localStorage.setItem(WISH_KEY, JSON.stringify([...new Set(ids)]));
  updateBadges();
}
function toggleWish(id) {
  const w = getWish();
  const on = w.includes(id);
  set(on ? w.filter((x) => x !== id) : [...w, id]);
  return !on;
}
function isWished(id) { return getWish().includes(id); }

/* ── شمارنده‌های هدر ── */
function updateBadges() {
  const cc = cartCount(), wc = getWish().length;
  $$('#cartCount, [data-cart-count]').forEach((el) => {
    el.textContent = faNum(cc); el.dataset.zero = cc ? '0' : '1';
  });
  $$('#wishCount, [data-wish-count]').forEach((el) => {
    el.textContent = faNum(wc); el.dataset.zero = wc ? '0' : '1';
  });
}

/* ── آیکون‌های SVG مشترک ── */
const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.7-9.7-9.2C.7 8.5 2.6 5 6.1 5c2 0 3.4 1.1 4.2 2.2C11.1 6.1 12.5 5 14.5 5c3.5 0 5.4 3.5 3.8 6.8C19.5 16.3 12 21 12 21z" transform="translate(1.4 0)"/></svg>',
  heartOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20.3s-6.8-4.3-8.9-8.4C1.4 8.5 3.2 5.4 6.3 5.4c1.9 0 3.2 1.1 3.9 2.1.7-1 2-2.1 3.9-2.1 3.1 0 4.9 3.1 3.2 6.5-2.1 4.1-8.9 8.4-8.9 8.4z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.4a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.25L20.5 8H6"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};

/* ── کارت محصول (مشترک بین صفحات) ── */
function productCard(p, { catLabel = '' } = {}) {
  const off = p.discountPrice > 0 && p.discountPrice < p.price;
  const offPct = off ? Math.round((1 - p.discountPrice / p.price) * 100) : 0;
  const out = p.stock === 0;
  const wished = isWished(p.id);
  const img = p.images && p.images[0] ? p.images[0] : '';
  return `
  <article class="p-card" data-id="${esc(p.id)}">
    <a class="pc-media" href="/product.html?p=${encodeURIComponent(p.slug)}">
      ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : ''}
      <div class="pc-badges">
        ${out ? '<span class="b b-out">ناموجود</span>' : ''}
        ${off && !out ? `<span class="b b-off">${faNum(offPct)}٪ تخفیف</span>` : ''}
        ${p.featured && !out ? '<span class="b b-featured">ویژه</span>' : ''}
      </div>
    </a>
    <button class="pc-wish ${wished ? 'on' : ''}" data-wish="${esc(p.id)}" aria-label="افزودن به علاقه‌مندی‌ها" title="علاقه‌مندی‌ها">
      ${wished ? ICONS.heart : ICONS.heartOutline}
    </button>
    <div class="pc-body">
      ${catLabel ? `<div class="pc-cat">${esc(catLabel)}</div>` : ''}
      <a class="pc-name" href="/product.html?p=${encodeURIComponent(p.slug)}">${esc(p.name)}</a>
      <div class="pc-price">
        <span class="now">${money(priceOf(p))}</span>
        ${off ? `<span class="was">${money(p.price)}</span>` : ''}
      </div>
      <span class="pc-stock ${out ? 'out' : ''}">${out ? 'ناموجود' : (p.stock === -1 ? 'موجود · سفارشی' : 'موجود در انبار')}</span>
      <button class="pc-add" data-quickadd="${esc(p.id)}" ${out ? 'disabled' : ''}>
        ${out ? 'ناموجود' : 'افزودن به سبد خرید'}
      </button>
    </div>
  </article>`;
}

/* ── رویدادهای مشترک (دلگیت) ── */
let STORE_CFG = null;

async function bindShared() {
  updateBadges();

  // علاقه‌مندی روی کارت‌ها
  document.addEventListener('click', (e) => {
    const w = e.target.closest('[data-wish]');
    if (w) {
      e.preventDefault();
      const on = toggleWish(w.dataset.wish);
      w.classList.toggle('on', on);
      w.innerHTML = on ? ICONS.heart : ICONS.heartOutline;
      toast(on ? 'به علاقه‌مندی‌ها اضافه شد ♥' : 'از علاقه‌مندی‌ها حذف شد', 'ok');
      // همگام‌سازی بقیه دکمه‌های همین شناسه
      $$(`[data-wish="${w.dataset.wish}"]`).forEach((b) => {
        b.classList.toggle('on', on);
        b.innerHTML = on ? ICONS.heart : ICONS.heartOutline;
      });
      return;
    }
    // افزودن سریع از کارت
    const qa = e.target.closest('[data-quickadd]');
    if (qa) {
      e.preventDefault();
      const id = qa.dataset.quickadd;
      quickAdd(id, qa);
    }
  });

  // جست‌وجوی هدر
  const form = $('#searchForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#searchInput')?.value.trim() || '';
      location.href = '/category.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }
  const mBtn = $('#menuBtn');
  if (mBtn) mBtn.addEventListener('click', () => $('#mainNav')?.classList.toggle('open'));

  // بنر اطلاعیه + اطلاعات فوتر از سرور
  try {
    STORE_CFG = await apiGet('/api/config');
    applyConfig(STORE_CFG);
  } catch { /* سرور در دسترس نیست — بی‌صدا رد شو */ }
}

function applyConfig(cfg) {
  if (cfg.announcement) {
    const a = $('#announce');
    if (a) { a.textContent = cfg.announcement; a.hidden = false; }
  }
  $$('[data-store-name]').forEach((el) => { el.textContent = cfg.storeName || 'گلیستا'; });
  $$('[data-store-tagline]').forEach((el) => { el.textContent = cfg.tagline || 'گل مصنوعی لوکس'; });
  document.title = document.title.replace('گلیستا', cfg.storeName || 'گلیستا');

  const phone = $('#fPhone');
  if (phone && cfg.phone) {
    phone.innerHTML = `<a href="tel:${esc(cfg.phone)}" dir="ltr">${esc(cfg.phone)}</a>`;
  }
  const addr = $('#fAddress');
  if (addr && cfg.address) addr.textContent = cfg.address;
  const card = $('#fCard');
  if (card && cfg.cardNumber) {
    card.innerHTML = `<div class="lbl">شماره کارت پرداخت</div><div class="num">${esc(cfg.cardNumber)}</div>` +
      (cfg.cardName ? `<div class="lbl">به نام ${esc(cfg.cardName)}</div>` : '');
  } else if (card) card.style.display = 'none';

  const ig = $('#fIg'), tg = $('#fTg');
  if (ig) { if (cfg.instagram) ig.href = cfg.instagram; else ig.style.display = 'none'; }
  if (tg) { if (cfg.telegram) tg.href = cfg.telegram; else tg.style.display = 'none'; }

  // لینک‌های شماره در صفحه
  $$('[data-phone-link]').forEach((el) => {
    if (cfg.phone) { el.href = 'tel:' + cfg.phone; el.textContent = cfg.phone; }
  });
}

/* افزودن سریع: اگر محصول گزینه دارد، به صفحه محصول می‌برد */
async function quickAdd(id, btn) {
  try {
    const data = await apiGet('/api/products/' + encodeURIComponent(id));
    const p = data.product;
    if ((p.colors && p.colors.length) || (p.sizes && p.sizes.length)) {
      location.href = '/product.html?p=' + encodeURIComponent(p.slug);
      return;
    }
    addToCart({ id: p.id, slug: p.slug, name: p.name, image: p.images?.[0] || '', price: priceOf(p), qty: 1, color: '', size: '' });
    toast('به سبد خرید اضافه شد', 'ok', '<a href="/cart.html">مشاهده سبد</a>');
    if (btn) { const t = btn.textContent; btn.textContent = '✓ اضافه شد'; setTimeout(() => { btn.textContent = t; }, 1400); }
  } catch (err) {
    // شناسه ممکن است slug باشد — از لیست پیدا کنیم
    toast(err.message, 'err');
  }
}

/* ── آیکون‌های هدر ── */
function paintHeaderIcons() {
  const m = $('#menuBtn'); if (m && !m.innerHTML) m.innerHTML = ICONS.menu;
  const s = $('#searchBtn'); if (s && !s.innerHTML) s.innerHTML = ICONS.search;
  $$('[data-icon="cart"]').forEach((el) => { if (!el.innerHTML) el.innerHTML = ICONS.cart; });
  $$('[data-icon="heart"]').forEach((el) => { if (!el.innerHTML) el.innerHTML = ICONS.heartOutline; });
}

/* ── reveal on scroll ── */
function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}

/* ── بوت مشترک ── */
document.addEventListener('DOMContentLoaded', async () => {
  paintHeaderIcons();
  await bindShared();
  initReveal();
  document.dispatchEvent(new CustomEvent('store:ready'));
});
