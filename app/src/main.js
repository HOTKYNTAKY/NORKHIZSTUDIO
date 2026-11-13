import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import '@fontsource/vazirmatn/900.css';
import './style.css';

const STORE_KEY = 'frame-cinema-catalog-v1';
const seed = [
  { id:'frame-01', title:'آن‌سوی مه', type:'فیلم', genre:'درام، ماجراجویی', year:2025, rating:8.7, duration:'۱۰۸ دقیقه', description:'عکاسی جوان برای یافتن پاسخ، راهی سفری می‌شود که نگاهش به خانه و خاطره را برای همیشه تغییر می‌دهد.', video:'', poster:'', tone:'amber', featured:true },
  { id:'frame-02', title:'ایستگاه آخر', type:'سریال', genre:'معمایی، درام', year:2024, rating:8.4, duration:'۸ قسمت', description:'در ایستگاهی دورافتاده، هر مسافر رازی با خود دارد و یک شب همه‌چیز را عوض می‌کند.', video:'', poster:'', tone:'blue' },
  { id:'frame-03', title:'مدار آبی', type:'فیلم', genre:'علمی‌تخیلی، ماجراجویی', year:2025, rating:8.1, duration:'۱۱۹ دقیقه', description:'گروهی از پژوهشگران در مأموریتی آرام، با پیامی روبه‌رو می‌شوند که از آینده خبر می‌دهد.', video:'', poster:'', tone:'violet' },
  { id:'frame-04', title:'یک روز معمولی', type:'فیلم', genre:'کمدی، درام', year:2023, rating:7.9, duration:'۹۶ دقیقه', description:'یک اشتباه کوچک، روزی عادی را به زنجیره‌ای از دیدارهای غیرمنتظره تبدیل می‌کند.', video:'', poster:'', tone:'coral' },
  { id:'frame-05', title:'خانه‌ی شماره هفت', type:'سریال', genre:'معمایی', year:2024, rating:8.6, duration:'۶ قسمت', description:'ساکنان خانه‌ای قدیمی می‌کوشند بفهمند چرا همه‌ی ساعت‌ها در نیمه‌شب می‌ایستند.', video:'', poster:'', tone:'green' },
  { id:'frame-06', title:'تابستان بی‌پایان', type:'فیلم', genre:'درام، عاشقانه', year:2022, rating:7.8, duration:'۱۰۲ دقیقه', description:'بازگشت به شهر ساحلی کودکی، دو دوست قدیمی را روبه‌روی انتخابی تازه می‌گذارد.', video:'', poster:'', tone:'pink' },
  { id:'frame-07', title:'خط افق', type:'سریال', genre:'ماجراجویی، درام', year:2025, rating:8.3, duration:'۱۰ قسمت', description:'یک گروه کوچک برای ساختن آینده‌ای بهتر، از مسیرهای ناآشنا عبور می‌کند.', video:'', poster:'', tone:'sand' },
  { id:'frame-08', title:'شهر خاموش', type:'فیلم', genre:'معمایی، علمی‌تخیلی', year:2024, rating:8.0, duration:'۱۱۲ دقیقه', description:'پس از خاموشی بزرگ، پیام کوتاهی در رادیویی قدیمی امید را زنده می‌کند.', video:'', poster:'', tone:'night' }
];
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const fa = n => Number(n || 0).toLocaleString('fa-IR');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog = loadCatalog();
const hasBrowserCatalog = Boolean(catalog);
if (!catalog) catalog = structuredClone(seed);
let activeFilter = 'all';
let query = '';
let toastTimer;

function loadCatalog() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved)) return saved.map(sanitizeMovie).filter(Boolean);
  } catch { /* fall back to the published catalog */ }
  return null;
}
function sanitizeMovie(m) {
  if (!m || typeof m !== 'object' || !String(m.title || '').trim()) return null;
  const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  return { id:String(m.id || crypto.randomUUID()), title:String(m.title).slice(0,80), type:m.type === 'سریال' ? 'سریال' : 'فیلم', genre:String(m.genre || 'درام').slice(0,50), year:Math.min(2100,Math.max(1900,Number(m.year)||2025)), rating:Math.min(10,Math.max(0,Number(m.rating)||0)), duration:String(m.duration || '').slice(0,30), description:String(m.description || '').slice(0,240), poster:safeUrl(m.poster || ''), video:safeUrl(m.video || ''), tone:/^(amber|blue|violet|coral|green|pink|sand|night)$/.test(m.tone) ? m.tone : 'blue', featured:Boolean(m.featured) };
}
function saveCatalog() { localStorage.setItem(STORE_KEY, JSON.stringify(catalog)); }
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800); }
function movieCard(m, index) {
  const title=esc(m.title), genre=esc(m.genre), poster=esc(m.poster), description=esc(m.description);
  const posterContent = m.poster ? `<img src="${poster}" alt="پوستر ${title}" loading="lazy" onerror="this.remove()">` : `<div class="poster-art poster-${esc(m.tone)}"><span class="poster-overline">FRAME / ${String(index+1).padStart(2,'0')}</span><span class="poster-glyph">${esc(m.title.trim().slice(0,1))}</span><span class="poster-art-title">${title}</span><span class="poster-art-sub">${genre}</span></div>`;
  return `<article class="movie-card" data-movie-id="${esc(m.id)}"><button class="poster-button" data-play="${esc(m.id)}" aria-label="نمایش ${title}"><div class="poster-wrap">${posterContent}<span class="poster-shade"></span><span class="poster-play">▶</span><span class="card-type">${esc(m.type)}</span><span class="card-rating">★ ${fa(m.rating)}</span></div></button><div class="card-info"><div class="card-topline"><span>${genre}</span><span>${fa(m.year)}</span></div><h3>${title}</h3><p>${description}</p><button class="card-watch" data-play="${esc(m.id)}">${m.video?'تماشای معرفی':'جزئیات اثر'} <span>←</span></button></div></article>`;
}
function matches(m) {
  const byType = activeFilter === 'all' || m.type === activeFilter || m.genre.split(/[،,]/).map(x=>x.trim()).includes(activeFilter);
  const byQuery = !query || `${m.title} ${m.genre} ${m.year} ${m.description}`.toLocaleLowerCase('fa').includes(query.toLocaleLowerCase('fa'));
  return byType && byQuery;
}
function renderCatalog() {
  const found=catalog.filter(matches);
  $('#movie-grid').innerHTML=found.map(movieCard).join('');
  $('#empty-state').hidden=found.length>0;
  $('#movie-grid').hidden=found.length===0;
  $('#count-all').textContent=fa(catalog.length);
  $('#results-label').textContent=query ? `نتیجه‌ی جست‌وجو برای «${query}»` : activeFilter==='all' ? 'منتخب‌های تماشایی' : `نمایش ${activeFilter}`;
}
function renderAdmin() {
  $('#admin-count').textContent=`${fa(catalog.length)} عنوان`;
  $('#admin-list').innerHTML = catalog.map(m=>`<article class="admin-row"><div class="admin-thumb">${m.poster?`<img src="${esc(m.poster)}" alt="" loading="lazy">`:esc(m.title.slice(0,1))}</div><div class="admin-row-copy"><b>${esc(m.title)}</b><span>${esc(m.type)} · ${esc(m.genre)} · ${fa(m.year)}</span></div><div class="admin-row-actions"><button data-edit="${esc(m.id)}">ویرایش</button><button class="delete-row" data-delete="${esc(m.id)}">حذف</button></div></article>`).join('') || '<div class="admin-empty">هنوز عنوانی در کتابخانه نیست.</div>';
}
function setFilter(value) {
  activeFilter=value;
  $$('.filter-chip').forEach(b=>b.classList.toggle('selected',b.dataset.filter===value));
  renderCatalog();
}
function openPlayer(id) {
  const m=catalog.find(x=>x.id===id) || catalog.find(x=>x.featured) || catalog[0];
  if(!m) return;
  $('#player-title').textContent=m.title;
  const frame=$('#player-frame');
  frame.innerHTML='<div class="player-placeholder"><span>▶</span><p>برای این عنوان هنوز پیوند پخش اضافه نشده است.</p><small>از پنل مدیریت، نشانی قانونی ویدئو یا تریلر را وارد کن.</small></div>';
  $('#player-source').textContent='پخش‌کننده‌ی رسمی';
  if(m.video) {
    try {
      const u=new URL(m.video);
      let embed='';
      if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) { const id=u.searchParams.get('v') || (u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:''); if(id && /^[\w-]{6,20}$/.test(id)) embed=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`; }
      if(u.hostname==='youtu.be' && /^[\w-]{6,20}$/.test(u.pathname.slice(1))) embed=`https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0`;
      if(['vimeo.com','www.vimeo.com'].includes(u.hostname) && /^\d+$/.test(u.pathname.slice(1))) embed=`https://player.vimeo.com/video/${u.pathname.slice(1)}?autoplay=1`;
      if(embed) { frame.innerHTML=`<iframe src="${embed}" title="${esc(m.title)}" allow="autoplay; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`; }
      else if(u.protocol==='https:' && /\.mp4(?:$|\?)/i.test(u.pathname+u.search)) { frame.innerHTML=`<video controls autoplay playsinline src="${esc(u.href)}"></video>`; }
      else { $('#player-source').textContent='لینک پخش پشتیبانی نمی‌شود'; }
    } catch { /* Show the empty-player message for invalid URLs. */ }
  }
  $('#player-dialog').showModal();
}
function closePlayer() { $('#player-dialog').close(); $('#player-frame').innerHTML=''; }
function clearForm() { $('#movie-form').reset(); $('#movie-form').hidden=true; $('#movie-form').elements.id.value=''; $('#form-title').textContent='افزودن به کتابخانه'; }
function editMovie(id) { const m=catalog.find(x=>x.id===id); if(!m)return; const form=$('#movie-form'); for(const key of ['id','title','year','type','genre','rating','duration','poster','video','description']) form.elements[key].value=m[key]??''; $('#form-title').textContent='ویرایش عنوان'; form.hidden=false; form.scrollIntoView({behavior:'smooth',block:'start'}); }
function exportJSON() { const blob=new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='frame-catalog.json'; a.click(); URL.revokeObjectURL(a.href); toast('فایل JSON کتابخانه آماده شد.'); }

$('#year').textContent=fa(new Date().getFullYear());
renderCatalog();
if (!hasBrowserCatalog) {
  fetch('/catalog.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(data => {
    if (Array.isArray(data) && data.length <= 500) {
      const published = data.map(sanitizeMovie).filter(Boolean);
      if (published.length) { catalog = published; renderCatalog(); }
    }
  }).catch(() => {});
}
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b)setFilter(b.dataset.filter);});
$('#search').addEventListener('input',e=>{query=e.target.value.trim();renderCatalog();});
$('#clear-filters').addEventListener('click',e=>{e.preventDefault();$('#search').value='';query='';setFilter('all');});
$('#movie-grid').addEventListener('click',e=>{const b=e.target.closest('[data-play]');if(b)openPlayer(b.dataset.play);});
$('#hero-play').addEventListener('click',()=>openPlayer(catalog.find(m=>m.featured)?.id));
$('#admin-open').addEventListener('click',()=>{$('#admin-dialog').showModal();renderAdmin();});
$('#admin-list').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)editMovie(edit.dataset.edit);if(del){const m=catalog.find(x=>x.id===del.dataset.delete);if(confirm(`«${m?.title||''}» از کتابخانه‌ی این مرورگر حذف شود؟`)){catalog=catalog.filter(x=>x.id!==del.dataset.delete);saveCatalog();renderCatalog();renderAdmin();toast('عنوان حذف شد.');}}});
$('#new-movie').addEventListener('click',()=>{clearForm();$('#movie-form').hidden=false;$('#movie-form').scrollIntoView({behavior:'smooth',block:'start'});});
$('#cancel-form').addEventListener('click',clearForm);
$('#movie-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;const d=Object.fromEntries(new FormData(form));const item=sanitizeMovie({...d,id:d.id||crypto.randomUUID(),featured:false});if(!item){toast('نام اثر را وارد کن.');return;}if((d.poster&&!item.poster)||(d.video&&!item.video)){toast('نشانی‌ها باید معتبر و با https باشند.');return;}const old=catalog.findIndex(x=>x.id===item.id);if(old>=0)catalog[old]=item;else catalog.unshift(item);try{saveCatalog();}catch{toast('فضای ذخیره‌سازی مرورگر پر شده است.');return;}clearForm();renderCatalog();renderAdmin();toast('کتابخانه در همین مرورگر به‌روز شد.');});
$('#export-button').addEventListener('click',exportJSON);
$('#import-button').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||data.length>500)throw Error();const clean=data.map(sanitizeMovie).filter(Boolean);if(!clean.length)throw Error();catalog=clean;saveCatalog();renderCatalog();renderAdmin();toast('کتابخانه وارد شد.');}catch{toast('فایل JSON معتبر نیست.');}e.target.value='';});
$$('[data-close="player"]').forEach(b=>b.addEventListener('click',closePlayer));
$$('[data-close="admin"]').forEach(b=>b.addEventListener('click',()=>$('#admin-dialog').close()));
$('#player-dialog').addEventListener('click',e=>{if(e.target===$('#player-dialog'))closePlayer();});
$('#admin-dialog').addEventListener('click',e=>{if(e.target===$('#admin-dialog'))$('#admin-dialog').close();});
document.addEventListener('keydown',e=>{if(e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
$('#mobile-menu').addEventListener('click',()=>document.querySelector('.nav-links').classList.toggle('mobile-open'));
$$('.nav-links a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav-links').classList.remove('mobile-open')));
