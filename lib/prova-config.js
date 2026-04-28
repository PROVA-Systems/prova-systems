/* ============================================================
   PROVA Systems — Frontend-Config (klassisches JS, kein Modul)

   Setzt window.PROVA_CONFIG mit Supabase-URL + Anon-Key.
   Muss VOR allen ESM-Modulen geladen werden:
     <script src="lib/prova-config.js"></script>
     <script type="module" src="lib/supabase-client.js"></script>

   Sicherheit:
   - SUPABASE_URL ist public, hardcoded OK
   - SUPABASE_ANON_KEY ist public (RLS schützt), aber wir hardcoden ihn
     NICHT im Repo, damit Key-Rotation ohne Repo-Commit möglich ist.
   - Stattdessen: Anon-Key kommt aus localStorage (einmalig vom Marcel
     in tools/test-supabase-login.html eingetragen) ODER aus
     window.PROVA_CONFIG_OVERRIDE (für spätere Build-Time-Substitution).
   - Service-Role-Key NIE hier — nur Server-Side (Edge Functions).
   ============================================================ */

(function () {
    'use strict';

    var ANON_KEY_PLACEHOLDER = 'sb_publishable_q93ZfVzD3lVi_jJw-CKkHQ_mXof11-B';

    // 1. Override-Pattern (für künftige Build-Time-Substitution oder Tests)
    var override = (typeof window !== 'undefined' && window.PROVA_CONFIG_OVERRIDE) || {};

    // 2. localStorage-Fallback (Marcel pastet Key einmalig in Setup-Banner)
    var anonFromStorage = null;
    try {
        anonFromStorage = (typeof localStorage !== 'undefined')
            ? localStorage.getItem('prova-supabase-anon-key')
            : null;
    } catch (e) {
        // localStorage kann durch Browser-Settings blockiert sein
        anonFromStorage = null;
    }

    var config = {
        SUPABASE_URL: override.SUPABASE_URL
            || 'https://cngteblrbpwsyypexjrv.supabase.co',
        SUPABASE_ANON_KEY: override.SUPABASE_ANON_KEY
            || anonFromStorage
            || ANON_KEY_PLACEHOLDER,
        PLACEHOLDER: ANON_KEY_PLACEHOLDER  // damit Consumer prüfen können
    };

    if (typeof window !== 'undefined') {
        window.PROVA_CONFIG = config;
    }
})();
