/* ════════════════════════════════════════════════════════════════════
   PROVA Legacy-Bridge Cookie-Sync — MEGA⁸³ Phase C
   ════════════════════════════════════════════════════════════════════
   Problem: Cross-Subdomain-Doppel-Login.
   - Supabase-Auth-Token wird via lib/supabase-client.js Cookie-first
     auf .prova-systems.de gespeichert (Cross-Domain ok seit MEGA39).
   - ABER: Legacy-Bridge-Keys (prova_auth_token, prova_sv_email, prova_user)
     werden in app-login-logic.js + auth-guard.js per localStorage gesetzt.
     localStorage ist origin-bound → auf app.prova-systems.de leer →
     Pre-Check in HTML-Pages redirected zu Login.

   Fix: Beim Schreiben dieser Keys ZUSÄTZLICH als Cookie auf
   .prova-systems.de setzen. Beim Page-Load Hydration: Cookie → localStorage.

   Anwendung:
     window.ProvaLegacyBridge.set('prova_auth_token', token)
     window.ProvaLegacyBridge.hydrate()  // Bootstrap am Page-Load
     window.ProvaLegacyBridge.clear()    // bei Logout
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // Bridge-Keys die Cross-Subdomain synchronisiert werden müssen
  var BRIDGE_KEYS = [
    'prova_auth_token',
    'prova_sv_email',
    'prova_user',
    'prova_paket',
    'prova_workspace_id'
  ];

  function getCookieDomain(){
    if (typeof location === 'undefined') return null;
    var h = location.hostname || '';
    if (/(^|\.)prova-systems\.de$/.test(h)) return '.prova-systems.de';
    return null;  // localhost/preview → kein Cross-Domain-Cookie
  }

  function setCookie(key, value){
    var domain = getCookieDomain();
    if (!domain || typeof document === 'undefined') return;
    var expires = new Date(Date.now() + 30 * 86400 * 1000).toUTCString();
    var isSecure = location.protocol === 'https:';
    document.cookie = key + '=' + encodeURIComponent(value)
      + ';expires=' + expires
      + ';domain=' + domain
      + ';path=/'
      + ';SameSite=Lax'
      + (isSecure ? ';Secure' : '');
  }

  function getCookie(key){
    if (typeof document === 'undefined') return null;
    var safe = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + safe + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function removeCookie(key){
    var domain = getCookieDomain();
    if (!domain || typeof document === 'undefined') return;
    document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=' + domain + ';path=/';
  }

  /**
   * Setze einen Bridge-Key in localStorage + Cross-Domain-Cookie.
   */
  function set(key, value){
    if (value == null) { clear(key); return; }
    try { localStorage.setItem(key, value); } catch(_){}
    if (BRIDGE_KEYS.indexOf(key) >= 0) setCookie(key, value);
  }

  /**
   * Lese — localStorage zuerst (origin-bound, schnellster), dann Cookie-Fallback.
   */
  function get(key){
    try {
      var ls = localStorage.getItem(key);
      if (ls != null) return ls;
    } catch(_){}
    return getCookie(key);
  }

  /**
   * Entferne aus localStorage + Cookie.
   */
  function clear(key){
    if (key) {
      try { localStorage.removeItem(key); } catch(_){}
      if (BRIDGE_KEYS.indexOf(key) >= 0) removeCookie(key);
      return;
    }
    BRIDGE_KEYS.forEach(function(k){
      try { localStorage.removeItem(k); } catch(_){}
      removeCookie(k);
    });
  }

  /**
   * Hydration-Bootstrap: Bei Page-Load auf neuer Subdomain die Bridge-Keys
   * aus Cookies (Cross-Domain) in localStorage (origin-bound) kopieren.
   * Damit funktionieren existierende Pre-Checks die localStorage lesen
   * ohne Code-Änderung.
   */
  function hydrate(){
    var hydrated = 0;
    BRIDGE_KEYS.forEach(function(key){
      try {
        var ls = localStorage.getItem(key);
        if (ls) return;  // localStorage hat schon Wert, kein Hydration nötig
        var ck = getCookie(key);
        if (ck) {
          localStorage.setItem(key, ck);
          hydrated++;
        }
      } catch(_){}
    });
    if (hydrated > 0) {
      try { console.log('[ProvaLegacyBridge] hydrated', hydrated, 'keys from cookie on', location.hostname); } catch(_){}
    } else {
      // MEGA86 A.1 Diagnostik: sichtbar machen wenn Bridge LEER ist
      try { console.log('[ProvaLegacyBridge] hydrate: 0 cookies found on', location.hostname, '(cookieDomain=', getCookieDomain() || 'NONE', ')'); } catch(_){}
    }
    return hydrated;
  }

  window.ProvaLegacyBridge = { set: set, get: get, clear: clear, hydrate: hydrate, BRIDGE_KEYS: BRIDGE_KEYS };

  // Auto-Hydration: läuft sofort beim Script-Load (synchron, vor Pre-Checks).
  hydrate();
})();
