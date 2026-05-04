/**
 * PROVA Mode-C Helpers (Vanilla-JS)
 * MEGA¹⁷ W50/W52 (2026-05-08)
 *
 * Public API (browser via window.ProvaModeC, node via module.exports):
 *   ProvaModeC.PROVA_FIELDS                   // [{ key, label, group }, ...]
 *   ProvaModeC.smartGuessField(varName)       // → 'akte.az' | null
 *   ProvaModeC.interpolateHtml(html, mapping, dataContext) → string
 *   ProvaModeC.collectMappingValues(mapping, dataContext) → { var: value }
 *   ProvaModeC.escapeHtml(s)                  // basic XSS-Defense
 *
 * Anti-Patterns vermieden:
 *   - Auto-Detection ist nur Vorschlag (User kann override)
 *   - Missing Keys werden NICHT silent ignoriert (returnt Liste)
 *   - HTML-Escape bei Interpolation (XSS-Defense)
 *   - Keine externe Dependency (keine Lib-Imports)
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ProvaModeC = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  // ─── PROVA_FIELDS ────────────────────────────────────────────
  // Felder, die in einer Akte mappable sind. Stable Schema-Pfade
  // entsprechen dem JSONB-Layout in `auftraege` + `kontakte`.
  const PROVA_FIELDS = [
    // Akten-Kern
    { key: 'akte.az',                  label: 'Aktenzeichen',                    group: 'Akte' },
    { key: 'akte.titel',               label: 'Titel / Kurzbezeichnung',         group: 'Akte' },
    { key: 'akte.fragestellung',       label: 'Fragestellung',                   group: 'Akte' },
    { key: 'akte.schadensart_label',   label: 'Schadensart',                     group: 'Akte' },
    { key: 'akte.auftragsdatum',       label: 'Auftragsdatum',                   group: 'Akte' },
    { key: 'akte.gutachtendatum',      label: 'Gutachten-Datum',                 group: 'Akte' },
    { key: 'akte.schadensstichtag',    label: 'Schadensstichtag',                group: 'Akte' },
    // Objekt
    { key: 'akte.objekt.adresse',      label: 'Objekt-Adresse',                  group: 'Objekt' },
    { key: 'akte.objekt.plz',          label: 'Objekt-PLZ',                      group: 'Objekt' },
    { key: 'akte.objekt.ort',          label: 'Objekt-Ort',                      group: 'Objekt' },
    { key: 'akte.objekt.objektart',    label: 'Objekt-Art',                      group: 'Objekt' },
    { key: 'akte.objekt.baujahr',      label: 'Baujahr',                         group: 'Objekt' },
    { key: 'akte.objekt.wohnflaeche',  label: 'Wohnflaeche (m²)',                group: 'Objekt' },
    // Auftraggeber (Kontakte)
    { key: 'kunde.name',               label: 'Auftraggeber Name',               group: 'Auftraggeber' },
    { key: 'kunde.adresse',            label: 'Auftraggeber Adresse',            group: 'Auftraggeber' },
    { key: 'kunde.plz',                label: 'Auftraggeber PLZ',                group: 'Auftraggeber' },
    { key: 'kunde.ort',                label: 'Auftraggeber Ort',                group: 'Auftraggeber' },
    { key: 'kunde.email',              label: 'Auftraggeber Email',              group: 'Auftraggeber' },
    { key: 'kunde.telefon',            label: 'Auftraggeber Telefon',            group: 'Auftraggeber' },
    // SV-Eigene
    { key: 'sv.name',                  label: 'SV Name',                         group: 'Sachverstaendiger' },
    { key: 'sv.titel',                 label: 'SV Titel',                        group: 'Sachverstaendiger' },
    { key: 'sv.kanzlei',               label: 'SV Kanzlei',                      group: 'Sachverstaendiger' },
    { key: 'sv.adresse',               label: 'SV Adresse',                      group: 'Sachverstaendiger' },
    { key: 'sv.email',                 label: 'SV Email',                        group: 'Sachverstaendiger' },
    // Honorar
    { key: 'akte.kosten_geschaetzt_brutto', label: 'Kosten geschaetzt (brutto)', group: 'Honorar' },
    { key: 'akte.kosten_geschaetzt_netto',  label: 'Kosten geschaetzt (netto)',  group: 'Honorar' },
    // System
    { key: 'system.heute',             label: 'Heutiges Datum',                  group: 'System' },
    { key: 'system.jahr',              label: 'Aktuelles Jahr',                  group: 'System' }
  ];

  // ─── Auto-Detection ──────────────────────────────────────────
  // Heuristisches Mapping: User-Variablen-Name → PROVA_FIELDS.key
  // Reine Vorschlag-Logik — User kann immer overriden.
  const _AUTO_PATTERNS = [
    [/^(akten|akte|az|aktenz)/i,                'akte.az'],
    [/^(titel|kurzb|bezeichn)/i,                'akte.titel'],
    [/^(frage|fragestel|sachverh)/i,            'akte.fragestellung'],
    [/^(schadens?ar|schaden$)/i,                'akte.schadensart_label'],
    [/^(auftragsdat|auftrag_dat)/i,             'akte.auftragsdatum'],
    [/^(gutachten|gutachtendat)/i,              'akte.gutachtendatum'],
    [/^(schadensstich|stichtag)/i,              'akte.schadensstichtag'],
    [/^(objekt_?adr|adresse|strasse|ort_?adr)/i,'akte.objekt.adresse'],
    [/^(plz|postleit)/i,                        'akte.objekt.plz'],
    [/^ort$/i,                                  'akte.objekt.ort'],
    [/^(baujahr|gebaeudejahr)/i,                'akte.objekt.baujahr'],
    [/^(wohnflae|wohnf|qm)/i,                   'akte.objekt.wohnflaeche'],
    [/^(auftraggeber|kunde|kunden_?n)/i,        'kunde.name'],
    [/^(kunden_?adr|kunden_?str)/i,             'kunde.adresse'],
    [/^(kunden_?plz)/i,                         'kunde.plz'],
    [/^(kunden_?ort)/i,                         'kunde.ort'],
    [/^(kunden_?email|email_?kun)/i,            'kunde.email'],
    [/^(kunden_?tel|tel_?kun|telefon)/i,        'kunde.telefon'],
    [/^(sv|sachv|gutachter)$/i,                 'sv.name'],
    [/^(sv_?name|sachv_?name)/i,                'sv.name'],
    [/^(sv_?adr|kanzlei_?adr)/i,                'sv.adresse'],
    [/^(sv_?email)/i,                           'sv.email'],
    [/^(kanzlei|sv_?kanzlei)/i,                 'sv.kanzlei'],
    [/^(honorar|kosten|brutto|gesamtkos)/i,     'akte.kosten_geschaetzt_brutto'],
    [/^(netto)/i,                               'akte.kosten_geschaetzt_netto'],
    [/^(heute|datum$|aktdat)/i,                 'system.heute'],
    [/^(jahr$)/i,                               'system.jahr']
  ];

  function smartGuessField(varName) {
    if (!varName || typeof varName !== 'string') return null;
    const clean = varName.replace(/^[\$\{\}]+|[\$\{\}]+$/g, '').trim();
    if (!clean) return null;
    for (const [rx, field] of _AUTO_PATTERNS) {
      if (rx.test(clean)) return field;
    }
    return null;
  }

  // ─── HTML-Escape (XSS-Defense) ──────────────────────────────
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Data-Context-Resolver ──────────────────────────────────
  // Gegeben: dataContext = { akte, kunde, sv, system }
  // Resolved: 'akte.objekt.adresse' → dataContext.akte.objekt.adresse
  function _resolveField(fieldKey, dataContext) {
    if (!fieldKey || !dataContext) return undefined;
    const path = fieldKey.split('.');
    let cur = dataContext;
    for (const seg of path) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[seg];
    }
    return cur;
  }

  function collectMappingValues(mapping, dataContext) {
    const result = {};
    if (!mapping || typeof mapping !== 'object') return result;
    for (const varName of Object.keys(mapping)) {
      const fieldKey = mapping[varName];
      if (!fieldKey) continue;
      const val = _resolveField(fieldKey, dataContext);
      if (val !== undefined && val !== null) {
        result[varName] = val;
      }
    }
    return result;
  }

  // ─── HTML-Interpolation ─────────────────────────────────────
  // Ersetzt $Var und {{Var}} im HTML durch Werte aus dataContext.
  // Returnt: { html, applied, missing }
  function interpolateHtml(html, mapping, dataContext) {
    if (!html || typeof html !== 'string') {
      return { html: '', applied: 0, missing: [] };
    }
    const values = collectMappingValues(mapping || {}, dataContext || {});
    const allVars = new Set();
    let applied = 0;

    // $Variable
    let result = html.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, function (m, name) {
      allVars.add(name);
      if (Object.prototype.hasOwnProperty.call(values, name)) {
        applied++;
        return escapeHtml(values[name]);
      }
      return m;  // unverändert lassen falls kein Mapping
    });

    // {{ Variable }}
    result = result.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, function (m, name) {
      allVars.add(name);
      if (Object.prototype.hasOwnProperty.call(values, name)) {
        applied++;
        return escapeHtml(values[name]);
      }
      return m;
    });

    const missing = [];
    for (const v of allVars) {
      if (!Object.prototype.hasOwnProperty.call(values, v)) missing.push(v);
    }
    missing.sort();

    return { html: result, applied: applied, missing: missing };
  }

  return {
    PROVA_FIELDS: PROVA_FIELDS,
    smartGuessField: smartGuessField,
    escapeHtml: escapeHtml,
    interpolateHtml: interpolateHtml,
    collectMappingValues: collectMappingValues,
    _AUTO_PATTERNS: _AUTO_PATTERNS  // exposed fuer Tests
  };
});
