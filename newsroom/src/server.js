import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import initSqlJs from 'sql.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const PORT = Number(process.env.PORT || 3000);
const SITE_NAME = process.env.SITE_NAME || 'ایران‌نگر';
const ADMIN_USER = String(process.env.ADMIN_USER || 'editor').trim();
const ADMIN_PASSWORD_HASH = String(process.env.ADMIN_PASSWORD_HASH || '');
const SESSION_SECRET = String(process.env.SESSION_SECRET || '');
const SESSION_TTL = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'iran_negar_admin';
const CATEGORIES = ['سیاست', 'تاریخ', 'جامعه', 'جهان', 'دیدگاه'];
const KINDS = ['خبر', 'گزارش', 'تحلیل', 'دیدگاه', 'تاریخ', 'راهنما'];

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o750 });
const DB_FILE = path.join(DATA_DIR, 'newsroom.sqlite');
const SQL = await initSqlJs({ locateFile: (file) => path.join(ROOT, 'node_modules', 'sql.js', 'dist', file) });
const rawDb = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
rawDb.run('PRAGMA foreign_keys = ON');
let transactionDepth = 0;
function persistDatabase() {
  const temporary = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporary, Buffer.from(rawDb.export()), { mode: 0o600 });
  fs.renameSync(temporary, DB_FILE);
}
function prepareBindings(sql, values) {
  if (values.length === 1 && values[0] && typeof values[0] === 'object' && !Array.isArray(values[0])) {
    const names = [...sql.matchAll(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
    return { sql: sql.replace(/[@:$][A-Za-z_][A-Za-z0-9_]*/g, '?'), values: names.map((name) => values[0][name]) };
  }
  return { sql, values };
}
const db = {
  exec(sql) { rawDb.exec(sql); if (!transactionDepth) persistDatabase(); },
  pragma() { /* sql.js persists a single, atomic SQLite image rather than using WAL. */ },
  close() { persistDatabase(); rawDb.close(); },
  transaction(callback) {
    return (...args) => {
      rawDb.run('BEGIN IMMEDIATE'); transactionDepth += 1;
      try {
        const result = callback(...args);
        rawDb.run('COMMIT'); transactionDepth -= 1; persistDatabase(); return result;
      } catch (error) {
        rawDb.run('ROLLBACK'); transactionDepth -= 1; throw error;
      }
    };
  },
  prepare(sql) {
    const makeStatement = (values) => {
      const bound = prepareBindings(sql, values);
      const statement = rawDb.prepare(bound.sql);
      statement.bind(bound.values);
      return statement;
    };
    return {
      get(...values) {
        const statement = makeStatement(values);
        try { return statement.step() ? statement.getAsObject() : undefined; }
        finally { statement.free(); }
      },
      all(...values) {
        const statement = makeStatement(values); const rows = [];
        try { while (statement.step()) rows.push(statement.getAsObject()); }
        finally { statement.free(); }
        return rows;
      },
      run(...values) {
        const bound = prepareBindings(sql, values);
        rawDb.run(bound.sql, bound.values);
        const changes = rawDb.getRowsModified();
        const row = rawDb.exec('SELECT last_insert_rowid() AS id')[0];
        if (!transactionDepth) persistDatabase();
        return { changes, lastInsertRowid: row?.values?.[0]?.[0] ?? 0 };
      },
    };
  },
};
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    kind TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'تحریریه ایران‌نگر',
    source_name TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
    featured INTEGER NOT NULL DEFAULT 0,
    is_sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_articles_public ON articles(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category, status);
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const isoNow = () => new Date().toISOString();
const seeded = db.prepare('SELECT COUNT(*) AS count FROM articles').get().count;
if (!seeded) {
  const seed = [
    {
      slug: 'constitutional-monarchy-and-accountability',
      title: 'میراث پهلوی و پادشاهی مشروطه؛ پرسش از دولت پاسخ‌گو',
      excerpt: 'یک یادداشت آغازین درباره‌ی نسبت نهادهای نمادین، قانون اساسی و پاسخ‌گویی سیاسی؛ با تفکیک روشن موضع تحریریه از خبر.',
      body: `این متن نمونه‌ای برای نمایش ساختار تحریریه است و خبر روز محسوب نمی‌شود.\n\nدر بحث پادشاهی مشروطه، پرسش محوری فقط نام یک نظام نیست؛ حدود اختیارات، استقلال نهادها، حقوق شهروندان و امکان پاسخ‌خواهی از دولت نیز اهمیت دارند. هر پیشنهاد سیاسی باید با متن روشن قانون اساسی، انتخابات آزاد و تضمین حقوق برابر سنجیده شود.\n\nموضع تحریریه‌ی ایران‌نگر، پشتیبانی از ایران سکولار و دموکراتیک و گفت‌وگوی آزاد درباره‌ی پادشاهی مشروطه است. این موضع جایگزین گزارش خبری یا رأی آزاد شهروندان نیست.`,
      category: 'دیدگاه', kind: 'دیدگاه', featured: 1,
    },
    {
      slug: 'reading-history-with-sources',
      title: 'تاریخ معاصر را چگونه دقیق‌تر بخوانیم؟',
      excerpt: 'برای فهم دوره‌های پرمناقشه، روایت‌های گوناگون را کنار سند و منبع اولیه بگذاریم؛ نه آن‌که یک روایت را بی‌بررسی بپذیریم.',
      body: `این مقاله‌ی نمونه درباره‌ی روش مطالعه‌ی تاریخ است، نه گزارش یک رویداد تازه.\n\nبرای بررسی هر دوره‌ی تاریخی، نخست باید نوع منبع را شناخت: سند رسمی، خاطره، پژوهش دانشگاهی یا یادداشت سیاسی. سپس تاریخ انتشار، نویسنده، زمینه‌ی نگارش و منابع پشتیبان را بررسی کرد.\n\nایران‌نگر در مطالب تاریخی، منبع و دیدگاه نویسنده را جداگانه درج می‌کند و اصلاح خطاهای مستند را می‌پذیرد.`,
      category: 'تاریخ', kind: 'تاریخ', featured: 0,
    },
    {
      slug: 'news-or-opinion',
      title: 'خبر یا تحلیل؟ برچسب‌ها را جدی بگیریم',
      excerpt: 'گزارش می‌گوید چه چیزی را می‌دانیم؛ تحلیل می‌پرسد چرا رخ داده است. این دو باید در صفحه‌ی خبری از هم قابل تشخیص باشند.',
      body: `این مطلب نمونه‌ای از راهنمای تحریریه است.\n\nدر خبر، داده‌های قابل راستی‌آزمایی، زمان و منبع اهمیت دارند. در تحلیل، نویسنده روابط و پیامدهای احتمالی را تفسیر می‌کند. دیدگاه نیز موضع نویسنده یا رسانه را بیان می‌کند و نباید به‌جای واقعیت قطعی عرضه شود.\n\nاگر در مطلبی خطای factual دیدید، از مسیر تماس تحریریه همراه با پیوند و مدرک اطلاع دهید تا بررسی و در صورت نیاز اصلاح شود.`,
      category: 'جامعه', kind: 'راهنما', featured: 0,
    },
  ];
  const insert = db.prepare(`INSERT INTO articles
    (slug,title,excerpt,body,category,kind,author,status,featured,is_sample,created_at,updated_at,published_at)
    VALUES (@slug,@title,@excerpt,@body,@category,@kind,'تحریریه ایران‌نگر','published',@featured,1,@now,@now,@now)`);
  const transaction = db.transaction((rows) => rows.forEach((row) => insert.run({ ...row, now: isoNow() })));
  transaction(seed);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], baseUri: ["'self'"], objectSrc: ["'none'"],
      scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'], connectSrc: ["'self'"], frameAncestors: ["'none'"],
      formAction: ["'self'"], upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(express.json({ limit: '96kb', type: 'application/json' }));
app.use(express.urlencoded({ extended: false, limit: '12kb' }));

const articleSummary = (row) => ({
  id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt,
  category: row.category, kind: row.kind, author: row.author,
  sourceName: row.source_name, sourceUrl: row.source_url,
  featured: Boolean(row.featured), sample: Boolean(row.is_sample),
  publishedAt: row.published_at || row.created_at,
});
const articleFull = (row) => ({ ...articleSummary(row), body: row.body, status: row.status, updatedAt: row.updated_at });
const publicColumns = `id,slug,title,excerpt,category,kind,author,source_name,source_url,featured,is_sample,created_at,published_at`;
const escapeLike = (value) => value.replace(/[\\%_]/g, (match) => `\\${match}`);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/api/meta', (_req, res) => res.json({ siteName: SITE_NAME, categories: CATEGORIES, contactEmail: process.env.CONTACT_EMAIL || '' }));
app.get('/api/news', (req, res) => {
  const category = CATEGORIES.includes(String(req.query.category || '')) ? String(req.query.category) : '';
  const query = String(req.query.q || '').trim().slice(0, 100);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 40);
  const clauses = ["status='published'"];
  const params = [];
  if (category) { clauses.push('category = ?'); params.push(category); }
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    clauses.push("(title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern, pattern);
  }
  const rows = db.prepare(`SELECT ${publicColumns} FROM articles WHERE ${clauses.join(' AND ')} ORDER BY featured DESC, published_at DESC LIMIT ?`).all(...params, limit);
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  res.json({ articles: rows.map(articleSummary), categories: CATEGORIES });
});
app.get('/api/news/:slug', (req, res) => {
  const row = db.prepare(`SELECT ${publicColumns}, body, status, updated_at FROM articles WHERE slug=? AND status='published'`).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'این مطلب پیدا نشد.' });
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json({ article: articleFull(row) });
});
app.get('/feed.xml', (_req, res) => {
  const origin = (process.env.PUBLIC_ORIGIN || '').replace(/\/$/, '');
  const items = db.prepare(`SELECT ${publicColumns} FROM articles WHERE status='published' ORDER BY published_at DESC LIMIT 30`).all();
  const xml = (value) => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const entries = items.map((a) => `<item><title>${xml(a.title)}</title><link>${xml(origin)}/article.html?slug=${encodeURIComponent(a.slug)}</link><guid>${xml(origin)}/article.html?slug=${encodeURIComponent(a.slug)}</guid><description>${xml(a.excerpt)}</description><pubDate>${new Date(a.published_at || a.created_at).toUTCString()}</pubDate></item>`).join('');
  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(SITE_NAME)}</title><link>${xml(origin)}</link><description>خبر، تحلیل، تاریخ و دیدگاه</description>${entries}</channel></rss>`);
});

function sha256(text) { return crypto.createHmac('sha256', SESSION_SECRET).update(text).digest('hex'); }
function getCookie(req, name) {
  for (const chunk of String(req.headers.cookie || '').split(';')) {
    const separator = chunk.indexOf('=');
    if (separator < 0) continue;
    if (chunk.slice(0, separator).trim() === name) return decodeURIComponent(chunk.slice(separator + 1).trim());
  }
  return '';
}
function verifyPassword(password) {
  try {
    const [scheme, saltText, hashText] = ADMIN_PASSWORD_HASH.split(':');
    if (scheme !== 'scrypt' || !saltText || !hashText) return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = String(process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  if (req.get('origin') !== expected) return res.status(403).json({ error: 'درخواست از مبدأ معتبر نیست.' });
  next();
}
function currentSession(req) {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return null;
  const digest = sha256(token);
  const session = db.prepare('SELECT token_hash,expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>?').get(digest, Date.now());
  return session || null;
}
function requireAdmin(req, res, next) {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'برای ادامه وارد پنل شوید.' });
  req.adminSession = session;
  next();
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'تعداد تلاش‌ها زیاد بود؛ کمی بعد دوباره امتحان کنید.' } });
app.post('/api/admin/login', originGuard, loginLimiter, (req, res) => {
  if (!ADMIN_PASSWORD_HASH || !SESSION_SECRET) return res.status(503).json({ error: 'تنظیمات اولیه‌ی مدیر هنوز انجام نشده است.' });
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (username.length > 120 || password.length > 1024 || username !== ADMIN_USER || !verifyPassword(password)) {
    return res.status(401).json({ error: 'نام کاربری یا گذرواژه درست نیست.' });
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO admin_sessions(token_hash,expires_at,created_at) VALUES(?,?,?)').run(sha256(token), now + SESSION_TTL, now);
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_TTL });
  res.json({ ok: true, username: ADMIN_USER });
});
app.get('/api/admin/me', (req, res) => {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'وارد نشده‌اید.' });
  res.json({ ok: true, username: ADMIN_USER });
});
app.post('/api/admin/logout', originGuard, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(req.adminSession.token_hash);
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});

const adminApi = express.Router();
adminApi.use(originGuard, requireAdmin);
adminApi.get('/articles', (req, res) => {
  const status = ['draft', 'published'].includes(String(req.query.status)) ? String(req.query.status) : '';
  const rows = status
    ? db.prepare('SELECT * FROM articles WHERE status=? ORDER BY updated_at DESC LIMIT 200').all(status)
    : db.prepare('SELECT * FROM articles ORDER BY updated_at DESC LIMIT 200').all();
  res.json({ articles: rows.map(articleFull) });
});
function normalizeArticle(body, existing = {}) {
  const title = String(body.title ?? existing.title ?? '').trim().slice(0, 180);
  const excerpt = String(body.excerpt ?? existing.excerpt ?? '').trim().slice(0, 420);
  const content = String(body.body ?? existing.body ?? '').trim().slice(0, 50000);
  const category = CATEGORIES.includes(body.category) ? body.category : (existing.category || 'سیاست');
  const kind = KINDS.includes(body.kind) ? body.kind : (existing.kind || 'تحلیل');
  const author = String(body.author ?? existing.author ?? 'تحریریه ایران‌نگر').trim().slice(0, 100) || 'تحریریه ایران‌نگر';
  const sourceName = String(body.sourceName ?? existing.source_name ?? '').trim().slice(0, 160);
  const sourceUrl = String(body.sourceUrl ?? existing.source_url ?? '').trim().slice(0, 500);
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) throw new Error('پیوند منبع باید با https:// آغاز شود.');
  if (!title || title.length < 4) throw new Error('عنوان باید دست‌کم ۴ نویسه باشد.');
  if (!excerpt || excerpt.length < 20) throw new Error('خلاصه باید دست‌کم ۲۰ نویسه باشد.');
  if (!content || content.length < 40) throw new Error('متن مطلب باید دست‌کم ۴۰ نویسه باشد.');
  return { title, excerpt, body: content, category, kind, author, sourceName, sourceUrl };
}
function uniqueSlug(base, exceptId = 0) {
  let slug = base.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 150);
  if (!slug) slug = `matlab-${crypto.randomBytes(4).toString('hex')}`;
  const exists = db.prepare('SELECT id FROM articles WHERE slug=? AND id<>?');
  let candidate = slug;
  while (exists.get(candidate, exceptId)) candidate = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
  return candidate;
}
adminApi.post('/articles', (req, res) => {
  try {
    const article = normalizeArticle(req.body || {});
    const status = req.body.status === 'published' ? 'published' : 'draft';
    const slug = uniqueSlug(String(req.body.slug || article.title).slice(0, 200));
    const now = isoNow();
    const info = db.prepare(`INSERT INTO articles
      (slug,title,excerpt,body,category,kind,author,source_name,source_url,status,featured,is_sample,created_at,updated_at,published_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`).run(
      slug, article.title, article.excerpt, article.body, article.category, article.kind, article.author,
      article.sourceName, article.sourceUrl, status, req.body.featured ? 1 : 0, now, now, status === 'published' ? now : null,
    );
    res.status(201).json({ article: articleFull(db.prepare('SELECT * FROM articles WHERE id=?').get(info.lastInsertRowid)) });
  } catch (error) { res.status(400).json({ error: error.message || 'ذخیره‌ی مطلب ناموفق بود.' }); }
});
adminApi.put('/articles/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM articles WHERE id=?').get(Number(req.params.id));
  if (!current) return res.status(404).json({ error: 'مطلب پیدا نشد.' });
  try {
    const article = normalizeArticle(req.body || {}, current);
    const status = req.body.status === 'published' ? 'published' : 'draft';
    const requestedSlug = String(req.body.slug || article.title).slice(0, 200);
    const slug = uniqueSlug(requestedSlug, current.id);
    const now = isoNow();
    const publishedAt = status === 'published' ? (current.published_at || now) : null;
    db.prepare(`UPDATE articles SET slug=?,title=?,excerpt=?,body=?,category=?,kind=?,author=?,source_name=?,source_url=?,status=?,featured=?,is_sample=0,updated_at=?,published_at=? WHERE id=?`).run(
      slug, article.title, article.excerpt, article.body, article.category, article.kind, article.author,
      article.sourceName, article.sourceUrl, status, req.body.featured ? 1 : 0, now, publishedAt, current.id,
    );
    res.json({ article: articleFull(db.prepare('SELECT * FROM articles WHERE id=?').get(current.id)) });
  } catch (error) { res.status(400).json({ error: error.message || 'ذخیره‌ی مطلب ناموفق بود.' }); }
});
adminApi.delete('/articles/:id', (req, res) => {
  const info = db.prepare('DELETE FROM articles WHERE id=?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'مطلب پیدا نشد.' });
  res.json({ ok: true });
});
app.use('/api/admin', adminApi);

app.get('/admin', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/admin/', (_req, res) => res.redirect(308, '/admin'));
app.use(express.static(PUBLIC_DIR, { index: 'index.html', maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0, etag: true }));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'مسیر پیدا نشد.' });
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});
app.use((error, _req, res, _next) => {
  console.error('[newsroom]', error.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'خطای داخلی؛ لطفاً دوباره تلاش کنید.' });
});

const cleanup = db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?');
setInterval(() => cleanup.run(Date.now()), 60 * 60 * 1000).unref();
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SITE_NAME}] listening on :${PORT}; database: ${path.join(DATA_DIR, 'newsroom.sqlite')}`);
  if (!ADMIN_PASSWORD_HASH) console.warn('[security] ADMIN_PASSWORD_HASH is missing; admin login is disabled.');
  if (!SESSION_SECRET) console.warn('[security] SESSION_SECRET is missing; login is disabled.');
});
function shutdown(signal) {
  console.log(`[newsroom] ${signal}; closing server`);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
