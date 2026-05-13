/**
 * PROVA Sticky-Action-Footer (MEGA⁷⁰ Phase 2.3)
 *
 * Konsistente Sticky-Bottom-Action-Bar auf Wizard/Editor-Pages.
 *
 * Auto-Detect Pattern:
 *   <div data-prova-sticky-footer
 *        data-primary="Speichern"
 *        data-primary-onclick="meinSubmit()"
 *        data-secondary="Entwurf"
 *        data-secondary-onclick="entwurfSpeichern()"></div>
 *
 * Programmatisch:
 *   ProvaStickyFooter.mount({ container, primary: {label, onClick}, secondary?: {...} })
 *   ProvaStickyFooter.unmount(container)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-sticky-footer-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-sticky-footer-style';
    style.textContent = `
      .prova-sticky-footer { position: sticky; bottom: 0; z-index: 60; background: rgba(11,13,17,.94); border-top: 1px solid var(--border2, rgba(255,255,255,0.16)); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; gap: 12px; backdrop-filter: blur(8px); margin: 24px -24px 0; }
      .psf-actions-left, .psf-actions-right { display: flex; gap: 8px; align-items: center; }
      .psf-btn { padding: 9px 18px; border-radius: 8px; border: 1px solid var(--border2, rgba(255,255,255,0.16)); background: transparent; color: var(--text2, #a3abc2); font: 700 13px 'DM Sans', sans-serif; font-family: inherit; cursor: pointer; transition: all .12s; }
      .psf-btn:hover { color: var(--text, #eaecf4); border-color: var(--accent, #4f8ef7); }
      .psf-btn-primary { background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #3a7be0)); color: #fff; border: none; }
      .psf-btn-primary:hover { opacity: .92; color: #fff; }
      .psf-btn:disabled { opacity: .5; cursor: not-allowed; }
      .psf-hint { font-size: 11px; color: var(--text3, #8b93ab); }
      @media (max-width: 600px) { .prova-sticky-footer { padding: 10px 14px; flex-direction: column-reverse; align-items: stretch; } .psf-actions-left, .psf-actions-right { width: 100%; justify-content: space-between; } }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function _evalOrCall(fn) {
    if (typeof fn === 'function') return fn();
    if (typeof fn === 'string' && fn.trim()) {
      try { new Function(fn)(); } catch (e) { console.warn('[psf] eval error:', e); }
    }
  }

  const ProvaStickyFooter = {
    mount({ container, primary, secondary, hint }) {
      _injectStyle();
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      el.classList.add('prova-sticky-footer');
      el.innerHTML = `
        <div class="psf-actions-left">
          ${secondary ? `<button class="psf-btn" id="psf-sec">${_esc(secondary.label)}</button>` : ''}
          ${hint ? `<span class="psf-hint">${_esc(hint)}</span>` : ''}
        </div>
        <div class="psf-actions-right">
          ${primary ? `<button class="psf-btn psf-btn-primary" id="psf-prim">${_esc(primary.label)}</button>` : ''}
        </div>
      `;
      if (primary) {
        const p = el.querySelector('#psf-prim');
        p.addEventListener('click', () => _evalOrCall(primary.onClick));
      }
      if (secondary) {
        const s = el.querySelector('#psf-sec');
        s.addEventListener('click', () => _evalOrCall(secondary.onClick));
      }
    },
    unmount(container) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (el) { el.classList.remove('prova-sticky-footer'); el.innerHTML = ''; }
    },
    autoApply() {
      document.querySelectorAll('[data-prova-sticky-footer]').forEach(el => {
        const d = el.dataset;
        ProvaStickyFooter.mount({
          container: el,
          primary: d.primary ? { label: d.primary, onClick: d.primaryOnclick } : null,
          secondary: d.secondary ? { label: d.secondary, onClick: d.secondaryOnclick } : null,
          hint: d.hint || null
        });
      });
    }
  };

  global.ProvaStickyFooter = ProvaStickyFooter;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ProvaStickyFooter.autoApply);
    else ProvaStickyFooter.autoApply();
  }
})(typeof window !== 'undefined' ? window : globalThis);
