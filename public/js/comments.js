/* ============================================================
   NORKHIZ STUDIO — comments.js
   ============================================================ */

(function () {
  'use strict';

  const form = document.querySelector('.comment-form');
  const textarea = document.querySelector('.comment-textarea');
  const list = document.getElementById('commentList');
  const send = document.getElementById('sendComment');
  if (!form || !textarea || !list) return;

  const initial = [
    { author: 'نورقیز', time: '۲ ساعت پیش', text: 'کیفیت ۴K ح실اً لا_description است. 🔥', liked: true },
    { author: 'Lila_Fan', time: '۵ ساعت پیش', text: 'بسیار لوکس و فوق‌العاده. ♥', liked: false },
    { author: 'Tehran_22', time: 'دیروز', text: 'افزودن زیرنویس فارسی عالی بود.', liked: false },
  ];

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function render() {
    list.innerHTML = initial.map(c => `
      <div class="comment">
        <div class="comment-avatar">${c.author.charAt(0)}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.author)}</span>
            <span class="comment-time">${c.time}</span>
          </div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
          <div class="comment-actions">
            <a href="#" class="flex items-center gap-4" style="color:var(--text-dim);"><span>👍</span> لایک</a>
            <a href="#" style="color:var(--text-dim);">پاسخ</a>
          </div>
        </div>
      </div>
    `).join('');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = textarea.value.trim();
    if (!val) return;
    send.disabled = true;
    send.textContent = 'ارسال…';
    setTimeout(() => {
      initial.unshift({ author: 'شما', time: 'الان', text: val, liked: false });
      render();
      textarea.value = '';
      textarea.style.height = '100px';
      send.disabled = false;
      send.textContent = 'ارسال';
    }, 400);
  });

  textarea.addEventListener('input', () => {
    textarea.style.height = '100px';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  });

  render();
})();