#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  گلیستا — سرور فروشگاه گل مصنوعی (Node بدون هیچ وابستگی خارجی)
 *
 *  - API عمومی: دسته‌بندی‌ها، محصولات، سبد خرید/سفارش
 *  - پنل ادمین روی همین پورت:  /admin
 *  - آپلود تصاویر محصول:      /uploads/…
 *  - دیتابیس JSON:             data/db.json (قابل توسعه — دسته‌بندی‌های
 *    آینده فقط یک ردیف جدید با parent=null می‌خواهند)
 *  - سرو فایل‌های فرانت‌اند shop/ (حالت توسعه/پیش‌نمایش؛ در سرور Nginx
 *    استاتیک را خودش سرو می‌کند و فقط /api, /admin, /uploads را پروکسی می‌کند)
 *
 *  هیچ رازی داخل کد نیست؛ رمز ادمین فقط در data/ (chmod 600) ذخیره می‌شود.
 * ═══════════════════════════════════════════════════════════════════
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.API_PORT || 9273);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SHOP_DIR = path.resolve(process.env.SHOP_DIR || path.join(__dirname, '..', 'shop'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const MAX_BODY = 30 * 1024 * 1024;          // 30MB — آپلود چند تصویر base64
const SESSION_TTL = 30 * 24 * 3600 * 1000;   // 30 روز

/* ───────────────────────── ابزارهای عمومی ───────────────────────── */
const nowISO = () => new Date().toISOString();
const uid = (p = 'id') => `${p}-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const cleanStr = (s, max = 500) => String(s ?? '').trim().slice(0, max);
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

function slugify(input) {
  // فقط حروف لاتین/عدد؛ نام فارسی خودش اسلاگ لاتین نمی‌سازد (به fallback واگذار می‌شود)
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
function uniqueSlug(base, exists) {
  let s = base || '';
  if (!s) return '';
  let n = 1;
  let candidate = s;
  while (exists(candidate)) { n += 1; candidate = `${s}-${n}`; }
  return candidate;
}
function normalizePhone(raw) {
  let s = String(raw ?? '').replace(/[^\d+]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  return s;
}
const sleeplessId = () => crypto.randomBytes(5).toString('hex').toUpperCase();
const ORDER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeOrderCode(orders) {
  let code;
  do {
    code = 'GL-' + Array.from({ length: 6 }, () => ORDER_CODE_ALPHABET[crypto.randomInt(ORDER_CODE_ALPHABET.length)]).join('');
  } while (orders.some((o) => o.code === code));
  return code;
}

/* ───────────────────────── دیتابیس ───────────────────────── */
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o755 });

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return structuredClone(fallback); }
}
function saveJson(file, data, mode = 0o644) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode });
  fs.renameSync(tmp, file);
}

/* ───────────────────────── دیده‌بان اولیه (Seed) ─────────────────────────
   دو دسته اصلی فعلی فروشگاه + ۱۲ زیردسته و ۱۲ محصول نمونه.
   دسته جدید در آینده: فقط یک ردیف با parent=null + homeSection دلخواه. */
function seedDb() {
  const categories = [
    // ── دسته اصلی ۱: باکس گل ──
    { slug: 'box-flower', name: 'باکس گل', parent: null, order: 1, active: true, homeSection: true,
      image: '/images/section-box.jpg',
      description: 'باکس‌های گل مصنوعی لاکچری، هدیه‌ای ماندگار برای همه مناسبت‌ها' },
    { slug: 'box-rose', name: 'باکس گل رز', parent: 'box-flower', order: 1, active: true, homeSection: false, image: '', description: '' },
    { slug: 'box-luxury', name: 'باکس گل لاکچری', parent: 'box-flower', order: 2, active: true, homeSection: false, image: '', description: '' },
    { slug: 'box-romantic', name: 'باکس گل عاشقانه', parent: 'box-flower', order: 3, active: true, homeSection: false, image: '', description: '' },
    { slug: 'box-gift', name: 'باکس گل مناسب هدیه', parent: 'box-flower', order: 4, active: true, homeSection: false, image: '', description: '' },
    { slug: 'box-mixed', name: 'باکس گل ترکیبی', parent: 'box-flower', order: 5, active: true, homeSection: false, image: '', description: '' },
    { slug: 'box-custom', name: 'باکس گل سفارشی', parent: 'box-flower', order: 6, active: true, homeSection: false, image: '', description: '' },
    // ── دسته اصلی ۲: دسته‌گل ──
    { slug: 'bouquet', name: 'دسته‌گل', parent: null, order: 2, active: true, homeSection: true,
      image: '/images/section-bouquet.jpg',
      description: 'دسته‌گل‌های مصنوعی ظریف و خوش‌رنگ، برای عروسی، مراسم و هدیه' },
    { slug: 'bqt-rose', name: 'دسته‌گل رز', parent: 'bouquet', order: 1, active: true, homeSection: false, image: '', description: '' },
    { slug: 'bqt-romantic', name: 'دسته‌گل عاشقانه', parent: 'bouquet', order: 2, active: true, homeSection: false, image: '', description: '' },
    { slug: 'bqt-luxury', name: 'دسته‌گل لاکچری', parent: 'bouquet', order: 3, active: true, homeSection: false, image: '', description: '' },
    { slug: 'bqt-wedding', name: 'دسته‌گل عروس', parent: 'bouquet', order: 4, active: true, homeSection: false, image: '', description: '' },
    { slug: 'bqt-mixed', name: 'دسته‌گل ترکیبی', parent: 'bouquet', order: 5, active: true, homeSection: false, image: '', description: '' },
    { slug: 'bqt-custom', name: 'دسته‌گل سفارشی', parent: 'bouquet', order: 6, active: true, homeSection: false, image: '', description: '' },
  ];

  const P = (o) => ({
    id: uid('p'), active: true, featured: false, colors: [], sizes: [],
    discountPrice: 0, stock: -1, order: 1, createdAt: nowISO(), updatedAt: nowISO(), ...o,
  });

  const products = [
    P({ slug: 'rose-luxury-box', name: 'باکس گل رز قرمز لاکچری', category: 'box-rose',
      price: 2850000, discountPrice: 2350000, featured: true, order: 1, stock: 12,
      images: ['/images/p-rose-box.jpg', '/images/section-box.jpg', '/images/p-luxury-box.jpg'],
      colors: [{ name: 'قرمز', hex: '#9e2b32' }, { name: 'صورتی', hex: '#e8b4bc' }, { name: 'شامپاینی', hex: '#e6d3b8' }],
      sizes: ['سایز کوچک (۲۵ شاخه)', 'سایز متوسط (۴۵ شاخه)', 'سایز بزرگ (۷۰ شاخه)'],
      description: 'باکس گل رز مصنوعی با گلبرگ‌های مخملی و جعبه کلاسیک با روکش طلایی. رزهای باکیفیت بدون نیاز به آب و مراقبت، ماندگاری سال‌ها. مناسب سالگرد، ولنتاین و هدیه خاص.' }),
    P({ slug: 'golden-luxury-box', name: 'باکس گل لاکچری طلایی', category: 'box-luxury',
      price: 4500000, discountPrice: 3900000, featured: true, order: 2, stock: 6,
      images: ['/images/p-luxury-box.jpg', '/images/section-box.jpg'],
      colors: [{ name: 'مشکی-طلایی', hex: '#2b2622' }, { name: 'کرم', hex: '#f0e6d8' }],
      sizes: ['متوسط', 'بزرگ'],
      description: 'ترکیب رز، پیونی و گل‌های خشک مصنوعی در باکس مشکی با جزئیات طلایی؛ انتخاب نخست برای هدیه‌های رسمی و لاکچری.' }),
    P({ slug: 'pink-romantic-box', name: 'باکس گل عاشقانه صورتی', category: 'box-romantic',
      price: 2450000, discountPrice: 1980000, order: 3, stock: 9,
      images: ['/images/p-romantic-box.jpg', '/images/p-gift-box.jpg'],
      colors: [{ name: 'صورتی پاستلی', hex: '#f3c6cd' }, { name: 'یاسمنی', hex: '#fdf6ec' }],
      sizes: ['کوچک', 'متوسط'],
      description: 'باکس رز و میخک مصنوعی در رنگ‌های پاستلی؛ حس لطیف و عاشقانه برای روزهای خاص.' }),
    P({ slug: 'peony-gift-box', name: 'باکس هدیه رز و پیونی', category: 'box-gift',
      price: 3200000, discountPrice: 0, order: 4, stock: 5,
      images: ['/images/p-gift-box.jpg', '/images/section-box.jpg'],
      colors: [{ name: 'هلویی', hex: '#f6d8c8' }, { name: 'عاجی', hex: '#f7f2e9' }],
      sizes: ['استاندارد'],
      description: 'باکس هدیه با روبان ساتن و ترکیب رز و پیونی عاجی؛ بسته‌بندی کادویی آماده تقدیم.' }),
    P({ slug: 'spring-mixed-box', name: 'باکس گل ترکیبی بهاره', category: 'box-mixed',
      price: 2950000, discountPrice: 2650000, order: 5, stock: 0,
      images: ['/images/p-luxury-box.jpg', '/images/p-romantic-box.jpg'],
      colors: [{ name: 'چند رنگ', hex: '#d98a7a' }],
      sizes: ['متوسط', 'بزرگ'],
      description: 'ترکیب بهاری گل‌های رنگارنگ مصنوعی در باکس مینیمال؛ فعلاً ناموجود — پیش‌سفارش از طریق پنل امکان‌پذیر است.' }),
    P({ slug: 'custom-box', name: 'باکس گل سفارشی', category: 'box-custom',
      price: 3500000, discountPrice: 0, order: 6, stock: -1,
      images: ['/images/section-box.jpg', '/images/p-gift-box.jpg'],
      colors: [{ name: 'به انتخاب شما', hex: '#b4806f' }],
      sizes: ['سفارشی'],
      description: 'باکس گل کاملاً سفارشی؛ رنگ گل‌ها، تعداد، جعبه و روبان را خودتان انتخاب می‌کنید. زمان تقریبی آماده‌سازی ۲ تا ۴ روز کاری.' }),
    P({ slug: 'red-rose-bouquet', name: 'دسته‌گل رز قرمز', category: 'bqt-rose',
      price: 1850000, discountPrice: 1590000, featured: true, order: 1, stock: 14,
      images: ['/images/p-rose-bouquet.jpg', '/images/section-bouquet.jpg'],
      colors: [{ name: 'قرمز', hex: '#9e2b32' }, { name: 'صورتی', hex: '#e8b4bc' }],
      sizes: ['۱۲ شاخه', '۲۴ شاخه', '۳۶ شاخه'],
      description: 'دسته‌گل رز مصنوعی قرمز با برگ‌های اکالیپتوس و بسته‌بندی کاغذ کرافت؛ کلاسیک و چشم‌نواز.' }),
    P({ slug: 'pastel-romantic-bouquet', name: 'دسته‌گل عاشقانه پاستلی', category: 'bqt-romantic',
      price: 1650000, discountPrice: 0, order: 2, stock: 11,
      images: ['/images/p-romantic-bouquet.jpg', '/images/section-bouquet.jpg'],
      colors: [{ name: 'صورتی', hex: '#f3c6cd' }, { name: 'یاسی', hex: '#cdc4e6' }],
      sizes: ['متوسط', 'بزرگ'],
      description: 'ترکیب رزهای پاستلی و شاخه‌های بیبی‌بریز؛ فضایی رمانتیک و ملایم برای هدیه دادن.' }),
    P({ slug: 'champagne-luxury-bouquet', name: 'دسته‌گل لاکچری شامپاینی', category: 'bqt-luxury',
      price: 2750000, discountPrice: 2400000, order: 3, stock: 7,
      images: ['/images/p-wedding-bouquet.jpg', '/images/p-mixed-bouquet.jpg'],
      colors: [{ name: 'شامپاینی', hex: '#e6d3b8' }, { name: 'عاجی', hex: '#f7f2e9' }],
      sizes: ['متوسط', 'بزرگ'],
      description: 'دسته‌گل رز و رانانکولوس مصنوعی در طیف شامپاینی و عاجی؛ انتخابی شیک برای مراسم رسمی.' }),
    P({ slug: 'white-wedding-bouquet', name: 'دسته‌گل عروس سفید', category: 'bqt-wedding',
      price: 3400000, discountPrice: 2990000, featured: true, order: 4, stock: 4,
      images: ['/images/p-wedding-bouquet.jpg', '/images/section-bouquet.jpg'],
      colors: [{ name: 'سفید', hex: '#faf7f2' }, { name: 'سبز ملایم', hex: '#a8b89a' }],
      sizes: ['استاندارد', 'بلند عروس'],
      description: 'دسته‌گل عروس مصنوعی با رز سفید و رانانکولوس؛ سبک، ماندگار و بدون حساسیت گرده — مناسب عکاسی و مراسم.' }),
    P({ slug: 'rainbow-mixed-bouquet', name: 'دسته‌گل ترکیبی رنگین‌کمانی', category: 'bqt-mixed',
      price: 1950000, discountPrice: 0, order: 5, stock: 10,
      images: ['/images/p-mixed-bouquet.jpg', '/images/section-bouquet.jpg'],
      colors: [{ name: 'چند رنگ', hex: '#d98a7a' }],
      sizes: ['کوچک', 'متوسط'],
      description: 'ترکیب رز، لاله و داوودی مصنوعی در رنگ‌های شاد؛ هدیه‌ای پرانرژی برای تولد و تشکر.' }),
    P({ slug: 'custom-bouquet', name: 'دسته‌گل سفارشی عروس و مراسم', category: 'bqt-custom',
      price: 2500000, discountPrice: 0, order: 6, stock: -1,
      images: ['/images/section-bouquet.jpg', '/images/p-romantic-bouquet.jpg'],
      colors: [{ name: 'به انتخاب شما', hex: '#b4806f' }],
      sizes: ['سفارشی'],
      description: 'دسته‌گل سفارشی مطابق سلیقه و تم مراسم شما؛ از انتخاب گل‌ها تا رنگ روبان. زمان تقریبی ۲ تا ۴ روز کاری.' }),
  ];

  const settings = {
    storeName: 'گلیستا',
    tagline: 'گل مصنوعی لوکس',
    phone: '09120000000',
    address: 'تهران',
    instagram: '',
    telegram: '',
    cardNumber: '',
    cardName: '',
    shippingCost: 0,          // ۰ = ارسال رایگان
    announcement: '',
    currency: 'تومان',
  };

  return { version: 1, categories, products, orders: [], settings, adminPassHash: null, createdAt: nowISO() };
}

let db = fs.existsSync(DB_FILE) ? loadJson(DB_FILE, seedDb()) : seedDb();
// سازگاری با دیتابیس‌های ناقص
db.categories ??= [];
db.products ??= [];
db.orders ??= [];
db.settings ??= seedDb().settings;
db.adminPassHash ??= null;
const saveDb = () => saveJson(DB_FILE, db, 0o600);
if (!fs.existsSync(DB_FILE)) saveDb();

/* ───────────────────────── نشست‌ها ───────────────────────── */
let sessions = loadJson(SESSIONS_FILE, {}); // token -> createdAt
function pruneSessions() {
  const cutoff = Date.now() - SESSION_TTL;
  let dirty = false;
  for (const [t, iso] of Object.entries(sessions)) {
    if (new Date(iso).getTime() < cutoff) { delete sessions[t]; dirty = true; }
  }
  if (dirty) saveJson(SESSIONS_FILE, sessions, 0o600);
}
pruneSessions();
const saveSessions = () => saveJson(SESSIONS_FILE, sessions, 0o600);
const createSession = () => {
  const token = crypto.randomBytes(24).toString('base64url');
  sessions[token] = nowISO();
  saveSessions();
  return token;
};

/* ───────────────────────── رمز عبور (scrypt) ───────────────────────── */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  try {
    const [scheme, salt, hash] = String(stored ?? '').split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const test = crypto.scryptSync(String(pw), salt, 64);
    const ref = Buffer.from(hash, 'hex');
    return test.length === ref.length && crypto.timingSafeEqual(test, ref);
  } catch { return false; }
}

/* ───────────────────────── محدودیت تلاش ورود ───────────────────────── */
const loginAttempts = new Map(); // ip -> {fails, lockUntil}
function loginLocked(ip) {
  const a = loginAttempts.get(ip);
  return !!a && a.lockUntil > Date.now();
}
function registerFail(ip) {
  const a = loginAttempts.get(ip) || { fails: 0, lockUntil: 0 };
  a.fails += 1;
  if (a.fails >= 8) { a.lockUntil = Date.now() + 15 * 60 * 1000; a.fails = 0; }
  loginAttempts.set(ip, a);
}
const clearFails = (ip) => loginAttempts.delete(ip);

/* ───────────────────────── HTTP helpers ───────────────────────── */
function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}
function sendError(res, status, message, extra = {}) {
  sendJson(res, status, { error: message, ...extra });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); }
  catch { throw Object.assign(new Error('BAD_JSON'), { status: 400 }); }
}
function getBearer(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)gl_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
function requireAuth(req, res) {
  const token = getBearer(req);
  if (!token || !sessions[token]) {
    sendError(res, 401, 'نشست شما منقضی شده است؛ دوباره وارد شوید.');
    return false;
  }
  if (new Date(sessions[token]).getTime() < Date.now() - SESSION_TTL) {
    delete sessions[token]; saveSessions();
    sendError(res, 401, 'نشست شما منقضی شده است؛ دوباره وارد شوید.');
    return false;
  }
  return true;
}
function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.socket.remoteAddress || '0.0.0.0');
}

/* ───────────────────────── منطق دامنه ───────────────────────── */
const bySlug = (slug) => db.categories.find((c) => c.slug === slug);
const childrenOf = (slug) => db.categories.filter((c) => c.parent === slug);
function categoryTree() {
  const mains = db.categories.filter((c) => !c.parent).sort((a, b) => a.order - b.order);
  return mains.map((m) => ({ ...m, children: childrenOf(m.slug).sort((a, b) => a.order - b.order) }));
}
function publicCategory(cat) {
  return pick(cat, ['slug', 'name', 'parent', 'order', 'image', 'description', 'homeSection']);
}
function publicProduct(p) {
  return {
    ...pick(p, ['id', 'slug', 'name', 'category', 'price', 'discountPrice', 'description',
      'images', 'colors', 'sizes', 'stock', 'featured', 'order', 'createdAt', 'updatedAt']),
    inStock: p.stock !== 0,
  };
}
function priceOf(p) {
  return p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
}
function categoryHasProducts(catSlug) {
  const slugs = new Set([catSlug, ...childrenOf(catSlug).map((c) => c.slug)]);
  return db.products.some((p) => slugs.has(p.category));
}
function productsForCategory(cat) {
  // دسته اصلی → همه زیردسته‌ها؛ زیردسته → فقط خودش
  const slugs = new Set([cat.slug, ...childrenOf(cat.slug).map((c) => c.slug)]);
  return db.products.filter((p) => slugs.has(p.category));
}

/* ───────────────────────── آپلود تصویر ───────────────────────── */
const IMAGE_DATAURL_RE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$/;
const MAGIC = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], ext: 'png', type: 'image/png' },
  { bytes: [0xff, 0xd8, 0xff], ext: 'jpg', type: 'image/jpeg' },
  { bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif', type: 'image/gif' },
];
function sniffImage(buf) {
  for (const m of MAGIC) {
    if (buf.length > m.bytes.length && m.bytes.every((b, i) => buf[i] === b)) return m;
  }
  if (buf.length > 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', type: 'image/webp' };
  }
  if (buf.length > 12 && buf.slice(0, 4).toString('ascii') === 'ftyp' && buf.slice(4, 8).toString('ascii') === 'avif') {
    return { ext: 'avif', type: 'image/avif' };
  }
  return null;
}
function saveDataUrlImage(dataUrl) {
  const m = String(dataUrl || '').match(IMAGE_DATAURL_RE);
  if (!m) return { error: 'فرمت تصویر پشتیبانی نمی‌شود (PNG/JPEG/WebP/GIF).' };
  const buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
  if (buf.length > 6 * 1024 * 1024) return { error: 'حجم هر تصویر حداکثر ۶ مگابایت است.' };
  const kind = sniffImage(buf);
  if (!kind) return { error: 'فایل ارسال‌شده تصویر معتبر نیست.' };
  const name = `u-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}.${kind.ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buf, { mode: 0o644 });
  return { url: `/uploads/${name}`, type: kind.type, size: buf.length };
}

/* ───────────────────────── MIME استاتیک ───────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function sendFile(res, file, urlPath) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { sendNotFound(res, urlPath); return; }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    const immutable = /\.(?:woff2?|png|jpe?g|webp|avif|svg|gif)$/.test(ext);
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Cache-Control': isHtml ? 'no-cache' : immutable ? 'public, max-age=604800' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    if (res.req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
}
function sendNotFound(res, what = '') {
  const fallback = path.join(SHOP_DIR, '404.html');
  if (fs.existsSync(fallback)) { sendFile(res, fallback, '/404.html'); return; }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><title>۴۰۴</title>
    <body dir="rtl" style="font-family:vazirmatn,system-ui;background:#f8f5f0;color:#2a2320;display:grid;place-items:center;height:100vh;margin:0">
    <div style="text-align:center"><h1 style="font-weight:400">صفحه پیدا نشد</h1>
    <a href="/" style="color:#a64d5c">بازگشت به فروشگاه</a></div></body>`);
}
function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  if (rel.endsWith('/')) rel += 'index.html';
  // جلوگیری از traversal
  const normalized = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(SHOP_DIR, normalized);
  if (!file.startsWith(SHOP_DIR + path.sep) && file !== SHOP_DIR) { sendNotFound(res, urlPath); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { sendFile(res, path.join(file, 'index.html'), urlPath); return; }
    if (err || !st.isFile()) { sendNotFound(res, urlPath); return; }
    sendFile(res, file, urlPath);
  });
}
function serveUpload(req, res, urlPath) {
  const name = path.basename(urlPath); // فقط نام فایل — بدون زیرپوشه
  const file = path.join(UPLOADS_DIR, name);
  if (!file.startsWith(UPLOADS_DIR + path.sep)) { sendNotFound(res, urlPath); return; }
  sendFile(res, file, urlPath);
}

/* ───────────────────────── روتر API ───────────────────────── */
async function handleApi(req, res, urlPath, query, ip) {
  const method = req.method;
  const seg = urlPath.slice('/api/'.length).split('/').filter(Boolean); // e.g. ['admin','products','x']

  /* ══════ عمومی ══════ */
  if (method === 'GET' && urlPath === '/api/health') return sendJson(res, 200, { ok: true, now: nowISO() });

  if (method === 'GET' && urlPath === '/api/config') {
    return sendJson(res, 200, {
      ...pick(db.settings, ['storeName', 'tagline', 'phone', 'address', 'instagram', 'telegram',
        'cardNumber', 'cardName', 'shippingCost', 'announcement', 'currency']),
      setupRequired: !db.adminPassHash,
    });
  }

  if (method === 'GET' && urlPath === '/api/categories') {
    const tree = categoryTree().map((m) => ({
      ...publicCategory(m),
      children: m.children.map(publicCategory),
    }));
    return sendJson(res, 200, { items: tree, total: tree.length });
  }

  if (method === 'GET' && seg[0] === 'products' && seg.length === 1) {
    const catSlug = query.get('category') || '';
    const q = (query.get('q') || '').trim().toLowerCase();
    const featured = query.get('featured') === '1';
    const sort = query.get('sort') || 'default';
    const page = Math.max(1, parseInt(query.get('page') || '1', 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(query.get('limit') || '24', 10) || 24));

    let items = db.products.filter((p) => p.active !== false);
    if (catSlug) {
      const cat = bySlug(catSlug);
      if (!cat) return sendJson(res, 200, { items: [], total: 0, page: 1, pages: 0, category: null });
      items = productsForCategory(cat).filter((p) => p.active !== false);
    }
    if (featured) items = items.filter((p) => p.featured);
    if (q) {
      items = items.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q));
    }
    const cmp = {
      default: (a, b) => (a.order - b.order) || (b.createdAt > a.createdAt ? 1 : -1),
      'price-asc': (a, b) => priceOf(a) - priceOf(b),
      'price-desc': (a, b) => priceOf(b) - priceOf(a),
      'newest': (a, b) => (b.createdAt > a.createdAt ? 1 : -1),
    }[sort] || ((a, b) => a.order - b.order);
    items = [...items].sort(cmp);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const pageItems = items.slice((page - 1) * limit, page * limit).map(publicProduct);
    const catInfo = catSlug ? bySlug(catSlug) : null;
    return sendJson(res, 200, {
      items: pageItems, total, page, pages,
      category: catInfo ? publicCategory(catInfo) : null,
      breadcrumbs: catInfo ? breadcrumbTrail(catInfo.slug) : [],
    });
  }

  if (method === 'GET' && seg[0] === 'products' && seg.length === 2) {
    const slug = decodeURIComponent(seg[1]);
    const p = db.products.find((x) => (x.slug === slug || x.id === slug) && x.active !== false);
    if (!p) return sendError(res, 404, 'محصول پیدا نشد.');
    const cat = bySlug(p.category);
    const related = db.products
      .filter((x) => x.active !== false && x.id !== p.id && sameMainCategory(x.category, p.category))
      .sort((a, b) => a.order - b.order)
      .slice(0, 4)
      .map(publicProduct);
    return sendJson(res, 200, {
      product: publicProduct(p),
      category: cat ? publicCategory(cat) : null,
      breadcrumbs: cat ? breadcrumbTrail(cat.slug) : [],
      related,
    });
  }

  if (method === 'POST' && urlPath === '/api/orders') {
    const body = await readJson(req);
    const name = cleanStr(body.name, 80);
    const phone = normalizePhone(body.phone);
    const city = cleanStr(body.city, 60);
    const address = cleanStr(body.address, 300);
    const note = cleanStr(body.note, 500);
    const payment = body.payment === 'card' ? 'card' : 'cod';
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (name.length < 2) return sendError(res, 400, 'نام و نام خانوادگی را وارد کنید.');
    if (!/^09\d{9}$/.test(phone)) return sendError(res, 400, 'شماره موبایل معتبر وارد کنید (مثال: ۰۹۱۲۱۲۳۴۵۶۷).');
    if (payment === 'cod' && address.length < 10) return sendError(res, 400, 'آدرس کامل را وارد کنید.');
    if (!rawItems.length) return sendError(res, 400, 'سبد خرید خالی است.');
    if (rawItems.length > 50) return sendError(res, 400, 'تعداد اقلام سبد بیش از حد مجاز است.');

    const lines = [];
    for (const it of rawItems) {
      const pid = String(it.productId || it.id || '');
      const p = db.products.find((x) => x.id === pid || x.slug === pid);
      if (!p || p.active === false) return sendError(res, 400, 'یکی از محصولات سبد موجود نیست؛ لیست را تازه کنید.');
      const qty = Math.min(99, Math.max(1, parseInt(it.qty, 10) || 1));
      if (p.stock >= 0 && qty > p.stock) {
        return sendError(res, 409, `موجودی «${p.name}» کافی نیست.`, { productId: p.id, stock: p.stock });
      }
      const color = p.colors?.length ? cleanStr(it.color, 60) : '';
      const size = p.sizes?.length ? cleanStr(it.size, 80) : '';
      if (color && !p.colors.some((c) => c.name === color)) return sendError(res, 400, 'رنگ انتخاب‌شده معتبر نیست.');
      if (size && !p.sizes.includes(size)) return sendError(res, 400, 'سایز انتخاب‌شده معتبر نیست.');
      const unit = priceOf(p);
      lines.push({
        productId: p.id, slug: p.slug, name: p.name, image: (p.images && p.images[0]) || '',
        qty, color, size, unit, total: unit * qty,
      });
    }

    // کم کردن موجودی
    for (const line of lines) {
      const p = db.products.find((x) => x.id === line.productId);
      if (p && p.stock >= 0) p.stock = Math.max(0, p.stock - line.qty);
    }
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const shipping = Number(db.settings.shippingCost) > 0 ? Number(db.settings.shippingCost) : 0;
    const order = {
      id: uid('o'),
      code: makeOrderCode(db.orders),
      customer: { name, phone, city, address, note },
      items: lines,
      subtotal, shipping, total: subtotal + shipping,
      payment, status: 'new', createdAt: nowISO(), updatedAt: nowISO(),
    };
    db.orders.unshift(order);
    saveDb();
    return sendJson(res, 201, {
      ok: true, code: order.code, total: order.total,
      message: 'سفارش شما با موفقیت ثبت شد؛ به‌زودی با شما تماس می‌گیریم.',
    });
  }

  /* ══════ ادمین: راه‌اندازی / ورود ══════ */
  if (method === 'POST' && urlPath === '/api/admin/setup') {
    if (db.adminPassHash) return sendError(res, 403, 'قبلاً راه‌اندازی شده است.');
    const body = await readJson(req);
    const pw = String(body.password || '');
    if (pw.length < 6) return sendError(res, 400, 'رمز عبور حداقل ۶ کاراکتر باشد.');
    db.adminPassHash = hashPassword(pw);
    saveDb();
    const token = createSession();
    return sendJson(res, 201, { ok: true, token });
  }

  if (method === 'POST' && urlPath === '/api/admin/login') {
    if (loginLocked(ip)) return sendError(res, 429, 'تلاش‌های ورود زیاد است؛ ۱۵ دقیقه دیگر دوباره امتحان کنید.');
    const body = await readJson(req);
    if (!db.adminPassHash) return sendError(res, 403, 'هنوز راه‌اندازی نشده است؛ ابتدا رمز تعیین کنید.');
    if (!verifyPassword(String(body.password || ''), db.adminPassHash)) {
      registerFail(ip);
      return sendError(res, 401, 'رمز عبور اشتباه است.');
    }
    clearFails(ip);
    return sendJson(res, 200, { ok: true, token: createSession() });
  }

  if (method === 'POST' && urlPath === '/api/admin/logout') {
    const token = getBearer(req);
    if (token) { delete sessions[token]; saveSessions(); }
    return sendJson(res, 200, { ok: true });
  }

  /* ══════ ادمین: محافظت‌شده ══════ */
  if (seg[0] === 'admin') {
    if (!requireAuth(req, res)) return;

    // پیشخوان
    if (method === 'GET' && urlPath === '/api/admin/me') {
      return sendJson(res, 200, { ok: true, storeName: db.settings.storeName });
    }
    if (method === 'GET' && urlPath === '/api/admin/stats') {
      const orders = db.orders;
      const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
      return sendJson(res, 200, {
        products: db.products.length,
        activeProducts: db.products.filter((p) => p.active !== false).length,
        featured: db.products.filter((p) => p.featured).length,
        outOfStock: db.products.filter((p) => p.stock === 0).length,
        categories: db.categories.length,
        orders: orders.length,
        newOrders: orders.filter((o) => o.status === 'new').length,
        revenue,
        recentOrders: orders.slice(0, 6),
      });
    }

    // ── محصولات ──
    if (seg[1] === 'products') {
      if (method === 'GET' && seg.length === 2) {
        const items = [...db.products].sort((a, b) =>
          (a.category === b.category ? a.order - b.order : a.category.localeCompare(b.category)) ||
          (b.createdAt > a.createdAt ? 1 : -1));
        return sendJson(res, 200, { items });
      }
      if (method === 'POST' && seg.length === 2) {
        const body = await readJson(req);
        const product = validateProductInput(body, null);
        if (product.error) return sendError(res, 400, product.error);
        const base = uniqueSlug(slugify(body.slug) || slugify(body.name) || `p-${sleeplessId()}`,
          (s) => db.products.some((x) => x.slug === s));
        const maxOrder = db.products.filter((p) => p.category === product.category)
          .reduce((m, p) => Math.max(m, p.order), 0);
        const created = {
          id: uid('p'), ...product, slug: base || `p-${sleeplessId()}`,
          order: maxOrder + 1, createdAt: nowISO(), updatedAt: nowISO(),
        };
        db.products.push(created);
        saveDb();
        return sendJson(res, 201, { ok: true, product: created });
      }
      if (method === 'PUT' && seg.length === 3) {
        const id = decodeURIComponent(seg[2]);
        const idx = db.products.findIndex((x) => x.id === id || x.slug === id);
        if (idx < 0) return sendError(res, 404, 'محصول پیدا نشد.');
        const body = await readJson(req);
        const patch = validateProductInput(body, db.products[idx]);
        if (patch.error) return sendError(res, 400, patch.error);
        let slug = db.products[idx].slug;
        if (body.slug !== undefined) {
          const desired = uniqueSlug(slugify(body.slug), (s) =>
            db.products.some((x, i) => x.slug === s && i !== idx));
          if (desired) slug = desired;
        }
        db.products[idx] = { ...db.products[idx], ...patch, slug, updatedAt: nowISO() };
        saveDb();
        return sendJson(res, 200, { ok: true, product: db.products[idx] });
      }
      if (method === 'DELETE' && seg.length === 3) {
        const id = decodeURIComponent(seg[2]);
        const idx = db.products.findIndex((x) => x.id === id || x.slug === id);
        if (idx < 0) return sendError(res, 404, 'محصول پیدا نشد.');
        db.products.splice(idx, 1);
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'POST' && seg.length === 4 && seg[3] === 'move') {
        const id = decodeURIComponent(seg[2]);
        const body = await readJson(req);
        const dir = body.dir === 'up' ? -1 : body.dir === 'down' ? 1 : 0;
        if (!dir) return sendError(res, 400, 'جهت نامعتبر است.');
        const p = db.products.find((x) => x.id === id);
        if (!p) return sendError(res, 404, 'محصول پیدا نشد.');
        const siblings = db.products.filter((x) => x.category === p.category)
          .sort((a, b) => a.order - b.order);
        const i = siblings.findIndex((x) => x.id === p.id);
        const j = i + dir;
        if (j < 0 || j >= siblings.length) return sendJson(res, 200, { ok: true, noop: true });
        const a = siblings[i], b = siblings[j];
        [a.order, b.order] = [b.order, a.order];
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
    }

    // ── دسته‌بندی‌ها ──
    if (seg[1] === 'categories') {
      if (method === 'GET' && seg.length === 2) {
        const items = categoryTree().map((m) => ({ ...m, children: m.children }));
        return sendJson(res, 200, { items, flat: [...db.categories].sort((a, b) =>
          (a.parent || '').localeCompare(b.parent || '') || a.order - b.order) });
      }
      if (method === 'POST' && seg.length === 2) {
        const body = await readJson(req);
        const err = validateCategoryInput(body, null);
        if (err) return sendError(res, 400, err);
        const base = uniqueSlug(slugify(body.slug) || slugify(body.name), (s) => db.categories.some((x) => x.slug === s));
        if (!base) return sendError(res, 400, 'اسلاگ باید لاتین باشد (مثلا: box-flower).');
        const parent = body.parent ? String(body.parent) : null;
        if (parent && !bySlug(parent)) return sendError(res, 400, 'دسته والد وجود ندارد.');
        const maxOrder = db.categories.filter((c) => (c.parent || null) === parent)
          .reduce((m, c) => Math.max(m, c.order), 0);
        const cat = {
          slug: base, name: cleanStr(body.name, 80), parent, order: maxOrder + 1,
          active: body.active !== false, homeSection: !!body.homeSection,
          image: cleanStr(body.image, 300), description: cleanStr(body.description, 400),
        };
        db.categories.push(cat);
        saveDb();
        return sendJson(res, 201, { ok: true, category: cat });
      }
      if ((method === 'PUT' || method === 'DELETE') && seg.length === 3) {
        const slug = decodeURIComponent(seg[2]);
        const idx = db.categories.findIndex((x) => x.slug === slug);
        if (idx < 0) return sendError(res, 404, 'دسته پیدا نشد.');
        if (method === 'DELETE') {
          if (childrenOf(slug).length) return sendError(res, 400, 'ابتدا زیردسته‌های این دسته را حذف یا جابه‌جا کنید.');
          if (categoryHasProducts(slug)) return sendError(res, 400, 'این دسته محصول دارد؛ ابتدا محصولات را منتقل کنید.');
          db.categories.splice(idx, 1);
          saveDb();
          return sendJson(res, 200, { ok: true });
        }
        const body = await readJson(req);
        const err = validateCategoryInput(body, db.categories[idx]);
        if (err) return sendError(res, 400, err);
        let newSlug = slug;
        if (body.slug !== undefined && slugify(body.slug)) {
          const desired = uniqueSlug(slugify(body.slug), (s) =>
            db.categories.some((x, i) => x.slug === s && i !== idx));
          if (desired && desired !== slug) {
            newSlug = desired;
            for (const p of db.products) if (p.category === slug) p.category = newSlug;
            for (const c of db.categories) if (c.parent === slug) c.parent = newSlug;
            if (db.categories[idx].parent === slug) db.categories[idx].parent = null; // جلوگیری از حلقه
          }
        }
        const parent = body.parent !== undefined ? (body.parent ? String(body.parent) : null) : db.categories[idx].parent;
        if (parent) {
          if (parent === newSlug) return sendError(res, 400, 'دسته نمی‌تواند والد خودش باشد.');
          if (!bySlug(parent) && parent !== slug) return sendError(res, 400, 'دسته والد وجود ندارد.');
          // جلوگیری از حلقه: والد نباید از فرزندان همین دسته باشد
          let walk = parent;
          while (walk) {
            if (walk === newSlug) return sendError(res, 400, 'این انتخاب باعث حلقه در دسته‌بندی می‌شود.');
            const w = bySlug(walk);
            walk = w ? w.parent : null;
          }
        }
        const prev = db.categories[idx];
        db.categories[idx] = {
          ...prev, ...pick(body, ['active', 'homeSection']),
          slug: newSlug, parent,
          name: cleanStr(body.name ?? prev.name, 80),
          order: Number.isFinite(Number(body.order)) ? Math.round(Number(body.order)) : prev.order,
          image: cleanStr(body.image ?? prev.image, 300),
          description: cleanStr(body.description ?? prev.description, 400),
        };
        saveDb();
        return sendJson(res, 200, { ok: true, category: db.categories[idx] });
      }
      if (method === 'POST' && seg.length === 4 && seg[3] === 'move') {
        const slug = decodeURIComponent(seg[2]);
        const body = await readJson(req);
        const dir = body.dir === 'up' ? -1 : body.dir === 'down' ? 1 : 0;
        if (!dir) return sendError(res, 400, 'جهت نامعتبر است.');
        const c = bySlug(slug);
        if (!c) return sendError(res, 404, 'دسته پیدا نشد.');
        const siblings = db.categories.filter((x) => (x.parent || null) === (c.parent || null))
          .sort((a, b) => a.order - b.order);
        const i = siblings.findIndex((x) => x.slug === c.slug);
        const j = i + dir;
        if (j < 0 || j >= siblings.length) return sendJson(res, 200, { ok: true, noop: true });
        const a = siblings[i], b = siblings[j];
        [a.order, b.order] = [b.order, a.order];
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
    }

    // ── سفارش‌ها ──
    if (seg[1] === 'orders') {
      if (method === 'GET' && seg.length === 2) {
        const status = query.get('status');
        let items = db.orders;
        if (status) items = items.filter((o) => o.status === status);
        return sendJson(res, 200, { items });
      }
      if (method === 'PATCH' && seg.length === 3) {
        const id = decodeURIComponent(seg[2]);
        const o = db.orders.find((x) => x.id === id || x.code === id);
        if (!o) return sendError(res, 404, 'سفارش پیدا نشد.');
        const body = await readJson(req);
        const allowed = ['new', 'confirmed', 'sent', 'done', 'cancelled'];
        if (!allowed.includes(body.status)) return sendError(res, 400, 'وضعیت نامعتبر است.');
        // لغو سفارش → بازگرداندن موجودی
        if (body.status === 'cancelled' && o.status !== 'cancelled') {
          for (const line of o.items) {
            const p = db.products.find((x) => x.id === line.productId);
            if (p && p.stock >= 0) p.stock += line.qty;
          }
        }
        o.status = body.status;
        o.updatedAt = nowISO();
        saveDb();
        return sendJson(res, 200, { ok: true, order: o });
      }
      if (method === 'DELETE' && seg.length === 3) {
        const id = decodeURIComponent(seg[2]);
        const idx = db.orders.findIndex((x) => x.id === id || x.code === id);
        if (idx < 0) return sendError(res, 404, 'سفارش پیدا نشد.');
        db.orders.splice(idx, 1);
        saveDb();
        return sendJson(res, 200, { ok: true });
      }
    }

    // ── تنظیمات ──
    if (urlPath === '/api/admin/settings') {
      if (method === 'GET') return sendJson(res, 200, { settings: db.settings });
      if (method === 'PUT') {
        const body = await readJson(req);
        const allowed = ['storeName', 'tagline', 'phone', 'address', 'instagram', 'telegram',
          'cardNumber', 'cardName', 'shippingCost', 'announcement', 'currency'];
        for (const k of allowed) if (k in body) {
          db.settings[k] = k === 'shippingCost' ? Math.max(0, Number(body[k]) || 0) : cleanStr(body[k], 400);
        }
        if (!db.settings.storeName) db.settings.storeName = 'گلیستا';
        saveDb();
        return sendJson(res, 200, { ok: true, settings: db.settings });
      }
    }

    // ── تغییر رمز ──
    if (method === 'POST' && urlPath === '/api/admin/password') {
      const body = await readJson(req);
      if (!verifyPassword(String(body.oldPassword || ''), db.adminPassHash)) {
        return sendError(res, 400, 'رمز فعلی اشتباه است.');
      }
      const nw = String(body.newPassword || '');
      if (nw.length < 6) return sendError(res, 400, 'رمز جدید حداقل ۶ کاراکتر باشد.');
      db.adminPassHash = hashPassword(nw);
      saveDb();
      return sendJson(res, 200, { ok: true });
    }

    // ── آپلود تصویر ──
    if (method === 'POST' && urlPath === '/api/admin/upload') {
      const body = await readJson(req);
      const list = Array.isArray(body.images) ? body.images.slice(0, 12) : [];
      if (!list.length) return sendError(res, 400, 'هیچ تصویری ارسال نشده است.');
      const urls = [];
      for (const durl of list) {
        const r = saveDataUrlImage(durl);
        if (r.error) return sendError(res, 400, r.error);
        urls.push(r.url);
      }
      return sendJson(res, 201, { ok: true, urls });
    }

    return sendError(res, 404, 'مسیر ادمین پیدا نشد.');
  }

  return sendError(res, 404, 'مسیر API پیدا نشد.');
}

function breadcrumbTrail(slug) {
  const trail = [];
  let c = bySlug(slug);
  while (c) {
    trail.unshift({ slug: c.slug, name: c.name, parent: c.parent });
    c = c.parent ? bySlug(c.parent) : null;
  }
  return trail;
}
function sameMainCategory(a, b) {
  const mainOf = (s) => {
    let c = bySlug(s);
    while (c && c.parent) c = bySlug(c.parent);
    return c ? c.slug : s;
  };
  return mainOf(a) === mainOf(b);
}
function validateProductInput(body, existing) {
  const name = cleanStr(body.name, 120);
  if (!name) return { error: 'نام محصول الزامی است.' };
  const category = cleanStr(body.category, 60);
  if (!category || !bySlug(category)) return { error: 'دسته محصول را انتخاب کنید.' };
  const price = Math.max(0, Math.round(Number(body.price) || 0));
  if (!price) return { error: 'قیمت محصول را وارد کنید.' };
  const discountPrice = Math.max(0, Math.round(Number(body.discountPrice) || 0));
  if (discountPrice >= price) return { error: 'قیمت تخفیف‌خورده باید کمتر از قیمت اصلی باشد.' };
  const stockRaw = body.stock;
  let stock;
  if (stockRaw === null || stockRaw === undefined || stockRaw === '' || Number(stockRaw) === -1) stock = -1;
  else stock = Math.max(0, Math.round(Number(stockRaw)));
  if (Number.isNaN(stock)) stock = -1;
  const images = (Array.isArray(body.images) ? body.images : [])
    .map((s) => cleanStr(s, 300))
    .filter((s) => s.startsWith('/images/') || s.startsWith('/uploads/') || s.startsWith('http'))
    .slice(0, 10);
  const colors = (Array.isArray(body.colors) ? body.colors : [])
    .map((c) => typeof c === 'string'
      ? { name: cleanStr(c, 40), hex: '' }
      : { name: cleanStr(c?.name, 40), hex: /^#[0-9a-fA-F]{3,8}$/.test(c?.hex || '') ? c.hex : '' })
    .filter((c) => c.name)
    .slice(0, 12);
  const sizes = (Array.isArray(body.sizes) ? body.sizes : [])
    .map((s) => cleanStr(s, 60))
    .filter(Boolean)
    .slice(0, 12);
  const description = String(body.description ?? existing?.description ?? '').slice(0, 4000);
  return {
    name, category, price, discountPrice, stock, images, colors, sizes, description,
    featured: !!body.featured,
    active: body.active !== false,
    order: existing && Number.isFinite(Number(body.order)) ? Math.round(Number(body.order)) : existing?.order,
  };
}
function validateCategoryInput(body, existing) {
  const name = cleanStr(body.name, 80);
  if (!name) return 'نام دسته الزامی است.';
  if (body.slug !== undefined && body.slug !== '' && !slugify(body.slug)) {
    return 'اسلاگ باید لاتین باشد (مثلا: box-flower).';
  }
  if (body.image && !String(body.image).startsWith('/') && !String(body.image).startsWith('http')) {
    return 'آدرس تصویر دسته باید مسیر داخلی یا URL باشد.';
  }
  return null;
}

/* ───────────────────────── سرور ───────────────────────── */
const server = http.createServer(async (req, res) => {
  // CORS ساده (برای توسعه/پیش‌نمایش)
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let urlPath;
  let query;
  try {
    const u = new URL(req.url, 'http://localhost');
    urlPath = decodeURIComponent(u.pathname);
    query = u.searchParams;
  } catch { sendError(res, 400, 'URL نامعتبر است.'); return; }

  try {
    if (urlPath.startsWith('/api/')) { await handleApi(req, res, urlPath, query, clientIp(req)); return; }
    if (urlPath === '/admin' || urlPath === '/admin/') {
      sendFile(res, path.join(__dirname, 'admin.html'), '/admin'); return;
    }
    if (urlPath.startsWith('/uploads/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { sendError(res, 405, 'Method not allowed'); return; }
      serveUpload(req, res, urlPath); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { sendError(res, 405, 'Method not allowed'); return; }
    serveStatic(req, res, urlPath);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status === 413) return sendError(res, 413, 'حجم درخواست بیش از حد مجاز است.');
    if (status === 400) return sendError(res, 400, 'درخواست نامعتبر است.');
    console.error('[error]', req.method, urlPath, err);
    sendError(res, 500, 'خطای داخلی سرور.');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('──────────────────────────────────────────────');
  console.log('  گلیستا — فروشگاه گل مصنوعی');
  console.log(`  فروشگاه : http://localhost:${PORT}/`);
  console.log(`  پنل ادمین : http://localhost:${PORT}/admin`);
  console.log(`  دیتا     : ${DATA_DIR}`);
  console.log(`  فرانت‌اند : ${SHOP_DIR}`);
  if (!db.adminPassHash) console.log('  → اولین ورود به /admin: رمز عبور تعیین کنید.');
  console.log('──────────────────────────────────────────────');
});
