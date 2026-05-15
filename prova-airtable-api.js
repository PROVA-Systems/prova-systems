/**
 * PROVA — prova-airtable-api.js
 * MEGA⁷⁵-F-Batch2 B10 (2026-05-14): Wrapper deaktiviert.
 *
 * window.PROVA_AIRTABLE bleibt als API-Compat-Stub. Alle Methoden
 * loggen einmalig eine Deprecation-Warn und returnen leere Defaults.
 * Aktuelle Caller migrieren zu lib/prova-supabase-adapters.js:
 *   - getCurrentWorkspaceId(), getSupabase()
 *   - auftragRowToFields(), kontaktRowToFields(), dokumentRowToFields()
 *   - loadSvProfile(), auditTrailInsert(), logBriefGenerated(),
 *     logEinwilligung()
 */
(function () {
  var _warned = false;
  function warn(method) {
    if (_warned) return;
    _warned = true;
    console.warn('[PROVA_AIRTABLE] deprecated — migriere zu /lib/prova-supabase-adapters.js. Call:', method);
  }
  function empty() { return Promise.resolve({ records: [] }); }
  function nullR() { return Promise.resolve(null); }

  window.PROVA_AIRTABLE = {
    BASE:                 '',
    TBL_SV:               '',
    TBL_SCHADENSFAELLE:   '',
    TBL_RECHNUNGEN:       '',
    TBL_TERMINE:          '',
    TBL_KONTAKTE:         '',
    TBL_BRIEFE:           '',
    FELDER_SV:            {},
    fetchSV:              function(){ warn('fetchSV'); return nullR(); },
    fetchKontakte:        function(){ warn('fetchKontakte'); return empty(); },
    fetchRechnungen:      function(){ warn('fetchRechnungen'); return empty(); },
    fetchTermine:         function(){ warn('fetchTermine'); return empty(); },
    fetchBriefe:          function(){ warn('fetchBriefe'); return empty(); },
    fetchSchadensfaelle:  function(){ warn('fetchSchadensfaelle'); return empty(); },
    upsertSV:             function(){ warn('upsertSV'); return nullR(); },
    createKontakt:        function(){ warn('createKontakt'); return nullR(); }
  };
})();
