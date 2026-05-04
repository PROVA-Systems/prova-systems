/**
 * PROVA Pull-to-Refresh
 * MEGA¹² W14 (Tier 1, 2026-05-05)
 *
 * Touch-Event-basierter Pull-to-Refresh fuer scrollable Container.
 * iOS-Safari + Chrome-Android kompatibel.
 *
 * USAGE:
 *   ProvaPullToRefresh.bind(scrollContainer, async () => {
 *     await ladeFaelle();  // refresh logic
 *   });
 *
 *   ProvaPullToRefresh.unbind(scrollContainer);
 *
 * Public API:
 *   bind(container, refreshCallback, options?)
 *   unbind(container)
 *
 * Anti-Pattern vermieden:
 *   - Kein Library-Dependency (vanilla touch-events)
 *   - Kein Conflict mit native iOS-Safari pull-to-refresh:
 *     - Native PTR feuert nur wenn scrollTop === 0 + Pull
 *     - Wir nutzen gleiches Trigger aber stoppen native via preventDefault
 *   - Kein Memory-Leak: unbind entfernt alle Listener
 *   - prefers-reduced-motion respektiert (kein Spinner-Spin)
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-ptr-style';

  // Default-Config
  const DEFAULTS = {
    triggerDistance: 80,   // px Pull bevor Trigger
    maxPullDistance: 120,  // px max sichtbarer Pull (Resistance danach)
    spinnerColor: 'currentColor',
    busyText: 'Aktualisiere…',
    pullText: 'Zum Aktualisieren ziehen',
    releaseText: 'Loslassen zum Aktualisieren'
  };

  // ─── Style-Inject ────────────────────────────────────────────────────
  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-ptr-indicator {
        position: absolute;
        top: -60px;
        left: 0;
        right: 0;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: var(--text3, #6b7a99);
        pointer-events: none;
        transition: transform 0.2s ease-out, opacity 0.2s ease-out;
        opacity: 0;
        z-index: 100;
      }
      .prova-ptr-indicator--visible { opacity: 1; }
      .prova-ptr-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: prova-ptr-spin 0.8s linear infinite;
      }
      .prova-ptr-arrow {
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: transform 0.15s ease-out;
      }
      .prova-ptr-arrow--release {
        transform: rotate(180deg);
      }
      @keyframes prova-ptr-spin {
        to { transform: rotate(360deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .prova-ptr-spinner { animation: none; }
        .prova-ptr-arrow { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Indicator-Element ────────────────────────────────────────────────
  function _buildIndicator(opts) {
    const div = document.createElement('div');
    div.className = 'prova-ptr-indicator';
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML =
      '<span class="prova-ptr-arrow" aria-hidden="true">↓</span>' +
      '<span class="prova-ptr-text">' + opts.pullText + '</span>';
    return div;
  }

  // ─── State pro container (WeakMap fuer auto-cleanup) ──────────────────
  const _state = new WeakMap();

  function bind(container, refreshCallback, options) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) {
      console.warn('[ProvaPullToRefresh] container not found');
      return;
    }
    if (typeof refreshCallback !== 'function') {
      throw new Error('[ProvaPullToRefresh] refreshCallback must be function');
    }
    if (_state.has(container)) {
      console.warn('[ProvaPullToRefresh] already bound, unbind first');
      return;
    }

    const opts = Object.assign({}, DEFAULTS, options || {});
    _injectStyle();

    // Container muss position:relative sein (fuer absolute indicator)
    const computedPos = window.getComputedStyle(container).position;
    if (computedPos === 'static') {
      container.style.position = 'relative';
    }

    const indicator = _buildIndicator(opts);
    container.appendChild(indicator);

    const arrow = indicator.querySelector('.prova-ptr-arrow');
    const text = indicator.querySelector('.prova-ptr-text');

    let touchStartY = null;
    let touchCurrentY = null;
    let pulling = false;
    let busy = false;

    function onTouchStart(e) {
      if (busy) return;
      // Nur wenn ganz oben gescrollt
      if (container.scrollTop > 0) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchStartY = t.clientY;
      touchCurrentY = t.clientY;
      pulling = false;
    }

    function onTouchMove(e) {
      if (busy || touchStartY == null) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchCurrentY = t.clientY;
      const delta = touchCurrentY - touchStartY;

      if (delta <= 0) {
        // User scrollt nach oben statt nach unten - exit
        if (pulling) {
          indicator.style.transform = 'translateY(0)';
          indicator.classList.remove('prova-ptr-indicator--visible');
          pulling = false;
        }
        return;
      }

      // Resistance: nach maxPullDistance abnehmend
      const damped = Math.min(delta, opts.maxPullDistance + (delta - opts.maxPullDistance) * 0.2);

      // preventDefault NUR wenn wir wirklich pullen (nicht bei normalem scroll)
      if (delta > 10 && container.scrollTop === 0) {
        try { e.preventDefault(); } catch (_) {}
      }

      pulling = true;
      indicator.classList.add('prova-ptr-indicator--visible');
      indicator.style.transform = `translateY(${damped}px)`;

      if (damped >= opts.triggerDistance) {
        arrow.classList.add('prova-ptr-arrow--release');
        text.textContent = opts.releaseText;
      } else {
        arrow.classList.remove('prova-ptr-arrow--release');
        text.textContent = opts.pullText;
      }
    }

    async function onTouchEnd() {
      if (busy || !pulling) {
        touchStartY = null;
        return;
      }
      const delta = (touchCurrentY || 0) - (touchStartY || 0);

      if (delta >= opts.triggerDistance) {
        // TRIGGER REFRESH
        busy = true;
        indicator.style.transform = `translateY(60px)`;  // hold visible
        arrow.outerHTML = '<span class="prova-ptr-spinner" aria-hidden="true"></span>';
        text.textContent = opts.busyText;
        container.setAttribute('aria-busy', 'true');

        try {
          await refreshCallback();
        } catch (e) {
          console.warn('[ProvaPullToRefresh] refreshCallback error', e);
        }

        // Cleanup nach Refresh
        const newArrow = document.createElement('span');
        newArrow.className = 'prova-ptr-arrow';
        newArrow.setAttribute('aria-hidden', 'true');
        newArrow.textContent = '↓';
        const spinner = indicator.querySelector('.prova-ptr-spinner');
        if (spinner) spinner.replaceWith(newArrow);
        const newText = indicator.querySelector('.prova-ptr-text');
        if (newText) newText.textContent = opts.pullText;

        indicator.style.transform = 'translateY(0)';
        indicator.classList.remove('prova-ptr-indicator--visible');
        container.removeAttribute('aria-busy');
        busy = false;
      } else {
        // Snap back
        indicator.style.transform = 'translateY(0)';
        indicator.classList.remove('prova-ptr-indicator--visible');
      }

      touchStartY = null;
      touchCurrentY = null;
      pulling = false;
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    // touchmove muss non-passive sein wegen preventDefault
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });

    _state.set(container, {
      indicator: indicator,
      handlers: { onTouchStart, onTouchMove, onTouchEnd }
    });
  }

  function unbind(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    const state = _state.get(container);
    if (!state) return;

    const h = state.handlers;
    container.removeEventListener('touchstart', h.onTouchStart);
    container.removeEventListener('touchmove', h.onTouchMove);
    container.removeEventListener('touchend', h.onTouchEnd);
    container.removeEventListener('touchcancel', h.onTouchEnd);

    if (state.indicator && state.indicator.parentNode) {
      state.indicator.parentNode.removeChild(state.indicator);
    }
    _state.delete(container);
  }

  // Public API
  window.ProvaPullToRefresh = {
    bind: bind,
    unbind: unbind
  };

  // Test-Exports
  window.ProvaPullToRefresh._test = {
    DEFAULTS: DEFAULTS,
    STYLE_ID: STYLE_ID
  };
})();
