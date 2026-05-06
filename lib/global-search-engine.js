/* ════════════════════════════════════════════════════════════
   PROVA global-search-engine.js (MEGA²⁸ V3.2-W2 KORR-7)
   Pure-Function-Engine für Cmd+K Globale Suche.

   Reine Filter-Funktionen (keine DOM-Abhängigkeit) — testbar in Node.
   global-search.js bleibt als UI-Wrapper bestehen und kann diese Engine
   optional adoptieren (PROVASearch._search delegate to engine).

   UMD: Browser (window.GlobalSearchEngine) + Node (module.exports).
═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GlobalSearchEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase().trim();
  }

  function tokenMatch(haystack, query) {
    if (!query) return true;
    var h = normalize(haystack);
    return h.indexOf(normalize(query)) !== -1;
  }

  function searchPages(pages, query, options) {
    if (!Array.isArray(pages)) return [];
    var q = normalize(query);
    if (!q) return [];
    var limit = (options && options.limit) || 100;
    return pages.filter(function (p) {
      return tokenMatch(p && p.label, q);
    }).slice(0, limit);
  }

  function searchNormen(normen, query, options) {
    if (!Array.isArray(normen)) return [];
    var q = normalize(query);
    if (!q) return [];
    var limit = (options && options.limit) || 5;
    return normen.filter(function (n) {
      if (!n) return false;
      return tokenMatch(n.num, q) || tokenMatch(n.titel, q) || tokenMatch(n.bereich, q);
    }).slice(0, limit);
  }

  function searchCases(cases, query, options) {
    if (!Array.isArray(cases)) return [];
    var q = normalize(query);
    if (!q) return [];
    var limit = (options && options.limit) || 5;
    return cases.filter(function (c) {
      if (!c) return false;
      return tokenMatch(c.az, q) ||
             tokenMatch(c.auftraggeber, q) ||
             tokenMatch(c.adresse, q);
    }).slice(0, limit);
  }

  function highlightMatch(text, query) {
    if (text == null) return '';
    var t = String(text);
    if (!query) return t;
    var q = normalize(query);
    var idx = normalize(t).indexOf(q);
    if (idx < 0) return t;
    return t.slice(0, idx) +
           '<mark>' + t.slice(idx, idx + q.length) + '</mark>' +
           t.slice(idx + q.length);
  }

  function dedupeByHref(items) {
    if (!Array.isArray(items)) return [];
    var seen = {};
    return items.filter(function (it) {
      if (!it || !it.href) return true;
      if (seen[it.href]) return false;
      seen[it.href] = true;
      return true;
    });
  }

  function buildResults(query, sources, options) {
    var q = normalize(query);
    var groups = [];
    sources = sources || {};

    if (Array.isArray(sources.pages)) {
      var pages = searchPages(sources.pages, q, { limit: (options && options.pageLimit) || 100 });
      if (pages.length) groups.push({ group: 'Seiten', items: pages });
    }
    if (Array.isArray(sources.normen)) {
      var normen = searchNormen(sources.normen, q, { limit: (options && options.normenLimit) || 5 });
      if (normen.length) groups.push({ group: 'Normen', items: normen });
    }
    if (Array.isArray(sources.cases)) {
      var cases = searchCases(sources.cases, q, { limit: (options && options.caseLimit) || 5 });
      if (cases.length) groups.push({ group: 'Fälle', items: cases });
    }
    return groups;
  }

  function flattenGroups(groups) {
    if (!Array.isArray(groups)) return [];
    var out = [];
    groups.forEach(function (g) {
      if (!g) return;
      if (g.group) out.push({ group: g.group });
      if (Array.isArray(g.items)) {
        g.items.forEach(function (it) { out.push(it); });
      }
    });
    return out;
  }

  return {
    normalize: normalize,
    tokenMatch: tokenMatch,
    searchPages: searchPages,
    searchNormen: searchNormen,
    searchCases: searchCases,
    highlightMatch: highlightMatch,
    dedupeByHref: dedupeByHref,
    buildResults: buildResults,
    flattenGroups: flattenGroups
  };
}));
