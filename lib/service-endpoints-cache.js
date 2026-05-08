/**
 * PROVA — service-endpoints-cache.js (MEGA³⁷ C4)
 *
 * Browser-Cache für service_endpoints (Make-Webhooks etc.). Lädt einmalig
 * via /.netlify/functions/list-service-endpoints und liefert dann lookups
 * by service_key oder service_type.
 *
 * Public API:
 *   await ProvaServiceEndpoints.byKey('make:l3-lifecycle-trial')
 *     → {service_key, endpoint_url, service_type, description, active}|null
 *   await ProvaServiceEndpoints.byType('make') → array
 *   ProvaServiceEndpoints.invalidate()
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProvaServiceEndpoints = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  let _cache = null;
  let _cachePromise = null;
  let _cacheTime = 0;
  const TTL_MS = 5 * 60 * 1000;

  function isFresh() { return _cache && (Date.now() - _cacheTime) < TTL_MS; }

  async function loadFromBackend() {
    const fetcher = (typeof window !== 'undefined')
      ? (window.provaFetch || window.fetch.bind(window))
      : null;
    if (!fetcher) throw new Error('Kein Fetcher verfügbar (Browser-only Lib)');
    const resp = await fetcher('/.netlify/functions/list-service-endpoints', { method: 'GET' });
    if (!resp.ok) throw new Error('list-service-endpoints HTTP ' + resp.status);
    const data = await resp.json();
    return Array.isArray(data && data.endpoints) ? data.endpoints : [];
  }

  async function _ensureLoaded() {
    if (isFresh()) return _cache;
    if (_cachePromise) return _cachePromise;
    _cachePromise = loadFromBackend().then(rows => {
      _cache = rows; _cacheTime = Date.now(); _cachePromise = null;
      return rows;
    }).catch(e => { _cachePromise = null; throw e; });
    return _cachePromise;
  }

  async function byKey(serviceKey) {
    if (!serviceKey) return null;
    const rows = await _ensureLoaded();
    return rows.find(r => r.service_key === serviceKey && r.active !== false) || null;
  }

  async function byType(serviceType) {
    if (!serviceType) return [];
    const rows = await _ensureLoaded();
    return rows.filter(r => r.service_type === serviceType && r.active !== false);
  }

  function invalidate() {
    _cache = null; _cacheTime = 0; _cachePromise = null;
  }

  function _setCacheForTests(rows) {
    _cache = Array.isArray(rows) ? rows : null;
    _cacheTime = rows ? Date.now() : 0;
  }

  return {
    byKey: byKey,
    byType: byType,
    invalidate: invalidate,
    _setCacheForTests: _setCacheForTests,
    _TTL_MS: TTL_MS
  };
}));
