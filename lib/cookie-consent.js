/**
 * lib/cookie-consent.js — MEGA³⁴ A1 DSGVO-Granular Cookie-Consent v2.0
 *
 * Compliance: § 25 TTDSG + DSGVO Art. 7 + EuGH "Planet49" (C-673/17)
 * - KEINE Pre-Selection außer 'necessary'
 * - 3 Buttons gleichberechtigt (Akzeptieren / Nur notwendige / Auswahl speichern)
 * - Granular: necessary / analytics / marketing
 * - 13-Monate-Re-Show (DSK-Empfehlung)
 * - Audit-Trail via /.netlify/functions/cookie-consent-log (idempotent + fail-silent)
 *
 * Public API:
 *   ProvaCookieConsent.init()           — Auto-Init (legacy-name)
 *   ProvaCookieConsent.show()           — Modal anzeigen
 *   ProvaCookieConsent.getConsent()     — { necessary, analytics, marketing, ts }
 *   ProvaCookieConsent.hasConsent()     — boolean (mit 13-Monate-Check)
 *   ProvaCookieConsent.hasDecided()     — alias für hasConsent
 *   ProvaCookieConsent.acceptAll()
 *   ProvaCookieConsent.acceptNecessary()
 *   ProvaCookieConsent.saveCustom({analytics, marketing})
 *   ProvaCookieConsent.revoke()         — Reset + Modal kann erneut zeigen
 *   ProvaCookieConsent.reset()          — alias für revoke
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProvaCookieConsent = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  const STORAGE_KEY = 'prova_cookie_consent';
  const STORAGE_TS_KEY = 'prova_cookie_consent_ts';
  const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ≈ 13 Monate (DSK-Empfehlung)
  const DEFAULT_CONSENT = { necessary: true, analytics: false, marketing: false };

  function readConsent() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const ts = localStorage.getItem(STORAGE_TS_KEY);
      if (ts) {
        const age = Date.now() - new Date(ts).getTime();
        if (!isNaN(age) && age > MAX_AGE_MS) {
          // 13 Monate abgelaufen — Re-Show pflicht
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_TS_KEY);
          return null;
        }
      }
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function writeConsent(consent) {
    if (typeof localStorage === 'undefined') return null;
    const ts = new Date().toISOString();
    const payload = Object.assign({}, DEFAULT_CONSENT, consent, { ts: ts });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(STORAGE_TS_KEY, ts);
    } catch (e) {}
    // Audit-Trail (fail-silent — Lambda muss nicht existieren)
    try {
      if (typeof fetch === 'function' && typeof location !== 'undefined') {
        fetch('/.netlify/functions/cookie-consent-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent: payload, page: location.pathname })
        }).catch(() => {});
      }
    } catch (e) {}
    return payload;
  }

  function getConsent() { return readConsent() || Object.assign({}, DEFAULT_CONSENT); }
  function hasConsent() { return !!readConsent(); }
  function hasDecided() { return hasConsent(); }

  function acceptAll() {
    return writeConsent({ necessary: true, analytics: true, marketing: true });
  }

  function acceptNecessary() {
    return writeConsent({ necessary: true, analytics: false, marketing: false });
  }

  function saveCustom(opts) {
    return writeConsent({
      necessary: true,
      analytics: !!(opts && opts.analytics),
      marketing: !!(opts && opts.marketing)
    });
  }

  function revoke() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TS_KEY);
    } catch (e) {}
  }

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('cc-styles')) return;
    const s = document.createElement('style');
    s.id = 'cc-styles';
    s.textContent = `
      .cc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99998;display:flex;align-items:flex-end;justify-content:center;padding:0;backdrop-filter:blur(4px);}
      .cc-modal{background:#1c2130;border-top:3px solid #4f8ef7;border-radius:14px 14px 0 0;padding:28px;max-width:760px;width:100%;color:#eaecf4;font-family:'DM Sans',system-ui,sans-serif;max-height:88vh;overflow-y:auto;}
      .cc-modal h2{font-size:20px;font-weight:800;margin-bottom:8px;}
      .cc-modal .cc-law{font-size:11px;color:#4f8ef7;font-family:ui-monospace,monospace;margin-bottom:14px;}
      .cc-modal p{font-size:13px;color:#8b93ab;line-height:1.6;margin-bottom:16px;}
      .cc-modal a{color:#4f8ef7;text-decoration:underline;}
      .cc-cat{padding:12px 14px;background:#0b0d11;border:1px solid rgba(255,255,255,.08);border-radius:8px;margin:8px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;}
      .cc-cat-title{font-size:13px;font-weight:700;}
      .cc-cat-desc{font-size:11px;color:#8b93ab;margin-top:2px;}
      .cc-cat input[type=checkbox]{margin-top:4px;}
      .cc-cat input[type=checkbox]:disabled{opacity:.5;}
      .cc-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;}
      .cc-btn{padding:12px 22px;background:#1c2130;border:1px solid rgba(255,255,255,.13);color:#eaecf4;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit;min-height:44px;flex:1;min-width:140px;}
      .cc-btn-primary{background:linear-gradient(135deg,#4f8ef7,#3a7be0);border-color:#4f8ef7;color:#fff;font-weight:700;}
      .cc-btn-secondary{background:#10b981;border-color:#10b981;color:#fff;font-weight:700;}
    `;
    document.head.appendChild(s);
  }

  function show() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('cc-modal-root')) return;
    ensureStyles();
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.id = 'cc-modal-root';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cc-title');
    overlay.innerHTML = ''
      + '<div class="cc-modal">'
      + '  <h2 id="cc-title">🍪 Cookies & Datenschutz</h2>'
      + '  <div class="cc-law">§ 25 TTDSG · DSGVO Art. 7 · EuGH C-673/17 "Planet49"</div>'
      + '  <p>Wir verwenden Cookies, um die Web-App zu betreiben und (optional) die Nutzung anonym auszuwerten. '
      + '     <a href="/datenschutz.html" target="_blank">Datenschutz-Erklärung</a> · '
      + '     <a href="/cookie-einstellungen.html" target="_blank">Detail-Einstellungen</a>'
      + '  </p>'
      + '  <div class="cc-cat">'
      + '    <div>'
      + '      <div class="cc-cat-title">Notwendig <span style="color:#10b981;font-size:10px;">(immer aktiv)</span></div>'
      + '      <div class="cc-cat-desc">Login-Session, Cookie-Consent, Tier-Routing. Ohne diese funktioniert die App nicht.</div>'
      + '    </div>'
      + '    <input type="checkbox" id="cc-necessary" checked disabled aria-label="Notwendige Cookies (immer aktiv)">'
      + '  </div>'
      + '  <div class="cc-cat">'
      + '    <div>'
      + '      <div class="cc-cat-title">Analyse</div>'
      + '      <div class="cc-cat-desc">Pseudonyme Nutzungs-Statistiken (Plausible Analytics, EU-Hosting, keine Drittland-Übermittlung).</div>'
      + '    </div>'
      + '    <input type="checkbox" id="cc-analytics" aria-label="Analyse-Cookies">'
      + '  </div>'
      + '  <div class="cc-cat">'
      + '    <div>'
      + '      <div class="cc-cat-title">Marketing</div>'
      + '      <div class="cc-cat-desc">Conversion-Tracking (Stripe). Aktuell nicht aktiv — nur bei Buchung relevant.</div>'
      + '    </div>'
      + '    <input type="checkbox" id="cc-marketing" aria-label="Marketing-Cookies">'
      + '  </div>'
      + '  <div class="cc-actions">'
      + '    <button type="button" class="cc-btn cc-btn-primary" id="cc-accept-all">Alle akzeptieren</button>'
      + '    <button type="button" class="cc-btn" id="cc-only-necessary">Nur notwendige</button>'
      + '    <button type="button" class="cc-btn cc-btn-secondary" id="cc-save-custom">Auswahl speichern</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(overlay);

    function close() { try { overlay.remove(); } catch (e) {} }
    document.getElementById('cc-accept-all').onclick = () => { acceptAll(); close(); };
    document.getElementById('cc-only-necessary').onclick = () => { acceptNecessary(); close(); };
    document.getElementById('cc-save-custom').onclick = () => {
      saveCustom({
        analytics: document.getElementById('cc-analytics').checked,
        marketing: document.getElementById('cc-marketing').checked
      });
      close();
    };
  }

  function init() {
    if (typeof document === 'undefined') return;
    if (hasConsent()) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(show, 300));
    } else {
      setTimeout(show, 300);
    }
  }

  if (typeof window !== 'undefined') {
    init();
  }

  return {
    init,
    show,
    getConsent,
    hasConsent,
    hasDecided,
    acceptAll,
    acceptNecessary,
    saveCustom,
    revoke,
    reset: revoke,
    _internals: { readConsent, writeConsent, STORAGE_KEY, MAX_AGE_MS, DEFAULT_CONSENT }
  };
}));
