const fa = (value) => Number(value || 0).toLocaleString('fa-IR');
const dateFa = (value) => {
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value)); }
  catch { return ''; }
};
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const state = { category: '', query: '', limit: 10 };
const grid = document.querySelector('#article-grid');
const featuredSlot = document.querySelector('#featured-slot');
const clearFilter = document.querySelector('#clear-filter');
const emptyState = document.querySelector('#empty-state');
const count = document.querySelector('#result-count');
const loadMore = document.querySelector('#load-more');

document.querySelector('#year').textContent = new Date().getFullYear().toLocaleString('fa-IR');
const today = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date());
document.querySelector('#today-date').textContent = today;
fetch('/api/meta').then((response) => response.ok ? response.json() : null).then((meta) => {
  const contact = document.querySelector('#editor-contact');
  if (contact && meta?.contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(meta.contactEmail)) {
    contact.href = `mailto:${meta.contactEmail}`;
    contact.hidden = false;
  }
}).catch(() => {});

function featuredCard(article) {
  return `<article class="featured-card"><div class="featured-copy"><span class="kind-pill">${esc(article.kind)} · ${esc(article.category)}</span><h3>${esc(article.title)}</h3><p>${esc(article.excerpt)}</p><a class="text-link" href="/article.html?slug=${encodeURIComponent(article.slug)}">خواندن مطلب <span>←</span></a><div class="featured-meta">${esc(article.author)} · ${dateFa(article.publishedAt)}</div></div><div class="featured-art" aria-hidden="true"><span>ایران‌نگر</span></div></article>`;
}
function articleCard(article) {
  return `<article class="news-card"><div class="card-top"><span class="card-label">${esc(article.kind)} / ${esc(article.category)}</span>${article.sample ? '<span class="sample-badge">نمونه‌ی آغازین</span>' : ''}</div><h3>${esc(article.title)}</h3><p>${esc(article.excerpt)}</p><div class="card-foot"><span>${esc(article.author)} · ${dateFa(article.publishedAt)}</span><a href="/article.html?slug=${encodeURIComponent(article.slug)}">ادامه <span aria-hidden="true">←</span></a></div></article>`;
}
async function loadArticles() {
  grid.innerHTML = '<div class="loading-state">در حال دریافت مطالب…</div>';
  const params = new URLSearchParams({ limit: String(state.limit) });
  if (state.category) params.set('category', state.category);
  if (state.query) params.set('q', state.query);
  try {
    const response = await fetch(`/api/news?${params}`);
    if (!response.ok) throw new Error('پاسخ سرور کامل نبود.');
    const result = await response.json();
    const articles = result.articles || [];
    const featured = !state.category && !state.query ? articles.find((article) => article.featured) : null;
    featuredSlot.innerHTML = featured ? featuredCard(featured) : '';
    const rest = featured ? articles.filter((article) => article.id !== featured.id) : articles;
    grid.innerHTML = rest.map(articleCard).join('');
    emptyState.hidden = articles.length !== 0;
    count.textContent = `${fa(articles.length)} مطلب`;
    clearFilter.hidden = !state.category && !state.query;
    loadMore.hidden = articles.length < state.limit;
    document.querySelector('#feed-label').textContent = state.query ? `نتیجه‌ی «${state.query}»` : state.category || 'تازه‌ترین مطالب';
  } catch {
    featuredSlot.innerHTML = '';
    grid.innerHTML = '<div class="loading-state">اتصال به سامانه‌ی خبر ممکن نشد. کمی بعد دوباره تلاش کنید.</div>';
    count.textContent = '';
    loadMore.hidden = true;
  }
}

document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
  state.category = button.dataset.category || '';
  state.query = '';
  document.querySelector('#search-input').value = '';
  state.limit = 10;
  document.querySelectorAll('[data-category]').forEach((item) => item.classList.toggle('active', item === button));
  loadArticles();
  document.querySelector('#latest').scrollIntoView({ behavior: 'smooth' });
}));
document.querySelector('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = document.querySelector('#search-input').value.trim();
  state.category = '';
  state.limit = 20;
  loadArticles();
  document.querySelector('#latest').scrollIntoView({ behavior: 'smooth' });
});
clearFilter.addEventListener('click', () => {
  state.category = '';
  state.query = '';
  state.limit = 10;
  document.querySelector('#search-input').value = '';
  document.querySelectorAll('[data-category]').forEach((item) => item.classList.remove('active'));
  loadArticles();
});
loadMore.addEventListener('click', () => { state.limit = Math.min(state.limit + 10, 40); loadArticles(); });
document.querySelector('#menu-toggle').addEventListener('click', (event) => {
  const nav = document.querySelector('#main-nav');
  const opened = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(opened));
});
loadArticles();
