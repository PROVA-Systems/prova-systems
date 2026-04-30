/* ============================================================
   PROVA Systems — Auth-Guard (ESM)
   Sprint K-1.3.A4 + Cutover Block 3 Bridge (01.05.2026)

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

   Cutover-Block-3 Bridge (01.05.2026):
     runAuthGuard() schreibt nach erfolgreicher Session-Validierung
     Legacy-Compat-Keys (prova_auth_token, prova_sv_email, prova_user,
     prova_last_activity), damit Hybrid-Pages mit altem Inline-IIFE-
     Guard und Logic-Files mit Legacy-Key-Reads weiterhin funktionieren.
     Bridge-Token ist client-side Format-valid (verifyProvaToken in
     auth-guard.js Root checkt Format+exp+sub, NICHT HMAC). Server-
     side bleibt Bridge ungültig — Hybrid-Pages sollten Supabase-Edge-
     Functions nutzen, nicht Legacy-HMAC-Endpunkte.

   Marcel-Reminder: Service-Role-Key NIEMALS hier oder in importierten Modulen.
   ============================================================ */

import {
    supabase,
    getCurrentSession,
    getCurrentUser,
    getActiveWorkspaceId,
    signOut as _signOut
} from './supabase-client.js';

const LOGIN_PAGE = '/login';
const ONBOARDING_PAGE = '/onboarding-supabase.html';

// ─── Belt-and-Suspenders: Loop-Detection ─────────────────────
// Wenn dieselbe Page innerhalb von 30s mehr als 5x redirected wird,
// breche ab und zeige Fehler. Reset bei erfolgreichem Page-Render.

const LOOP_COUNTER_KEY = 'prova-redirect-counter';
const LOOP_STAMP_KEY   = 'prova-redirect-stamp';
const LOOP_THRESHOLD   = 5;
const LOOP_WINDOW_MS   = 30_000;

function _trackRedirect(target) {
    try {
        const now = Date.now();
        const lastStamp = parseInt(sessionStorage.getItem(LOOP_STAMP_KEY) || '0', 10);
        if (now - lastStamp > LOOP_WINDOW_MS) {
            sessionStorage.setItem(LOOP_COUNTER_KEY, '0');
        }
        sessionStorage.setItem(LOOP_STAMP_KEY, String(now));
        const count = parseInt(sessionStorage.getItem(LOOP_COUNTER_KEY) || '0', 10) + 1;
        sessionStorage.setItem(LOOP_COUNTER_KEY, String(count));
        if (count > LOOP_THRESHOLD) {
            console.error('[auth-guard] LOOP detected — refusing redirect to', target);
            // Visible feedback ueber Banner, falls Page DOM hat
            try {
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;padding:14px;z-index:99999;font-family:system-ui;text-align:center;font-size:14px;';
                banner.innerHTML = '⚠️ Login-Loop erkannt. Bitte Browser-Daten löschen oder Inkognito-Tab nutzen. Redirect blockiert.';
                document.body && document.body.appendChild(banner);
            } catch (_) { /* DOM nicht ready, console-only */ }
            sessionStorage.removeItem(LOOP_COUNTER_KEY);
            sessionStorage.removeItem(LOOP_STAMP_KEY);
            return false;   // Caller: do NOT navigate
        }
        return true;
    } catch (e) {
        return true;   // sessionStorage failed — don't block
    }
}

function _resetLoopCounter() {
    try {
        sessionStorage.removeItem(LOOP_COUNTER_KEY);
        sessionStorage.removeItem(LOOP_STAMP_KEY);
    } catch (_) {}
}

// ─── Bridge-Layer: Legacy-Auth-Keys nach Supabase-Session schreiben ─
// Damit Hybrid-Pages mit Inline-IIFE-Guard (z.B. dashboard.html)
// und Logic-Files mit Legacy-Key-Reads (z.B. archiv-logic.js) weiterhin
// funktionieren ohne dass jede Page einzeln migriert werden muss.

function _b64urlEncode(json) {
    return btoa(JSON.stringify(json))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function writeLegacyBridge(user) {
    if (!user || !user.email) return;
    try {
        const nowSec = Math.floor(Date.now() / 1000);
        const payload = {
            sub: user.email,
            iat: nowSec,
            exp: nowSec + 24 * 3600,    // 24h gültig
            uid: user.id,
            source: 'supabase-bridge'
        };
        const fakeToken = _b64urlEncode(payload) + '.bridge-supabase-' + (user.id || 'unknown');
        localStorage.setItem('prova_auth_token', fakeToken);
        localStorage.setItem('prova_sv_email', user.email);
        localStorage.setItem('prova_user', JSON.stringify({
            email: user.email,
            id: user.id,
            bridge: true
        }));
        localStorage.setItem('prova_last_activity', String(Date.now()));
    } catch (e) {
        console.warn('[auth-guard] writeLegacyBridge failed', e);
    }
}

export function clearLegacyBridge() {
    try {
        localStorage.removeItem('prova_auth_token');
        localStorage.removeItem('prova_sv_email');
        localStorage.removeItem('prova_user');
        localStorage.removeItem('prova_session_v2');
        localStorage.removeItem('prova_last_activity');
    } catch (_) {}
}

/**
 * Prüft Supabase-Session. Bei nicht eingeloggt: Redirect zu Login.
 * Bei eingeloggt: Bridge-Keys werden geschrieben (für Hybrid-Pages).
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
        // Belt-and-Suspenders: stoppe wenn Loop erkannt
        if (!_trackRedirect(url)) {
            // Page rendert weiter mit Banner statt Redirect — kein new Promise(() => {})
            return null;
        }
        window.location.href = url;
        // returns ein hängendes Promise — Page wird gleich gewechselt
        return new Promise(() => {});
    }
    // Session OK — Bridge schreiben für Hybrid-Pages, Loop-Counter reset
    writeLegacyBridge(session.user);
    _resetLoopCounter();
    return { user: session.user, session, workspaceId: null };
}

/**
 * Wie runAuthGuard, plus Workspace-Check.
 * Bei fehlendem Workspace: Redirect zu Onboarding.
 */
export async function requireWorkspace(options = {}) {
    const ctx = await runAuthGuard(options);
    if (!ctx) return null;   // Loop-Block: ctx kann null sein
    const wsId = await getActiveWorkspaceId();
    if (!wsId) {
        const target = options.onboardingPage || ONBOARDING_PAGE;
        if (!_trackRedirect(target)) return null;
        window.location.href = target;
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
            clearLegacyBridge();
            _resetLoopCounter();
            await _signOut(redirectTo);
        });
    });
}

/**
 * Subscribt auf Auth-State-Changes (z.B. Token-Expiry, Logout in anderem Tab).
 * Bei SIGNED_OUT: Redirect zu Login.
 */
export function watchAuthState(options = {}) {
    return supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            clearLegacyBridge();
            _resetLoopCounter();
            window.location.href = options.loginPage || LOGIN_PAGE;
        } else if (event === 'TOKEN_REFRESHED' && session) {
            // Token wurde refreshed — Bridge-Keys neu schreiben damit exp aktualisiert
            writeLegacyBridge(session.user);
        } else if (event === 'SIGNED_IN' && session) {
            writeLegacyBridge(session.user);
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
    isFounder,
    writeLegacyBridge,
    clearLegacyBridge
};

if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.runAuthGuard = runAuthGuard;
    window.PROVA_DEBUG.requireWorkspace = requireWorkspace;
    window.PROVA_DEBUG.writeLegacyBridge = writeLegacyBridge;
    window.PROVA_DEBUG.clearLegacyBridge = clearLegacyBridge;
}
