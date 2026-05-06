/**
 * PROVA Plausible-Analytics-Wrapper
 * MEGA¹¹ W7 (Tier 10, 2026-05-04)
 *
 * Cookieless DSGVO-konforme Analytics via Plausible.io.
 *
 * Plausible ist:
 *   - Cookieless (keine Tracking-Cookies, keine Browser-Fingerprinting)
 *   - DSGVO-konform out-of-the-box (kein Consent-Banner-Pflicht)
 *   - Open-Source + EU-hosted
 *
 * Trotzdem respektieren wir ProvaCookieConsent.hasConsent():
 *   - Wenn Consent-Banner abgelehnt -> kein Tracking
 *   - Wenn Banner noch nicht gezeigt -> kein Tracking (Pre-Consent)
 *   - Wenn Banner accepted -> Page-Views + Goals tracking
 *
 * Public API:
 *   Plausible.init(domain)         — initialisiert Plausible-Script + auto-page-view
 *   Plausible.trackPageview()      — manueller Pageview (z.B. SPA-Navigation)
 *   Plausible.trackGoal(name, props?) — Custom Event mit optional Custom-Props
 *   Plausible.optOut()             — User-Opt-Out (localStorage-Flag)
 *   Plausible.isEnabled()          — true wenn Tracking aktiv
 *
 * USAGE:
 *   <script src="/lib/analytics-plausible.js" defer></script>
 *   <script>Plausible.init('prova-systems.de');</script>
 *
 *   Plausible.trackGoal('Trial-Signup', { plan: 'solo' });
 *   Plausible.trackGoal('Pricing-Click');
 *
 * Anti-Pattern vermieden:
 *   - Kein eager-Tracking ohne Consent-Check
 *   - Kein localStorage-Bloat (nur Opt-Out-Flag)
 *   - Kein Hard-Failure wenn Plausible-Script geblockt (Adblocker)
 *   - Kein Personal-Data in Custom-Props (nur Aggregat-Daten)
 *   - Kein Auto-Init im Footer-Pattern (eager könnte vor consent feuern)
 */
'use strict';

(function () {

  const PLAUSIBLE_SCRIPT_URL = 'https://plausible.io/js/script.tagged-events.js';
  const OPT_OUT_KEY = 'prova_plausible_optout';
  const DEFAULT_DOMAIN = 'prova-systems.de';

  let _initialized = false;
  let _domain = null;

  // ─── Consent-Check (zentral) ────────────────────────────────────────
  function _hasUserConsent() {
    // 1. User-Opt-Out hat hoechste Prio
    try {
      if (localStorage.getItem(OPT_OUT_KEY) === '1') return false;
    } catch (_) {}

    // 2. Cookie-Consent-Banner respektieren wenn da
    if (window.ProvaCookieConsent && typeof window.ProvaCookieConsent.hasConsent === 'function') {
      return window.ProvaCookieConsent.hasConsent();
    }

    // 3. Default: kein Consent-Banner = kein Tracking
    //    (Marcel-Pflicht: Consent-Banner muss da sein bevor Plausible aktiv)
    return false;
  }

  // ─── Script-Loader (Lazy + Defensive) ────────────────────────────────
  function _loadPlausibleScript(domain) {
    if (document.querySelector('script[data-plausible-loaded]')) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = PLAUSIBLE_SCRIPT_URL;
    script.setAttribute('data-domain', domain);
    script.setAttribute('data-plausible-loaded', 'true');
    script.onerror = () => {
      // Adblocker / Network-Fehler — fail silent, kein User-Impact
      console.info('[Plausible] script blocked or failed to load (likely adblocker)');
    };
    document.head.appendChild(script);
  }

  // ─── Public API ─────────────────────────────────────────────────────

  function init(domain) {
    _domain = domain || DEFAULT_DOMAIN;

    if (_initialized) {
      console.warn('[Plausible] already initialized');
      return;
    }

    if (!_hasUserConsent()) {
      // Defer init — re-check spaeter, falls Consent kommt
      // (z.B. nach Banner-Klick wird init() noch mal aufgerufen)
      return;
    }

    _loadPlausibleScript(_domain);
    _initialized = true;
  }

  function trackPageview() {
    if (!_hasUserConsent()) return;
    if (typeof window.plausible !== 'function') return;  // Script nicht geladen
    try {
      window.plausible('pageview');
    } catch (e) {
      console.warn('[Plausible] trackPageview failed:', e.message);
    }
  }

  function trackGoal(goalName, props) {
    if (!_hasUserConsent()) return;
    if (typeof goalName !== 'string' || !goalName.trim()) {
      console.warn('[Plausible] trackGoal: goalName must be non-empty string');
      return;
    }
    if (typeof window.plausible !== 'function') {
      // Plausible-Script noch nicht geladen — Goal in Queue (Plausible's eigener Mechanismus)
      window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
    }
    try {
      // Plausible-API: plausible('GoalName', { props: {...} })
      const payload = {};
      if (props && typeof props === 'object') {
        // Sanitize props: keine Personal-Data, Strings only, max-length
        const cleanProps = {};
        for (const [k, v] of Object.entries(props)) {
          if (typeof k !== 'string' || k.length > 50) continue;
          // Wert: zu String konvertieren, max 100 Chars
          let strVal = String(v == null ? '' : v).slice(0, 100);
          // Defensive: keine offensichtlichen Personal-Data-Patterns
          // Email-Detection: lokal@domain.tld (Hyphen in Domain ok)
          if (/@[a-z0-9._-]+\.[a-z]{2,}/i.test(strVal)) continue;
          // Telefonnummer (>= 8 Ziffern, optional + Prefix)
          if (/\+?\d{8,}/.test(strVal)) continue;
          cleanProps[k] = strVal;
        }
        if (Object.keys(cleanProps).length > 0) payload.props = cleanProps;
      }
      window.plausible(goalName, payload);
    } catch (e) {
      console.warn('[Plausible] trackGoal failed:', e.message);
    }
  }

  function optOut() {
    try {
      localStorage.setItem(OPT_OUT_KEY, '1');
    } catch (_) {}
    _initialized = false;
  }

  function isEnabled() {
    return _initialized && _hasUserConsent();
  }

  // Re-Init wenn Cookie-Consent NACH init() accepted wurde
  // (z.B. User klickt Banner, dann sollten Goals tracken)
  if (window.addEventListener) {
    window.addEventListener('storage', function (e) {
      // Cookie-Consent setzt prova_consent_v1 — bei Storage-Event re-evaluate
      if (e.key && e.key.indexOf('prova_consent') === 0 && _domain && !_initialized) {
        init(_domain);
      }
    });
  }

  // Public Export
  window.Plausible = {
    init: init,
    trackPageview: trackPageview,
    trackGoal: trackGoal,
    optOut: optOut,
    isEnabled: isEnabled
  };

  // Test-Exports
  window.Plausible._test = {
    hasUserConsent: _hasUserConsent,
    OPT_OUT_KEY: OPT_OUT_KEY,
    PLAUSIBLE_SCRIPT_URL: PLAUSIBLE_SCRIPT_URL,
    resetForTesting: () => { _initialized = false; _domain = null; }
  };
})();
