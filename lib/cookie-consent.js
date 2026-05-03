/**
 * PROVA Systems — Cookie-Consent-Banner v1.0
 * MEGA⁷ U4 (04.05.2026)
 *
 * Note: PROVA setzt KEINE Marketing-Cookies / Tracking-Cookies.
 * Dieser Banner ist trotzdem DSGVO-best-practice + nutzer-transparent.
 *
 * Was wird wirklich gespeichert (functional, kein Consent-Bedarf):
 *  - prova_user (Auth-Session-Email)
 *  - prova_sv_email (display-name)
 *  - prova_jwt-Token (HttpOnly-Cookie)
 *  - prova_consent (DIESER Banner-Status)
 *  - localStorage Drafts (Auto-Save)
 *
 * Daher: minimal "OK"-Banner statt komplexer Granular-Settings.
 *
 * Public API:
 *   ProvaCookieConsent.init()  — auto-shows banner if no consent
 *   ProvaCookieConsent.reset() — clears consent (for /datenschutz Widerruf)
 */
'use strict';

(function () {
  const CONSENT_KEY = 'prova_consent_v1';

  function hasConsent() {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      return v === '1';
    } catch (e) { return false; }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value ? '1' : '0');
      localStorage.setItem(CONSENT_KEY + '_ts', new Date().toISOString());
    } catch (e) {}
  }

  function buildBanner() {
    const div = document.createElement('div');
    div.id = 'prova-cookie-banner';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', 'Cookie-Hinweis');
    div.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0',
      'background:#1c2537', 'color:#e8eaf0',
      'border-top:1px solid rgba(255,255,255,0.12)',
      'padding:16px 20px',
      'z-index:9998',
      'box-shadow:0 -4px 20px rgba(0,0,0,0.3)',
      'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      'font-size:13px',
      'line-height:1.55',
      'transform:translateY(100%)',
      'transition:transform 0.4s cubic-bezier(.4,0,.2,1)'
    ].join(';');

    div.innerHTML = (
      '<div style="max-width:960px;margin:0 auto;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">'
        + '<div style="flex:1 1 320px;min-width:0">'
          + '<strong style="color:#e8eaf0;display:block;margin-bottom:4px">🍪 Funktionale Cookies</strong>'
          + 'PROVA nutzt nur funktional notwendige Cookies und localStorage fuer Login-Sessions, '
          + 'Auto-Save und diesen Hinweis. <strong>Keine Tracking-Cookies, kein Google Analytics, kein Facebook Pixel.</strong> '
          + 'Mehr in der <a href="/datenschutz.html" style="color:#4f8ef7;text-decoration:underline">Datenschutzerklärung</a>.'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
          + '<a href="/datenschutz.html" style="padding:9px 18px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#aab4cb;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Details</a>'
          + '<button id="prova-consent-ok" style="padding:9px 22px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Verstanden</button>'
        + '</div>'
      + '</div>'
    );
    return div;
  }

  function show() {
    if (document.getElementById('prova-cookie-banner')) return;
    const banner = buildBanner();
    document.body.appendChild(banner);
    requestAnimationFrame(() => { banner.style.transform = 'translateY(0)'; });
    document.getElementById('prova-consent-ok').addEventListener('click', () => {
      setConsent(true);
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 400);
    });
  }

  function init() {
    if (hasConsent()) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', show);
    } else {
      show();
    }
  }

  function reset() {
    try {
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(CONSENT_KEY + '_ts');
    } catch (e) {}
  }

  window.ProvaCookieConsent = { init: init, reset: reset, hasConsent: hasConsent };

  // Auto-init wenn auf nicht-internen Pages
  // (Login + App-Pages: kein Banner — User ist eh angemeldet, hat Datenschutzerklaerung schon akzeptiert)
  if (typeof document !== 'undefined') {
    const path = window.location.pathname;
    const isPublicPage = path === '/' || path === '/index.html' ||
                         path === '/pilot.html' || path === '/pricing.html' ||
                         path === '/datenschutz.html' || path === '/agb.html' ||
                         path === '/impressum.html' || path === '/avv.html';
    if (isPublicPage) init();
  }
})();
