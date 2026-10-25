/* ============================================================
   NORKHIZ STUDIO — auth.js
   Login / register demo handlers
   ============================================================ */

(function () {
  'use strict';

  function handleForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'در حال پردازش…';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = orig;
        alert('عملیات با موفقیت انجام شد (نمایشی). در نسخه PHP به api/auth/* متصل می‌شود.');
      }, 900);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    handleForm('loginForm');
    handleForm('registerForm');

    // VIP switch visual
    const cb = document.getElementById('vipSwitch');
    const sw = document.getElementById('vipSwitchUI');
    if (cb && sw) {
      cb.addEventListener('change', () => {
        sw.classList.toggle('checked', cb.checked);
      });
    }
  });
})();