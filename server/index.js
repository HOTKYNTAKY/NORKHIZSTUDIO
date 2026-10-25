/**
 * NORKHIZ STUDIO — Node preview server (development only).
 * Serves the static frontend and mocks the PHP API so the site runs locally.
 * Production: use api/ with PHP-FPM + Nginx (see INSTALL.md).
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.resolve('../public');

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// in-memory mock state
const users = [];
const sessions = new Map(); // token -> {user, expires}
let videos = [
  { id: 1, title: 'شب طلایی — Visconti و Lila', views: 504123, duration: '۳۱ دقیقه', quality: '۴K UHD', tags: ['آماتور','HD','VIP'], rating: 9.8, category_id: 1, premium: true, description: 'فیلمی با کیفیت ۴ک و تصاویر شیشه‌ای لوکس.' },
  { id: 2, title: 'شبهای تهران — پارسی native', views: 389012, duration: '۲۲ دقیقه', quality: '۱۰۸۰p', tags: ['ایرانی / پارسی','HD'], rating: 9.4, category_id: 6, premium: false, description: 'محتوای پارسی با پشتیبانی کامل فارسی و RTL.' },
  { id: 3, title: 'لجن و طلا — دوپره', views: 215670, duration: '۴۴ دقیقه', quality: '۴K UHD', tags: ['لسبیان','VIP','HD'], rating: 9.1, category_id: 2, premium: true },
  { id: 4, title: 'شب لولیتا — MILF اراکی', views: 441900, duration: '۳۸ دقیقه', quality: '۴K UHD', tags: ['میلف (MILF)','HD'], rating: 9.6, category_id: 4, premium: false },
  { id: 5, title: 'silk — دیده-ban', views: 167450, duration: '۱۹ دقیقه', quality: '۷۲۰p', tags: ['آماتور','HD'], rating: 8.9, category_id: 1, premium: false },
  { id: 6, title: 'سفر به تокиو', views: 298330, duration: '۲۷ دقیقه', quality: '۱۰۸۰p', tags: ['آسیایی','HD'], rating: 9.0, category_id: 5, premium: false },
];

const categories = [
  { id: 1, name: 'آماتور', slug: 'amateur', video_count: 142 },
  { id: 2, name: 'لسبیان', slug: 'lesbian', video_count: 98 },
  { id: 3, name: 'موتور / آナル', slug: 'anal', video_count: 87 },
  { id: 4, name: 'میلف (MILF)', slug: 'milf', video_count: 64 },
  { id: 5, name: 'آسیایی', slug: 'asian', video_count: 112 },
  { id: 6, name: 'ایرانی / پارسی', slug: 'iranian', video_count: 56 },
];

const favorites = new Map(); // userId -> Set(videoId)
const history = new Map();   // userId -> Map(videoId -> {at, pos})
const comments = new Map();  // videoId -> Array

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace(/^Bearer\s/i, '') ?? req.cookies?.session_token;
  const sess = token && sessions.get(token);
  if (!sess || sess.expires < Date.now()) {
    return res.status(401).json({ error: 'authentication_required' });
  }
  req.user = sess.user;
  next();
}

// ---- static frontend ----
app.use(express.static(PUBLIC));

// ---- API mock ----
app.get('/api/status', (req, res) => res.json({ app: 'NORKHIZ STUDIO API', version: '1.0.0 (preview)', status: 'ok', time: new Date().toISOString() }));

app.get('/api/categories', (req, res) => res.json({ ok: true, data: categories }));

app.get('/api/videos', (req, res) => {
  let list = videos.filter(v => !v.premium);
  if (req.query.category) list = list.filter(v => String(v.category_id) === req.query.category);
  if (req.query.premium === 'true') list = videos.filter(v => v.premium);
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const per = Math.min(50, Math.max(1, parseInt(req.query.per_page || '20', 10)));
  const slice = list.slice((page - 1) * per, page * per).map(v => ({
    id: v.id, title: v.title, views: v.views, duration: v.duration, quality: v.quality,
    tags: v.tags, rating: v.rating, is_premium: v.premium,
    duration_formatted: v.duration,
  }));
  res.json({ ok: true, page, per_page: per, data: slice });
});

app.get('/api/video', (req, res) => {
  const id = parseInt(req.query.id, 10);
  const v = videos.find(x => x.id === id);
  if (!v) return res.status(404).json({ error: 'video_not_found' });
  res.json({
    ok: true,
    video: { ...v, views: v.views + 1, rating: v.rating },
    related: videos.filter(x => x.id !== id && x.category_id === v.category_id).slice(0, 6).map(x => ({
      id: x.id, title: x.title, rating: x.rating, views: x.views, quality: x.quality, is_premium: x.premium,
    })),
  });
});

app.get('/api/related', (req, res) => {
  const id = parseInt(req.query.id, 10);
  const v = videos.find(x => x.id === id);
  const list = v ? videos.filter(x => x.id !== id && x.category_id === v.category_id) : videos;
  res.json({ ok: true, data: list.slice(0, 8).map(x => ({ id: x.id, title: x.title, rating: x.rating, views: x.views, quality: x.quality, is_premium: x.premium })) });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  let list = videos.filter(v => v.title.toLowerCase().includes(q) || v.tags.some(t => t.toLowerCase().includes(q)));
  if (req.query.category) list = list.filter(v => String(v.category_id) === req.query.category);
  if (req.query.quality) list = list.filter(v => v.quality.includes(req.query.quality));
  res.json({ ok: true, q, data: list.map(v => ({ id: v.id, title: v.title, views: v.views, quality: v.quality, tags: v.tags, rating: v.rating, duration: v.duration })) });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  const user = users.find(u => (u.phone === identifier || u.email === identifier) && u.password === password);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const token = 'mock_' + Buffer.from(crypto.randomUUID()).toString('base64url');
  sessions.set(token, { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, membership: user.membership, avatar: user.avatar }, expires: Date.now() + 120 * 60 * 1000 });
  res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.cookie('csrf_token', 'mock_csrf', { sameSite: 'lax', path: '/' });
  res.json({ ok: true, token, user: sessions.get(token).user });
});

app.post('/api/auth/register', (req, res) => {
  const { name, phone, email, password, vip } = req.body;
  if (users.find(u => u.phone === phone)) return res.status(409).json({ error: 'user_exists' });
  const user = { id: users.length + 1, name, phone, email, password, membership: vip ? 'vip' : 'free', avatar: '/assets/avatar-default.svg' };
  users.push(user);
  res.json({ ok: true, user: { id: user.id, name, membership: user.membership } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization']?.replace(/^Bearer\s/i, '') ?? req.cookies?.session_token;
  sessions.delete(token);
  res.clearCookie('session_token');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ ok: true, user: req.user }));

app.get('/api/membership', (req, res) => res.json({
  ok: true,
  plans: [
    { id: 'free', name: 'رایگان', price: 0, currency: 'IRR', quality: '۷۲۰p', features: ['تبلیغات محدود','دسترسی به محتوای رایگان'], premium: false },
    { id: 'vip_monthly', name: 'VIP ماهانه', price: 49000, currency: 'IRR', quality: '۴K UHD', features: ['بدون تبلیغ','دسترسی نامحدود ۴K','دانلود ویدیو','پشتیبانی 우선'], premium: true },
  ],
}));

function requireVip(req, res, next) {
  if (req.user.membership !== 'vip') return res.status(403).json({ error: 'vip_required' });
  next();
}

app.get('/api/favorites', requireAuth, (req, res) => {
  const set = favorites.get(req.user.id) || new Set();
  const data = videos.filter(v => set.has(v.id)).map(v => ({ id: v.id, title: v.title, rating: v.rating, views: v.views, is_premium: v.premium }));
  res.json({ ok: true, data });
});

app.post('/api/favorites', requireAuth, (req, res) => {
  const id = req.body.video_id;
  if (!id) return res.status(400).json({ error: 'video_id_required' });
  if (!favorites.has(req.user.id)) favorites.set(req.user.id, new Set());
  favorites.get(req.user.id).add(id);
  res.json({ ok: true });
});

app.delete('/api/favorites', requireAuth, (req, res) => {
  const id = req.query.video_id;
  favorites.get(req.user.id)?.delete(id);
  res.json({ ok: true });
});

app.get('/api/history', requireAuth, (req, res) => {
  const map = history.get(req.user.id) || new Map();
  const data = videos.filter(v => map.has(v.id)).map(v => ({ id: v.id, title: v.title, rating: v.rating, views: v.views, watched_at: map.get(v.id).at }));
  res.json({ ok: true, data });
});

app.post('/api/history', requireAuth, (req, res) => {
  const id = req.body.video_id;
  if (!id) return res.status(400).json({ error: 'video_id_required' });
  if (!history.has(req.user.id)) history.set(req.user.id, new Map());
  history.get(req.user.id).set(id, { at: new Date().toISOString(), pos: req.body.position_seconds || 0 });
  res.json({ ok: true });
});

app.delete('/api/history', requireAuth, (req, res) => {
  const id = req.query.video_id;
  history.get(req.user.id)?.delete(id);
  res.json({ ok: true });
});

app.get('/api/downloads', requireAuth, requireVip, (req, res) => res.json({ ok: true, data: [] }));
app.post('/api/downloads', requireAuth, requireVip, (req, res) => res.json({ ok: true, download_url: `/api/stream?id=${req.body.video_id}` }));

app.get('/api/comments', (req, res) => {
  const id = parseInt(req.query.video_id, 10);
  res.json({ ok: true, data: comments.get(id) || [] });
});

app.post('/api/comments', requireAuth, (req, res) => {
  const id = parseInt(req.body.video_id, 10);
  const body = req.body.body;
  if (!id || !body) return res.status(400).json({ error: 'video_and_body_required' });
  const c = { id: Date.now(), body, author: req.user.name, likes: 0, created_at: new Date().toISOString() };
  if (!comments.has(id)) comments.set(id, []);
  comments.get(id).unshift(c);
  res.status(201).json({ ok: true });
});

// ---- HLS mock stream ----
app.get('/api/stream', (req, res) => {
  const id = parseInt(req.query.id, 10);
  const v = videos.find(x => x.id === id);
  if (!v) return res.status(404).send('not found');
  // minimal playlist referencing a demo segment endpoint (404 on purpose -> player shows friendly error)
  res.type('application/vnd.apple.mpegurl').send(`#EXTM3U8
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
/api/segment?id=${id}&seq=0
#EXT-X-ENDLIST
`);
});

app.get('/api/segment', (req, res) => res.status(404).send('no segment'));

app.listen(PORT, () => {
  console.log(`NORKHIZ STUDIO preview server: http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/index.html`);
});