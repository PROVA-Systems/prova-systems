/* ============================================================
   PROVA Edge-Shim (MEGA⁴⁴ Frontend-Patch)

   Intercepts window.fetch('/.netlify/functions/<name>') and rewrites
   to the corresponding Supabase Edge Function with auto-injected
   JWT Bearer auth from supabase.auth.getSession().

   Pre-pilot strategy: instead of patching 280+ Netlify-Function
   references in HTML/JS files individually, this shim reroutes
   transparently. Each call works whether the underlying handler
   is still on Netlify (legacy) or migrated to Edge.

   Pflicht-Pattern in app-shell HTML:
     <script src="lib/prova-config.js"></script>
     <script type="module" src="lib/supabase-client.js"></script>
     <script src="lib/edge-shim.js"></script>     <- AFTER supabase-client

   Public-page-Pattern (kein supabase-client):
     <script src="lib/prova-config.js"></script>
     <script src="lib/edge-shim.js"></script>

   Deaktivieren via window.PROVA_EDGE_SHIM_DISABLED = true (Debug only).
   ============================================================ */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;
    if (window.PROVA_EDGE_SHIM_DISABLED) return;
    if (window.__provaEdgeShimInstalled) return;
    window.__provaEdgeShimInstalled = true;

    const CFG = window.PROVA_CONFIG || {};
    const SUPABASE_URL = CFG.SUPABASE_URL || 'https://cngteblrbpwsyypexjrv.supabase.co';
    const SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || '';
    const EDGE_BASE = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/';
    const NETLIFY_PREFIX = '/.netlify/functions/';

    // Functions, die NICHT umgeroutet werden sollen (z.B. Netlify-only)
    // MEGA⁷⁵-C: parse-docx ist als Netlify-Function voll implementiert
    // (mammoth via esm.sh in Lambda), die Supabase-Edge-Version ist ein
    // 501-DEFERRED-Stub. Frontend → Netlify direkt routen.
    // MEGA⁸²-A.1: eintraege-list — Supabase-Edge-Version hat CORS-Bug,
    // Netlify-Version ist voll funktional inkl. Rate-Limit + JWT-Middleware.
    const SKIP_REROUTE = new Set(['parse-docx', 'eintraege-list']);

    const _origFetch = window.fetch.bind(window);

    async function _getAccessToken() {
        // 1. Versuche supabase-client Singleton
        try {
            const sb = window.__provaSupabaseClient || (window.PROVA && window.PROVA.supabase);
            if (sb) {
                const { data } = await sb.auth.getSession();
                return data && data.session ? data.session.access_token : null;
            }
        } catch (_) { /* fallthrough */ }

        // 2. Fallback: localStorage (Supabase-Auth Default-Storage-Key)
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            for (const k of keys) {
                const raw = localStorage.getItem(k);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                if (parsed && parsed.access_token) return parsed.access_token;
            }
        } catch (_) {}
        return null;
    }

    function _extractFunctionName(url) {
        try {
            const u = typeof url === 'string' ? url : (url.url || String(url));
            const idx = u.indexOf(NETLIFY_PREFIX);
            if (idx === -1) return null;
            const tail = u.slice(idx + NETLIFY_PREFIX.length);
            const slashIdx = tail.indexOf('/');
            const queryIdx = tail.indexOf('?');
            let endIdx = tail.length;
            if (slashIdx >= 0 && slashIdx < endIdx) endIdx = slashIdx;
            if (queryIdx >= 0 && queryIdx < endIdx) endIdx = queryIdx;
            const name = tail.slice(0, endIdx);
            const rest = tail.slice(endIdx); // includes leading / or ?
            return { name, rest };
        } catch (_) { return null; }
    }

    window.fetch = async function patchedFetch(input, init) {
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const fn = _extractFunctionName(url);
            if (!fn || SKIP_REROUTE.has(fn.name)) return _origFetch(input, init);

            const newUrl = EDGE_BASE + fn.name + fn.rest;
            const opts = Object.assign({}, init || {});
            opts.headers = new Headers(opts.headers || (input && input.headers) || {});

            // Bearer-Token aus Session (falls noch nicht gesetzt)
            if (!opts.headers.has('Authorization')) {
                const token = await _getAccessToken();
                if (token) opts.headers.set('Authorization', 'Bearer ' + token);
                else if (SUPABASE_ANON_KEY) opts.headers.set('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
            }
            if (!opts.headers.has('apikey') && SUPABASE_ANON_KEY) {
                opts.headers.set('apikey', SUPABASE_ANON_KEY);
            }
            if (!opts.headers.has('Content-Type') && opts.body && typeof opts.body === 'string') {
                opts.headers.set('Content-Type', 'application/json');
            }

            // Methode aus Request-Objekt übernehmen falls input ein Request war
            if (input && typeof input === 'object' && input.method && !opts.method) {
                opts.method = input.method;
            }
            // Body aus Request-Objekt
            if (input && typeof input === 'object' && !opts.body && input.body) {
                opts.body = input.body;
            }

            console.debug('[edge-shim] reroute', fn.name, '→', newUrl);
            return _origFetch(newUrl, opts);
        } catch (e) {
            console.warn('[edge-shim] reroute failed, falling back:', e);
            return _origFetch(input, init);
        }
    };

    /**
     * Direkter Edge-Function-Call (für neuen Code, statt fetch zu nutzen).
     * Gibt parsed JSON zurück. Wirft bei !response.ok.
     */
    window.callEdgeFunction = async function (name, body, opts) {
        opts = opts || {};
        const token = await _getAccessToken();
        const headers = Object.assign({}, opts.headers || {}, {
            'Content-Type': 'application/json'
        });
        if (token) headers['Authorization'] = 'Bearer ' + token;
        else if (SUPABASE_ANON_KEY) headers['Authorization'] = 'Bearer ' + SUPABASE_ANON_KEY;
        if (SUPABASE_ANON_KEY) headers['apikey'] = SUPABASE_ANON_KEY;

        const url = EDGE_BASE + name + (opts.queryString ? '?' + opts.queryString : '');
        const method = opts.method || (body !== undefined ? 'POST' : 'GET');
        const res = await _origFetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok) {
            const err = new Error('Edge ' + name + ' fehlgeschlagen: HTTP ' + res.status);
            err.status = res.status;
            err.body = data;
            throw err;
        }
        return data;
    };

    console.debug('[edge-shim] active — rerouting /.netlify/functions/* → ' + EDGE_BASE);

    // ════════════════════════════════════════════════
    // MEGA⁴⁶: Netlify-Identity-Polyfill (inline)
    // ════════════════════════════════════════════════
    // Frontend-Legacy referenziert window.netlifyIdentity.currentUser() in
    // 8+ Files (nav.js, push-optin.js, lib/editor-tiptap.js, etc.). Nach
    // Removal des netlify-identity-widget.js Script-Tags wäre netlifyIdentity
    // undefined → ReferenceErrors. Polyfill antwortet stattdessen mit Daten
    // aus Supabase-Session bzw. localStorage.
    if (!window.PROVA_NI_POLYFILL_DISABLED) {
        function _readUserEmail() {
            try {
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
                const legacy = localStorage.getItem('prova_sv_email');
                if (legacy) return legacy;
                const u = localStorage.getItem('prova_user');
                if (u) {
                    const p = JSON.parse(u);
                    if (p && p.email) return p.email;
                }
            } catch (_) {}
            return null;
        }
        function _readUser() {
            const email = _readUserEmail();
            if (!email) return null;
            const vn = localStorage.getItem('prova_sv_vorname') || '';
            const nn = localStorage.getItem('prova_sv_nachname') || '';
            return {
                email: email,
                id: email,
                app_metadata: {},
                user_metadata: {
                    full_name: (vn + ' ' + nn).trim() || email.split('@')[0]
                },
                jwt: function () { return localStorage.getItem('prova_auth_token') || null; },
                getToken: function () { return Promise.resolve(localStorage.getItem('prova_auth_token') || null); }
            };
        }
        async function _polyfillLogout() {
            try {
                const m = await import('/lib/supabase-client.js');
                const supabase = m.supabase || (m.getSupabase && m.getSupabase());
                if (supabase) await supabase.auth.signOut();
            } catch (e) { console.warn('[ni-polyfill] signOut failed:', e && e.message); }
            try {
                ['prova_auth_token','prova_user','prova_sv_email','prova_paket','prova_status',
                 'prova_subscription_status','prova_trial_end','prova_testpilot','prova_sv_vorname',
                 'prova_sv_nachname','prova_at_sv_record_id'].forEach(function (k) {
                    try { localStorage.removeItem(k); } catch (_) {}
                });
                try { sessionStorage.removeItem('prova_email'); } catch (_) {}
            } catch (_) {}
        }

        // Nicht überschreiben falls echtes Widget bereits geladen
        if (!window.netlifyIdentity || window.netlifyIdentity.__isPolyfill === true) {
            window.netlifyIdentity = {
                __isPolyfill: true,
                currentUser: _readUser,
                logout: _polyfillLogout,
                signup: async function (opts) {
                    const m = await import('/lib/supabase-client.js');
                    const supabase = m.supabase || (m.getSupabase && m.getSupabase());
                    if (!supabase) throw new Error('Supabase nicht verfügbar');
                    const r = await supabase.auth.signUp({
                        email: opts.email, password: opts.password,
                        options: { data: opts.data || {} }
                    });
                    if (r.error) throw new Error(r.error.message);
                    return r.data;
                },
                open: function (_mode) {
                    console.warn('[ni-polyfill] open() no-op — Login via app-login.html');
                },
                init: function () {},
                on: function () {},
                off: function () {},
                store: { user: null },
                gotrue: null
            };
            console.debug('[ni-polyfill] active — netlifyIdentity → Supabase Auth');
        }
    }
})();
