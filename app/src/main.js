import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import './style.css';

const AGE_KEY = 'frame18-age-confirmed-v1';
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const fa = value => Number(value || 0).toLocaleString('fa-IR');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog = [];
let activeFilter = 'all';
let query = '';
let toastTimer;

function sanitizeMovie(movie) {
  if (!movie || typeof movie !== 'object' || !String(movie.title || '').trim()) return null;
  let video = '', poster = '';
  try { const url = new URL(movie.video || ''); if (url.protocol === 'https:') video = url.href; } catch { /* no playable URL */ }
  try { const url = new URL(movie.poster || ''); if (url.protocol === 'https:') poster = url.href; } catch { /* generated art will be used */ }
  return {
    id: String(movie.id || ''), title: String(movie.title).slice(0, 100),
    type: movie.type === 'سریال' ? 'سریال' : 'فیلم',
    category: String(movie.category || 'داستانی').slice(0, 30),
    year: Math.min(2100, Math.max(1900, Number(movie.year) || new Date().getFullYear())),
    duration: String(movie.duration || '').slice(0, 40),
    description: String(movie.description || '').slice(0, 300), video, poster,
    rightsVerified: movie.rightsVerified === true,
    performers18Plus: movie.performers18Plus === true,
    consentVerified: movie.consentVerified === true,
    tone: /^(wine|rose|violet|amber|night|copper)$/.test(movie.tone) ? movie.tone : 'wine'
  };
}
function eligible(movie) {
  // Published entries require affirmative editorial attestations. These are not legal verification by themselves.
  return movie && movie.title && movie.video && movie.rightsVerified && movie.performers18Plus && movie.consentVerified;
}
function toast(message) {
  const element = $('#toast'); element.textContent = message; element.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('show'), 2800);
}
function card(movie, index) {
  const title = esc(movie.title), category = esc(movie.category);
  const art = movie.poster
    ? `<img src="${esc(movie.poster)}" alt="پوستر ${title}" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="adult-poster-art poster-${esc(movie.tone)}"><span>FRAME / 18+</span><b>${title.slice(0, 1)}</b><strong>${title}</strong></div>`;
  return `<article class="movie-card"><button class="poster-button" data-play="${esc(movie.id)}" aria-label="نمایش ${title}"><div class="poster-wrap">${art}<span class="poster-shade"></span><span class="poster-play">▶</span><span class="card-type">۱۸+</span><span class="card-rating">${esc(movie.type)}</span></div></button><div class="card-info"><div class="card-topline"><span>${category}</span><span>${fa(movie.year)}</span></div><h3>${title}</h3><p>${esc(movie.description)}</p><button class="card-watch" data-play="${esc(movie.id)}">مشاهده در منبع ویدئو <span>↗</span></button></div></article>`;
}
function isMatch(movie) {
  const typeMatch = activeFilter === 'all' || movie.type === activeFilter || movie.category === activeFilter;
  const searchText = `${movie.title} ${movie.category} ${movie.year} ${movie.description}`.toLocaleLowerCase('fa');
  return typeMatch && (!query || searchText.includes(query.toLocaleLowerCase('fa')));
}
function render() {
  const results = catalog.filter(eligible).filter(isMatch);
  $('#movie-grid').innerHTML = results.map(card).join('');
  $('#movie-grid').hidden = !results.length;
  $('#empty-state').hidden = results.length > 0;
  $('#count-all').textContent = fa(catalog.filter(eligible).length);
  $('#results-label').textContent = query ? `نتیجه‌ی جست‌وجو برای «${query}»` : activeFilter === 'all' ? 'همه‌ی عناوین' : `نمایش ${activeFilter}`;
}
async function fetchCatalog() {
  try {
    const response = await fetch('/catalog.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`catalog ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data) && data.length <= 500) catalog = data.map(sanitizeMovie).filter(eligible);
  } catch { catalog = []; }
  render();
}
function openPlayer(id) {
  const movie = catalog.find(item => item.id === id && eligible(item));
  if (!movie) return;
  $('#player-title').textContent = movie.title;
  const source = $('#player-source'); source.href = movie.video;
  const frame = $('#player-frame');
  frame.innerHTML = '';
  if (/\.(mp4|webm|ogv)(?:$|\?)/i.test(movie.video)) {
    const video = document.createElement('video');
    video.controls = true; video.autoplay = true; video.playsInline = true; video.preload = 'metadata';
    video.src = movie.video;
    if (movie.poster) video.poster = movie.poster;
    video.setAttribute('aria-label', `${movie.title} — فقط ۱۸+`);
    frame.append(video);
  } else {
    const message = document.createElement('div'); message.className = 'player-placeholder';
    message.innerHTML = '<span>↗</span><p>این ویدئو روی میزبان بیرونی قرار دارد.</p><small>برای ادامه از دکمه‌ی «ادامه در میزبان ویدئو» استفاده کن.</small>';
    frame.append(message);
  }
  $('#player-dialog').showModal();
}
function closePlayer() {
  $('#player-dialog').close(); $('#player-frame').replaceChildren();
}
function leaveSite() {
  try { sessionStorage.removeItem(AGE_KEY); } catch { /* private mode */ }
  document.body.innerHTML = '<main class="exit-screen" dir="rtl"><h1>از فریم خارج شدی.</h1><p>برای بستن این صفحه، پنجره‌ی مرورگر را ببند.</p></main>';
}
function acceptAge() {
  try { sessionStorage.setItem(AGE_KEY, 'yes'); } catch { /* still allow this tab */ }
  document.body.classList.add('age-confirmed');
  $('#age-gate').hidden = true; $('#site-shell').inert = false; $('#site-shell').setAttribute('aria-hidden', 'false');
  fetchCatalog();
}

$('#year').textContent = fa(new Date().getFullYear());
$('#age-accept').addEventListener('click', acceptAge);
$('#age-leave').addEventListener('click', leaveSite);
$('#exit-site').addEventListener('click', leaveSite);
$('#footer-exit').addEventListener('click', leaveSite);
let ageConfirmed = false;
try { ageConfirmed = sessionStorage.getItem(AGE_KEY) === 'yes'; } catch { /* show age gate */ }
if (ageConfirmed) acceptAge();
else $('#age-accept').focus();

$('#filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  $$('.filter-chip').forEach(chip => chip.classList.toggle('selected', chip === button));
  render();
});
$('#search').addEventListener('input', event => { query = event.target.value.trim(); render(); });
$('#movie-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-play]'); if (button) openPlayer(button.dataset.play);
});
$('#player-dialog').addEventListener('click', event => { if (event.target === $('#player-dialog')) closePlayer(); });
$$('[data-close="player"]').forEach(button => button.addEventListener('click', closePlayer));
$('#mobile-menu').addEventListener('click', () => document.querySelector('.nav-links').classList.toggle('mobile-open'));
$$('.nav-links a').forEach(link => link.addEventListener('click', () => document.querySelector('.nav-links').classList.remove('mobile-open')));
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); }
  if (event.key === 'Escape' && $('#player-dialog').open) closePlayer();
});
