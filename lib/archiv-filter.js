/* ════════════════════════════════════════════════════════════
   PROVA archiv-filter.js (MEGA²⁸ V3.2-W2 KORR-10)
   Pure-Function-Library für Archiv-Filter.

   Reine Funktionen — testbar ohne DOM/Browser.
   Wrapper-Logik (DOM-Read + Render) bleibt in archiv-logic.js.

   UMD-Pattern: Browser (window.ArchivFilter) + Node (module.exports).
═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArchivFilter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Auftragstyp → Flow Mapping (Fallback wenn Flow-Feld leer) */
  var ART_ZU_FLOW = {
    'gerichtsgutachten': 'A', 'versicherungsgutachten': 'A', 'privatgutachten': 'A',
    'schiedsgutachten': 'A', 'beweissicherung': 'A', 'ergaenzungsgutachten': 'A', 'gegengutachten': 'A',
    'kaufberatung': 'C', 'sanierungsberatung': 'C', 'bauherrenberatung': 'C',
    'baubegleitung': 'D', 'bauabnahme': 'D',
    'verkehrswert': 'B', 'beleihungswert': 'B', 'mietwert': 'B'
  };

  /* Status → Phase Mapping (Fallback) */
  var STATUS_ZU_PHASE = {
    'neuer auftrag': 1, 'auftrag erhalten': 1,
    'in bearbeitung': 5, 'ortstermin': 2, 'messung': 3, 'recherche': 4, 'schreiben': 5,
    'entwurf fertig': 6, 'qualitätsprüfung': 6, 'zur freigabe': 7,
    'freigegeben': 7, 'pdf erstellt': 7,
    'versendet': 8, 'abgeschlossen': 9, 'exportiert': 9
  };

  /* Status-Buckets für f-status Filter */
  var STATUS_BUCKETS = {
    'bearbeitung': ['in bearbeitung', 'überarbeitung', 'ortstermin', 'messung', 'schreiben', 'recherche'],
    'entwurf': ['entwurf fertig', 'qualitätsprüfung', 'zur freigabe'],
    'freigegeben': ['freigegeben', 'pdf erstellt'],
    'versendet': ['versendet', 'abgeschlossen'],
    'exportiert': ['exportiert'],
    'archiviert': ['archiviert']
  };

  /* DEFAULT_CRITERIA — Initial-State + Reset-Target */
  var DEFAULT_CRITERIA = Object.freeze({
    such: '',
    flow: '',
    art: '',
    phase: '',
    schadenart: '',
    zeitraum: '',
    status: '',
    demo: 'all'  // 'all' | 'only' | 'hide'
  });

  function getDefaultCriteria() {
    return Object.assign({}, DEFAULT_CRITERIA);
  }

  function getFlowFromRecord(r) {
    var f = (r && r.fields) || {};
    if (f.Flow) return String(f.Flow).toUpperCase().charAt(0);
    var art = (f.Auftragstyp || '').toLowerCase();
    return ART_ZU_FLOW[art] || '';
  }

  function getPhaseFromRecord(r) {
    var f = (r && r.fields) || {};
    if (f.Phase) {
      var p = parseInt(f.Phase, 10);
      if (!isNaN(p) && p >= 1 && p <= 9) return p;
    }
    var st = (f.Status || '').toLowerCase();
    for (var key in STATUS_ZU_PHASE) {
      if (st.indexOf(key) !== -1) return STATUS_ZU_PHASE[key];
    }
    return 0;
  }

  function isDemoRecord(r) {
    var f = (r && r.fields) || {};
    if (f.is_demo === true || f.is_demo === 'true') return true;
    var az = (f.Aktenzeichen || '').toUpperCase();
    return /^SCH-DEMO-/i.test(az);
  }

  function matchStatus(record, statusBucket) {
    if (!statusBucket) return true;
    var f = (record && record.fields) || {};
    var st = (f.Status || '').toLowerCase();
    var matchers = STATUS_BUCKETS[statusBucket.toLowerCase()];
    if (!matchers) return true;
    for (var i = 0; i < matchers.length; i++) {
      if (st.indexOf(matchers[i]) !== -1) return true;
    }
    return false;
  }

  function matchZeitraum(record, zr, now) {
    if (!zr) return true;
    var f = (record && record.fields) || {};
    if (!f.Timestamp) return false;
    var ts = new Date(f.Timestamp).getTime();
    if (isNaN(ts)) return false;
    if (zr === 'jahr') {
      return new Date(f.Timestamp).getFullYear() === new Date(now).getFullYear();
    }
    var tage = zr === '30' ? 30 : zr === '90' ? 90 : 365;
    return (now - ts) <= tage * 24 * 60 * 60 * 1000;
  }

  function matchSearch(record, such) {
    if (!such) return true;
    var f = (record && record.fields) || {};
    var s = such.toLowerCase();
    var az = (f.Aktenzeichen || '').toLowerCase();
    var addr = [(f.Schaden_Strasse || ''), (f.Ort || '')].join(' ').toLowerCase();
    var ag = (f.Auftraggeber_Name || '').toLowerCase();
    var art = (f.Schadensart || f.schadenart || '').toLowerCase();
    var at = (f.Auftragstyp || '').toLowerCase();
    return az.indexOf(s) !== -1 ||
           addr.indexOf(s) !== -1 ||
           ag.indexOf(s) !== -1 ||
           art.indexOf(s) !== -1 ||
           at.indexOf(s) !== -1;
  }

  function matchDemo(record, demoFlag) {
    if (!demoFlag || demoFlag === 'all') return true;
    var isDemo = isDemoRecord(record);
    if (demoFlag === 'only') return isDemo;
    if (demoFlag === 'hide') return !isDemo;
    return true;
  }

  function applyFilters(records, criteria, options) {
    if (!Array.isArray(records)) return [];
    var c = Object.assign({}, DEFAULT_CRITERIA, criteria || {});
    var now = (options && options.now) || Date.now();

    return records.filter(function (r) {
      if (c.flow && getFlowFromRecord(r) !== c.flow) return false;
      if (c.art) {
        var recArt = ((r.fields && r.fields.Auftragstyp) || '').toLowerCase();
        if (recArt !== c.art.toLowerCase()) return false;
      }
      if (c.phase) {
        var recPhase = getPhaseFromRecord(r);
        if (String(recPhase) !== String(c.phase)) return false;
      }
      if (c.schadenart) {
        var saField = ((r.fields && (r.fields.Schadensart || r.fields.schadenart)) || '').toLowerCase();
        if (saField.indexOf(c.schadenart.toLowerCase()) === -1) return false;
      }
      if (!matchZeitraum(r, c.zeitraum, now)) return false;
      if (!matchStatus(r, c.status)) return false;
      if (!matchDemo(r, c.demo)) return false;
      if (!matchSearch(r, c.such)) return false;
      return true;
    });
  }

  return {
    applyFilters: applyFilters,
    getDefaultCriteria: getDefaultCriteria,
    getFlowFromRecord: getFlowFromRecord,
    getPhaseFromRecord: getPhaseFromRecord,
    isDemoRecord: isDemoRecord,
    matchStatus: matchStatus,
    matchZeitraum: matchZeitraum,
    matchSearch: matchSearch,
    matchDemo: matchDemo,
    STATUS_BUCKETS: STATUS_BUCKETS,
    DEFAULT_CRITERIA: DEFAULT_CRITERIA
  };
}));
