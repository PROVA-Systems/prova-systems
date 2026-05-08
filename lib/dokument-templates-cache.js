/**
 * PROVA — dokument-templates-cache.js (MEGA³⁶ W6.1)
 *
 * In-Memory-Cache für die dokument_templates-Tabelle (DB-Lookup statt
 * PROVA_TEMPLATE_*-ENVs). Lädt einmalig beim ersten Zugriff via
 * /.netlify/functions/list-dokument-templates und liefert dann lookups
 * by code (z. B. 'F-04', 'K-01').
 *
 * Browser-only (kein Node). Nutzt window.provaFetch oder window.fetch.
 *
 * Public API:
 *   await ProvaDokumentTemplates.byCode('F-04') → {id, name, typ, ...}|null
 *   await ProvaDokumentTemplates.byTyp('mahnung_2') → array
 *   ProvaDokumentTemplates.invalidate() — Cache leeren (nach SEED-Updates)
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProvaDokumentTemplates = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  let _cache = null;          // Array oder null
  let _cachePromise = null;   // De-duplication für gleichzeitige Erstaufrufe
  let _cacheTime = 0;
  const TTL_MS = 5 * 60 * 1000; // 5 Min — Templates ändern sich selten

  function isFresh() { return _cache && (Date.now() - _cacheTime) < TTL_MS; }

  async function loadFromBackend() {
    const fetcher = (typeof window !== 'undefined')
      ? (window.provaFetch || window.fetch.bind(window))
      : null;
    if (!fetcher) throw new Error('Kein Fetcher verfügbar (Browser-only Lib)');
    const resp = await fetcher('/.netlify/functions/list-dokument-templates', { method: 'GET' });
    if (!resp.ok) throw new Error('list-dokument-templates HTTP ' + resp.status);
    const data = await resp.json();
    return Array.isArray(data && data.templates) ? data.templates : [];
  }

  async function _ensureLoaded() {
    if (isFresh()) return _cache;
    if (_cachePromise) return _cachePromise;
    _cachePromise = loadFromBackend().then(rows => {
      _cache = rows;
      _cacheTime = Date.now();
      _cachePromise = null;
      return rows;
    }).catch(e => {
      _cachePromise = null;
      throw e;
    });
    return _cachePromise;
  }

  async function byCode(code) {
    if (!code) return null;
    const rows = await _ensureLoaded();
    return rows.find(t => t.pdfmonkey_template_id === code) || null;
  }

  async function byTyp(typ) {
    if (!typ) return [];
    const rows = await _ensureLoaded();
    return rows.filter(t => t.typ === typ && t.aktiv !== false);
  }

  async function defaultForTyp(typ) {
    const matches = await byTyp(typ);
    return matches.find(t => t.is_default_for_typ === true) || matches[0] || null;
  }

  function invalidate() {
    _cache = null;
    _cacheTime = 0;
    _cachePromise = null;
  }

  function _setCacheForTests(rows) {
    _cache = Array.isArray(rows) ? rows : null;
    _cacheTime = rows ? Date.now() : 0;
  }

  return {
    byCode: byCode,
    byTyp: byTyp,
    defaultForTyp: defaultForTyp,
    invalidate: invalidate,
    _setCacheForTests: _setCacheForTests,
    _TTL_MS: TTL_MS
  };
}));
