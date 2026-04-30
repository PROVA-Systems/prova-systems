/* ============================================================
   PROVA Systems — Auth-Guard (ESM)
   Sprint K-1.3.A4

   Zentrales Auth-Modul für alle Frontend-Pages.
   Ersetzt das alte auth-guard.js (Netlify Identity) +
   prova-fetch-auth.js (Auth-Header-Helper) +
   prova-auth-api.js (Auth-API-Wrapper).

   Pattern in HTML-Pages:
     <script src="/lib/prova-config.js"></script>
     <script type="module">
       import { runAuthGuard } from '/lib/auth-guard.js';
       await runAuthGuard();  // redirected falls nicht eingeloggt
     </script>

   Marcel-Reminder: Service-Role-Key NIEMALS hier oder in importierten Modulen.
   ============================================================ */

import {
    supabase,
    getCurrentSession,
    getCurrentUser,
    getActiveWorkspaceId,
    signOut as _signOut
} from './supabase-client.js';

// APP-LANDING-SPLIT (Phase 3, 30.04.2026):
// /login ist die kanonische Login-URL. netlify.toml + _redirects servieren
// von dort die login.html. Auf prova-systems.de (LANDING) wird /login
// zusaetzlich host-conditioned auf https://app.prova-systems.de/login
// umgeleitet — der Pfad ist also auf beiden Hosts korrekt.
const LOGIN_PAGE = '/login';
const ONBOARDING_PAGE = '/onboarding-supabase.html';

/**
 * Prüft Supabase-Session. Bei nicht eingeloggt: Redirect zu Login.
 *
 * @param {Object} [options]
 * @param {string}  [options.loginPage]  — Override Login-URL
 * @param {string}  [options.next]       — Where-To-Return nach Login
 *                                          (default: aktuelle Page)
 * @returns {Promise<{user, session, workspaceId}>}
 */
export async function runAuthGuard(options = {}) {
    const session = await getCurrentSession();
    if (!session) {
        const next = options.next || (window.location.pathname + window.location.search);
        const url = (options.loginPage || LOGIN_PAGE) + `?next=${encodeURIComponent(next)}`;
        window.location.href = url;
        // returns ein hängendes Promise — Page wird gleich gewechselt
        return new Promise(() => {});
    }
    return { user: session.user, session, workspaceId: null };
}

/**
 * Wie runAuthGuard, plus Workspace-Check.
 * Bei fehlendem Workspace: Redirect zu Onboarding.
 */
export async function requireWorkspace(options = {}) {
    const ctx = await runAuthGuard(options);
    const wsId = await getActiveWorkspaceId();
    if (!wsId) {
        window.location.href = options.onboardingPage || ONBOARDING_PAGE;
        return new Promise(() => {});
    }
    return { ...ctx, workspaceId: wsId };
}

/**
 * Bindet Logout-Handler an alle [data-action="logout"]-Elemente.
 * Wird typischerweise nach DOMContentLoaded aufgerufen.
 */
export function bindLogoutButtons(redirectTo = LOGIN_PAGE) {
    document.querySelectorAll('[data-action="logout"]').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.preventDefault();
            await _signOut(redirectTo);
        });
    });
}

/**
 * Subscribt auf Auth-State-Changes (z.B. Token-Expiry, Logout in anderem Tab).
 * Bei SIGNED_OUT: Redirect zu Login.
 */
export function watchAuthState(options = {}) {
    return supabase.auth.onAuthStateChange((event /*, session */) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = options.loginPage || LOGIN_PAGE;
        }
    });
}

/**
 * Convenience: prüft ob User Founder ist (für Admin-Pages).
 * is_founder ist eine Spalte in public.users.
 */
export async function isFounder() {
    const user = await getCurrentUser();
    if (!user) return false;
    const { data } = await supabase
        .from('users')
        .select('is_founder')
        .eq('id', user.id)
        .maybeSingle();
    return !!data?.is_founder;
}

// Default-Export-Bundle für `import auth from './auth-guard.js'`
export default {
    runAuthGuard,
    requireWorkspace,
    bindLogoutButtons,
    watchAuthState,
    isFounder
};

if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.runAuthGuard = runAuthGuard;
    window.PROVA_DEBUG.requireWorkspace = requireWorkspace;
}
