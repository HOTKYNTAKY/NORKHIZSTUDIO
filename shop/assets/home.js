/* گلیستا — صفحه اصلی: بخش‌های دسته‌بندی + محصولات ویژه */
'use strict';

(async function initHome() {
  // ── همگام‌سازی نام/توضیح/تصویر دو بخش بزرگ از دیتابیس ──
  try {
    const { items } = await apiGet('/api/categories');
    const mains = items.filter((c) => c.homeSection);
    mains.forEach((c) => {
      const card = document.querySelector(`[data-sec="${c.slug}"]`);
      if (!card) return;
      const nameEl = card.querySelector(`[data-sec-name="${c.slug}"]`);
      const descEl = card.querySelector(`[data-sec-desc="${c.slug}"]`);
      const imgEl = card.querySelector('img');
      if (nameEl && c.name) nameEl.textContent = c.name;
      if (descEl && c.description) descEl.textContent = c.description;
      if (imgEl && c.image) imgEl.src = c.image;
      card.href = '/category.html?c=' + encodeURIComponent(c.slug);
      const tag = card.querySelector('.bc-tag');
      if (tag && c.children) tag.textContent = faNum(c.children.length) + ' مجموعه متنوع';
    });
  } catch { /* سرور در دسترس نیست — همان محتوای پیش‌فرض می‌ماند */ }

  // ── محصولات ویژه ──
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  try {
    const data = await apiGet('/api/products?featured=1&limit=8');
    if (!data.items.length) {
      // اگر ویژه‌ای ثبت نشده، جدیدترین‌ها را نشان بده
      const fallback = await apiGet('/api/products?sort=newest&limit=8');
      render(fallback.items);
    } else {
      render(data.items);
    }
  } catch {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>ارتباط با سرور برقرار نشد</h3>
        <p>لطفاً چند لحظه دیگر دوباره تلاش کنید.</p>
      </div>`;
  }

  function render(items) {
    if (!items.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <h3>هنوز محصولی ثبت نشده</h3>
          <p>به‌زودی محصولات جدید اضافه می‌شوند.</p>
        </div>`;
      return;
    }
    grid.innerHTML = items.map((p) => productCard(p)).join('');
    grid.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }
})();
