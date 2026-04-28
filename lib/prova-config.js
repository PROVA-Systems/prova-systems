/* ============================================================
   PROVA Systems — Frontend-Config (klassisches JS, kein Modul)

   Setzt window.PROVA_CONFIG mit Supabase-URL + Anon-Key.
   Muss VOR allen ESM-Modulen geladen werden:
     <script src="lib/prova-config.js"></script>
     <script type="module" src="lib/supabase-client.js"></script>

   Sicherheit:
   - SUPABASE_URL ist public, hardcoded OK
   - SUPABASE_ANON_KEY ist public (RLS schützt), hardcoded OK
   - Service-Role-Key NIE hier — nur Server-Side (Edge Functions).
   ============================================================ */

(function () {
    'use strict';

    // Placeholder als Magic-String (für Consumer-Check)
    var ANON_KEY_PLACEHOLDER = '__SET_SUPABASE_ANON_KEY_VIA_TEST_PAGE__';

    // Hardcoded echter Anon-Key (public, RLS-protected, OK im Frontend)
    var ANON_KEY_HARDCODED = 'sb_publishable_q93ZfVzD3lVi_jJw-CKkHQ_mXof11-B';

    // Override-Pattern (für künftige Build-Time-Substitution oder Tests)
    var override = (typeof window !== 'undefined' && window.PROVA_CONFIG_OVERRIDE) || {};

    // localStorage-Fallback (Override für Tests)
    var anonFromStorage = null;
    try {
        anonFromStorage = (typeof localStorage !== 'undefined')
            ? localStorage.getItem('prova-supabase-anon-key')
            : null;
    } catch (e) {
        anonFromStorage = null;
    }

    var config = {
        SUPABASE_URL: override.SUPABASE_URL
            || 'https://cngteblrbpwsyypexjrv.supabase.co',
        SUPABASE_ANON_KEY: override.SUPABASE_ANON_KEY
            || anonFromStorage
            || ANON_KEY_HARDCODED
            || ANON_KEY_PLACEHOLDER,
        PLACEHOLDER: ANON_KEY_PLACEHOLDER  // damit Consumer prüfen können
    };

    if (typeof window !== 'undefined') {
        window.PROVA_CONFIG = config;
    }
})();