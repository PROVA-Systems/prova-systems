/**
 * PROVA Floating-Action-Button (MEGA⁶⁶ Item 4.10)
 *
 * Zeigt FAB rechts unten auf Touch-Geräten — Klick öffnet Command-Palette.
 * CSS in lib/prova-mobile.css.
 *
 * API:
 *   new ProvaFab({ palette })   → FAB sichtbar wenn pointer:coarse
 *   fab.show() / hide() / destroy()
 */
'use strict';

(function (global) {

  function _injectMobile() {
    if (document.getElementById('prova-mobile-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-mobile-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-mobile.css';
    document.head.appendChild(link);
  }

  class ProvaFab {
    constructor(opts = {}) {
      this.palette = opts.palette || null;
      this.button = null;
      _injectMobile();
      this._build();
      this._registerMediaQuery();
    }

    _build() {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prova-fab-command';
      btn.setAttribute('aria-label', 'Befehle öffnen');
      btn.innerHTML = (window.ProvaPlatform?.fmt('K', { mod: true })) || '⌘K';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.palette?.toggle) this.palette.toggle();
        else if (this.palette?.show) this.palette.show();
      });
      document.body.appendChild(btn);
      this.button = btn;
    }

    _registerMediaQuery() {
      const mq = window.matchMedia('(pointer: coarse)');
      const apply = () => {
        if (this.button) this.button.classList.toggle('is-touch-active', mq.matches);
      };
      apply();
      if (mq.addEventListener) mq.addEventListener('change', apply);
      else mq.addListener(apply);   // Safari <14 fallback
    }

    show() { this.button?.classList.add('is-touch-active'); }
    hide() { this.button?.classList.remove('is-touch-active'); }

    destroy() {
      if (this.button?.parentNode) this.button.parentNode.removeChild(this.button);
    }
  }

  global.ProvaFab = ProvaFab;
})(typeof window !== 'undefined' ? window : globalThis);
