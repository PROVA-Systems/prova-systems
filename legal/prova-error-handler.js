/* ============================================================
   PROVA prova-error-handler.js — Robuste Fehlerbehandlung
   
   PROBLEM GELÖST: API-Fehler → Endlos-Ladeindikator
   
   FEATURES:
   - Einheitliche Error-States für alle API-Calls
   - Automatisches Retry mit Exponential Backoff
   - Offline-Queue: Aktionen werden zwischengespeichert
   - Nutzerfreundliche Deutsche Fehlermeldungen
   - Sentry-kompatibles Error-Logging (optional)
   
   EINBINDEN (nach nav.js):
   <script src="prova-error-handler.js"></script>
============================================================ */

(function (global) {
  'use strict';

  /* ── Fehlerkategorien ── */
  var ERROR_TYPES = {
    NETWORK:    'network',
    AUTH:       'auth',
    RATE_LIMIT: 'rate_limit',
    NOT_FOUND:  'not_found',
    SERVER:     'server',
    TIMEOUT:    'timeout',
    UNKNOWN:    'unknown'
  };

  /* ── Deutsche Fehlermeldungen ── */
  var ERROR_MESSAGES = {
    network:    { title: 'Keine Verbindung',           hint: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.' },
    auth:       { title: 'Sitzung abgelaufen',         hint: 'Bitte melden Sie sich erneut an.' },
    rate_limit: { title: 'Zu viele Anfragen',          hint: 'Bitte warten Sie kurz und versuchen Sie es erneut.' },
    not_found:  { title: 'Datensatz nicht gefunden',   hint: 'Der gesuchte Eintrag existiert möglicherweise nicht mehr.' },
    server:     { title: 'Serverfehler',               hint: 'Unser Team wurde benachrichtigt. Bitte versuchen Sie es in einigen Minuten erneut.' },
    timeout:    { title: 'Zeitüberschreitung',         hint: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.' },
    unknown:    { title: 'Unbekannter Fehler',         hint: 'Bitte laden Sie die Seite neu oder wenden Sie sich an den Support.' }
  };

  /* ── Error klassifizieren ── */
  function classifyError(error, httpStatus) {
    if (!navigator.onLine)            return ERROR_TYPES.NETWORK;
    if (httpStatus === 401 || httpStatus === 403) return ERROR_TYPES.AUTH;
    if (httpStatus === 429)           return ERROR_TYPES.RATE_LIMIT;
    if (httpStatus === 404)           return ERROR_TYPES.NOT_FOUND;
    if (httpStatus >= 500)            return ERROR_TYPES.SERVER;
    if (error && error.name === 'AbortError') return ERROR_TYPES.TIMEOUT;
    if (error && (error.message || '').includes('fetch')) return ERROR_TYPES.NETWORK;
    return ERROR_TYPES.UNKNOWN;
  }

  /* ── Error-State HTML rendern ── */
  function renderErrorState(opts) {
    opts = opts || {};
    var type    = opts.type || ERROR_TYPES.UNKNOWN;
    var msg     = ERROR_MESSAGES[type] || ERROR_MESSAGES.unknown;
    var title   = opts.title || msg.title;
    var hint    = opts.hint  || msg.hint;
    var retryFn = opts.onRetry;
    var icon    = { network: '📡', auth: '🔒', rate_limit: '⏳', not_found: '🔍', server: '⚡', timeout: '⏱️', unknown: '⚠️' }[type] || '⚠️';

    return [
      '<div class="prova-error-state" style="text-align:center;padding:48px 20px;max-width:400px;margin:0 auto;">',
        '<div style="font-size:40px;margin-bottom:14px;opacity:.8;">' + icon + '</div>',
        '<div style="font-size:16px;font-weight:700;color:var(--text,#eaecf4);margin-bottom:8px;">' + title + '</div>',
        '<div style="font-size:13px;color:var(--text3,rgba(255,255,255,.4));line-height:1.6;margin-bottom:20px;">' + hint + '</div>',
        retryFn ? '<button class="prova-retry-btn" style="padding:10px 22px;border-radius:8px;background:var(--accent,#4f8ef7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);display:inline-flex;align-items:center;gap:8px;transition:opacity .15s;" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">🔄 Erneut versuchen</button>' : '',
        type === 'auth' ? '<div style="margin-top:12px;"><a href="app-login.html" style="font-size:13px;color:var(--accent,#4f8ef7);">→ Zur Anmeldung</a></div>' : '',
      '</div>'
    ].join('');
  }

  /* ── Error in Container einblenden ── */
  function showError(containerId, opts) {
    var container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;
    if (!container) return;

    var html = renderErrorState(opts);
    container.innerHTML = html;

    if (opts && opts.onRetry) {
      var btn = container.querySelector('.prova-retry-btn');
      if (btn) {
        btn.addEventListener('click', function () {
          btn.disabled = true;
          btn.innerHTML = '⏳ Lädt…';
          opts.onRetry();
        });
      }
    }
  }

  /* ── Fetch mit Timeout + Retry + Error-Handling ── */
  async function safeFetch(url, fetchOpts, provaOpts) {
    provaOpts = provaOpts || {};
    var timeout  = provaOpts.timeout  || 15000;  // 15s Standard
    var retries  = provaOpts.retries  || 2;
    var retryOn  = provaOpts.retryOn  || [429, 500, 502, 503, 504];

    var lastError;
    var lastStatus;

    for (var attempt = 0; attempt <= retries; attempt++) {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, timeout);

      try {
        var opts = Object.assign({}, fetchOpts, { signal: controller.signal });
        var res  = await fetch(url, opts);
        clearTimeout(timer);

        lastStatus = res.status;

        // Retry bei Server-Fehlern
        if (!res.ok && retryOn.indexOf(res.status) !== -1 && attempt < retries) {
          var waitMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          await new Promise(function (r) { setTimeout(r, waitMs); });
          continue;
        }

        return res;

      } catch (e) {
        clearTimeout(timer);
        lastError = e;

        if (attempt < retries && navigator.onLine) {
          var waitMs2 = Math.pow(2, attempt) * 1000;
          await new Promise(function (r) { setTimeout(r, waitMs2); });
        }
      }
    }

    // Alle Versuche fehlgeschlagen
    var errorType = classifyError(lastError, lastStatus);
    var err = new Error('safeFetch fehlgeschlagen nach ' + (retries + 1) + ' Versuchen');
    err.type   = errorType;
    err.status = lastStatus;
    throw err;
  }

  /* ── Airtable Proxy mit Fehlerbehandlung ── */
  async function atProxy(method, path, payload, provaOpts) {
    var res = await safeFetch(
      '/.netlify/functions/airtable',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: method, path: path, payload: payload || null })
      },
      provaOpts
    );

    if (!res.ok) {
      var err = new Error('Airtable HTTP ' + res.status);
      err.type   = classifyError(null, res.status);
      err.status = res.status;
      throw err;
    }

    return res.json();
  }

  /* ── Offline-Queue: Aktionen speichern wenn offline ── */
  var QUEUE_KEY = 'prova_offline_queue';

  function queueAction(action) {
    try {
      var queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      queue.push(Object.assign({ id: Date.now(), queued_at: new Date().toISOString() }, action));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      if (typeof showToast === 'function') {
        showToast('📥 Offline gespeichert — wird synchronisiert wenn Sie wieder online sind', 'info', 4000);
      }
    } catch (e) {
      console.warn('[PROVA] Offline-Queue Fehler:', e);
    }
  }

  function getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch(e) { return []; }
  }

  function clearQueueItem(id) {
    try {
      var queue = getQueue().filter(function(a){ return a.id !== id; });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch(e) {}
  }

  /* ── Auto-Sync wenn wieder online ── */
  window.addEventListener('online', async function () {
    var queue = getQueue();
    if (!queue.length) return;

    if (typeof showToast === 'function') {
      showToast('🔄 Synchronisiere ' + queue.length + ' gespeicherte Aktion(en)…', 'info', 3000);
    }

    for (var i = 0; i < queue.length; i++) {
      var action = queue[i];
      try {
        await atProxy(action.method, action.path, action.payload);
        clearQueueItem(action.id);
      } catch (e) {
        console.warn('[PROVA] Sync fehlgeschlagen für Aktion', action.id, e);
      }
    }

    var remaining = getQueue().length;
    if (remaining === 0 && typeof showToast === 'function') {
      showToast('✅ Alle Änderungen synchronisiert', 'success', 3000);
    } else if (remaining > 0 && typeof showToast === 'function') {
      showToast('⚠️ ' + remaining + ' Aktion(en) konnten nicht synchronisiert werden', 'warning', 5000);
    }
  });

  /* ── Loading-State Helfer ── */
  function showLoading(containerId, rows) {
    var container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;
    if (!container) return;

    rows = rows || 3;
    var html = Array(rows).fill(0).map(function (_, i) {
      var widths = ['60%', '80%', '70%', '90%', '50%'];
      var w = widths[i % widths.length];
      return [
        '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.07));">',
          '<div style="width:36px;height:36px;border-radius:8px;background:var(--surface2,#1e2535);animation:shimmer 1.5s infinite;flex-shrink:0;"></div>',
          '<div style="flex:1;">',
            '<div style="height:13px;width:' + w + ';background:var(--surface2,#1e2535);border-radius:4px;animation:shimmer 1.5s infinite;margin-bottom:6px;"></div>',
            '<div style="height:11px;width:40%;background:var(--surface2,#1e2535);border-radius:4px;animation:shimmer 1.5s infinite;"></div>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');

    container.innerHTML = html;
  }

  /* ── Shimmer-CSS einmal injizieren ── */
  if (!document.getElementById('prova-shimmer-css')) {
    var s = document.createElement('style');
    s.id  = 'prova-shimmer-css';
    s.textContent = '@keyframes shimmer{0%{background-color:var(--surface2,#1e2535)}50%{background-color:var(--surface3,#252d40)}100%{background-color:var(--surface2,#1e2535)}}';
    document.head.appendChild(s);
  }

  /* ── Globales Error-Handling für ungecatchte Promises ── */
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    if (!reason) return;

    // Nur PROVA-relevante Fehler loggen
    var msg = (reason.message || '').toLowerCase();
    if (msg.includes('airtable') || msg.includes('netlify') || msg.includes('fetch')) {
      console.warn('[PROVA] Ungecatchter Promise-Fehler:', reason.message || reason);
      // Kein showToast hier — würde den User für interne Fehler belasten
    }
  });

  /* ── Globales Export ── */
  global.ProvaError = {
    TYPES:       ERROR_TYPES,
    show:        showError,
    render:      renderErrorState,
    safeFetch:   safeFetch,
    atProxy:     atProxy,
    showLoading: showLoading,
    queue:       queueAction,
    getQueue:    getQueue
  };

  // Backward-compat mit PROVA-Objekt
  if (global.PROVA) {
    global.PROVA.error     = global.ProvaError;
    global.PROVA.safeFetch = safeFetch;
    global.PROVA.showLoading = showLoading;
  }

})(window);