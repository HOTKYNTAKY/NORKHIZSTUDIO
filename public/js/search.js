/* ============================================================
   NORKHIZ STUDIO — search.js
   ============================================================ */

(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      // live filtering of rendered video cards on this page
      document.querySelectorAll('#searchResults article').forEach(card => {
        const text = (card.textContent || '').toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });
  });
})();