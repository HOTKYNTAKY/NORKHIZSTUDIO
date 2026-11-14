import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './style.css';
import './news-theme.css';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const fa = value => String(value ?? '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const BOOKMARK_KEY = 'iran-azad-saved-stories-v1';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let stories = [];
let activeFilter = 'همه';
let query = '';
let savedStories = new Set();
let currentStoryId = null;
try { savedStories = new Set(JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]')); } catch { savedStories = new Set(); }

document.documentElement.classList.add('js');
document.body.classList.add('is-loading');
$('#year').textContent = fa(new Date().getFullYear());

function setLoader(value) {
  const percent = Math.max(0, Math.min(100, value));
  $('#loader-bar-fill').style.width = `${percent}%`;
  $('#loader-count').textContent = fa(String(Math.round(percent)).padStart(2, '0'));
}
function hideLoader() {
  setLoader(100);
  setTimeout(() => {
    $('#preloader')?.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    setTimeout(() => $('#preloader')?.remove(), 750);
    revealHero();
  }, 180);
}
function revealHero() {
  $$('.hero-anim').forEach((element, index) => {
    setTimeout(() => { element.style.transition = 'opacity .8s ease, transform .8s cubic-bezier(.22,1,.36,1)'; element.style.opacity = '1'; element.style.transform = 'translateY(0)'; }, index * 105);
  });
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFC').replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').toLocaleLowerCase('fa');
}
function safeStory(item) {
  if (!item || typeof item !== 'object' || !item.id || !item.title || !Array.isArray(item.body)) return null;
  const allowed = ['خبر', 'تحلیل', 'دیدگاه'];
  return {
    id: String(item.id).slice(0, 80), type: allowed.includes(item.type) ? item.type : 'دیدگاه',
    title: String(item.title).slice(0, 180), summary: String(item.summary || '').slice(0, 320),
    author: String(item.author || 'تحریریه').slice(0, 80),
    dateLabel: String(item.dateLabel || '—').slice(0, 50),
    readMinutes: Math.min(60, Math.max(1, Number(item.readMinutes) || 3)),
    topic: String(item.topic || 'ایران').slice(0, 60),
    body: item.body.slice(0, 30).map(paragraph => String(paragraph).slice(0, 4000)),
    sample: item.sample === true
  };
}
function isVisible(item) {
  const matchesCategory = activeFilter === 'همه' || item.type === activeFilter;
  const text = normalizeText(`${item.title} ${item.summary} ${item.type} ${item.topic} ${item.author}`);
  return matchesCategory && (!query || text.includes(normalizeText(query)));
}
function saveStory(id) {
  if (savedStories.has(id)) savedStories.delete(id); else savedStories.add(id);
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...savedStories])); } catch { /* private browsing */ }
  renderStories();
}
function storyCard(item, index) {
  const featured = index === 0 && activeFilter === 'همه' && !query;
  const saved = savedStories.has(item.id);
  const title = esc(item.title);
  return `<article class="news-card glass-card ${featured ? 'news-featured' : ''}" data-reveal style="--card-order:${index}">
    <button class="news-cover cover-${index % 4} article-open" type="button" data-story="${esc(item.id)}" aria-label="خواندن: ${title}">
      <span class="cover-orbit" aria-hidden="true"></span><span class="cover-index">IA / ${String(index + 1).padStart(2, '0')}</span>
      <svg class="cover-mark" aria-hidden="true"><use href="#ic-brand"/></svg><span class="cover-title">${title}</span><span class="cover-watermark">IRAN AZAD</span>
      ${item.sample ? '<span class="sample-label">نمونه‌ی نمایشی</span>' : ''}
    </button>
    <div class="news-card-body"><div class="story-meta"><span class="story-type type-${item.type === 'خبر' ? 'news' : item.type === 'تحلیل' ? 'analysis' : 'opinion'}">${esc(item.type)}</span><span>${esc(item.topic)}</span><span>${esc(item.dateLabel)}</span></div>
      <button class="story-title article-open" type="button" data-story="${esc(item.id)}">${title}</button><p class="story-summary">${esc(item.summary)}</p>
      <div class="story-foot"><span class="story-author">${esc(item.author)} <i></i> ${fa(item.readMinutes)} دقیقه مطالعه</span><button class="bookmark-btn ${saved ? 'is-saved' : ''}" type="button" data-bookmark="${esc(item.id)}" aria-pressed="${saved}" aria-label="${saved ? 'حذف از' : 'افزودن به'} مطالب ذخیره‌شده"><svg><use href="#ic-bookmark"/></svg></button></div>
    </div></article>`;
}
function renderStories() {
  const results = stories.filter(isVisible);
  $('#news-grid').innerHTML = results.map(storyCard).join('');
  $('#news-empty').hidden = results.length > 0;
  $('#news-grid').hidden = results.length === 0;
  observeReveals($('#news-grid'));
  $$('.news-filter').forEach(button => button.classList.toggle('active', button.dataset.filter === activeFilter));
}
function openStory(id) {
  const item = stories.find(story => story.id === id);
  if (!item) return;
  currentStoryId = id;
  $('#article-content').innerHTML = `<header class="article-modal-head"><span class="article-kicker">${esc(item.type)}${item.sample ? ' · نمونه‌ی نمایشی' : ''}</span><h1 id="modal-title">${esc(item.title)}</h1><p>${esc(item.summary)}</p><div class="article-byline"><span>${esc(item.author)}</span><i></i><span>${esc(item.dateLabel)}</span><i></i><span>${fa(item.readMinutes)} دقیقه مطالعه</span></div></header><div class="article-modal-body">${item.body.map(p => `<p>${esc(p)}</p>`).join('')}</div><footer class="article-modal-foot"><span><svg><use href="#ic-check"/></svg> ${item.sample ? 'مطلب نمونه؛ خبر واقعی نیست' : 'منابع و توضیحات در متن'}</span><button type="button" class="btn btn-ghost btn-small" id="share-story"><svg class="btn-ico"><use href="#ic-share"/></svg> کپی پیوند</button></footer>`;
  $('#article-modal').showModal();
  if (location.hash !== `#story/${encodeURIComponent(id)}`) history.replaceState(null, '', `#story/${encodeURIComponent(id)}`);
  $('#share-story').addEventListener('click', shareStory, { once: true });
}
function closeStory() {
  if ($('#article-modal').open) $('#article-modal').close();
  $('#article-content').replaceChildren();
  if (location.hash.startsWith('#story/')) history.replaceState(null, '', `${location.pathname}${location.search}`);
  currentStoryId = null;
}
async function shareStory() {
  const url = new URL(location.href);
  url.hash = `story/${encodeURIComponent(currentStoryId || '')}`;
  try { await navigator.clipboard.writeText(url.href); }
  catch {
    const helper = document.createElement('textarea'); helper.value = url.href; document.body.append(helper); helper.select(); document.execCommand('copy'); helper.remove();
  }
  const button = $('#share-story');
  if (button) button.textContent = 'پیوند کپی شد';
}
async function loadStories() {
  setLoader(35);
  try {
    const response = await fetch('/news.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`news ${response.status}`);
    const data = await response.json();
    stories = Array.isArray(data) ? data.map(safeStory).filter(Boolean) : [];
  } catch { stories = []; }
  setLoader(78);
  renderStories();
  setLoader(100);
}

// Initial loader + resilient static-content fetch.
const loaderTimer = setInterval(() => {
  const current = Number($('#loader-bar-fill').style.width.replace('%', '')) || 0;
  if (current < 82) setLoader(current + 7);
}, 85);
loadStories().finally(() => {
  clearInterval(loaderTimer);
  const initialStory = location.hash.match(/^#story\/(.+)$/);
  if (initialStory) openStory(decodeURIComponent(initialStory[1]));
  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader, { once: true });
});

// Category and search controls.
$('#news-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  renderStories();
});
function syncSearch(value) {
  query = value.trim();
  $('#search-input').value = value;
  $('#section-search').value = value;
  renderStories();
}
$('#search-form').addEventListener('submit', event => { event.preventDefault(); syncSearch($('#search-input').value); $('#latest').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); });
$('#search-input').addEventListener('input', event => syncSearch(event.target.value));
$('#section-search').addEventListener('input', event => syncSearch(event.target.value));
$('#news-grid').addEventListener('click', event => {
  const bookmark = event.target.closest('[data-bookmark]');
  if (bookmark) { event.preventDefault(); event.stopPropagation(); saveStory(bookmark.dataset.bookmark); return; }
  const opener = event.target.closest('[data-story]');
  if (opener) openStory(opener.dataset.story);
});
$('#modal-close').addEventListener('click', closeStory);
$('#article-modal').addEventListener('click', event => { if (event.target === $('#article-modal')) closeStory(); });
$('#article-modal').addEventListener('close', () => { if (currentStoryId) closeStory(); });
window.addEventListener('hashchange', () => {
  const match = location.hash.match(/^#story\/(.+)$/);
  if (match) openStory(decodeURIComponent(match[1]));
  else if ($('#article-modal').open) closeStory();
});

// Responsive full-screen menu.
const menuButton = $('#menu-btn');
const mobileMenu = $('#mobile-menu');
function setMenu(open) {
  menuButton.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  mobileMenu.classList.toggle('is-open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  mobileMenu.inert = !open;
  document.body.classList.toggle('menu-open', open);
  if (open) requestAnimationFrame(() => $('#mobile-menu .mm-item')?.focus());
  else if (document.activeElement.closest?.('#mobile-menu')) menuButton.focus();
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
$('#mm-close').addEventListener('click', () => setMenu(false));
$$('#mobile-menu .nav-link').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search-input').focus(); }
  if (event.key === 'Escape') { setMenu(false); if ($('#article-modal').open) closeStory(); }
});

// Header scroll state + progress line + section-aware nav.
const nav = $('#site-nav');
const progress = $('#scroll-progress');
let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    nav.classList.toggle('is-scrolled', scrollY > 20);
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
    if (sceneApi) {
      sceneApi.state.palette = p * 3;
      sceneApi.state.distort = .36 + p * .38;
      sceneApi.state.posY = Math.sin(p * Math.PI * 2) * .38;
      sceneApi.state.spin = .8 + p * .65;
    }
    scrollQueued = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
const sectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  const link = $(`.nav-links a[href="#${entry.target.id}"]`);
  if (link) { $$('.nav-links a').forEach(a => a.classList.remove('is-active')); link.classList.add('is-active'); }
}), { rootMargin: '-35% 0px -55% 0px' }) : null;
$$('main section[id]').forEach(section => sectionObserver?.observe(section));

// Reveal on scroll, with a no-observer fallback.
function observeReveals(root = document) {
  const nodes = $$('[data-reveal]', root);
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window) || reduceMotion) { nodes.forEach(node => node.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: .1 });
  nodes.forEach(node => observer.observe(node));
}
observeReveals();

// Lazy-load the original Aether orbital scene; CSS blobs remain as its fallback.
let sceneApi = null;
const startAether = () => import('./three/scene.js').then(({ createAetherScene }) => {
  sceneApi = createAetherScene($('#webgl'), { reducedMotion: reduceMotion });
  if (!sceneApi) document.body.classList.add('no-webgl');
  else onScroll();
}).catch(() => document.body.classList.add('no-webgl'));
if (!reduceMotion) {
  if ('requestIdleCallback' in window) requestIdleCallback(startAether, { timeout: 1800 });
  else setTimeout(startAether, 900);
} else document.body.classList.add('no-webgl');

// Original Vortex cursor language, activated only for a fine pointer.
if (matchMedia('(pointer:fine)').matches && !reduceMotion) {
  const dot = $('#cursor-dot'), ring = $('#cursor-ring');
  let pointerFrame = 0, x = -50, y = -50, shown = false;
  window.addEventListener('pointermove', event => {
    x = event.clientX; y = event.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      dot.style.left = `${x}px`; dot.style.top = `${y}px`;
      ring.style.left = `${x}px`; ring.style.top = `${y}px`;
      if (!shown) { dot.style.opacity = ring.style.opacity = '1'; shown = true; }
      pointerFrame = 0;
    });
  }, { passive: true });
  document.addEventListener('pointerover', event => ring.classList.toggle('is-hover', Boolean(event.target.closest('a,button,input'))));
}
