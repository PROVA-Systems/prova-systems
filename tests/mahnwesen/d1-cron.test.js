'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const cronSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'mahnwesen-cron.js'), 'utf8');
const Mahn = require('../../netlify/functions/mahnwesen-cron');

test('D1: 3 Stufen mit korrekten Schwellen (14/21/35 Tage)', () => {
  assert.strictEqual(Mahn.__STUFEN.length, 3);
  assert.strictEqual(Mahn.__STUFEN[0].tage_nach_faellig, 14);
  assert.strictEqual(Mahn.__STUFEN[1].tage_nach_faellig, 21);
  assert.strictEqual(Mahn.__STUFEN[2].tage_nach_faellig, 35);
});

test('D1: Mahngebühren 0/5/10 EUR', () => {
  assert.strictEqual(Mahn.__STUFEN[0].gebuehr_eur, 0);
  assert.strictEqual(Mahn.__STUFEN[1].gebuehr_eur, 5);
  assert.strictEqual(Mahn.__STUFEN[2].gebuehr_eur, 10);
});

test('D1: 3 PDFMonkey-Templates referenziert', () => {
  ['F-05-MAHNUNG-1-FREUNDLICH', 'F-07-MAHNUNG-2', 'F-08-MAHNUNG-3-LETZTE'].forEach(t =>
    assert.match(cronSrc, new RegExp(t)));
});

test('D1: daysSince-Helper berechnet Tage seit Datum', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  assert.strictEqual(Mahn.__daysSince(yesterday), 1);
  const fifteenDays = new Date(Date.now() - 15 * 86400000).toISOString();
  assert.strictEqual(Mahn.__daysSince(fifteenDays), 15);
});

test('D1: Cron-Secret-ENV-Fallback (PROVA_FRISTEN || FRISTEN || PROVA_MAHN)', () => {
  assert.match(cronSrc, /PROVA_FRISTEN_CRON_SECRET/);
  assert.match(cronSrc, /FRISTEN_CRON_SECRET/);
  assert.match(cronSrc, /PROVA_MAHN_CRON_SECRET/);
});

test('D1: Filter typ=rechnung* + bezahlt_at IS NULL + deleted_at IS NULL', () => {
  assert.match(cronSrc, /\.in\(['"]typ['"],\s*\[['"]rechnung['"],\s*['"]rechnung_jveg['"],\s*['"]rechnung_stunden['"]\]\)/);
  assert.match(cronSrc, /\.is\(['"]bezahlt_at['"],\s*null\)/);
  assert.match(cronSrc, /\.is\(['"]deleted_at['"],\s*null\)/);
});

test('D1: Idempotenz via mahn_datum_letzte heute-Check', () => {
  assert.match(cronSrc, /mahn_datum_letzte\.slice\(0,\s*10\)\s*===?\s*heuteDate/);
});

test('D1: nur Eskalation auf höhere Stufe (s.stufe > aktuelleStufe)', () => {
  assert.match(cronSrc, /s\.stufe\s*>\s*aktuelleStufe/);
});

test('D1: audit_trail-Insert action=create entity_typ=mahnung', () => {
  assert.match(cronSrc, /action:\s*['"]create['"]/);
  assert.match(cronSrc, /entity_typ:\s*['"]mahnung['"]/);
});

test('D1: Defensive — DB-Errors brechen Cron nicht ab (try/catch)', () => {
  // try/catch um audit_trail muss da sein
  assert.match(cronSrc, /try\s*\{[\s\S]*?audit_trail[\s\S]*?\}\s*catch/);
});

test('D1: Quellen-Doku existiert mit ≥10 URLs', () => {
  const sources = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-30-D1-MAHNWESEN-SOURCES.md'), 'utf8');
  const urlCount = (sources.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10, `≥10 URLs erwartet, gefunden ${urlCount}`);
});

test('D1: BGB §286 + §288 dokumentiert', () => {
  const sources = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-30-D1-MAHNWESEN-SOURCES.md'), 'utf8');
  assert.match(sources, /BGB §\s*286/);
  assert.match(sources, /BGB §\s*288/);
});
