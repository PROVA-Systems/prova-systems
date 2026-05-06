/**
 * PROVA PWA-Install-Prompt
 * MEGA¹¹ W10 (Tier 1, 2026-05-04)
 *
 * Install-Prompt-Banner fuer PWA "Add to Home Screen".
 *
 * Browser-Behavior:
 *   - Chrome/Edge: feuert `beforeinstallprompt`-Event automatisch, wir intercepten
 *   - iOS-Safari: kein Auto-Event, wir zeigen statisches Hint nach 30s + N-Visits
 *   - Firefox: kein Auto-Install, kein Hint
 *
 * USAGE:
 *   <script src="/lib/pwa-install-prompt.js" defer></script>
 *
 *   ProvaPWA.show()         — manuell triggern (z.B. aus Settings)
 *   ProvaPWA.dismiss()      — User dismissed (1 Woche kein Re-Show)
 *   ProvaPWA.canInstall()   — true wenn Browser unterstuetzt
 *
 * Anti-Pattern vermieden:
 *   - Kein eager-Show beim 1. Visit (User-Friendly)
 *   - Show erst nach 3+ Visits AND nicht in letzten 7 Tagen dismissed
 *   - Kein Re-Show wenn User dismissed
 *   - Kein Show wenn schon installiert (display-mode standalone)
 */
'use strict';

(function () {

  const STORAGE_KEY_DISMISSED = 'prova_pwa_dismissed_at';
  const STORAGE_KEY_VISITS = 'prova_pwa_visits';
  const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;  // 7 Tage
  const MIN_VISITS = 3;

  let _deferredPrompt = null;
  let _bannerEl = null;

  // ─── Install-State-Detection ─────────────────────────────────────────
  function isInstalled() {
    // PWA-Display-Modes laut Spec:
    //   standalone | minimal-ui | fullscreen → installed
    //   browser → not installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator.standalone === true) return true;  // iOS-Safari Legacy-Flag
    return false;
  }

  function isIOS() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  }

  function wasDismissedRecently() {
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (!dismissedAt) return false;
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      return elapsed < DISMISS_COOLDOWN_MS;
    } catch (_) { return false; }
  }

  function incrementVisits() {
    try {
      const current = parseInt(localStorage.getItem(STORAGE_KEY_VISITS) || '0', 10);
      localStorage.setItem(STORAGE_KEY_VISITS, String(current + 1));
      return current + 1;
    } catch (_) { return 0; }
  }

  function getVisits() {
    try { return parseInt(localStorage.getItem(STORAGE_KEY_VISITS) || '0', 10); }
    catch (_) { return 0; }
  }

  // ─── Banner-UI ───────────────────────────────────────────────────────
  function buildBanner() {
    if (_bannerEl) return _bannerEl;

    const div = document.createElement('div');
    div.id = 'prova-pwa-banner';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', 'PROVA als App installieren');
    div.style.cssText = [
      'position:fixed', 'bottom:16px', 'left:16px', 'right:16px',
      'max-width:480px', 'margin:0 auto',
      'background:linear-gradient(135deg,#1c2537,#0f1729)',
      'color:#e8eaf0',
      'border:1px solid rgba(79,142,247,.35)',
      'border-radius:14px',
      'padding:16px 18px',
      'box-shadow:0 12px 40px rgba(0,0,0,.4)',
      'z-index:9700',
      'display:flex', 'flex-direction:column', 'gap:10px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    ].join(';');

    const isiOS = isIOS();
    const title = isiOS ? '📲 PROVA als App auf dem Home-Bildschirm' : '📲 PROVA installieren';
    const text = isiOS
      ? 'In Safari: Teilen-Symbol antippen → "Zum Home-Bildschirm" — funktioniert wie eine echte App.'
      : 'Installiere PROVA als App fuer schnelleren Zugriff und Offline-Funktionen.';

    div.innerHTML =
      '<div style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px;">' +
        '<span aria-hidden="true">' + (isiOS ? '🍎' : '⚡') + '</span>' +
        '<span>' + title + '</span>' +
      '</div>' +
      '<div style="font-size:12px;color:#aab4cb;line-height:1.5;">' + text + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:4px;">' +
        (isiOS ? '' :
          '<button id="prova-pwa-install" style="background:#4f8ef7;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;">Installieren</button>') +
        '<button id="prova-pwa-dismiss" style="background:transparent;color:#aab4cb;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;">' +
          (isiOS ? 'Verstanden' : 'Spaeter') +
        '</button>' +
      '</div>';

    document.body.appendChild(div);
    _bannerEl = div;

    // Event-Wiring
    const installBtn = document.getElementById('prova-pwa-install');
    if (installBtn) {
      installBtn.addEventListener('click', _handleInstallClick);
    }
    const dismissBtn = document.getElementById('prova-pwa-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', dismiss);
    }

    return div;
  }

  function _removeBanner() {
    if (_bannerEl && _bannerEl.parentNode) {
      _bannerEl.parentNode.removeChild(_bannerEl);
      _bannerEl = null;
    }
  }

  // ─── Install-Flow ────────────────────────────────────────────────────
  async function _handleInstallClick() {
    if (!_deferredPrompt) {
      console.warn('[ProvaPWA] no deferredPrompt available');
      return;
    }
    _deferredPrompt.prompt();
    const choice = await _deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('[ProvaPWA] installed');
    }
    _deferredPrompt = null;
    _removeBanner();
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
    } catch (_) {}
    _removeBanner();
  }

  function canInstall() {
    return _deferredPrompt !== null || isIOS();
  }

  function show() {
    if (isInstalled()) return;
    if (!canInstall()) return;
    buildBanner();
  }

  // ─── Auto-Show-Decision ──────────────────────────────────────────────
  function _maybeShow() {
    if (isInstalled()) return;
    if (wasDismissedRecently()) return;

    const visits = getVisits();
    if (visits < MIN_VISITS) return;

    // iOS: kein deferredPrompt-Event, aber wir koennen statisches Hint zeigen
    if (isIOS() || _deferredPrompt) {
      // Verzoegert (nicht sofort beim ersten Pageload-Tick)
      setTimeout(show, 5000);
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────
  // Browser-Event abfangen (Chrome/Edge)
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    _maybeShow();
  });

  // Installed-Event (Chrome)
  window.addEventListener('appinstalled', function () {
    console.log('[ProvaPWA] app installed');
    _removeBanner();
  });

  // Page-Load: visit count + maybe-show fuer iOS
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      incrementVisits();
      _maybeShow();
    });
  } else {
    incrementVisits();
    _maybeShow();
  }

  // Public API
  window.ProvaPWA = {
    show: show,
    dismiss: dismiss,
    canInstall: canInstall,
    isInstalled: isInstalled,
    isIOS: isIOS
  };

  // Test-Exports
  window.ProvaPWA._test = {
    STORAGE_KEY_DISMISSED, STORAGE_KEY_VISITS,
    DISMISS_COOLDOWN_MS, MIN_VISITS,
    incrementVisits, getVisits, wasDismissedRecently,
    resetForTesting: function () {
      try {
        localStorage.removeItem(STORAGE_KEY_DISMISSED);
        localStorage.removeItem(STORAGE_KEY_VISITS);
      } catch (_) {}
      _deferredPrompt = null;
      _removeBanner();
    }
  };
})();
