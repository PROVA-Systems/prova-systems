/* ============================================================
   PROVA Systems — Supabase-Auth-Logic (ESM)
   Sprint K-1.0 Block 6 — parallel zu Netlify Identity / login.html

   Wird in K-1.5 Cutover als finales Auth-System aktiviert.
   Bis dahin: Test-Mode für Entwickler + Browser-Roundtrip-Test.

   Page: /auth-supabase.html
   ============================================================ */

import {
    supabase,
    signOut as _signOut
} from './lib/supabase-client.js';

// ─── DOM-HELPERS ──────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const msgEl = () => $('#msg');

function showError(text) {
    const el = msgEl();
    el.className = 'msg error';
    el.textContent = text;
}

function showSuccess(text) {
    const el = msgEl();
    el.className = 'msg success';
    el.textContent = text;
}

function showInfo(text) {
    const el = msgEl();
    el.className = 'msg info';
    el.textContent = text;
}

function hideMsg() {
    const el = msgEl();
    el.className = 'msg';
    el.textContent = '';
}

function setLoading(form, loading) {
    const btn = form.querySelector('button[type=submit]');
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? '…' : btn.dataset.originalText;
}

// ─── ERROR-MAPPING (DE) ───────────────────────────────────────

function germanError(error) {
    if (!error) return 'Unbekannter Fehler.';
    const msg = (error.message || '').trim();
    const map = {
        'Invalid login credentials':                                'Email oder Passwort falsch.',
        'Email not confirmed':                                      'Bitte bestätige zuerst Deine Email — schau in Dein Postfach.',
        'User already registered':                                  'Diese Email ist bereits registriert.',
        'Password should be at least 6 characters':                 'Passwort muss mindestens 6 Zeichen lang sein.',
        'Password should be at least 8 characters':                 'Passwort muss mindestens 8 Zeichen lang sein.',
        'New password should be different from the old password':  'Neues Passwort muss sich vom alten unterscheiden.',
        'Email rate limit exceeded':                                'Zu viele Versuche — bitte in 5 Min nochmal.',
        'Token has expired or is invalid':                          'Link abgelaufen — fordere einen neuen Reset-Link an.',
        'Anonymous sign-ins are disabled':                          'Anonyme Logins sind deaktiviert.',
        'For security purposes, you can only request this after':   'Sicherheits-Sperre — bitte einen Moment warten und nochmal versuchen.'
    };
    for (const [en, de] of Object.entries(map)) {
        if (msg.startsWith(en)) return de;
    }
    return msg || 'Unbekannter Fehler.';
}

// ─── TAB-SWITCHING ────────────────────────────────────────────

function activateTab(name) {
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === name);
    });
    document.querySelectorAll('form').forEach(f => {
        f.classList.toggle('active', f.id === `${name}-form`);
    });
    hideMsg();
}

// ─── LOGIN ────────────────────────────────────────────────────

async function handleLogin(form) {
    const email = form.email.value.trim();
    const password = form.password.value;

    setLoading(form, true);
    hideMsg();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(form, false);

    if (error) {
        showError(germanError(error));
        return;
    }

    showSuccess('Eingeloggt — prüfe Pflicht-Einwilligungen…');

    // Forced Re-Consent: vor jedem Login pflicht_einwilligungen prüfen
    try {
        const { data: pending, error: pendingErr } = await supabase.rpc('get_pending_einwilligungen');
        if (!pendingErr && Array.isArray(pending) && pending.length > 0) {
            // Marcel-Wunsch: Forced Re-Consent bei neuer AGB/DSE/AVV-Version
            window.location.href = '/einwilligung-update.html?source=auth-supabase';
            return;
        }
    } catch (e) {
        // RPC nicht verfügbar oder Fehler — wir loggen ein, aber nicht blocken
        console.warn('PROVA: get_pending_einwilligungen-Check fehlgeschlagen:', e);
    }

    // Post-Login-Redirect: ursprünglich angeforderter Pfad aus next= ODER /dashboard.
    // (Hotfix login-redirect-default 01.05.2026 — Default war zuvor die K-1.0-Test-Page.)
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/dashboard';
    window.location.href = next;
}

// ─── SIGN-UP ──────────────────────────────────────────────────

async function handleSignUp(form) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name.value.trim();

    setLoading(form, true);
    hideMsg();

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/auth-supabase.html?action=verified`
        }
    });

    setLoading(form, false);

    if (error) {
        showError(germanError(error));
        return;
    }

    showSuccess('Account angelegt. Bitte bestätige Deine Email — wir haben Dir einen Link geschickt.');
    form.reset();
}

// ─── PASSWORT-RESET ───────────────────────────────────────────

async function handleReset(form) {
    const email = form.email.value.trim();

    setLoading(form, true);
    hideMsg();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth-supabase.html?action=reset`
    });

    setLoading(form, false);

    if (error) {
        showError(germanError(error));
        return;
    }

    showSuccess('Reset-Link gesendet — schau in Dein Email-Postfach.');
    form.reset();
}

// ─── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Tab-Switcher
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => activateTab(t.dataset.tab));
    });

    // Form-Submits
    $('#login-form')?.addEventListener('submit', e => {
        e.preventDefault();
        handleLogin(e.target);
    });

    $('#signup-form')?.addEventListener('submit', e => {
        e.preventDefault();
        handleSignUp(e.target);
    });

    $('#reset-form')?.addEventListener('submit', e => {
        e.preventDefault();
        handleReset(e.target);
    });

    // URL-Param-Handling: ?action=verified | ?action=reset | ?logged_out=1
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action === 'verified') {
        showSuccess('Email bestätigt! Du kannst Dich jetzt einloggen.');
        activateTab('login');
    } else if (action === 'reset') {
        showInfo('Du wurdest über einen Reset-Link hierher geleitet — bitte Passwort neu setzen.');
        // K-1.4: hier kommt das Password-Update-Formular. K-1.0 Skeleton: Hinweis reicht.
    } else if (params.get('logged_out') === '1') {
        showInfo('Du bist abgemeldet.');
    }

    // Hotfix-2 (01.05.2026, disable-auto-redirect-loop):
    // Auto-Redirect bei bereits eingeloggter Session DEAKTIVIERT.
    //
    // Vorgaenger-Hotfix login-redirect-default leitete bei vorhandener
    // Session automatisch nach /dashboard weiter. Resultat war eine
    // Race-Condition-Loop: auth-guard.js auf /dashboard prueft synchron
    // (vor Session-Hydration), sieht keine Session, schickt zurueck nach
    // /login. /login sieht hydrierte Session, schickt nach /dashboard.
    // → Endlos-Loop, Browser haengt.
    //
    // Notfall-Loesung: kein Auto-Sprung. User loggt sich aktiv ein
    // (oder navigiert manuell zu /dashboard). Kein UX-Verlust — Login-
    // Page ist die normale Erwartung wenn jemand /login aufruft.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !action) {
            console.log('[auth] Session detected on /login, no auto-redirect (anti-loop hotfix-2)');
        }
    }).catch(() => { /* nicht blocken */ });
});

// ─── EXPORTS für Browser-Console-Debug ────────────────────────

if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.signOut = _signOut;
    window.PROVA_DEBUG.handleLogin = handleLogin;
}
