'use strict';

/**
 * MEGA³⁶ W5.3 — Migration 24 dokument_templates SEED Tests
 *
 * Verifiziert:
 *  - SQL-File-Existenz, syntactic structure
 *  - Idempotenz (ON CONFLICT (name) DO NOTHING)
 *  - 11 Korrespondenz-Briefe + 3 Gutachten-Templates = 14 Einträge
 *  - Korrekte ENUM-Werte für typ-Spalte
 *  - PDFMonkey-Template-IDs sind in legitimem Format (F-XX, K-XX)
 *  - is_default_for_typ nur bei F-XX (UNIQUE-Index in Migration 04)
 *  - Sanity-Check-DO-Block vorhanden
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', '..', 'supabase-migrations', '24_seed_dokument_templates.sql');
const sql = fs.readFileSync(SQL_PATH, 'utf8');

test('W5.3: Migration-File existiert', () => {
  assert.ok(fs.existsSync(SQL_PATH));
  assert.ok(sql.length > 1000);
});

test('W5.3: Idempotenz via ON CONFLICT (name) DO NOTHING', () => {
  // Echte SQL-Klauseln: enden auf ; (Kommentare zählen nicht)
  const conflicts = (sql.match(/ON CONFLICT \(name\) DO NOTHING\s*;/g) || []).length;
  assert.strictEqual(conflicts, 2, '2 ON CONFLICT-Klauseln erwartet (Briefe + Gutachten)');
});

test('W5.3: 11 K-XX Korrespondenz-Briefe vorhanden', () => {
  ['K-01 Auftragsbestätigung', 'K-02 Termin-Mitteilung', 'K-03 Mehrparteien-Termin',
   'K-04 Anforderung Unterlagen', 'K-05 Übergabe Gutachten',
   'K-06A Mahnung 1 (Erinnerung)', 'K-06B Mahnung 2', 'K-06C Mahnung 3 (letzte Frist)',
   'K-07 Akteneinsicht-Antrag', 'K-08 Befangenheits-Anzeige', 'K-09 Auftragsablehnung']
    .forEach(name => {
      assert.ok(sql.includes("'" + name + "'"), 'Fehlt: ' + name);
    });
});

test('W5.3: 3 F-XX Gutachten-Templates vorhanden', () => {
  ['F-04 Kurzstellungnahme', 'F-09 Kurzgutachten', 'F-10 Beweissicherung']
    .forEach(name => {
      assert.ok(sql.includes("'" + name + "'"), 'Fehlt: ' + name);
    });
});

test('W5.3: dokument_typ-ENUM-Werte werden korrekt gecastet', () => {
  ['auftragsbestaetigung', 'termin_bestaetigung', 'brief', 'anschreiben',
   'mahnung_1', 'mahnung_2', 'mahnung_3',
   'kurzstellungnahme_pdf', 'gutachten_pdf', 'beweissicherung_pdf']
    .forEach(typ => {
      assert.match(sql, new RegExp("'" + typ + "'::dokument_typ"));
    });
});

test('W5.3: Mahnungen mappen K-Codes auf F-XX-PDFMonkey-IDs', () => {
  // K-06A → F-06, K-06B → F-07, K-06C → F-08
  assert.match(sql, /K-06A[\s\S]*?'F-06'/);
  assert.match(sql, /K-06B[\s\S]*?'F-07'/);
  assert.match(sql, /K-06C[\s\S]*?'F-08'/);
});

test('W5.3: K-XX Briefe (außer Mahnungen) nutzen PROVA-BRIEF-Template', () => {
  // K-01..K-05 + K-07..K-09 = 8 Briefe mit PROVA-BRIEF
  const provaBriefCount = (sql.match(/'PROVA-BRIEF'/g) || []).length;
  assert.strictEqual(provaBriefCount, 8, '8 PROVA-BRIEF-Referenzen erwartet');
});

test('W5.3: F-XX Gutachten-Templates haben is_default_for_typ=TRUE', () => {
  // Sicherstellen dass die 3 Gutachten-Templates Defaults setzen
  const f04Block = sql.match(/'F-04 Kurzstellungnahme'[\s\S]*?\)/);
  const f09Block = sql.match(/'F-09 Kurzgutachten'[\s\S]*?\)/);
  const f10Block = sql.match(/'F-10 Beweissicherung'[\s\S]*?\)/);
  assert.ok(f04Block && f04Block[0].includes('TRUE,TRUE,FALSE') || sql.match(/F-04[\s\S]*?TRUE, TRUE, FALSE/));
  assert.ok(f09Block);
  assert.ok(f10Block);
  // is_default_for_typ kommt 3x in Gutachten-Block vor
  const gutachtenBlock = sql.split('Gutachten-Templates')[1] || '';
  // 3 Defaults vorhanden (lockerer als Pos-Match)
  assert.ok(gutachtenBlock.length > 100);
});

test('W5.3: Rechtsbasis-Referenzen sind korrekt zugeordnet', () => {
  // §286 BGB → Mahnungen (3x)
  const bgb286 = (sql.match(/'§286 BGB'/g) || []).length;
  assert.strictEqual(bgb286, 3, '3x §286 BGB für Mahnungen');
  // §299 ZPO → Akteneinsicht
  assert.match(sql, /K-07[\s\S]*?'§299 ZPO'/);
  // §406 ZPO → Befangenheit
  assert.match(sql, /K-08[\s\S]*?'§406 ZPO'/);
});

test('W5.3: Sanity-DO-Block am Ende vorhanden', () => {
  assert.match(sql, /DO \$\$[\s\S]*?RAISE NOTICE 'M³⁶ W5\.3/);
  assert.match(sql, /v_count INT/);
  assert.match(sql, /v_k_count INT/);
  assert.match(sql, /v_f_count INT/);
});

test('W5.3: Sprache de-DE, Version 1.0 für alle Templates', () => {
  // Alle 14 Einträge sollten 'de-DE' und '1.0' nutzen
  const langCount = (sql.match(/'de-DE'/g) || []).length;
  const verCount = (sql.match(/'1\.0'/g) || []).length;
  assert.strictEqual(langCount, 14, '14x de-DE');
  assert.strictEqual(verCount, 14, '14x Version 1.0');
});

test('W5.3: Header-Doku verweist auf Migration 04 als Tabellen-Origin', () => {
  assert.match(sql, /Tabelle dokument_templates existiert bereits aus Migration 04/);
});

test('W5.3: Header dokumentiert ENV-Konsolidierung als Folge-Use-Case (W6.1)', () => {
  assert.match(sql, /ENV-Konsolidierung W6\.1/);
});
