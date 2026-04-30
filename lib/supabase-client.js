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
const cfg = (typeof window !== 'undefined' && window.PROVA_CONFIG) || {};
const SUPABASE_URL = cfg.SUPABASE_URL;
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;
const PLACEHOLDER = cfg.PLACEHOLDER;

if (!SUPABASE_URL) {
    throw new Error(
        'PROVA: window.PROVA_CONFIG.SUPABASE_URL fehlt. '
        + 'Lade lib/prova-config.js VOR diesem Modul.'
    );
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === PLACEHOLDER) {
    throw new Error(
        'PROVA: SUPABASE_ANON_KEY nicht gesetzt. '
        + 'Öffne tools/test-supabase-login.html und paste den Anon-Key '
        + 'in den Setup-Banner (wird in localStorage gespeichert). '
        + 'Werte holen: Supabase-Dashboard → Project Settings → API → anon public.'
    );
}

// ─── SINGLETON ────────────────────────────────────────────────
let _client = null;

export function getSupabase() {
    if (!_client) {
        _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'prova-auth-token',
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
    // Cutover-Block-3 Bridge: auch Legacy-Auth-Keys clearen
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('prova_auth_token');
            localStorage.removeItem('prova_sv_email');
            localStorage.removeItem('prova_user');
            localStorage.removeItem('prova_session_v2');
            localStorage.removeItem('prova_last_activity');
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
