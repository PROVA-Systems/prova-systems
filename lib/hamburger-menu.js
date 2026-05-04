/**
 * PROVA Hamburger-Menu
 * MEGA¹³ W19 (Tier 1, 2026-05-05)
 *
 * Mobile-Hamburger-Menu mit Smooth-Slide-In + Tap-Outside-to-Close.
 *
 * USAGE:
 *   ProvaHamburger.bind(triggerEl, {
 *     content: '<a href="...">...</a>...',  // HTML-String
 *     position: 'left' | 'right',           // Default: 'right'
 *     onOpen: () => {},
 *     onClose: () => {}
 *   });
 *
 *   ProvaHamburger.open(triggerEl);
 *   ProvaHamburger.close();
 *   ProvaHamburger.unbind(triggerEl);
 *
 * Anti-Pattern vermieden:
 *   - Kein eager-Open beim Page-Load
 *   - Tap-Outside schliesst (User-Erwartung)
 *   - ESC-Key schliesst
 *   - Body-Scroll-Lock waehrend offen (CSS overflow:hidden)
 *   - prefers-reduced-motion respektiert
 *   - aria-expanded auf Trigger + role=menu auf Panel
 *   - Focus-Management: erster fokussierbarer Eintrag bei Open
 *   - Escape returns Focus zum Trigger
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-hb-style';
  const PANEL_ID = 'prova-hb-panel';
  const BACKDROP_ID = 'prova-hb-backdrop';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-hb-backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 9700;
        opacity: 0; pointer-events: none;
        transition: opacity 0.25s ease-out;
      }
      .prova-hb-backdrop--visible { opacity: 1; pointer-events: auto; }
      .prova-hb-panel {
        position: fixed; top: 0; bottom: 0;
        width: 280px; max-width: 80vw;
        background: var(--surface,#1c2537); color: var(--text,#e8eaf0);
        z-index: 9701;
        box-shadow: 0 0 40px rgba(0,0,0,0.5);
        transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        overflow-y: auto;
        padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
      }
      .prova-hb-panel--right {
        right: 0; transform: translateX(100%);
      }
      .prova-hb-panel--right.prova-hb-panel--visible { transform: translateX(0); }
      .prova-hb-panel--left {
        left: 0; transform: translateX(-100%);
      }
      .prova-hb-panel--left.prova-hb-panel--visible { transform: translateX(0); }
      .prova-hb-close {
        background: transparent; border: none; color: var(--text3,#6b7a99);
        font-size: 24px; cursor: pointer; padding: 8px 12px;
        margin-bottom: 8px;
        min-width: 48px; min-height: 48px;
      }
      body.prova-hb-locked { overflow: hidden; }
      @media (prefers-reduced-motion: reduce) {
        .prova-hb-backdrop { transition: none; }
        .prova-hb-panel { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  // Single-Open-Pattern: nur 1 Hamburger gleichzeitig
  let _activeBinding = null;
  let _previousFocus = null;

  function _getFocusableInPanel(panel) {
    return panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
  }

  function _onEscape(e) {
    if (e.key === 'Escape' && _activeBinding) close();
  }

  function _onBackdropClick(e) {
    if (e.target.id === BACKDROP_ID) close();
  }

  function open(triggerEl) {
    if (typeof triggerEl === 'string') triggerEl = document.querySelector(triggerEl);
    if (!triggerEl) return;
    const config = triggerEl._provaHbConfig;
    if (!config) {
      console.warn('[ProvaHamburger] not bound — call bind() first');
      return;
    }
    if (_activeBinding) close();

    _injectStyle();
    _previousFocus = document.activeElement;

    // Backdrop
    let backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = BACKDROP_ID;
      backdrop.className = 'prova-hb-backdrop';
      backdrop.addEventListener('click', _onBackdropClick);
      document.body.appendChild(backdrop);
    }

    // Panel
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = PANEL_ID;
      panel.setAttribute('role', 'menu');
      panel.setAttribute('aria-label', 'Mobile-Navigation');
      document.body.appendChild(panel);
    }

    const positionClass = config.position === 'left' ? 'prova-hb-panel--left' : 'prova-hb-panel--right';
    panel.className = 'prova-hb-panel ' + positionClass;
    panel.innerHTML =
      '<button class="prova-hb-close" aria-label="Menue schliessen" type="button">✕</button>' +
      (config.content || '');

    panel.querySelector('.prova-hb-close').addEventListener('click', close);

    // Show with rAF for smooth animation
    requestAnimationFrame(() => {
      backdrop.classList.add('prova-hb-backdrop--visible');
      panel.classList.add('prova-hb-panel--visible');
    });

    document.body.classList.add('prova-hb-locked');
    triggerEl.setAttribute('aria-expanded', 'true');

    // Focus erstes fokussierbares Element (oder Close-Btn)
    const focusables = _getFocusableInPanel(panel);
    if (focusables.length > 0) focusables[0].focus();

    // Listeners
    document.addEventListener('keydown', _onEscape);

    _activeBinding = { triggerEl, panel, backdrop, config };
    if (config.onOpen) try { config.onOpen(); } catch (_) {}
  }

  function close() {
    if (!_activeBinding) return;
    const { triggerEl, panel, backdrop, config } = _activeBinding;

    panel.classList.remove('prova-hb-panel--visible');
    backdrop.classList.remove('prova-hb-backdrop--visible');
    document.body.classList.remove('prova-hb-locked');
    triggerEl.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', _onEscape);

    if (config.onClose) try { config.onClose(); } catch (_) {}

    if (_previousFocus && _previousFocus.focus) {
      _previousFocus.focus();
      _previousFocus = null;
    }
    _activeBinding = null;
  }

  function bind(triggerEl, config) {
    if (typeof triggerEl === 'string') triggerEl = document.querySelector(triggerEl);
    if (!triggerEl) return;
    if (triggerEl._provaHbConfig) {
      console.warn('[ProvaHamburger] already bound');
      return;
    }
    triggerEl._provaHbConfig = config || {};
    triggerEl.setAttribute('aria-haspopup', 'menu');
    triggerEl.setAttribute('aria-expanded', 'false');

    const onClick = () => open(triggerEl);
    triggerEl.addEventListener('click', onClick);
    triggerEl._provaHbHandler = onClick;
  }

  function unbind(triggerEl) {
    if (typeof triggerEl === 'string') triggerEl = document.querySelector(triggerEl);
    if (!triggerEl || !triggerEl._provaHbConfig) return;
    if (_activeBinding && _activeBinding.triggerEl === triggerEl) close();
    triggerEl.removeEventListener('click', triggerEl._provaHbHandler);
    triggerEl.removeAttribute('aria-haspopup');
    triggerEl.removeAttribute('aria-expanded');
    delete triggerEl._provaHbConfig;
    delete triggerEl._provaHbHandler;
  }

  function isOpen() {
    return _activeBinding !== null;
  }

  // Public API
  window.ProvaHamburger = {
    bind: bind, unbind: unbind, open: open, close: close, isOpen: isOpen
  };
})();
