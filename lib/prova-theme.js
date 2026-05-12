/**
 * PROVA Theme-Toggle (MEGA⁶⁶ Item 4.11)
 *
 * Light / Dark / Auto-Modes über data-theme-Attribut auf <html>.
 * Auto: respect prefers-color-scheme.
 * Persistierung: localStorage.prova_theme.
 *
 * API:
 *   ProvaTheme.set('light' | 'dark' | 'auto')
 *   ProvaTheme.get() → aktuelles Theme
 *   ProvaTheme.cycle() → light → dark → auto → light
 *   ProvaTheme.init() → wendet gespeichertes Theme an (idempotent)
 */
'use strict';

(function (global) {

  const STORAGE_KEY = 'prova_theme';
  const VALID = ['light', 'dark', 'auto'];
  let _mqListener = null;

  function _injectDarkStyle() {
    if (document.getElementById('prova-theme-dark-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-theme-dark-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-theme-dark.css';
    document.head.appendChild(link);
  }

  function _apply(theme) {
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      root.dataset.themeMode = 'auto';
    } else {
      root.setAttribute('data-theme', theme);
      root.dataset.themeMode = theme;
    }
    _injectDarkStyle();
  }

  function _watchSystem(theme) {
    if (_mqListener && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.removeEventListener) mq.removeEventListener('change', _mqListener);
      else mq.removeListener(_mqListener);
      _mqListener = null;
    }
    if (theme === 'auto' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      _mqListener = (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      if (mq.addEventListener) mq.addEventListener('change', _mqListener);
      else mq.addListener(_mqListener);
    }
  }

  const ProvaTheme = {
    get() {
      try { return localStorage.getItem(STORAGE_KEY) || 'auto'; } catch (_) { return 'auto'; }
    },
    set(theme) {
      if (!VALID.includes(theme)) theme = 'auto';
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* noop */ }
      _apply(theme);
      _watchSystem(theme);
      document.dispatchEvent(new CustomEvent('prova:theme-changed', { detail: { theme } }));
    },
    cycle() {
      const cur = this.get();
      const order = ['light', 'dark', 'auto'];
      const next = order[(order.indexOf(cur) + 1) % order.length];
      this.set(next);
      return next;
    },
    init() {
      _apply(this.get());
      _watchSystem(this.get());
    }
  };

  // Auto-Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProvaTheme.init());
  } else {
    ProvaTheme.init();
  }

  global.ProvaTheme = ProvaTheme;
})(typeof window !== 'undefined' ? window : globalThis);
