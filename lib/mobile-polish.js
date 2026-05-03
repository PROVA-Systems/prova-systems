/**
 * PROVA Systems · MOBILE-POLISH v1.0 (MEGA⁴ Q3)
 * Mobile-Features: Lazy-Loading-Polyfill, Offline-Detection, Pull-to-Refresh,
 *                  Touch-Gestures, Camera-API-Helpers, Geolocation-Helpers
 *
 * Wird automatisch beim Laden initialisiert. Kein Init-Call nötig.
 */
'use strict';

(function () {
  // ── 1. Lazy-Loading-Polyfill (für ältere Browser ohne native loading="lazy") ──
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy-loading. Trotzdem data-loaded Attribut für CSS-Fade-In.
      document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
        if (img.complete) {
          img.setAttribute('data-loaded', '1');
        } else {
          img.addEventListener('load', function () {
            img.setAttribute('data-loaded', '1');
          }, { once: true });
        }
      });
      return;
    }
    // IntersectionObserver-Polyfill
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        if (img.dataset.src) { img.src = img.dataset.src; }
        img.setAttribute('data-loaded', '1');
        observer.unobserve(img);
      });
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      observer.observe(img);
    });
  }

  // ── 2. Offline-Detection-Banner ──
  function initOfflineBanner() {
    var banner = null;
    function ensureBanner() {
      if (banner) return banner;
      banner = document.createElement('div');
      banner.className = 'prova-offline-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.textContent = '⚠ Offline — Änderungen werden nach erneuter Verbindung synchronisiert.';
      document.body.appendChild(banner);
      return banner;
    }
    function update() {
      var b = ensureBanner();
      if (!navigator.onLine) {
        b.classList.add('visible');
      } else {
        b.classList.remove('visible');
      }
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (!navigator.onLine) update();
  }

  // ── 3. Pull-to-Refresh Helper (opt-in via Klasse .pull-to-refresh-active) ──
  function initPullToRefresh() {
    var container = document.querySelector('.pull-to-refresh-active');
    if (!container) return;
    var startY = 0, currentY = 0, pulling = false;
    var threshold = 80;
    container.addEventListener('touchstart', function (e) {
      if (container.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }, { passive: true });
    container.addEventListener('touchmove', function (e) {
      if (!pulling) return;
      currentY = e.touches[0].clientY;
      var pullDist = currentY - startY;
      if (pullDist > 0) {
        container.style.transform = 'translateY(' + Math.min(pullDist / 2, threshold) + 'px)';
      }
    }, { passive: true });
    container.addEventListener('touchend', function () {
      if (!pulling) return;
      var pullDist = currentY - startY;
      container.style.transition = 'transform 0.3s ease';
      container.style.transform = '';
      if (pullDist > threshold) {
        container.dispatchEvent(new CustomEvent('prova:pull-refresh'));
      }
      setTimeout(function () { container.style.transition = ''; }, 350);
      pulling = false;
    });
  }

  // ── 4. Camera-API Helper (für Foto-Upload Pages) ──
  // Usage: ProvaMobile.openCamera(function (file) { ... }, options)
  function openCamera(callback, opts) {
    opts = opts || {};
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = opts.facingMode === 'user' ? 'user' : 'environment';
    input.style.display = 'none';
    input.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) callback(file);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  // ── 5. Geolocation Helper (Ortstermin-Pages) ──
  // Usage: ProvaMobile.getLocation(function(coords){ ... }, function(err){ ... })
  function getLocation(success, error, opts) {
    opts = Object.assign({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }, opts || {});
    if (!navigator.geolocation) {
      if (error) error(new Error('Geolocation API nicht verfuegbar'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        success({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
      },
      function (err) {
        if (error) error(err);
      },
      opts
    );
  }

  // ── 6. Touch-Gesture: Swipe-to-Action für Liste-Items (opt-in via Klasse) ──
  // Usage: <li class="swipe-action" data-swipe-callback="myFn">...</li>
  function initSwipeActions() {
    document.querySelectorAll('.swipe-action').forEach(function (item) {
      var startX = 0, currentX = 0, swiping = false;
      item.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        swiping = true;
      }, { passive: true });
      item.addEventListener('touchmove', function (e) {
        if (!swiping) return;
        currentX = e.touches[0].clientX;
        var dist = currentX - startX;
        if (Math.abs(dist) > 10) {
          item.style.transform = 'translateX(' + dist + 'px)';
        }
      }, { passive: true });
      item.addEventListener('touchend', function () {
        if (!swiping) return;
        var dist = currentX - startX;
        item.style.transition = 'transform 0.2s ease';
        item.style.transform = '';
        if (Math.abs(dist) > 100) {
          var fn = item.dataset.swipeCallback;
          if (fn && typeof window[fn] === 'function') {
            window[fn](item, dist > 0 ? 'right' : 'left');
          }
          item.dispatchEvent(new CustomEvent('prova:swipe', { detail: { direction: dist > 0 ? 'right' : 'left' } }));
        }
        setTimeout(function () { item.style.transition = ''; }, 220);
        swiping = false;
      });
    });
  }

  // ── 7. Auto-Scroll-to-Active (Mobile-Nav nach Tap) ──
  function initAutoScrollActive() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      // Wenn Mobile-Bottom-Nav, scroll zum Ziel-Anchor
      if (link.closest('.bottom-nav')) {
        var href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          var target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });
  }

  // ── Init ──
  function init() {
    try { initLazyLoading(); } catch (e) { console.warn('[mobile] lazy fail', e); }
    try { initOfflineBanner(); } catch (e) { console.warn('[mobile] offline fail', e); }
    try { initPullToRefresh(); } catch (e) { console.warn('[mobile] ptr fail', e); }
    try { initSwipeActions(); } catch (e) { console.warn('[mobile] swipe fail', e); }
    try { initAutoScrollActive(); } catch (e) { console.warn('[mobile] scroll fail', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  window.ProvaMobile = {
    openCamera: openCamera,
    getLocation: getLocation,
    initSwipeActions: initSwipeActions,
    initLazyLoading: initLazyLoading
  };
})();
