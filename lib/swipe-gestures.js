/**
 * PROVA Swipe-Gestures
 * MEGA¹⁴ W24 (Tier 1, 2026-05-06)
 *
 * Touch-basierte Swipe-Detection (left/right) auf Akten-Karten oder Listen-Items.
 *
 * USAGE:
 *   ProvaSwipe.bind(rowEl, {
 *     onSwipeLeft: (el) => archive(el),
 *     onSwipeRight: (el) => edit(el),
 *     threshold: 80,        // px Schwelle
 *     showFeedback: true    // visuelles Hinweis-Overlay waehrend Swipe
 *   });
 *
 *   ProvaSwipe.unbind(rowEl);
 *
 * Anti-Pattern vermieden:
 *   - Multi-Touch (Pinch) wird ignoriert
 *   - Vertikaler Scroll vs. horizontaler Swipe via Threshold-Aspect-Ratio
 *   - Threshold-Schutz gegen Falsch-Trigger bei kurzem Tap
 *   - WeakMap fuer State (Memory-Leak-Defense)
 *   - prefers-reduced-motion respektiert (kein Slide-Animation)
 *   - aria-label informiert Screen-Reader nicht ueber Swipe (es ist Touch-only)
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-swipe-style';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-swipe-target { position: relative; touch-action: pan-y; }
      .prova-swipe-feedback {
        position: absolute; inset: 0;
        display: flex; align-items: center;
        padding: 0 16px;
        font-size: 14px; font-weight: 600; color: #fff;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease-out;
        z-index: 1;
      }
      .prova-swipe-feedback--left {
        background: linear-gradient(90deg, transparent, #dc2626);
        justify-content: flex-end;
      }
      .prova-swipe-feedback--right {
        background: linear-gradient(90deg, #4f8ef7, transparent);
        justify-content: flex-start;
      }
      .prova-swipe-feedback--visible { opacity: 1; }
      .prova-swipe-content {
        position: relative; z-index: 2;
        background: inherit;
        transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
      }
      @media (prefers-reduced-motion: reduce) {
        .prova-swipe-feedback { transition: none; }
        .prova-swipe-content { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  const _state = new WeakMap();

  const DEFAULTS = {
    threshold: 80,
    aspectRatio: 1.5,  // Horizontal-Movement muss min 1.5x Vertical sein
    showFeedback: true,
    leftLabel: '🗑 Archive',
    rightLabel: '✎ Edit'
  };

  function bind(el, options) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    if (_state.has(el)) {
      console.warn('[ProvaSwipe] already bound');
      return;
    }
    const opts = Object.assign({}, DEFAULTS, options || {});
    if (typeof opts.onSwipeLeft !== 'function' && typeof opts.onSwipeRight !== 'function') {
      console.warn('[ProvaSwipe] need onSwipeLeft or onSwipeRight callback');
      return;
    }

    _injectStyle();

    el.classList.add('prova-swipe-target');

    let feedbackLeft = null, feedbackRight = null;
    if (opts.showFeedback) {
      feedbackLeft = document.createElement('div');
      feedbackLeft.className = 'prova-swipe-feedback prova-swipe-feedback--left';
      feedbackLeft.setAttribute('aria-hidden', 'true');
      feedbackLeft.textContent = opts.leftLabel;
      el.appendChild(feedbackLeft);

      feedbackRight = document.createElement('div');
      feedbackRight.className = 'prova-swipe-feedback prova-swipe-feedback--right';
      feedbackRight.setAttribute('aria-hidden', 'true');
      feedbackRight.textContent = opts.rightLabel;
      el.appendChild(feedbackRight);
    }

    let touchStartX = null, touchStartY = null, touchCurrentX = null, swiping = false;

    function _onTouchStart(e) {
      // Multi-Touch ignorieren
      if (e.touches && e.touches.length > 1) {
        touchStartX = null;
        return;
      }
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchCurrentX = t.clientX;
      swiping = false;
    }

    function _onTouchMove(e) {
      if (touchStartX == null) return;
      if (e.touches && e.touches.length > 1) {
        _resetSwipe();
        return;
      }
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchCurrentX = t.clientX;
      const dx = touchCurrentX - touchStartX;
      const dy = t.clientY - touchStartY;

      // Horizontal-vs-Vertical-Aspect-Check
      // Wenn Vertical > Horizontal/aspectRatio → ist scroll, kein Swipe
      if (Math.abs(dy) * opts.aspectRatio > Math.abs(dx)) {
        _resetSwipe();
        return;
      }

      swiping = true;

      // Visuelles Feedback
      if (opts.showFeedback) {
        if (dx < 0 && feedbackLeft) {
          feedbackLeft.classList.add('prova-swipe-feedback--visible');
          feedbackLeft.style.opacity = Math.min(1, Math.abs(dx) / opts.threshold);
        } else if (dx > 0 && feedbackRight) {
          feedbackRight.classList.add('prova-swipe-feedback--visible');
          feedbackRight.style.opacity = Math.min(1, dx / opts.threshold);
        }
      }
    }

    function _onTouchEnd() {
      if (touchStartX == null || !swiping) {
        _resetSwipe();
        return;
      }
      const dx = (touchCurrentX || 0) - (touchStartX || 0);

      if (dx <= -opts.threshold && opts.onSwipeLeft) {
        try { opts.onSwipeLeft(el); } catch (e) { console.warn('[ProvaSwipe] onSwipeLeft error', e); }
      } else if (dx >= opts.threshold && opts.onSwipeRight) {
        try { opts.onSwipeRight(el); } catch (e) { console.warn('[ProvaSwipe] onSwipeRight error', e); }
      }

      _resetSwipe();
    }

    function _resetSwipe() {
      touchStartX = null;
      touchStartY = null;
      touchCurrentX = null;
      swiping = false;
      if (feedbackLeft) {
        feedbackLeft.classList.remove('prova-swipe-feedback--visible');
        feedbackLeft.style.opacity = '';
      }
      if (feedbackRight) {
        feedbackRight.classList.remove('prova-swipe-feedback--visible');
        feedbackRight.style.opacity = '';
      }
    }

    el.addEventListener('touchstart', _onTouchStart, { passive: true });
    el.addEventListener('touchmove', _onTouchMove, { passive: true });
    el.addEventListener('touchend', _onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', _onTouchEnd, { passive: true });

    _state.set(el, {
      handlers: { _onTouchStart, _onTouchMove, _onTouchEnd },
      feedbackLeft, feedbackRight
    });
  }

  function unbind(el) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    const state = _state.get(el);
    if (!state) return;

    const h = state.handlers;
    el.removeEventListener('touchstart', h._onTouchStart);
    el.removeEventListener('touchmove', h._onTouchMove);
    el.removeEventListener('touchend', h._onTouchEnd);
    el.removeEventListener('touchcancel', h._onTouchEnd);

    if (state.feedbackLeft && state.feedbackLeft.parentNode) state.feedbackLeft.parentNode.removeChild(state.feedbackLeft);
    if (state.feedbackRight && state.feedbackRight.parentNode) state.feedbackRight.parentNode.removeChild(state.feedbackRight);

    el.classList.remove('prova-swipe-target');
    _state.delete(el);
  }

  window.ProvaSwipe = { bind: bind, unbind: unbind };
  window.ProvaSwipe._test = { DEFAULTS };
})();
