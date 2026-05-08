/**
 * PROVA — bescheinigungs-logic.js (MEGA³⁹ P9)
 *
 * 12 Bescheinigungs-Typen (Sprint 04d laut PROVA-VISION-MASTER):
 *   1. SV-Bestätigung
 *   2. Ortsbesichtigungs-Bestätigung
 *   3. Auftragsannahme-Bestätigung
 *   4. Termin-Bestätigung
 *   5. Mängelfreiheits-Bescheinigung
 *   6. Zustands-Bescheinigung
 *   7. Beweissicherungs-Bestätigung
 *   8. Schimmelfreiheits-Bescheinigung
 *   9. Feuchtigkeits-Bescheinigung
 *  10. Standsicherheits-Bestätigung (saSV-Bereich, optional)
 *  11. Bedenken-Anzeige (VOB/B §4)
 *  12. Behinderungs-Anzeige (VOB/B §6)
 *
 * AZ-Format: BES-YYYY-NNN (Generator: M³⁶ W4.6 Lambda + Migration 23
 *                          bescheinigungs_sequences live).
 * Storage: dokumente-Tabelle mit typ='bescheinigung' +
 *          bescheinigungs_typ + bescheinigungs_az.
 *
 * Public API (window.PROVA_BESCHEINIGUNGEN):
 *   getTypen() → BESCHEINIGUNGS_TYPEN
 *   getTyp(id) → einzelner Typ
 *   erstelle(typ_id, daten) → Promise<{ az, dokument_id }>
 */
'use strict';

(function (root) {
  // 12 Bescheinigungs-Typen mit Metadaten
  const BESCHEINIGUNGS_TYPEN = [
    {
      id: 'sv-bestaetigung',
      titel: 'SV-Bestätigung',
      icon: '🏛️',
      kurz: 'Bestätigung über Status als ö.b.u.v. SV',
      template_code: 'BES-01',
      rechtsbasis: 'IHK-SVO §8',
      pflichtfelder: ['empfaenger', 'zweck', 'datum'],
      typ_enum: 'bescheinigung_sv_bestaetigung'
    },
    {
      id: 'ortsbesichtigung',
      titel: 'Ortsbesichtigungs-Bestätigung',
      icon: '📍',
      kurz: 'Bestätigung der Vor-Ort-Begehung',
      template_code: 'BES-02',
      rechtsbasis: 'eigene Tätigkeit',
      pflichtfelder: ['empfaenger', 'auftrag_id', 'objekt_adresse', 'datum_termin'],
      typ_enum: 'bescheinigung_ortsbesichtigung'
    },
    {
      id: 'auftragsannahme',
      titel: 'Auftragsannahme-Bestätigung',
      icon: '✅',
      kurz: 'Bestätigung der Auftragsannahme',
      template_code: 'BES-03',
      rechtsbasis: 'BGB §631',
      pflichtfelder: ['empfaenger', 'auftrag_id', 'datum_annahme', 'leistungsumfang'],
      typ_enum: 'bescheinigung_auftragsannahme'
    },
    {
      id: 'termin',
      titel: 'Termin-Bestätigung',
      icon: '📅',
      kurz: 'Bestätigung über stattgefundenen Termin',
      template_code: 'BES-04',
      rechtsbasis: 'eigene Tätigkeit',
      pflichtfelder: ['empfaenger', 'datum_termin', 'ort', 'anwesende'],
      typ_enum: 'bescheinigung_termin'
    },
    {
      id: 'maengelfreiheit',
      titel: 'Mängelfreiheits-Bescheinigung',
      icon: '✓',
      kurz: 'Bestätigung über mängelfreie Ausführung',
      template_code: 'BES-05',
      rechtsbasis: 'VOB/B §12 Abs. 1 — Voraussetzung Abnahme',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'pruefdatum', 'pruefumfang'],
      typ_enum: 'bescheinigung_maengelfreiheit',
      hinweis: 'Aussage nur für geprüften Umfang zum Stichtag — KEINE Allzeit-Garantie.'
    },
    {
      id: 'zustand',
      titel: 'Zustands-Bescheinigung',
      icon: '🔍',
      kurz: 'Dokumentation des Bauzustands zum Stichtag',
      template_code: 'BES-06',
      rechtsbasis: 'BGB §640 — Beweissicherung',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'pruefdatum', 'zustands_beschreibung'],
      typ_enum: 'bescheinigung_zustand'
    },
    {
      id: 'beweissicherung-bestaetigung',
      titel: 'Beweissicherungs-Bestätigung',
      icon: '🔒',
      kurz: 'Bestätigung der durchgeführten Beweissicherung',
      template_code: 'BES-07',
      rechtsbasis: 'ZPO §485',
      pflichtfelder: ['empfaenger', 'auftrag_id', 'datum_termin', 'beweisbeschluss_az'],
      typ_enum: 'bescheinigung_beweissicherung'
    },
    {
      id: 'schimmelfreiheit',
      titel: 'Schimmelfreiheits-Bescheinigung',
      icon: '🧪',
      kurz: 'Bestätigung Schimmel-Untersuchung negativ',
      template_code: 'BES-08',
      rechtsbasis: 'UBA-Schimmelleitfaden 2017 + DIN ISO 16000-17',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'pruefdatum', 'pruefmethode', 'pruefumfang'],
      typ_enum: 'bescheinigung_schimmelfreiheit',
      hinweis: 'Aussage NUR für geprüfte sichtbare Oberflächen + dokumentierten Untersuchungsumfang.'
    },
    {
      id: 'feuchtigkeit',
      titel: 'Feuchtigkeits-Bescheinigung',
      icon: '💧',
      kurz: 'Feuchtemessung an definierten Stellen',
      template_code: 'BES-09',
      rechtsbasis: 'DIN 4108-3 + WTA 4-5',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'pruefdatum', 'messstellen', 'messgeraet'],
      typ_enum: 'bescheinigung_feuchtigkeit'
    },
    {
      id: 'standsicherheit',
      titel: 'Standsicherheits-Bestätigung',
      icon: '🏗️',
      kurz: 'Statik-Bestätigung (NUR saSV-Bereich!)',
      template_code: 'BES-10',
      rechtsbasis: 'BauO Land + SV-VO §85 (saSV-Vorbehalt!)',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'pruefdatum', 'sv_anerkennungs_az'],
      typ_enum: 'bescheinigung_standsicherheit',
      hinweis: 'NUR für staatlich anerkannte SV (saSV) — NICHT für ö.b.u.v.-SV im Schadensbereich!'
    },
    {
      id: 'bedenken-vob',
      titel: 'Bedenken-Anzeige (VOB/B §4)',
      icon: '⚠️',
      kurz: 'Schriftliche Anzeige von Bedenken gegen vorgeschriebene Ausführung',
      template_code: 'BES-11',
      rechtsbasis: 'VOB/B §4 Abs. 3',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'datum', 'bedenken_text', 'vorgeschriebene_ausfuehrung'],
      typ_enum: 'bescheinigung_bedenken_vob'
    },
    {
      id: 'behinderung-vob',
      titel: 'Behinderungs-Anzeige (VOB/B §6)',
      icon: '🚧',
      kurz: 'Schriftliche Anzeige von Behinderungen mit Folge auf Bauablauf',
      template_code: 'BES-12',
      rechtsbasis: 'VOB/B §6 Abs. 1',
      pflichtfelder: ['empfaenger', 'objekt_adresse', 'datum_beginn', 'behinderung_grund', 'auswirkung'],
      typ_enum: 'bescheinigung_behinderung_vob'
    }
  ];

  function getTypen() { return BESCHEINIGUNGS_TYPEN.slice(); }
  function getTyp(id) { return BESCHEINIGUNGS_TYPEN.find(t => t.id === id) || null; }

  async function _generiereAZ() {
    const f = (typeof window !== 'undefined') ? (window.provaFetch || window.fetch.bind(window)) : null;
    if (!f) throw new Error('no fetcher');
    const resp = await f('/.netlify/functions/generate-bescheinigungs-aktenzeichen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!resp.ok) throw new Error('AZ-Generation HTTP ' + resp.status);
    const data = await resp.json();
    return data.aktenzeichen || data.az || null;
  }

  async function erstelle(typ_id, daten) {
    const typ = getTyp(typ_id);
    if (!typ) throw new Error('Unbekannter Bescheinigungs-Typ: ' + typ_id);
    // Pflichtfelder-Check
    const fehlende = (typ.pflichtfelder || []).filter(p => !daten || daten[p] == null || daten[p] === '');
    if (fehlende.length) throw new Error('Pflichtfelder fehlen: ' + fehlende.join(', '));

    const az = await _generiereAZ();
    if (!az) throw new Error('AZ-Generierung fehlgeschlagen');

    // Persist via bescheinigung-generate Lambda (existierend)
    const f = window.provaFetch || window.fetch.bind(window);
    const resp = await f('/.netlify/functions/bescheinigung-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bescheinigungs_typ: typ.typ_enum,
        bescheinigungs_az: az,
        template_code: typ.template_code,
        daten: daten,
        hinweis: typ.hinweis || null,
        rechtsbasis: typ.rechtsbasis
      })
    });
    if (!resp.ok) throw new Error('bescheinigung-generate HTTP ' + resp.status);
    const result = await resp.json();
    return { az: az, dokument_id: result.dokument_id || null, pdf_url: result.pdf_url || null };
  }

  const exported = {
    getTypen: getTypen,
    getTyp: getTyp,
    erstelle: erstelle,
    _BESCHEINIGUNGS_TYPEN: BESCHEINIGUNGS_TYPEN
  };

  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (typeof root !== 'undefined') root.PROVA_BESCHEINIGUNGEN = exported;
})(typeof self !== 'undefined' ? self : this);
