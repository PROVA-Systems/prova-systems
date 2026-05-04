/**
 * PROVA Mode-C Helpers (Vanilla-JS)
 * MEGA¹⁷ W50/W52 + W56/W57 (2026-05-08)
 *
 * Public API (browser via window.ProvaModeC, node via module.exports):
 *   ProvaModeC.PROVA_FIELDS                       // re-exported aus prova-fields
 *   ProvaModeC.smartGuessField(varName)           // → 'akte.az' | null
 *   ProvaModeC.smartGuessFieldWithConfidence(v)   // → { field, confidence }
 *   ProvaModeC.interpolateHtml(html, mapping, dataContext) → { html, applied, missing }
 *   ProvaModeC.collectMappingValues(mapping, dataContext) → { var: value }
 *   ProvaModeC.escapeHtml(s)                      // basic XSS-Defense
 *
 * Anti-Patterns vermieden:
 *   - Auto-Detection ist nur Vorschlag (User kann override)
 *   - Missing Keys werden NICHT silent ignoriert (returnt Liste)
 *   - HTML-Escape bei Interpolation (XSS-Defense)
 *   - PROVA_FIELDS NICHT dupliziert — Single-Source-of-Truth in prova-fields.js
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node: require prova-fields fuer Single-Source-Re-Export
    const ProvaFields = require('./prova-fields.js');
    module.exports = factory(ProvaFields);
  } else {
    // Browser: window.ProvaFields ist via <script src="/lib/prova-fields.js"> bereits da
    root.ProvaModeC = factory(root.ProvaFields || { PROVA_FIELDS: [] });
  }
})(typeof window !== 'undefined' ? window : globalThis, function (ProvaFields) {

  // ─── PROVA_FIELDS (re-exported aus prova-fields.js) ─────────
  // Single-Source-of-Truth. Falls ProvaFields nicht geladen ist (Test-Szenario,
  // manuelles Reload), Fallback auf leeres Array.
  const PROVA_FIELDS = (ProvaFields && ProvaFields.PROVA_FIELDS) || [];

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

  // ─── Confidence-Score (high/medium/low) ─────────────────────
  // high: exakter Match auf Pattern-Anfang + Variable-Name >=8 Zeichen
  // medium: Pattern matched, aber kurzer Variable-Name oder Token-Match
  // low: kein Pattern-Match (User muss manuell waehlen)
  function smartGuessFieldWithConfidence(varName) {
    if (!varName || typeof varName !== 'string') {
      return { field: null, confidence: 'low' };
    }
    const clean = varName.replace(/^[\$\{\}]+|[\$\{\}]+$/g, '').trim();
    if (!clean) return { field: null, confidence: 'low' };

    for (const [rx, field] of _AUTO_PATTERNS) {
      if (rx.test(clean)) {
        // High wenn Variable-Name aussagekraeftig (>=8 Zeichen)
        // ODER wenn Pattern fast die ganze Variable matched (>= 70% length)
        const m = clean.match(rx);
        const matchLen = m && m[0] ? m[0].length : 0;
        const ratio = matchLen / clean.length;
        if (clean.length >= 8 || ratio >= 0.7) {
          return { field: field, confidence: 'high' };
        }
        return { field: field, confidence: 'medium' };
      }
    }
    return { field: null, confidence: 'low' };
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
    smartGuessFieldWithConfidence: smartGuessFieldWithConfidence,
    escapeHtml: escapeHtml,
    interpolateHtml: interpolateHtml,
    collectMappingValues: collectMappingValues,
    _AUTO_PATTERNS: _AUTO_PATTERNS  // exposed fuer Tests
  };
});
