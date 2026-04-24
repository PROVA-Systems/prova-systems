/* ═══════════════════════════════════════════════════════════════════
   PROVA PSEUDONYMISIERUNG — netlify/functions/lib/prova-pseudo.js
   ═══════════════════════════════════════════════════════════════════

   Server-Modul. CommonJS-Spiegel der Client-Datei /prova-pseudo.js.
   API identisch: apply(text), audit(text), formatReport(report), lastReport.

   ⚠ MANUELL SYNCHRON HALTEN MIT CLIENT-VERSION (/prova-pseudo.js).
   Bei Änderungen an Regex-Mustern oder apply()-Logik beide Files
   parallel anpassen, sonst greift Client-Pseudo und Server-Audit
   nicht mehr konsistent (oder umgekehrt).

   Eingebunden ab Sprint 01 P3 (S-SICHER P3.1, 25.04.2026):
   - ki-proxy.js Handler-Einstieg (P3.3)
   - whisper-diktat.js vor Response-Return (P3.4)
   - ki-proxy.js appendUserContext (P3.5)
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// ─── IBAN: DE + 20 Ziffern, mit oder ohne Leerzeichen ───
// Format-Übersicht: DE89 3704 0044 0532 0130 00  oder  DE89370400440532013000
const IBAN_DE_RE = /\bDE\s?\d{2}(?:\s?\d{4}){4}\s?\d{2}\b|\bDE\d{20}\b/gi;

// Breitere IBAN für andere Länder (optional — Hauptaugenmerk DE):
const IBAN_INT_RE = /\b[A-Z]{2}\d{2}[\s\d]{12,30}\b/g;

// ─── E-Mail ───
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi;

// ─── Telefon: deutsche Formate ───
// +49 221 98765432, 0221-9876543, 0221/9876543, 0176 12345678
const TELEFON_RE = /(?:(?:\+49|0049|0)[\s\-/.]?)(?:\d{2,5}[\s\-/.]?)\d{4,}(?:[\s\-]?\d+)?/g;

// ─── PLZ + Ort (5 Ziffern + Großbuchstaben-Wort) ───
const PLZ_ORT_RE = /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß\-]+(?:\s[A-ZÄÖÜ][a-zäöüß\-]+)?/g;

// ─── Straße + Hausnummer ───
const STRASSE_RE = /\b[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]*(?:straße|strasse|weg|platz|allee|gasse|ring|damm|ufer|chaussee|promenade|hof|feld|markt|zeile|kamp|brücke)\s+\d+\s*[a-zA-Z]?\b/g;

// ─── Personen-Namen mit Kontext ───
const PERSON_PREFIX_RE = /\b(?:Herr|Herrn|Frau|Fr\.|Hr\.|Dr\.|Dr|Prof\.|Prof|Auftraggeber|Geschädigte[rn]?|wohnhaft|Familie|Fam\.|Eheleute|Ehepaar)\s+((?:[A-ZÄÖÜ][a-zäöüß]+)(?:[-\s]+[A-ZÄÖÜ][a-zäöüß]+){0,4})/g;

const ProvaPseudo = {
  apply: apply,
  audit: audit,
  formatReport: formatReport,
  lastReport: null,
  _re: {
    iban: IBAN_DE_RE,
    email: EMAIL_RE,
    telefon: TELEFON_RE,
    strasse: STRASSE_RE,
    plz_ort: PLZ_ORT_RE
  }
};

function apply(text) {
  if (!text || typeof text !== 'string') return text;

  const report = {
    iban: 0, telefon: 0, email: 0,
    adresse: 0, plz_ort: 0, strasse: 0, person: 0,
    length_in: text.length, length_out: 0
  };

  let out = text;

  // 1. IBAN zuerst (spezifischer als Telefon)
  out = out.replace(IBAN_DE_RE, function() { report.iban++; return '[IBAN]'; });
  out = out.replace(IBAN_INT_RE, function(match) {
    if (match.length > 15 && match.length < 35 && match.replace(/[^0-9]/g, '').length > 12) {
      report.iban++;
      return '[IBAN]';
    }
    return match;
  });

  // 2. E-Mail
  out = out.replace(EMAIL_RE, function() { report.email++; return '[EMAIL]'; });

  // 3. Telefon (VOR Adresse — sonst matcht Adresse Teile der Tel.nr)
  out = out.replace(TELEFON_RE, function(match) {
    if (match.replace(/\D/g, '').length >= 7) {
      report.telefon++;
      return '[TELEFON]';
    }
    return match;
  });

  // 4. Straße + Hausnummer
  out = out.replace(STRASSE_RE, function() { report.strasse++; return '[STRASSE]'; });

  // 5. PLZ + Ort
  out = out.replace(PLZ_ORT_RE, function() { report.plz_ort++; return '[PLZ_ORT]'; });

  // 6. Personen-Namen (nur mit Kontext-Indikator)
  out = out.replace(PERSON_PREFIX_RE, function(match, name) {
    report.person++;
    const anrede = match.substring(0, match.length - name.length).trim();
    return anrede + ' [PERSON]';
  });

  report.adresse = report.strasse + report.plz_ort;
  report.length_out = out.length;
  ProvaPseudo.lastReport = report;

  return out;
}

function audit(text) {
  if (!text) return [];
  const findings = [];
  if (IBAN_DE_RE.test(text)) findings.push('IBAN');
  IBAN_DE_RE.lastIndex = 0;
  if (EMAIL_RE.test(text))   findings.push('E-Mail');
  EMAIL_RE.lastIndex = 0;
  if (TELEFON_RE.test(text)) findings.push('Telefon');
  TELEFON_RE.lastIndex = 0;
  return findings;
}

function formatReport(report) {
  if (!report) return 'Keine Pseudonymisierung durchgeführt.';
  const items = [];
  if (report.iban)    items.push(report.iban + '× IBAN');
  if (report.telefon) items.push(report.telefon + '× Telefon');
  if (report.email)   items.push(report.email + '× E-Mail');
  if (report.adresse) items.push(report.adresse + '× Adresse');
  if (report.person)  items.push(report.person + '× Person');
  if (items.length === 0) return 'Keine sensiblen Daten gefunden (' + report.length_in + ' Zeichen).';
  return 'Pseudonymisiert: ' + items.join(', ') + ' (' + report.length_in + '→' + report.length_out + ' Zeichen).';
}

module.exports = ProvaPseudo;
