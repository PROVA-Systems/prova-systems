/* PROVA — Frontend Sentry-Init (MEGA⁴⁹ esm.sh statt CDN)
 *
 * Sentry-Browser-SDK via esm.sh ESM-Bundle (statt browser.sentry-cdn.com).
 * Vorteile:
 *   - kein zusätzlicher 3rd-party-Origin in CSP nötig (esm.sh schon drin)
 *   - DSGVO-konform: PII-Filter aktiv, EU-Region (ingest.de.sentry.io)
 *   - Tree-shaking + minified durch esm.sh
 *
 * Ladereihenfolge in HTML:
 *   <script type="module" src="/lib/sentry-init.js"></script>
 *
 * Nach Init verfuegbar:
 *   - window.Sentry (offizielle SDK-API)
 *   - window.testSentryError() (manueller Test-Trigger)
 */

// EU-Region Frontend-DSN (Sentry-AVV unterschrieben, Daten bleiben in Frankfurt)
const FRONTEND_DSN = 'https://d75257bf7764086c4f342d1988846e12@o4511326134534144.ingest.de.sentry.io/4511326272749648';

(async function () {
    if (typeof window === 'undefined') return;

    let Sentry;
    try {
        // Dynamic ESM-Import via esm.sh (CSP allowt esm.sh bereits)
        Sentry = await import('https://esm.sh/@sentry/browser@9.20.0');
    } catch (e) {
        console.warn('[sentry-init] esm.sh import failed (CSP/Network):', e && e.message);
        return;
    }

    try {
        Sentry.init({
            dsn: FRONTEND_DSN,
            release: window.PROVA_BUILD_SHA || 'unknown',
            environment: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                ? 'development' : 'production',
            tracesSampleRate: 0.1,
            replaysSessionSampleRate: 0.0,    // KEIN Session-Replay (DSGVO)
            replaysOnErrorSampleRate: 0.0,
            sendDefaultPii: false,
            beforeSend(event) {
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
                    if (Array.isArray(event.breadcrumbs)) {
                        event.breadcrumbs = event.breadcrumbs.map(function (bc) {
                            if (bc && bc.data && bc.data.url) {
                                try { bc.data.url = String(bc.data.url).split('?')[0]; } catch (_) {}
                            }
                            return bc;
                        });
                    }
                } catch (_) { /* never block error reporting */ }
                return event;
            }
        });

        // Workspace-Context (no PII)
        try {
            const ws = localStorage.getItem('prova_workspace_id');
            if (ws) Sentry.setUser({ id: ws });
        } catch (_) {}

        // Public-API
        window.Sentry = Sentry;
        window.testSentryError = function () {
            try {
                throw new Error('PROVA Sentry-Test (' + new Date().toISOString() + ')');
            } catch (e) {
                Sentry.captureException(e);
                return 'Test-Error gesendet — checke Sentry-Dashboard';
            }
        };
        console.debug('[sentry-init] active via esm.sh');
    } catch (e) {
        console.warn('[sentry-init] init failed:', e && e.message);
    }
})();
