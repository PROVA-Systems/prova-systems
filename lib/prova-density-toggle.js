/**
 * PROVA Density-Toggle (MEGA⁷⁰ Phase 2.1)
 *
 * Globaler Compact/Comfortable/Spacious-Switch via CSS-Variables.
 * Persistiert in localStorage. Anwendung: einstellungen.html oder Topbar.
 *
 * API:
 *   ProvaDensity.set('compact'|'comfortable'|'spacious')
 *   ProvaDensity.get() → current
 *   ProvaDensity.cycle() → wechselt durch alle drei
 *   ProvaDensity.renderToggle(container) → 3-Button-UI in einstellungen
 */
'use strict';

(function (global) {

  const KEY = 'prova_density';
  const MODES = ['compact', 'comfortable', 'spacious'];
  const DEFAULT = 'comfortable';

  function _injectStyle() {
    if (document.getElementById('prova-density-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-density-style';
    style.textContent = `
      :root[data-density="compact"] {
        --density-pad-y: 6px;
        --density-pad-x: 10px;
        --density-row-h: 36px;
        --density-font: 12px;
        --density-gap: 6px;
      }
      :root[data-density="comfortable"] {
        --density-pad-y: 10px;
        --density-pad-x: 14px;
        --density-row-h: 44px;
        --density-font: 13px;
        --density-gap: 10px;
      }
      :root[data-density="spacious"] {
        --density-pad-y: 14px;
        --density-pad-x: 18px;
        --density-row-h: 52px;
        --density-font: 14px;
        --density-gap: 14px;
      }
      /* Opt-in: Components markieren sich mit class .uses-density */
      .uses-density { padding: var(--density-pad-y) var(--density-pad-x); font-size: var(--density-font); min-height: var(--density-row-h); }
      .pdt-wrap { display: inline-flex; background: var(--surface, #1c2130); border: 1px solid var(--border2, rgba(255,255,255,0.16)); border-radius: 8px; overflow: hidden; }
      .pdt-btn { padding: 7px 14px; background: transparent; border: none; color: var(--text2, #a3abc2); font: 600 12px 'DM Sans', sans-serif; cursor: pointer; border-right: 1px solid var(--border2); }
      .pdt-btn:last-child { border-right: none; }
      .pdt-btn.is-active { background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #3a7be0)); color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function _apply(mode) {
    document.documentElement.setAttribute('data-density', mode);
  }

  const ProvaDensity = {
    get() {
      try { return localStorage.getItem(KEY) || DEFAULT; } catch (_) { return DEFAULT; }
    },
    set(mode) {
      if (!MODES.includes(mode)) mode = DEFAULT;
      try { localStorage.setItem(KEY, mode); } catch (_) {}
      _apply(mode);
      document.dispatchEvent(new CustomEvent('prova:density-changed', { detail: { mode } }));
    },
    cycle() {
      const idx = MODES.indexOf(this.get());
      this.set(MODES[(idx + 1) % MODES.length]);
    },
    renderToggle(container) {
      _injectStyle();
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      const cur = this.get();
      el.classList.add('pdt-wrap');
      el.innerHTML = MODES.map(m => `<button type="button" class="pdt-btn ${m === cur ? 'is-active' : ''}" data-density="${m}">${m === 'compact' ? '🌶 Kompakt' : m === 'comfortable' ? '☕ Standard' : '🛋 Großzügig'}</button>`).join('');
      el.querySelectorAll('.pdt-btn').forEach(b => {
        b.addEventListener('click', () => {
          ProvaDensity.set(b.dataset.density);
          el.querySelectorAll('.pdt-btn').forEach(x => x.classList.toggle('is-active', x === b));
        });
      });
    }
  };

  // Auto-Apply on script load
  _injectStyle();
  _apply(ProvaDensity.get());

  global.ProvaDensity = ProvaDensity;
})(typeof window !== 'undefined' ? window : globalThis);
