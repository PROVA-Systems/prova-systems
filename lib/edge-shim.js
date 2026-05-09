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
    // Leer per default — alle 144 deployten Edge-Functions sind aktiv.
    const SKIP_REROUTE = new Set([]);

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
})();
