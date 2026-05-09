/* ============================================================
   PROVA Netlify-Identity-Polyfill (MEGA⁴⁶)

   Frontend-Legacy-Code referenziert window.netlifyIdentity.currentUser()
   in 8+ Files (nav.js, push-optin.js, lib/editor-tiptap.js,
   lib/editor-spell-layer.js, lib/docx-export.js, lib/import-assistent-supabase.js,
   prova-auth-api.js, vor-ort-logic.js, account-gesperrt.html).

   Statt 8 Files einzeln zu patchen: hier ein Polyfill der das alte API
   erfüllt aber Daten aus Supabase Auth bzw. localStorage holt. Jeder
   netlifyIdentity-Call funktioniert weiter, ohne CSP-Violation und ohne
   das Original-Widget zu laden.

   API-Surface (was Legacy-Code benutzt):
     netlifyIdentity.currentUser()  → { email, user_metadata, ... } | null
     netlifyIdentity.logout()       → ruft supabase.auth.signOut() + räumt localStorage
     netlifyIdentity.signup(opts)   → forward zu supabase.auth.signUp
     netlifyIdentity.open(mode)     → no-op (App nutzt eigenes Login-Modal)
     netlifyIdentity.init()         → no-op
     netlifyIdentity.on(event, fn)  → no-op (für 'init', 'login', 'error')

   Pflicht-Pattern in HTML (Reihenfolge):
     <script src="lib/prova-config.js"></script>
     <script src="lib/edge-shim.js"></script>
     <script src="lib/netlify-identity-polyfill.js"></script>
     <script type="module" src="lib/supabase-client.js"></script>

   Deaktivieren: window.PROVA_NI_POLYFILL_DISABLED = true.
   ============================================================ */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;
    if (window.PROVA_NI_POLYFILL_DISABLED) return;

    // Falls echtes Identity-Widget doch noch geladen werden sollte (z.B.
    // wenn jemand das Script-Tag wieder einbaut), nicht überschreiben.
    if (window.netlifyIdentity && window.netlifyIdentity.__isPolyfill !== true && typeof window.netlifyIdentity.gotrue !== 'undefined') {
        return;
    }

    function readEmailFromStorage() {
        try {
            // 1. Supabase-Auth localStorage (storageKey: 'prova-auth-token')
            //    JSON-Form: { access_token, refresh_token, user: { email, ... }, ... }
            const keys = ['prova-auth-token', 'sb-cngteblrbpwsyypexjrv-auth-token'];
            for (const k of keys) {
                const raw = localStorage.getItem(k);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                if (parsed && parsed.user && parsed.user.email) return parsed.user.email;
                if (parsed && parsed.currentSession && parsed.currentSession.user) {
                    return parsed.currentSession.user.email;
                }
            }
            // 2. Legacy prova_sv_email
            const legacy = localStorage.getItem('prova_sv_email');
            if (legacy) return legacy;
            // 3. prova_user JSON
            const userRaw = localStorage.getItem('prova_user');
            if (userRaw) {
                const u = JSON.parse(userRaw);
                if (u && u.email) return u.email;
            }
        } catch (_) {}
        return null;
    }

    function readUserFromStorage() {
        const email = readEmailFromStorage();
        if (!email) return null;
        // Gleiche Shape wie Netlify-Identity-User
        return {
            email: email,
            id: email,                              // legacy code only reads .email
            app_metadata: {},
            user_metadata: {
                full_name: localStorage.getItem('prova_sv_vorname') ?
                    [localStorage.getItem('prova_sv_vorname'), localStorage.getItem('prova_sv_nachname')]
                        .filter(Boolean).join(' ').trim() : email.split('@')[0]
            },
            // Legacy-Methoden die manche Caller benutzen
            jwt: function () {
                return localStorage.getItem('prova_auth_token') || null;
            },
            getToken: function () {
                return Promise.resolve(localStorage.getItem('prova_auth_token') || null);
            }
        };
    }

    async function logout() {
        try {
            const sbModule = await import('/lib/supabase-client.js');
            const supabase = sbModule.supabase || sbModule.getSupabase();
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[ni-polyfill] supabase signOut failed:', e && e.message);
        }
        try {
            ['prova_auth_token', 'prova_user', 'prova_sv_email',
             'prova_paket', 'prova_status', 'prova_subscription_status',
             'prova_trial_end', 'prova_testpilot', 'prova_sv_vorname',
             'prova_sv_nachname', 'prova_at_sv_record_id'].forEach(function (k) {
                try { localStorage.removeItem(k); } catch (_) {}
            });
            try { sessionStorage.removeItem('prova_email'); } catch (_) {}
        } catch (_) {}
    }

    async function signup(opts) {
        const sbModule = await import('/lib/supabase-client.js');
        const supabase = sbModule.supabase || sbModule.getSupabase();
        const result = await supabase.auth.signUp({
            email: opts.email,
            password: opts.password,
            options: { data: opts.data || {} }
        });
        if (result.error) throw new Error(result.error.message);
        return result.data;
    }

    const polyfill = {
        __isPolyfill: true,
        currentUser: function () { return readUserFromStorage(); },
        logout: function () { return logout(); },
        signup: function (opts) { return signup(opts); },
        open: function (_mode) {
            console.warn('[ni-polyfill] netlifyIdentity.open() ist no-op — Login geht über app-login.html / auth-supabase.html');
        },
        init: function () { /* no-op */ },
        on: function (_event, _fn) { /* no-op — 'init', 'login', 'error' werden nicht emittiert */ },
        off: function () { /* no-op */ },
        store: { user: null },                      // einige Callsites lesen das
        gotrue: null                                // Marker dass dies kein echtes Widget ist
    };

    window.netlifyIdentity = polyfill;
    console.debug('[ni-polyfill] active — netlifyIdentity API umgeleitet auf Supabase Auth');
})();
