/* ============================================================
   NORKHIZ STUDIO — emoji-picker.js
   Custom SVG stickers (no system emojis)
   ============================================================ */

(function () {
  'use strict';

  const EMOJIS = [
    { id: 'lips', label: 'لب', svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-4.4 0-8 2.4-8 5.6 0 2.2 2 4 5 4s5-1.8 5-4c0-3.2-3.6-5.6-8-5.6Z"/><path d="M12 12c-1.7 0-3-1-3-3s1.3-3 3-3 3 1 3 3-1.3 3-3 3Z" opacity=".9"/><path d="M12 8c-1.1 0-2 .6-2 2s.9 2 2 2 2-.6 2-2-.9-2-2-2Z" fill="#ff4d88"/></svg>` },
    { id: 'heart', label: 'قلب', svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" fill="#ff4d88"/></svg>` },
    { id: 'fire', label: 'آتش', svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 16c0-2.5 4-5 4-5s4 2.5 4 5c0 2-1 3-3 3s-3-1-3-3Z" fill="#ff4d88"/><path d="M9 14c0-1.5 2-3 2-3s2 1.5 2 3c0 1-.6 2-2 2s-2-1-2-2Z" fill="#fbbf24"/><path d="M9 12c0-.8 1-2 1-2s1 .8 1 2c0 .5-.4 1-1 1s-1-.5-1-1Z" fill="#ffd400"/></svg>` },
    { id: 'star', label: 'ستاره', svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.37 6.54L20.4 9.3l-5.6 1.7 2.4 5.5L12 15.9l-5.2 1.6 2.4-5.5-5.6-1.7L9.63 8.54 12 2Z" fill="#fbbf24"/></svg>` },
    { id: 'eye', label: 'چشم', svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 6c3.9 0 7 2.1 7 5.5S15.9 17 12 17s-7-2.1-7-5.5S8.1 6 12 6Zm0-2C7 4 2 8 2 12c0 3.3 2.8 6 10 6s10-2.7 10-6c0-4-5-8-10-8Z"/><circle cx="12" cy="12" r="2" fill="#0a0a0f"/></svg>` },
    { id: 'kiss', label: 'بوسه', svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-3.3 0-6 1.5-6 4 0 1.5 1 3 3 3s3-1.5 3-3c0-1.5-3-4-6-4ZM18 6c-3.3 0-6 1.5-6 4 0 1.5 1 3 3 3s3-1.5 3-3c0-1.5-3-4-6-4Z"/><path d="M12 10c-1.1 0-2 .6-2 2s.9 2 2 2 2-.6 2-2-.9-2-2-2Z" fill="#ff4d88"/></svg>` },
  ];

  const container = document.getElementById('emojiRow');
  const textarea = document.querySelector('.comment-textarea');
  if (!container || !textarea) return;

  EMOJIS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'emoji-item';
    btn.setAttribute('aria-label', e.label);
    btn.title = e.label;
    btn.innerHTML = e.svg;
    btn.addEventListener('click', () => insertAtCursor(textarea, ` ${e.label} `));
    container.appendChild(btn);
  });

  function insertAtCursor(el, text) {
    const start = el.selectionStart, end = el.selectionEnd;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.selectionStart = el.selectionEnd = start + text.length;
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
})();