/* PROVA — Frontend Sentry-Init (Browser)
 * MEGA-SKALIERUNG M3 (03.05.2026, Sentry-Integration)
 *
 * Initialisiert Sentry-Browser-SDK fuer Error-Tracking + Performance-Monitoring.
 * DSGVO-konform: PII-Filter aktiv, EU-Region (ingest.de.sentry.io), AVV mit Sentry.
 *
 * Ladereihenfolge in HTML (Reihenfolge wichtig!):
 *   <script src="https://browser.sentry-cdn.com/10.51.0/bundle.tracing.min.js"
 *           crossorigin="anonymous"></script>
 *   <script src="/lib/sentry-init.js"></script>
 *
 * Nach Init verfuegbar:
 *   - window.Sentry (offizielle SDK-API)
 *   - window.testSentryError() (manueller Test-Trigger)
 *
 * DSN ist oeffentlich (Sentry-Design — Server akzeptiert nur Events vom konfig-
 * urierten Origin). Daher hardcoded statt aus ENV (Frontend-Static).
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (!window.Sentry || typeof window.Sentry.init !== 'function') {
    // CDN nicht geladen — silent no-op (z.B. CSP-Block oder Network-Issue)
    return;
  }

  // EU-Region Frontend-DSN (Sentry-AVV unterschrieben, Daten bleiben in Frankfurt)
  var FRONTEND_DSN = 'https://d75257bf7764086c4f342d1988846e12@o4511326134534144.ingest.de.sentry.io/4511326272749648';

  try {
    window.Sentry.init({
      dsn: FRONTEND_DSN,
      release: (window.PROVA_BUILD_SHA || 'unknown'),
      environment: (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'development' : 'production',
      tracesSampleRate: 0.1,           // 10% Performance-Monitoring
      replaysSessionSampleRate: 0.0,   // KEIN Session-Replay (DSGVO: SV-Daten + Mandanten-Daten waeren sichtbar)
      replaysOnErrorSampleRate: 0.0,
      sendDefaultPii: false,
      // M3: PII-Filter (DSGVO Art. 25)
      beforeSend: function (event) {
        try {
          if (event.request) {
            if (event.request.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.Authorization;
              delete event.request.headers.cookie;
              delete event.request.headers.Cookie;
            }
            if (event.request.cookies) event.request.cookies = '[redacted]';
          }
          if (event.user) {
            if (event.user.email) event.user.email = '[redacted]';
            if (event.user.ip_address) event.user.ip_address = null;
          }
          // Breadcrumbs: URLs mit Query-Strings (oft Aktenzeichen/Email) clampen
          if (Array.isArray(event.breadcrumbs)) {
            event.breadcrumbs = event.breadcrumbs.map(function (bc) {
              if (bc && bc.data && bc.data.url) {
                try { bc.data.url = String(bc.data.url).split('?')[0]; } catch (e) {}
              }
              return bc;
            });
          }
        } catch (e) { /* never block error reporting */ }
        return event;
      }
    });

    // Workspace-Context (no PII — only ID)
    try {
      var ws = (typeof localStorage !== 'undefined') ? localStorage.getItem('prova_workspace_id') : null;
      if (ws) window.Sentry.setUser({ id: ws });
    } catch (e) {}

    // Manueller Test-Trigger fuer DSGVO-/Funktions-Verifikation
    window.testSentryError = function () {
      try {
        throw new Error('PROVA Sentry-Test (' + new Date().toISOString() + ')');
      } catch (e) {
        window.Sentry.captureException(e);
        return 'Test-Error gesendet — checke Sentry-Dashboard';
      }
    };
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[sentry-init] failed:', e && e.message);
    }
  }
})();
