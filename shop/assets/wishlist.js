/* گلیستا — صفحه علاقه‌مندی‌ها */
'use strict';

(async function initWish() {
  const host = document.getElementById('wishRoot');
  const ids = getWish();

  if (!ids.length) {
    host.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 20.3s-6.8-4.3-8.9-8.4C1.4 8.5 3.2 5.4 6.3 5.4c1.9 0 3.2 1.1 3.9 2.1.7-1 2-2.1 3.9-2.1 3.1 0 4.9 3.1 3.2 6.5-2.1 4.1-8.9 8.4-8.9 8.4z"/></svg>
        <h3>لیست علاقه‌مندی‌ها خالی است</h3>
        <p>روی قلب محصولات کلیک کنید تا اینجا ذخیره شوند.</p>
        <a class="btn btn-primary" href="/category.html">مشاهده محصولات</a>
      </div>`;
    return;
  }

  // دریافت همه محصولات (چند صفحه در صورت نیاز) و فیلتر علاقه‌مندی‌ها
  const found = [];
  try {
    let page = 1;
    while (page <= 5) {
      const data = await apiGet('/api/products?limit=60&page=' + page);
      for (const p of data.items) if (ids.includes(p.id)) found.push(p);
      if (page >= data.pages) break;
      page += 1;
    }
  } catch (err) {
    host.innerHTML = `<div class="empty-state"><h3>خطا در دریافت محصولات</h3><p>${esc(err.message)}</p></div>`;
    return;
  }

  const missing = ids.length - found.length;
  host.innerHTML = `
    <div class="list-bar">
      <span class="cnt">${faNum(found.length)} محصول ذخیره‌شده</span>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" id="clearWish">پاک کردن همه</button>
    </div>
    ${found.length
      ? `<div class="wish-grid">${found.map((p) => productCard(p)).join('')}</div>`
      : `<div class="empty-state"><h3>محصولی پیدا نشد</h3><p>شاید این محصولات دیگر موجود نیستند.</p>
         <a class="btn btn-primary" href="/category.html">مشاهده محصولات</a></div>`}
    ${missing > 0 ? `<p style="text-align:center;color:var(--muted);font-size:13px;margin-top:18px">${faNum(missing)} مورد دیگر در فروشگاه موجود نیست.</p>` : ''}`;

  document.getElementById('clearWish')?.addEventListener('click', () => {
    if (!confirm('همه موارد علاقه‌مندی پاک شود؟')) return;
    setWish([]);
    initWish();
  });

  // حذف کارت هنگام برداشتن قلب
  host.addEventListener('click', (e) => {
    const w = e.target.closest('[data-wish]');
    if (!w) return;
    setTimeout(() => {
      if (!isWished(w.dataset.wish)) {
        const card = w.closest('.p-card');
        card?.remove();
        const left = host.querySelectorAll('.p-card').length;
        const cnt = host.querySelector('.cnt');
        if (cnt) cnt.textContent = faNum(left) + ' محصول ذخیره‌شده';
        if (!left) initWish();
      }
    }, 60);
  });
})();
