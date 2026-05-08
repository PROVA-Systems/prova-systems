/**
 * PROVA Import-Format-Detector (MEGA⁴¹ P1)
 *
 * Erkennt Quellformat einer CSV/JSON anhand charakteristischer Spaltennamen.
 * Werkzeug: 4 Hauptformate + Generic-Fallback.
 *
 * Public API (window.ProvaImportFormatDetector + module.exports):
 *   detectFormat(headers: string[]) → { format, confidence, matched }
 *   parseCsv(csvText) → { headers, rows, encoding? }
 *   parseJson(jsonText) → { rows, format_hint? }
 *   FORMAT_SIGNATURES (Object für UI-Mapping-Default)
 *   FIELD_MAPPINGS (Object pro Format)
 */
'use strict';

(function () {

  const FORMAT_SIGNATURES = {
    gutachten_manager: {
      label: 'Gutachten Manager',
      icon: '📋',
      indicators: ['Mandant_Name', 'Mandant_Email', 'Auftrag_Az', 'Auftrag_Datum', 'Mandant_Adresse', 'Auftrag_Typ']
    },
    gutachten_agent: {
      label: 'GutachtenAgent',
      icon: '🤖',
      indicators: ['client_name', 'client_email', 'case_number', 'created_date', 'client_phone', 'case_type']
    },
    bauexpert: {
      label: 'Bauexpert',
      icon: '🏗️',
      indicators: ['Auftraggeber', 'Aktenzeichen', 'Erstellungsdatum', 'Gegenstand', 'Beauftragt_am']
    },
    generic_csv: {
      label: 'Generic CSV',
      icon: '📄',
      indicators: []  // Always-fallback
    }
  };

  /**
   * Field-Mappings pro Format → PROVA-Schema.
   * Source-Field-Name → PROVA-Field-Name (in entities-Tabelle).
   */
  const FIELD_MAPPINGS = {
    gutachten_manager: {
      kontakte: {
        'Mandant_Name': 'name',
        'Mandant_Email': 'email',
        'Mandant_Telefon': 'telefon',
        'Mandant_Adresse': 'adresse',
        'Mandant_PLZ': 'plz',
        'Mandant_Ort': 'ort',
        'Mandant_Anrede': 'anrede',
        'Mandant_Firma': 'firma'
      },
      auftraege: {
        'Auftrag_Az': 'aktenzeichen',
        'Auftrag_Datum': 'beauftragt_am',
        'Auftrag_Typ': 'auftragstyp',
        'Auftrag_Gegenstand': 'gegenstand',
        'Auftrag_Status': 'status',
        'Mandant_Email': '_kontakt_email_lookup'  // Foreign-Key-Resolution
      },
      rechnungen: {
        'Rechnung_Nr': 'rechnungsnr',
        'Rechnung_Datum': 'rechnungsdatum',
        'Rechnung_Betrag': 'betrag_brutto',
        'Auftrag_Az': '_auftrag_az_lookup'
      }
    },
    gutachten_agent: {
      kontakte: {
        'client_name': 'name',
        'client_email': 'email',
        'client_phone': 'telefon',
        'client_address': 'adresse',
        'client_zip': 'plz',
        'client_city': 'ort'
      },
      auftraege: {
        'case_number': 'aktenzeichen',
        'created_date': 'beauftragt_am',
        'case_type': 'auftragstyp',
        'subject': 'gegenstand',
        'status': 'status',
        'client_email': '_kontakt_email_lookup'
      }
    },
    bauexpert: {
      kontakte: {
        'Auftraggeber': 'name',
        'Email': 'email',
        'Telefon': 'telefon',
        'Strasse': 'adresse',
        'PLZ': 'plz',
        'Ort': 'ort'
      },
      auftraege: {
        'Aktenzeichen': 'aktenzeichen',
        'Erstellungsdatum': 'beauftragt_am',
        'Gegenstand': 'gegenstand',
        'Typ': 'auftragstyp',
        'Email': '_kontakt_email_lookup'
      }
    },
    generic_csv: {
      kontakte: {},
      auftraege: {},
      rechnungen: {}
    }
  };

  /**
   * Detect format aus Spalten-Headers.
   *
   * @param {string[]} headers
   * @returns {{format: string, confidence: number, matched: string[]}}
   */
  function detectFormat(headers) {
    if (!Array.isArray(headers) || headers.length === 0) {
      return { format: 'generic_csv', confidence: 0, matched: [] };
    }
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());

    let bestFormat = 'generic_csv';
    let bestScore = 0;
    let bestMatched = [];

    Object.keys(FORMAT_SIGNATURES).forEach(fmt => {
      const sig = FORMAT_SIGNATURES[fmt];
      if (sig.indicators.length === 0) return;
      const matches = sig.indicators.filter(i =>
        lowerHeaders.indexOf(i.toLowerCase()) >= 0
      );
      const score = matches.length / sig.indicators.length;
      if (score > bestScore) {
        bestScore = score;
        bestFormat = fmt;
        bestMatched = matches;
      }
    });

    // Mindestens 2/N (ca. 33% bei 6 Indikatoren) für Confidence
    if (bestScore < 0.33) {
      return { format: 'generic_csv', confidence: bestScore, matched: bestMatched };
    }
    return { format: bestFormat, confidence: bestScore, matched: bestMatched };
  }

  /**
   * Pure-JS CSV-Parser (RFC 4180-konform, ohne Library).
   * Handhabt: Quoted-Strings, Embedded-Commas, Newlines-in-Quotes, Escaped-Quotes.
   *
   * @param {string} text
   * @param {Object} [opts] - { delimiter?: ',' | ';' | '\t', skipEmpty?: bool }
   * @returns {{headers: string[], rows: Object[], delimiter: string}}
   */
  function parseCsv(text, opts) {
    opts = opts || {};
    if (!text || typeof text !== 'string') return { headers: [], rows: [], delimiter: ',' };

    const delim = opts.delimiter || _detectDelimiter(text);
    const lines = _splitCsvLines(text);
    if (lines.length === 0) return { headers: [], rows: [], delimiter: delim };

    const headers = _parseCsvLine(lines[0], delim).map(h => String(h).trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = _parseCsvLine(lines[i], delim);
      if (fields.length === 0 || (fields.length === 1 && !fields[0].trim())) {
        if (opts.skipEmpty !== false) continue;
      }
      const row = {};
      headers.forEach((h, idx) => { row[h] = (fields[idx] !== undefined ? fields[idx] : '').trim(); });
      rows.push(row);
    }
    return { headers, rows, delimiter: delim };
  }

  function _detectDelimiter(text) {
    const sample = text.slice(0, 1000);
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    const tabs = (sample.match(/\t/g) || []).length;
    if (semis > commas && semis > tabs) return ';';
    if (tabs > commas) return '\t';
    return ',';
  }

  function _splitCsvLines(text) {
    // Split bei \n außerhalb Quotes
    const lines = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        // Check escape ""
        if (text[i + 1] === '"') { cur += '""'; i++; continue; }
        inQuote = !inQuote;
        cur += c;
        continue;
      }
      if ((c === '\n' || c === '\r') && !inQuote) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        if (cur.length > 0) { lines.push(cur); cur = ''; }
        continue;
      }
      cur += c;
    }
    if (cur.length > 0) lines.push(cur);
    return lines;
  }

  function _parseCsvLine(line, delim) {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; continue; }
        inQuote = !inQuote;
        continue;
      }
      if (c === delim && !inQuote) {
        fields.push(cur);
        cur = '';
        continue;
      }
      cur += c;
    }
    fields.push(cur);
    return fields;
  }

  /**
   * Parse JSON-Daten — erwartet Array of Objects oder Object mit "rows"/"data"-Key.
   */
  function parseJson(text) {
    if (!text || typeof text !== 'string') return { rows: [], format_hint: null };
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) return { rows: data, format_hint: null };
      if (data && Array.isArray(data.rows)) return { rows: data.rows, format_hint: data.format || null };
      if (data && Array.isArray(data.data)) return { rows: data.data, format_hint: data.format || null };
      if (data && typeof data === 'object') return { rows: [data], format_hint: null };
      return { rows: [], format_hint: null };
    } catch (e) {
      throw new Error('JSON-Parse-Fehler: ' + e.message);
    }
  }

  // Public API
  const api = {
    detectFormat: detectFormat,
    parseCsv: parseCsv,
    parseJson: parseJson,
    FORMAT_SIGNATURES: FORMAT_SIGNATURES,
    FIELD_MAPPINGS: FIELD_MAPPINGS,
    _parseCsvLine: _parseCsvLine,
    _detectDelimiter: _detectDelimiter,
    _splitCsvLines: _splitCsvLines
  };

  if (typeof window !== 'undefined') {
    window.ProvaImportFormatDetector = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
