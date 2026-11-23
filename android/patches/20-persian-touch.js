/*
 * NEON TIDE — touch layout (Persian).
 *
 * The build ships an English mobile layer (assets/mobile.js) that draws the
 * on-screen controls and maps them to a virtual gamepad. It also shows labels
 * that make no sense on a phone (keyboard keys, "Gamepad", "Click to play").
 * This patch renames the touch buttons to Persian, hides the text hints that
 * talk about keyboards and pads, and adds the two pad buttons the stock layout
 * left out (map, pause) to the touch UI.
 *
 * It touches text and CSS only — no gameplay state.
 */
(function neonTidePersianTouch() {
  "use strict";

  const LABEL = {
    // touch buttons drawn by assets/mobile.js
    "سوار / تعامل": "سوار / تعامل",
    "نشانه": "نشانه‌گیری",
    "شلیک": "شلیک",
    "دویدن": "دویدن",
    "خشاب": "خشاب",
    "پرش": "پرش",
    "گاز": "گاز",
    "ترمز": "ترمز",
    "هندبرک": "دست‌فرمان",
    "پیاده شدن": "پیاده شدن",
    "بوق": "بوق",
    "دید عقب": "دید عقب",
    "خم شدن": "خم شدن",
    "پوشش": "پوشش",
    "چرخ اسلحه": "چرخ سلاح",
    "سلاح بعدی": "سلاح بعدی",
    "سلاح قبلی": "سلاح قبلی",
    "گوشی": "گوشی",
    "تعویض شخصیت": "تعویض شخصیت",
    "توقف": "توقف",
    "تمام‌صفحه": "تمام‌صفحه",
    "نقشه": "نقشه",
    "بیشتر": "بیشتر",
    "تنظیم لمس": "تنظیم لمس",
    "بستن": "بستن",
  };

  // Text that only makes sense with a keyboard or a gamepad.
  const TECH = [
    /Click to play/i,
    /Hold to skip/i,
    /Space/i,
    /Gamepad/i,
    /Keyboard/i,
    /Esc\b/,
    /\bEnter\b/,
    /F3\b/,
    /backquote/i,
    /\bKBM\b/i,
    /mouse/i,
  ];

  const MAP_BUTTON = "نقشه";
  const PAUSE_BUTTON = "توقف";

  function textNodes(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const out = [];
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }

  function relabel() {
    // 1) touch pad labels
    for (const btn of document.querySelectorAll("#nt-touch button[data-pad], #nt-touch button")) {
      const t = btn.textContent.trim();
      if (LABEL[t] && LABEL[t] !== t) btn.textContent = LABEL[t];
    }

    // 2) hide keyboard/pad hints
    for (const node of textNodes()) {
      const t = (node.textContent || "").trim();
      if (!t || t.length > 90) continue;
      if (!TECH.some((re) => re.test(t))) continue;
      const el = node.parentElement;
      if (!el || el.closest("#nt-touch")) continue;
      if (el.dataset && el.dataset.ntHidden) continue;
      if (el.closest("kbd") || el.tagName === "KBD") {
        el.style.display = "none";
        continue;
      }
      el.dataset.ntHidden = "1";
      el.style.display = "none";
    }
  }

  function addTouchButtons() {
    const root = document.getElementById("nt-touch");
    if (!root || root.dataset.ntExtra === "1") return;
    const bar = root.querySelector(".bar.bot");
    if (!bar) return;
    root.dataset.ntExtra = "1";
    const make = (label, pad) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.dataset.pad = String(pad);
      return b;
    };
    bar.prepend(make(MAP_BUTTON, 8)); // pad button 8 = Map
    bar.prepend(make(PAUSE_BUTTON, 9)); // pad button 9 = Pause
  }

  function run() {
    try {
      addTouchButtons();
      relabel();
    } catch (e) {
      console.warn("[neon-tide/touch]", e && e.message);
    }
  }

  const boot = () => {
    run();
    // The React UI re-renders as menus open and close; keep the labels tidy
    // without doing work on every animation frame.
    setInterval(run, 1500);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
