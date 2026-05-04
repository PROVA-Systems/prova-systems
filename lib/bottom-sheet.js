/**
 * PROVA Bottom-Sheet (iOS-style Modal-Pattern)
 * MEGA¹³ W19 (Tier 1, 2026-05-05)
 *
 * Modal-Variante die von unten nach oben slidet (iOS-Native-Pattern).
 * Mit Swipe-down-to-dismiss (Touch).
 *
 * USAGE:
 *   ProvaBottomSheet.open({
 *     title: 'Aktionen',
 *     content: '<button onclick="...">Edit</button>...',  // HTML-String oder DOMNode
 *     onClose: () => {},
 *     showHandle: true  // visuelle "drag handle"
 *   });
 *
 *   ProvaBottomSheet.close();
 *
 * Anti-Pattern vermieden:
 *   - Kein Multi-Open (single-instance)
 *   - Backdrop-Tap schliesst
 *   - ESC schliesst
 *   - Swipe-down > 80px schliesst
 *   - Body-Scroll-Lock
 *   - prefers-reduced-motion respektiert
 *   - aria-modal + role=dialog
 *   - Safe-Area-Bottom-Padding
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-bs-style';
  const SHEET_ID = 'prova-bs-sheet';
  const BACKDROP_ID = 'prova-bs-backdrop';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-bs-backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9700;
        opacity: 0; pointer-events: none;
        transition: opacity 0.25s ease-out;
      }
      .prova-bs-backdrop--visible { opacity: 1; pointer-events: auto; }
      .prova-bs-sheet {
        position: fixed; left: 0; right: 0; bottom: 0;
        max-height: 88vh;
        background: var(--surface,#1c2537); color: var(--text,#e8eaf0);
        border-radius: 16px 16px 0 0;
        z-index: 9701;
        transform: translateY(100%);
        transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
        box-shadow: 0 -4px 30px rgba(0,0,0,0.4);
        display: flex; flex-direction: column;
        padding-bottom: max(16px, env(safe-area-inset-bottom));
      }
      .prova-bs-sheet--visible { transform: translateY(0); }
      .prova-bs-handle {
        width: 36px; height: 4px;
        background: rgba(255,255,255,0.25);
        border-radius: 2px;
        margin: 8px auto;
        flex-shrink: 0;
      }
      .prova-bs-header {
        padding: 4px 20px 12px;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid var(--border,rgba(255,255,255,0.08));
      }
      .prova-bs-title { font-size: 16px; font-weight: 700; }
      .prova-bs-close {
        background: transparent; border: none; color: var(--text3,#6b7a99);
        font-size: 22px; cursor: pointer; padding: 4px 10px;
        min-width: 44px; min-height: 44px;
      }
      .prova-bs-content {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
      }
      body.prova-bs-locked { overflow: hidden; }
      @media (prefers-reduced-motion: reduce) {
        .prova-bs-backdrop { transition: none; }
        .prova-bs-sheet { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  let _activeConfig = null;
  let _previousFocus = null;
  let _touchStartY = null;
  let _touchCurrentY = null;
  let _initialTransform = 0;

  function _onTouchStart(e) {
    if (!_activeConfig) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    _touchStartY = t.clientY;
    _touchCurrentY = t.clientY;
    _initialTransform = 0;
    const sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.style.transition = 'none';
  }

  function _onTouchMove(e) {
    if (!_activeConfig || _touchStartY == null) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    _touchCurrentY = t.clientY;
    const delta = _touchCurrentY - _touchStartY;
    if (delta < 0) return;  // pull-up = ignore (sheet bleibt)
    const sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.style.transform = `translateY(${delta}px)`;
  }

  function _onTouchEnd() {
    if (!_activeConfig || _touchStartY == null) return;
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;

    const delta = (_touchCurrentY || 0) - (_touchStartY || 0);
    sheet.style.transition = '';  // re-enable

    if (delta > 80) {
      close();
    } else {
      sheet.style.transform = '';  // snap back
    }
    _touchStartY = null;
    _touchCurrentY = null;
  }

  function _onEscape(e) {
    if (e.key === 'Escape' && _activeConfig) close();
  }

  // MEGA¹⁴ W25 Bug-Fix: Voller Focus-Trap (analog admin-drilldown.js + hamburger-menu.js)
  function _onTabKey(e) {
    if (e.key !== 'Tab' || !_activeConfig) return;
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;

    const focusables = sheet.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !sheet.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function _onBackdropClick(e) {
    if (e.target.id === BACKDROP_ID) close();
  }

  function open(config) {
    config = config || {};
    if (_activeConfig) close();

    _injectStyle();
    _previousFocus = document.activeElement;

    let backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = BACKDROP_ID;
      backdrop.className = 'prova-bs-backdrop';
      backdrop.addEventListener('click', _onBackdropClick);
      document.body.appendChild(backdrop);
    }

    let sheet = document.getElementById(SHEET_ID);
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = SHEET_ID;
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'prova-bs-title');
      document.body.appendChild(sheet);
    }
    sheet.className = 'prova-bs-sheet';

    const showHandle = config.showHandle !== false;
    const handleHtml = showHandle ? '<div class="prova-bs-handle" aria-hidden="true"></div>' : '';

    const titleHtml = config.title
      ? '<div class="prova-bs-header">' +
          '<div class="prova-bs-title" id="prova-bs-title">' + _esc(config.title) + '</div>' +
          '<button class="prova-bs-close" aria-label="Schliessen" type="button">✕</button>' +
        '</div>'
      : '<div class="prova-bs-header" style="justify-content:flex-end;">' +
          '<button class="prova-bs-close" aria-label="Schliessen" type="button">✕</button>' +
        '</div>';

    sheet.innerHTML = handleHtml + titleHtml +
      '<div class="prova-bs-content"></div>';

    const contentEl = sheet.querySelector('.prova-bs-content');
    if (typeof config.content === 'string') {
      contentEl.innerHTML = config.content;
    } else if (config.content instanceof HTMLElement) {
      contentEl.appendChild(config.content);
    }

    sheet.querySelector('.prova-bs-close').addEventListener('click', close);

    // Touch-Listeners
    sheet.addEventListener('touchstart', _onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', _onTouchMove, { passive: true });
    sheet.addEventListener('touchend', _onTouchEnd, { passive: true });
    sheet.addEventListener('touchcancel', _onTouchEnd, { passive: true });

    requestAnimationFrame(() => {
      backdrop.classList.add('prova-bs-backdrop--visible');
      sheet.classList.add('prova-bs-sheet--visible');
    });

    document.body.classList.add('prova-bs-locked');
    document.addEventListener('keydown', _onEscape);
    document.addEventListener('keydown', _onTabKey);  // MEGA¹⁴ W25

    // Focus first focusable
    const focusable = sheet.querySelector('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();

    _activeConfig = config;
    if (config.onOpen) try { config.onOpen(); } catch (_) {}
  }

  function close() {
    if (!_activeConfig) return;
    const config = _activeConfig;
    const sheet = document.getElementById(SHEET_ID);
    const backdrop = document.getElementById(BACKDROP_ID);

    if (sheet) sheet.classList.remove('prova-bs-sheet--visible');
    if (backdrop) backdrop.classList.remove('prova-bs-backdrop--visible');

    document.body.classList.remove('prova-bs-locked');
    document.removeEventListener('keydown', _onEscape);
    document.removeEventListener('keydown', _onTabKey);  // MEGA¹⁴ W25

    if (config.onClose) try { config.onClose(); } catch (_) {}

    if (_previousFocus && _previousFocus.focus) {
      _previousFocus.focus();
      _previousFocus = null;
    }
    _activeConfig = null;
  }

  function isOpen() { return _activeConfig !== null; }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.ProvaBottomSheet = {
    open: open, close: close, isOpen: isOpen
  };
})();
