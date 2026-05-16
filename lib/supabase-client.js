/* ============================================================
   PROVA Systems — Supabase-Client Singleton (ESM)
   Sprint K-1.0 Block 3

   Wird von allen anderen Lib-Modulen genutzt. Lädt @supabase/supabase-js
   per CDN (esm.sh) — kein Bundler nötig im Vanilla-JS-Setup.

   Browser-Side: nutzt Anon-Key aus window.PROVA_CONFIG (RLS schützt).
   Server-Side: dieses Modul wird im Browser geladen, Server-Code nutzt
                stattdessen das npm-Paket direkt mit Service-Role-Key.

   Pflicht-Pattern:
     <script src="lib/prova-config.js"></script>          <- VOR Modul!
     <script type="module" src="lib/supabase-client.js"></script>
   ============================================================ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

// ─── KONFIG ───────────────────────────────────────────────────
// MEGA⁴⁸: Defensive Fallback — falls prova-config.js fehlt oder zu spät lädt,
// werden hardcoded Werte gesetzt damit Login nicht crashed. Login muss
// funktionieren auch wenn Script-Tag-Order kaputt ist.
const HARDCODED_FALLBACK = {
    SUPABASE_URL: 'https://cngteblrbpwsyypexjrv.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_q93ZfVzD3lVi_jJw-CKkHQ_mXof11-B'
};

if (typeof window !== 'undefined') {
    window.PROVA_CONFIG = window.PROVA_CONFIG || {};
    if (!window.PROVA_CONFIG.SUPABASE_URL) {
        console.warn('[supabase-client] PROVA_CONFIG.SUPABASE_URL fehlt — Fallback hardcoded. Bitte lib/prova-config.js Script-Tag VOR Supabase-Client prüfen.');
        window.PROVA_CONFIG.SUPABASE_URL = HARDCODED_FALLBACK.SUPABASE_URL;
    }
    if (!window.PROVA_CONFIG.SUPABASE_ANON_KEY) {
        console.warn('[supabase-client] PROVA_CONFIG.SUPABASE_ANON_KEY fehlt — Fallback hardcoded.');
        window.PROVA_CONFIG.SUPABASE_ANON_KEY = HARDCODED_FALLBACK.SUPABASE_ANON_KEY;
    }
}

const cfg = (typeof window !== 'undefined' && window.PROVA_CONFIG) || HARDCODED_FALLBACK;
const SUPABASE_URL = cfg.SUPABASE_URL || HARDCODED_FALLBACK.SUPABASE_URL;
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || HARDCODED_FALLBACK.SUPABASE_ANON_KEY;
const PLACEHOLDER = cfg.PLACEHOLDER;

// ─── SINGLETON ────────────────────────────────────────────────
let _client = null;

// MEGA³⁹ P10 F1: Cross-Subdomain-Storage-Adapter
// localStorage ist per-origin isoliert → Cross-Domain-Login bricht zwischen
// prova-systems.de und app.prova-systems.de. Lösung: Cookie auf Parent-Domain
// `.prova-systems.de` für die Session, + localStorage-Mirror für Lese-Fallback.
const COOKIE_DOMAIN = (typeof location !== 'undefined' &&
    /(^|\.)prova-systems\.de$/.test(location.hostname))
    ? '.prova-systems.de'
    : null;  // localhost / netlify-Preview → kein Cookie-Set

const crossDomainStorage = {
    getItem(key) {
        // 1. Cookie-First (Cross-Subdomain wirksam)
        if (typeof document !== 'undefined' && document.cookie) {
            const m = document.cookie.match(new RegExp('(?:^|;\\s*)' +
                key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '=([^;]*)'));
            if (m) return decodeURIComponent(m[1]);
        }
        // 2. Fallback localStorage
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem(key, value) {
        // Beide setzen: Cookie (cross-subdomain) + localStorage (legacy-fallback)
        try { localStorage.setItem(key, value); } catch (e) {}
        if (typeof document !== 'undefined' && COOKIE_DOMAIN) {
            const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toUTCString();
            const cookieParts = [
                key + '=' + encodeURIComponent(value),
                'expires=' + expires,
                'domain=' + COOKIE_DOMAIN,
                'path=/',
                'SameSite=Lax',
                'Secure'
            ];
            document.cookie = cookieParts.join('; ');
        }
    },
    removeItem(key) {
        try { localStorage.removeItem(key); } catch (e) {}
        if (typeof document !== 'undefined' && COOKIE_DOMAIN) {
            document.cookie = key + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ' +
                'domain=' + COOKIE_DOMAIN + '; path=/';
        }
    }
};

export function getSupabase() {
    if (!_client) {
        _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'prova-auth-token',
                storage: crossDomainStorage,  // M³⁹ P10 F1: Cross-Subdomain
                flowType: 'pkce'
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'X-Client-Info': 'prova-web/1.0'
                }
            }
        });
    }
    return _client;
}

// Test-Export für Verify ohne createClient
export const __crossDomainStorage = crossDomainStorage;
export const __COOKIE_DOMAIN = COOKIE_DOMAIN;

// Convenience-Export: direkter Singleton-Zugriff
export const supabase = getSupabase();

// ─── AUTH-HELPERS ─────────────────────────────────────────────

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('PROVA Auth Error (getCurrentUser):', error);
        return null;
    }
    return user;
}

export async function getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('PROVA Auth Error (getCurrentSession):', error);
        return null;
    }
    return session;
}

// ─── WORKSPACE-CONTEXT ────────────────────────────────────────
// Multi-Tenancy: jede DB-Operation läuft im Kontext eines Workspaces.
// In K-1.0 nutzen wir den ersten aktiven Workspace des Users.
// In K-1.4 kommt Workspace-Switcher (für Team-Tier).

let _activeWorkspaceId = null;

export async function getActiveWorkspaceId() {
    if (_activeWorkspaceId) return _activeWorkspaceId;

    // localStorage-Cache (überlebt Page-Reloads)
    const cached = (typeof localStorage !== 'undefined')
        ? localStorage.getItem('prova-active-workspace')
        : null;
    if (cached) {
        _activeWorkspaceId = cached;
        return cached;
    }

    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

    if (error || !data) {
        console.warn('PROVA: Kein aktiver Workspace für User', user.id);
        return null;
    }

    _activeWorkspaceId = data.workspace_id;
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('prova-active-workspace', data.workspace_id);
    }
    return _activeWorkspaceId;
}

export function setActiveWorkspaceId(id) {
    _activeWorkspaceId = id;
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('prova-active-workspace', id);
    }
}

export function clearActiveWorkspace() {
    _activeWorkspaceId = null;
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('prova-active-workspace');
    }
}

// ─── SIGN-OUT ─────────────────────────────────────────────────

export async function signOut(redirectTo = '/login') {
    clearActiveWorkspace();
    // MEGA⁸³ C: ProvaLegacyBridge.clear() raumt Cookies + localStorage Cross-Domain.
    // Ohne diesen Aufruf bleiben prova_auth_token Cookies auf .prova-systems.de aktiv
    // und der naechste Subdomain-Besuch hydrated sie zurueck in localStorage → Logout-Bug.
    try {
        if (typeof window !== 'undefined' && window.ProvaLegacyBridge) {
            window.ProvaLegacyBridge.clear();
        }
    } catch(_){}
    // Cutover-Block-3 Bridge: auch Legacy-Auth-Keys clearen
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('prova_auth_token');
            localStorage.removeItem('prova_sv_email');
            localStorage.removeItem('prova_user');
            localStorage.removeItem('prova_session_v2');
            localStorage.removeItem('prova_last_activity');
            localStorage.removeItem('prova_workspace_id');  // MEGA⁷⁵-A
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('prova-redirect-counter');
            sessionStorage.removeItem('prova-redirect-stamp');
        }
    } catch (_) {}
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('PROVA Sign-Out Error:', error);
    }
    if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
    }
}

// ─── DEBUG-HELPER ─────────────────────────────────────────────
// Marcel kann in der Browser-Console window.PROVA_DEBUG.* nutzen
if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.supabase = supabase;
    window.PROVA_DEBUG.getCurrentUser = getCurrentUser;
    window.PROVA_DEBUG.getActiveWorkspaceId = getActiveWorkspaceId;
}
