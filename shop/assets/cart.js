/* گلیستا — سبد خرید و ثبت سفارش */
'use strict';

const root = document.getElementById('cartRoot');
let cfg = null;

function render() {
  const items = getCart();
  if (!items.length) {
    root.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 4h2l2.2 10.4a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.25L20.5 8H6"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>
        <h3>سبد خرید خالی است</h3>
        <p>از دو دسته «باکس گل» و «دسته‌گل» دیدن کنید و هدیه دلخواهتان را انتخاب کنید.</p>
        <a class="btn btn-primary" href="/category.html">شروع خرید</a>
      </div>`;
    return;
  }

  const shippingCost = Number(cfg?.shippingCost || 0);
  const t = cartTotals(shippingCost);

  root.innerHTML = `
  <div class="cart-grid">
    <div class="cart-items" id="cartItems">
      ${items.map((it) => `
        <div class="cart-row" data-key="${esc(it.key || cartKey(it))}">
          <a class="ci-img" href="/product.html?p=${encodeURIComponent(it.slug)}">
            ${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.name)}">` : ''}
          </a>
          <div>
            <div class="ci-name"><a href="/product.html?p=${encodeURIComponent(it.slug)}">${esc(it.name)}</a></div>
            ${(it.color || it.size) ? `<div class="ci-opts">${it.color ? 'رنگ: ' + esc(it.color) : ''}${it.color && it.size ? ' · ' : ''}${it.size ? 'سایز: ' + esc(it.size) : ''}</div>` : ''}
            <div class="ci-price">قیمت واحد: ${money(it.price)}</div>
          </div>
          <div class="ci-side">
            <div class="ci-total">${money(it.price * it.qty)}</div>
            <div class="qty qty-sm">
              <button type="button" data-act="minus">−</button>
              <input type="number" value="${it.qty}" min="1" max="99" data-act="set" readonly>
              <button type="button" data-act="plus">＋</button>
            </div>
            <button class="ci-rm" data-act="rm">حذف</button>
          </div>
        </div>`).join('')}
    </div>

    <aside class="summary">
      <h3>خلاصه سفارش</h3>
      <div class="sum-row"><span>تعداد اقلام (${faNum(t.count)})</span><span>${money(t.subtotal)}</span></div>
      <div class="sum-row"><span>هزینه ارسال</span>
        ${t.shipping ? `<span>${money(t.shipping)}</span>` : '<span class="free">رایگان</span>'}</div>
      <div class="sum-row total"><span>مبلغ قابل پرداخت</span><span>${money(t.total)}</span></div>

      <form class="checkout-form" id="checkoutForm">
        <h4>اطلاعات تحویل</h4>
        <div><label class="f-lbl" for="cName">نام و نام خانوادگی *</label>
          <input class="f-in" id="cName" required autocomplete="name" placeholder="مثال: سارا محمدی"></div>
        <div><label class="f-lbl" for="cPhone">شماره موبایل *</label>
          <input class="f-in" id="cPhone" required inputmode="tel" dir="ltr" style="text-align:right" autocomplete="tel" placeholder="09121234567"></div>
        <div><label class="f-lbl" for="cCity">شهر</label>
          <input class="f-in" id="cCity" placeholder="مثلا: تهران"></div>
        <div><label class="f-lbl" for="cAddress">آدرس تحویل *</label>
          <textarea class="f-in" id="cAddress" required placeholder="استان، شهر، خیابان، پلاک، واحد"></textarea></div>
        <div><label class="f-lbl" for="cNote">یادداشت (اختیاری)</label>
          <textarea class="f-in" id="cNote" placeholder="پیام روی کارت، زمان تحویل، نکته خاص…"></textarea></div>

        <h4 style="margin-top:8px">نحوه پرداخت</h4>
        <div class="pay-opts" id="payOpts">
          <label class="pay-opt active">
            <input type="radio" name="pay" value="cod" checked>
            <span>پرداخت در محل<small>نقد یا کارت هنگام تحویل</small></span>
          </label>
          <label class="pay-opt">
            <input type="radio" name="pay" value="card">
            <span>کارت به کارت<small>${cfg?.cardNumber ? 'شماره کارت: <b dir="ltr">' + esc(cfg.cardNumber) + '</b>' : 'شماره کارت پس از ثبت سفارش پیامک می‌شود'}</small></span>
          </label>
        </div>

        <button class="btn btn-primary btn-block btn-lg" type="submit" id="submitBtn" style="margin-top:6px">ثبت نهایی سفارش</button>
        <p style="font-size:12px;color:var(--muted);text-align:center;line-height:1.9">
          با ثبت سفارش، قوانین فروشگاه را می‌پذیرید. کارشناسان ما برای هماهنگی ارسال تماس می‌گیرند.
        </p>
      </form>
    </aside>
  </div>`;

  bindCartEvents();
  bindCheckout();
}

function bindCartEvents() {
  document.getElementById('cartItems').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = e.target.closest('.cart-row');
    const key = row.dataset.key;
    const it = getCart().find((c) => (c.key || cartKey(c)) === key);
    if (!it) return;
    const act = btn.dataset.act;
    if (act === 'plus') setCartQty(key, it.qty + 1);
    else if (act === 'minus') setCartQty(key, it.qty - 1);
    else if (act === 'rm') {
      removeFromCart(key);
      toast('از سبد حذف شد', '');
    } else return;
    render();
  });
}

function bindCheckout() {
  const form = document.getElementById('checkoutForm');
  document.getElementById('payOpts').addEventListener('change', (e) => {
    $$('.pay-opt').forEach((l) => l.classList.toggle('active', l.contains(e.target)));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = getCart();
    if (!items.length) return;

    const payload = {
      name: document.getElementById('cName').value.trim(),
      phone: document.getElementById('cPhone').value.trim(),
      city: document.getElementById('cCity').value.trim(),
      address: document.getElementById('cAddress').value.trim(),
      note: document.getElementById('cNote').value.trim(),
      payment: form.querySelector('input[name="pay"]:checked').value,
      items: items.map((it) => ({
        productId: it.id, qty: it.qty, color: it.color || '', size: it.size || '',
      })),
    };

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'در حال ثبت سفارش…';
    try {
      const r = await apiPost('/api/orders', payload);
      setCart([]);
      showSuccess(r);
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false;
      btn.textContent = 'ثبت نهایی سفارش';
    }
  });
}

function showSuccess(r) {
  root.innerHTML = `
    <div class="order-ok">
      <div class="ok-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div>
      <h2>سفارش شما با موفقیت ثبت شد 🌿</h2>
      <p>${esc(r.message || 'به‌زودی با شما تماس می‌گیریم.')}</p>
      <div class="code">${esc(r.code)}</div>
      <p style="font-size:13.5px;margin-top:14px">مبلغ قابل پرداخت: <b>${money(r.total)}</b></p>
      <div class="btns">
        <a class="btn btn-primary" href="/category.html">ادامه خرید</a>
        <a class="btn btn-ghost" href="/">بازگشت به خانه</a>
      </div>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* بوت */
(async function boot() {
  try { cfg = await apiGet('/api/config'); } catch { /* بدون تنظیمات هم کار می‌کند */ }
  render();
})();
