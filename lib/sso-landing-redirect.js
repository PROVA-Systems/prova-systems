/* ============================================================
   PROVA SSO-Landing-Redirect (MEGA⁴⁷)

   Auf prova-systems.de (Landing): wenn User bereits eingeloggt
   auf app.prova-systems.de (Cookie .prova-systems.de),
   verwandelt diesen Anmelden-Link in einen "Zum Dashboard"-Link.

   Vermeidet "Doppel-Login" Symptom: User klickt Anmelden, sieht
   schon eingeloggt-Variante, klickt Dashboard → direkt rein.

   Pflicht-Pattern in index.html (am Ende des <body>):
     <script src="/lib/sso-landing-redirect.js" defer></script>

   Detection-Source: Cookie 'prova-auth-token' (Cross-Domain)
                  ODER localStorage 'prova_auth_token'
   ============================================================ */
(function () {
    'use strict';
    if (typeof document === 'undefined') return;

    function _hasValidSession() {
        // 1. Cross-Domain Cookie check (gesetzt durch supabase-client.js
        //    crossDomainStorage auf .prova-systems.de)
        try {
            const cookies = document.cookie || '';
            if (/(?:^|;\s*)prova-auth-token=/.test(cookies)) {
                // Quick heuristic: cookie value is JSON with access_token + expires_at
                const m = cookies.match(/(?:^|;\s*)prova-auth-token=([^;]+)/);
                if (m) {
                    try {
                        const parsed = JSON.parse(decodeURIComponent(m[1]));
                        if (parsed && parsed.access_token && parsed.expires_at) {
                            const expMs = parsed.expires_at * 1000;
                            if (expMs > Date.now()) return true;
                        }
                    } catch (_) { /* parse fail — fallthrough */ }
                }
            }
        } catch (_) {}
        // 2. localStorage fallback (legacy prova_auth_token)
        try {
            const t = localStorage.getItem('prova_auth_token');
            if (t && t.length > 30) return true;
        } catch (_) {}
        return false;
    }

    function _patchLoginLinks() {
        if (!_hasValidSession()) return;
        // Suche alle Anmelden-Links auf der Landing-Page
        const selectors = [
            'a[href*="app-login.html"]',
            'a[href*="/login"]',
            'a[href*="auth-supabase.html"]'
        ];
        const seen = new Set();
        selectors.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (a) {
                if (seen.has(a)) return;
                seen.add(a);
                const txt = (a.textContent || '').toLowerCase();
                if (txt.indexOf('anmelden') === -1 &&
                    txt.indexOf('einloggen') === -1 &&
                    txt.indexOf('login') === -1) return;
                a.href = 'https://app.prova-systems.de/dashboard.html';
                a.textContent = 'Zum Dashboard →';
                a.setAttribute('data-sso-patched', '1');
            });
        });
        // Trial-CTA kann auch direkt zu Dashboard
        document.querySelectorAll('a[href*="next=/pricing"]').forEach(function (a) {
            const txt = (a.textContent || '').toLowerCase();
            if (txt.indexOf('trial') !== -1 || txt.indexOf('starten') !== -1) {
                // Trial-Starter sind eingeloggt → schicke zu pricing direkt
                a.href = 'https://app.prova-systems.de/pricing.html';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _patchLoginLinks);
    } else {
        _patchLoginLinks();
    }
})();
