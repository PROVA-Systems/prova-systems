/**
 * PROVA — prova-api-cache.js
 * Zentrales Request-Deduplication und Client-Side Caching.
 *
 * Problem: Wenn ein SV schnell zwischen Tabs wechselt, laufen
 * 5 identische Airtable-Requests parallel. Der letzte gewinnt,
 * die anderen 4 waren Netzwerk-Verschwendung.
 *
 * Lösung (wie React Query / SWR):
 *   1. Gleiche URL → gleicher laufender Request (kein Duplicate)
 *   2. Antwort für 30s im Memory cachen
 *   3. Cache nach Schreib-Operation für betroffene Tabelle invalidieren
 *
 * Lädt VOR nav.js und prova-auth-api.js auf jeder App-Seite.
 */
(function() {
  'use strict';

  /* ── In-Flight Request Deduplication ── */
  var _inFlight = {}; // URL → Promise

  /* ── Response Cache (Memory, max 30s TTL) ── */
  var _cache = {};    // URL → { data, ts, ttl }

  var DEFAULT_TTL = 30 * 1000; // 30 Sekunden

  /**
   * Gecachter GET-Request mit Deduplication
   * Gleiche URL = gleicher Request, nie doppelt
   */
  function cachedFetch(url, options, ttlMs) {
    var cacheKey = url + (options && options.body ? '::' + options.body : '');
    var ttl = ttlMs !== undefined ? ttlMs : DEFAULT_TTL;

    // 1. Cache-Hit: frische Daten vorhanden
    var cached = _cache[cacheKey];
    if (cached && (Date.now() - cached.ts) < cached.ttl) {
      return Promise.resolve(cached.data);
    }

    // 2. Deduplication: gleicher Request läuft bereits
    if (_inFlight[cacheKey]) {
      return _inFlight[cacheKey];
    }

    // 3. Neuer Request
    var authHeaders = window.provaAuthHeaders ? window.provaAuthHeaders() : { 'Content-Type': 'application/json' };
    var fetchOpts = Object.assign({ method: 'POST', headers: authHeaders }, options || {});

    var promise = fetch(url, fetchOpts)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        // Im Cache speichern
        if (ttl > 0) {
          _cache[cacheKey] = { data: data, ts: Date.now(), ttl: ttl };
        }
        delete _inFlight[cacheKey];
        return data;
      })
      .catch(function(err) {
        delete _inFlight[cacheKey];
        throw err;
      });

    _inFlight[cacheKey] = promise;
    return promise;
  }

  /**
   * Cache für eine Tabelle/URL invalidieren
   * Nach jedem PATCH/DELETE/POST aufrufen
   */
  function invalidateCache(tableIdOrUrl) {
    Object.keys(_cache).forEach(function(key) {
      if (key.includes(tableIdOrUrl)) {
        delete _cache[key];
      }
    });
  }

  /**
   * Airtable-Abfrage mit Deduplication (Hauptfunktion)
   * @param {string} path - Airtable API Pfad (z.B. /v0/appXXX/tblXXX?...)
   * @param {number} [ttlMs] - Cache-TTL in ms (0 = kein Cache)
   */
  function airtableGet(path, ttlMs) {
    return cachedFetch(
      '/.netlify/functions/airtable',
      {
        method: 'POST',
        body: JSON.stringify({ method: 'GET', path: path })
      },
      ttlMs
    );
  }

  /**
   * Alle laufenden Requests und Cache leeren
   * Bei Logout aufrufen
   */
  function clearAll() {
    _cache = {};
    _inFlight = {};
  }

  /* ── Cache bei Logout leeren ── */
  window.addEventListener('prova:logout', clearAll);

  /* ── Global verfügbar machen ── */
  window.PROVA_API = {
    cachedFetch:     cachedFetch,
    invalidateCache: invalidateCache,
    airtableGet:     airtableGet,
    clearAll:        clearAll,
    // Stats für Debugging
    getStats: function() {
      return {
        cacheSize:    Object.keys(_cache).length,
        inFlightSize: Object.keys(_inFlight).length,
        cacheKeys:    Object.keys(_cache),
      };
    },
  };

})();
