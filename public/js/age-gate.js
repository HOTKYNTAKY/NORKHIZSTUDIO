/**
 * public/js/age-gate.js
 * 18+ Age Verification Gate, Official National License Compliance & Boss-Key Panic Exit
 */

window.VelvetToast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast-msg';
    if (type === 'success') el.style.borderLeftColor = '#10b981';
    if (type === 'warning') el.style.borderLeftColor = '#f59e0b';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }
};

window.AgeGateManager = {
  init(siteConfig = {}) {
    const backdrop = document.getElementById('ageGateBackdrop');
    if (!backdrop) return;

    const licenseNumEl = document.getElementById('ageGateLicenseNum');
    if (licenseNumEl && siteConfig.licenseNumber) {
      licenseNumEl.textContent = siteConfig.licenseNumber;
    }

    const verified = localStorage.getItem('vv_age_verified_18') === 'true';
    if (siteConfig.ageGateEnabled === false || verified) {
      backdrop.style.display = 'none';
    } else {
      backdrop.style.display = 'flex';
    }

    const enterBtn = document.getElementById('btnAgeEnter');
    if (enterBtn) {
      enterBtn.onclick = () => {
        localStorage.setItem('vv_age_verified_18', 'true');
        backdrop.style.display = 'none';
        window.VelvetToast.show('تایید سنی +18 انجام شد. خوش آمدید!', 'success');
      };
    }

    const exitBtn = document.getElementById('btnAgeExit');
    if (exitBtn) {
      exitBtn.onclick = () => {
        window.location.href = 'https://www.google.com';
      };
    }

    // Panic / Boss Key: Press ESC twice quickly or click Quick Exit button
    let lastEsc = 0;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEsc < 450) {
          this.triggerPanicExit();
        }
        lastEsc = now;
      }
    });

    const panicBtn = document.getElementById('btnPanicExit');
    if (panicBtn) {
      panicBtn.onclick = () => this.triggerPanicExit();
    }
  },

  triggerPanicExit() {
    document.title = 'Google';
    document.body.innerHTML = `
      <div style="background:#fff;color:#222;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
        <h1 style="font-size:48px;margin-bottom:16px;color:#4285F4;">G<span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span></h1>
        <p style="color:#5f6368;margin-bottom:24px;">حالت خروج اضطراری فعال شد (Safe Screen Mode)</p>
        <button onclick="window.location.reload()" style="padding:10px 22px;border:1px solid #dadce0;border-radius:6px;background:#f8f9fa;cursor:pointer;">بازگشت به سایت</button>
      </div>
    `;
  }
};
