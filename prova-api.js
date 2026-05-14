/**
 * PROVA — prova-api.js
 * MEGA⁷⁵-F-Batch2 B10 (2026-05-14): Wrapper deaktiviert.
 *
 * window.PROVA_API bleibt als API-Compat-Stub. Methoden loggen einmalig
 * eine Deprecation-Warn und returnen leere Defaults. Caller migrieren
 * direkt auf lib/prova-supabase-adapters.js oder lib/supabase-client.js.
 */
(function () {
  var _warned = false;
  function warn(method) {
    if (_warned) return;
    _warned = true;
    console.warn('[PROVA_API] deprecated — migriere zu /lib/prova-supabase-adapters.js. Call:', method);
  }
  function empty() { return Promise.resolve({ records: [] }); }
  function nullR() { return Promise.resolve(null); }
  function okR()   { return Promise.resolve({ ok: true }); }

  window.PROVA_API = {
    BASE_URL: '',
    get:      function(){ warn('get'); return empty(); },
    post:     function(){ warn('post'); return okR(); },
    patch:    function(){ warn('patch'); return okR(); },
    listFaelle:        function(){ warn('listFaelle'); return empty(); },
    listRechnungen:    function(){ warn('listRechnungen'); return empty(); },
    listKontakte:      function(){ warn('listKontakte'); return empty(); },
    listTermine:       function(){ warn('listTermine'); return empty(); },
    listBriefe:        function(){ warn('listBriefe'); return empty(); },
    createFall:        function(){ warn('createFall'); return nullR(); },
    createRechnung:    function(){ warn('createRechnung'); return nullR(); },
    patchSV:           function(){ warn('patchSV'); return okR(); }
  };
})();
