/* ============================================================
   PROVA prova-context.js — Zentrales Context-Modul
   
   PROBLEM GELÖST: Dieser Code stand in JEDER logic.js (8x+):
   
   var paket = localStorage.getItem('prova_paket') || 'Solo';
   var pc = {'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
   if(!localStorage.getItem('prova_user')){...}
   
   LÖSUNG: Einmalig einbinden, überall nutzen.
   
   EINBINDEN in jeder Seite (nach nav.js, vor logic.js):
   <script src="prova-context.js"></script>
   
   USAGE in logic.js:
   var ctx = PROVA.ctx;
   ctx.paket        // 'Solo' | 'Team'
   ctx.paketColor   // '#4f8ef7' | '#a78bfa'
   ctx.email        // 'sv@example.de'
   ctx.vorname      // 'Max'
   ctx.nachname     // 'Mustermann'
   ctx.isSolo       // true/false
   ctx.isTeam       // true/false
   ctx.isAdmin      // true/false
   ctx.isTestpilot  // true/false
   ctx.isGruenderkreis // true/false
   ctx.recordId     // Airtable SV Record ID
   PROVA.atFetch()  // Airtable Proxy (DRY)
   PROVA.guard()    // Auth-Check mit Redirect
   PROVA.setPageTitle() // Topbar-Titel setzen
============================================================ */

(function (global) {
  'use strict';

  /* ── Raw localStorage Werte ── */
  function ls(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch(e) { return fallback; }
  }

  /* ── Paket-Normalisierung (backward-compat) ── */
  var rawPaket  = ls('prova_paket', 'Solo');
  var paketMap  = { Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' };
  var paket     = paketMap[rawPaket] || rawPaket;
  if (paketMap[rawPaket]) {
    try { localStorage.setItem('prova_paket', paket); } catch(e) {}
  }

  /* ── Farben ── */
  var PAKET_COLORS = { Solo: '#4f8ef7', Team: '#a78bfa' };
  var paketColor   = PAKET_COLORS[paket] || PAKET_COLORS.Solo;

  /* ── Context-Objekt ── */
  var ctx = {
    paket:          paket,
    paketColor:     paketColor,
    isSolo:         paket === 'Solo',
    isTeam:         paket === 'Team',

    email:          ls('prova_sv_email',   ls('prova_email', '')),
    vorname:        ls('prova_sv_vorname', ''),
    nachname:       ls('prova_sv_nachname', ''),
    anrede:         ls('prova_sv_anrede', 'Sie'),
    firma:          ls('prova_sv_firma', ''),
    recordId:       ls('prova_at_sv_record_id', ''),

    isAdmin:        ls('prova_is_admin', '') === 'true',
    isTestpilot:    ls('prova_testpilot', '') === '1',
    isGruenderkreis: ls('prova_gruenderkreis', '') === '1',

    status:         ls('prova_status', 'Trial'),
    trialStart:     ls('prova_trial_start', null),
    trialDays:      parseInt(ls('prova_trial_days', '14'), 10),

    get fullName() {
      return [this.vorname, this.nachname].filter(Boolean).join(' ') || this.email || '—';
    },

    get isActive() {
      return this.status === 'Aktiv' || this.status === 'aktiv' || this.isTestpilot;
    },

    get appUrl() {
      return 'app.html'; // Session 30 Legacy-Cleanup
    },

    get kontingent() {
      return { Solo: 25, Team: 75 }[paket] || 5;
    }
  };

  /* ── Airtable Constants ── */
  var AT = {
    BASE:       'appJ7bLlAHZoxENWE',
    FAELLE:     'tblSxV8bsXwd1pwa0',
    SV:         'tbladqEQT3tmx4DIB',
    TERMINE:    'tblyMTTdtfGQjjmc2',
    RECHNUNGEN: 'tblF6MS7uiFAJDjiT',
    NORMEN:     'tblFVcMxntQhusY2i',
  };

  /* ── Zentraler Airtable-Proxy-Fetch ── */
  async function atFetch(table, formula, opts) {
    opts = opts || {};
    var maxRecords = opts.maxRecords || 100;
    // O1-FIX: KEIN Default-Sort mehr — Tabellen wie RECHNUNGEN haben kein
    // 'Timestamp'-Feld, was bei Default-Sort 422 ausloeste. Caller muss
    // sort explizit setzen wenn gewuenscht.
    var sort       = opts.sort;
    var sortDir    = opts.sortDir || 'desc';
    var fields     = opts.fields ? opts.fields.map(function(f){ return '&fields[]=' + encodeURIComponent(f); }).join('') : '';

    var path = '/v0/' + AT.BASE + '/' + table
      + '?filterByFormula=' + encodeURIComponent(formula || 'TRUE()')
      + '&maxRecords=' + maxRecords
      + (sort ? ('&sort[0][field]=' + encodeURIComponent(sort) + '&sort[0][direction]=' + sortDir) : '')
      + fields;

    try {
      var res = await provaFetch('/.netlify/functions/airtable', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'GET', path: path })
      });
      if (!res.ok) return [];
      var data = await res.json();
      return data.records || [];
    } catch (e) {
      console.warn('[PROVA.atFetch] Fehler:', e.message);
      return [];
    }
  }

  /* ── Einzelnen Record holen ── */
  async function atGet(table, recordId) {
    try {
      var path = '/v0/' + AT.BASE + '/' + table + '/' + recordId;
      var res = await provaFetch('/.netlify/functions/airtable', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'GET', path: path })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[PROVA.atGet] Fehler:', e.message);
      return null;
    }
  }

  /* ── Record anlegen ── */
  async function atCreate(table, fields) {
    try {
      var path = '/v0/' + AT.BASE + '/' + table;
      var res = await provaFetch('/.netlify/functions/airtable', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'POST', path: path, payload: { fields: fields } })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[PROVA.atCreate] Fehler:', e.message);
      return null;
    }
  }

  /* ── Record aktualisieren ── */
  async function atPatch(table, recordId, fields) {
    try {
      var path = '/v0/' + AT.BASE + '/' + table + '/' + recordId;
      var res = await provaFetch('/.netlify/functions/airtable', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'PATCH', path: path, payload: { fields: fields } })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[PROVA.atPatch] Fehler:', e.message);
      return null;
    }
  }

  /* ── Auth Guard ── */
  function guard(opts) {
    opts = opts || {};
    // Bevorzuge v2 guard wenn vorhanden
    if (typeof window.provaAuthGuard === 'function') {
      return window.provaAuthGuard(opts);
    }
    // Fallback
    if (!localStorage.getItem('prova_user')) {
      window.location.replace(opts.redirectTo || 'app-login.html');
      return false;
    }
    return true;
  }

  /* ── Topbar-Paket-Badge ausblenden (war dupliziert) ── */
  function hidePaketBadge() {
    var el = document.getElementById('topbar-paket-badge');
    if (el) el.style.display = 'none';
  }

  /* ── Seitentitel setzen ── */
  function setPageTitle(title, sub) {
    var el = document.getElementById('page-title');
    if (el && title) el.textContent = title;
    var subEl = document.getElementById('page-sub');
    if (subEl && sub) subEl.textContent = sub;
    if (title) document.title = title + ' · PROVA';
  }

  /* ── Fehler-State für API-Fehler ── */
  function showApiError(containerId, opts) {
    opts = opts || {};
    var container = document.getElementById(containerId);
    if (!container) return;

    var retryFn  = opts.retry;
    var message  = opts.message || 'Verbindung zu PROVA-Server fehlgeschlagen.';
    var hint     = opts.hint || 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';

    container.innerHTML = [
      '<div style="text-align:center;padding:48px 20px;">',
        '<div style="font-size:32px;margin-bottom:12px;">⚠️</div>',
        '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">' + message + '</div>',
        '<div style="font-size:13px;color:var(--text3);margin-bottom:20px;">' + hint + '</div>',
        retryFn ? '<button onclick="(' + retryFn.toString() + ')()" style="padding:10px 22px;border-radius:8px;background:var(--accent,#4f8ef7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);">🔄 Erneut versuchen</button>' : '',
      '</div>'
    ].join('');
  }

  /* ── Retry-Wrapper für API-Calls ── */
  async function withRetry(fn, retries, delay) {
    retries = retries || 3;
    delay   = delay   || 1500;
    var lastError;
    for (var i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (i < retries - 1) {
          await new Promise(function(r){ setTimeout(r, delay * (i + 1)); });
        }
      }
    }
    throw lastError;
  }

  /* ── Datum-Formatter (war auch dupliziert) ── */
  function formatDatum(isoString, opts) {
    if (!isoString) return '—';
    opts = opts || {};
    try {
      var d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      if (opts.time) {
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
          + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return isoString;
    }
  }

  /* ── Betrag-Formatter ── */
  function formatBetrag(cents) {
    if (typeof cents !== 'number') return '—';
    return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }
  function formatEuro(euro) {
    if (typeof euro !== 'number') return '—';
    return euro.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  /* ── User-Filter für Fälle (server-side Formula) ── */
  function getSVFilter(extraFilter) {
    var email = ctx.email;
    if (ctx.isAdmin) return extraFilter || 'TRUE()';
    if (!email) return 'FALSE()'; // Kein Email → nichts anzeigen (sicher!)
    var baseFilter = '{sv_email}="' + email.replace(/"/g, '') + '"';
    return extraFilter ? 'AND(' + baseFilter + ',' + extraFilter + ')' : baseFilter;
  }

  /* ── DOM bereit abwarten ── */
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* ── Topbar-Badge beim DOM-Bereit ausblenden ── */
  onReady(hidePaketBadge);

  /* ── Globales PROVA-Objekt ── */
  global.PROVA = {
    ctx:          ctx,
    AT:           AT,
    atFetch:      atFetch,
    atGet:        atGet,
    atCreate:     atCreate,
    atPatch:      atPatch,
    guard:        guard,
    setPageTitle: setPageTitle,
    showApiError: showApiError,
    withRetry:    withRetry,
    formatDatum:  formatDatum,
    formatBetrag: formatBetrag,
    formatEuro:   formatEuro,
    getSVFilter:  getSVFilter,
    onReady:      onReady,
    version:      '2.0.0'
  };

  /* ── Backward-Compat: Einzelne Globals die ältere Logic-Files nutzen ── */
  global.provaCtx       = ctx;
  global.provaAtFetch   = atFetch;
  global.provaFormatDatum = formatDatum;

  /* ═════════════════════════════════════════════════════════════════
     PERSÖNLICHER KI-KONTEXT — v2.1
     
     Liest den vom SV in "Einstellungen → Persönlicher KI-Kontext"
     hinterlegten Text (Spezialisierung, bevorzugte Normen etc.) und
     hängt ihn AUTOMATISCH an JEDEN Aufruf von /.netlify/functions/ki-proxy
     als Feld `user_kontext` an. Die 6 Frontend-Call-Sites müssen dafür
     NICHT angepasst werden — der Interceptor wirkt transparent.
     ═════════════════════════════════════════════════════════════════ */

  function getProvaKiKontext() {
    try {
      var s = JSON.parse(localStorage.getItem('prova_einstellungen') || '{}');
      return ((s.ki_kontext || '') + '').trim().slice(0, 1000); // max 1000 Zeichen
    } catch (e) {
      return '';
    }
  }
  global.getProvaKiKontext = getProvaKiKontext;
  ctx.kiKontext = getProvaKiKontext();

  // Session 22: KI-Analyse-Modus (schnell/praezise) → wird vom Server in gpt-4o-mini / gpt-4o übersetzt
  function getProvaKiAnalyseModus() {
    try {
      var s = JSON.parse(localStorage.getItem('prova_einstellungen') || '{}');
      return s.ki_modell === 'praezise' ? 'praezise' : 'schnell';
    } catch (e) { return 'schnell'; }
  }
  global.getProvaKiAnalyseModus = getProvaKiAnalyseModus;

  /* Fetch-Interceptor: packt user_kontext + ki_analyse_modus an jeden ki-proxy-Call */
  if (!global.__provaKiKontextInterceptorInstalled) {
    global.__provaKiKontextInterceptorInstalled = true;
    var origFetch = global.fetch.bind(global);
    global.fetch = function (resource, init) {
      try {
        var urlStr = typeof resource === 'string' ? resource :
                     (resource && resource.url) ? resource.url : '';
        if (urlStr && urlStr.indexOf('/ki-proxy') !== -1 && init && init.body && typeof init.body === 'string') {
          var body = JSON.parse(init.body);
          if (body && typeof body === 'object') {
            var modified = false;
            if (!body.user_kontext) {
              var k = getProvaKiKontext();
              if (k) { body.user_kontext = k; modified = true; }
            }
            if (!body.ki_analyse_modus) {
              body.ki_analyse_modus = getProvaKiAnalyseModus();
              modified = true;
            }
            if (modified) init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      } catch (e) { /* silent — Interceptor darf niemals den Call brechen */ }
      return origFetch(resource, init);
    };
  }

  /* ═════════════════════════════════════════════════════════════════
     SESSION 26: Zentraler Onboarding-Sync-Helper
     Ersetzt 3 duplizierte Stellen (onboarding-logic, dashboard-logic,
     onboarding-schnellstart) durch einen einheitlichen Aufruf.

     window.provaMarkOnboardingDone() macht:
     1. localStorage['prova_onboarding_done'] = 'true'
     2. Airtable-Patch mit onboarding_done: true auf SV-Record (via Email-Lookup)
     3. Idempotent: doppelter Call schadet nicht
     4. Fehlertolerant: wenn kein Netz, nur localStorage — kein Block für den User
     ═════════════════════════════════════════════════════════════════ */
  global.provaMarkOnboardingDone = async function() {
    // Lokal IMMER setzen — auch bei Netzwerk-Ausfall
    try { localStorage.setItem('prova_onboarding_done', 'true'); } catch(e) {}

    // Airtable-Patch — fehlertolerant
    try {
      var email = localStorage.getItem('prova_sv_email') || '';
      if (!email) return { ok: false, grund: 'keine_email' };

      var atId = localStorage.getItem('prova_at_sv_record_id') ||
                 localStorage.getItem('prova_sv_record_id') || '';

      // Wenn Record-ID schon bekannt: direkter PATCH
      if (atId) {
        await provaFetch('/.netlify/functions/airtable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method:  'PATCH',
            path:    '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB/' + atId,
            payload: { fields: { onboarding_done: true } }
          })
        });
        return { ok: true, via: 'direkt' };
      }

      // Sonst: erst Record-ID per Email-Lookup holen, dann patchen
      var findRes = await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          path:   '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB' +
                  '?filterByFormula=' + encodeURIComponent('{Email}="' + email + '"') +
                  '&maxRecords=1'
        })
      });
      if (!findRes.ok) return { ok: false, grund: 'lookup_http_' + findRes.status };
      var findData = await findRes.json();
      var records = findData.records || [];
      if (!records.length) return { ok: false, grund: 'kein_record' };

      var recId = records[0].id;
      try { localStorage.setItem('prova_at_sv_record_id', recId); } catch(e) {}

      await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method:  'PATCH',
          path:    '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB/' + recId,
          payload: { fields: { onboarding_done: true } }
        })
      });
      return { ok: true, via: 'lookup' };
    } catch(e) {
      console.warn('[PROVA] Onboarding-Airtable-Sync fehlgeschlagen:', e.message);
      return { ok: false, grund: 'exception', error: e.message };
    }
  };

})(window);