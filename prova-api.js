/**
 * PROVA API Client — Single Source of Truth für alle Airtable-Zugriffe
 * ════════════════════════════════════════════════════════════════════
 * Standard in allen professionellen SaaS-Systemen (Linear, Notion, Stripe):
 * Ein API-Client, überall verwendet. Kein Copy-Paste von Fetch-Calls.
 *
 * Features:
 * - fields[]= Filterung: nur benötigte Felder laden (60-80% weniger Daten)
 * - Request-Deduplication: gleiche Anfragen werden nicht doppelt gesendet
 * - Einheitliche Fehlerbehandlung
 * - Automatischer Auth-Header via provaAuthHeaders()
 */

(function() {
  'use strict';

  var BASE_URL = '/.netlify/functions/airtable';

  /* ── In-Flight Request Deduplication ────────────────────────────
     Wenn zwei identische Requests gleichzeitig laufen,
     wartet der zweite auf das Ergebnis des ersten.
     Spart API-Calls bei schnellen Tab-Wechseln.
  ── */
  var _inFlight = {};

  function _getHeaders() {
    return window.provaAuthHeaders
      ? window.provaAuthHeaders()
      : { 'Content-Type': 'application/json' };
  }

  /**
   * GET — Records aus Airtable lesen
   * @param {string} tableId - Airtable Table ID (tblXXX)
   * @param {object} options - { filter, fields, maxRecords, sort }
   */
  function get(tableId, options) {
    options = options || {};
    var base = 'appJ7bLlAHZoxENWE';
    var url = '/v0/' + base + '/' + tableId;
    var params = [];

    if (options.filter) {
      params.push('filterByFormula=' + encodeURIComponent(options.filter));
    }
    // KRITISCH: Nur benötigte Felder laden
    if (options.fields && options.fields.length > 0) {
      options.fields.forEach(function(f) {
        params.push('fields[]=' + encodeURIComponent(f));
      });
    }
    if (options.maxRecords) {
      params.push('maxRecords=' + options.maxRecords);
    }
    if (options.sort && options.sort.length > 0) {
      options.sort.forEach(function(s, i) {
        params.push('sort[' + i + '][field]=' + encodeURIComponent(s.field));
        if (s.direction) params.push('sort[' + i + '][direction]=' + s.direction);
      });
    }
    if (params.length > 0) url += '?' + params.join('&');

    // Deduplication Key
    var dedupKey = 'GET:' + url;
    if (_inFlight[dedupKey]) {
      return _inFlight[dedupKey];
    }

    var promise = fetch(BASE_URL, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({ method: 'GET', path: url })
    })
    .then(function(r) {
      delete _inFlight[dedupKey];
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Airtable GET fehlgeschlagen'); });
      return r.json();
    })
    .catch(function(e) {
      delete _inFlight[dedupKey];
      throw e;
    });

    _inFlight[dedupKey] = promise;
    return promise;
  }

  /**
   * PATCH — Record aktualisieren
   */
  function patch(tableId, recordId, fields) {
    var base = 'appJ7bLlAHZoxENWE';
    var path = '/v0/' + base + '/' + tableId + '/' + recordId;
    return fetch(BASE_URL, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({ method: 'PATCH', path: path, payload: { fields: fields } })
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Airtable PATCH fehlgeschlagen'); });
      return r.json();
    });
  }

  /**
   * POST — Neuen Record erstellen
   */
  function post(tableId, fields) {
    var base = 'appJ7bLlAHZoxENWE';
    var path = '/v0/' + base + '/' + tableId;
    return fetch(BASE_URL, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({ method: 'POST', path: path, payload: { fields: fields } })
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Airtable POST fehlgeschlagen'); });
      return r.json();
    });
  }

  /**
   * DELETE — Record löschen
   */
  function del(tableId, recordId) {
    var base = 'appJ7bLlAHZoxENWE';
    var path = '/v0/' + base + '/' + tableId + '/' + recordId;
    return fetch(BASE_URL, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({ method: 'DELETE', path: path })
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Airtable DELETE fehlgeschlagen'); });
      return r.json();
    });
  }

  /* ── Tabellen-IDs — Single Source of Truth ── */
  var TABLES = {
    FAELLE:        'tblSxV8bsXwd1pwa0',
    SV:            'tbladqEQT3tmx4DIB',
    RECHNUNGEN:    'tblF6MS7uiFAJDjiT',
    TERMINE:       'tblyMTTdtfGQjjmc2',
    KONTAKTE:      'tblMKmPLjRelr6Hal',
    KI_STATISTIK:  'tblv9F8LEnUC3mKru',
    KI_LERNPOOL:   'tbl4LEsMvcDKFCYaF',
    TEXTBAUSTEINE: 'tblDS8NQxzceGedJO',
    BRIEFE:        'tblSzxvnkRE6B0thx',
    AUDIT_TRAIL:   'tblqQmMwJKxltXXXl',
  };

  /* ── Felder-Definitionen: nur was wirklich gebraucht wird ── */
  var FIELDS = {
    /* Dashboard: Liste der Fälle */
    FAELLE_LISTE: [
      'Aktenzeichen', 'Status', 'Schadensart', 'Auftraggeber_Name',
      'Adresse_Schadensort', 'Fristdatum', 'sv_email', 'erstellt_am'
    ],
    /* Akte: Detail-Ansicht */
    FAELLE_DETAIL: [
      'Aktenzeichen', 'Status', 'Schadensart', 'Auftraggeber_Name',
      'Adresse_Schadensort', 'Fristdatum', 'Notizen', 'Diktat_Text',
      'sv_email', 'erstellt_am', 'geaendert_am'
    ],
    /* Termine: Kalender */
    TERMINE_LISTE: [
      'Aktenzeichen', 'termin_datum', 'termin_uhrzeit', 'betreff',
      'ort', 'typ', 'sv_email', 'notiz'
    ],
    /* Rechnungen: Liste */
    RECHNUNGEN_LISTE: [
      'Rechnungsnummer', 'Aktenzeichen', 'Betrag_Netto', 'Betrag_Brutto',
      'Status', 'rechnungsdatum', 'faellig_am', 'sv_email', 'Auftraggeber'
    ],
    /* SV-Profil */
    SV_PROFIL: [
      'Email', 'Vorname', 'Nachname', 'Firma', 'Strasse', 'PLZ', 'Ort',
      'Telefon', 'Website', 'IBAN', 'BIC', 'Bank', 'Paket', 'Status',
      'trial_end', 'abo_start', 'smtp_host', 'smtp_user', 'smtp_port',
      'smtp_from_name', 'Steuernummer', 'UStIdNr', 'app_theme', 'app_fontsize'
    ],
  };

  /* ── Öffentliche API ── */
  window.PROVA_API = {
    get:    get,
    patch:  patch,
    post:   post,
    delete: del,
    TABLES: TABLES,
    FIELDS: FIELDS,
  };

})();
