'use strict';

/**
 * MEGA³⁹ P8 — Dashboard 5-Widgets + Mahnwesen 3-Stufen
 *
 * Verifiziert:
 *   1. dashboard.html hat 5 KPI-Widgets (5. = KI-Token-Verbrauch NEU)
 *   2. dashboard-logic.js loadKiTokenKpi-Funktion + Eskalations-Farben
 *   3. mahnwesen-cron.js mit 3 Stufen (Tag 14 / 21 / 35) + F-05/F-07/F-08
 *   4. Verzugsgebühren-Eskalation (0€/5€/10€)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const dashHtml = fs.readFileSync(path.join(ROOT, 'dashboard.html'), 'utf8');
const dashLogic = fs.readFileSync(path.join(ROOT, 'dashboard-logic.js'), 'utf8');
const mahnSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'mahnwesen-cron.js'), 'utf8');

test('P8: dashboard.html hat 5 KPI-Widgets (Aktiv, Fristen, Rechnungen, Kontingent, KI-Token)', () => {
  ['kpi-aktiv', 'kpi-heute', 'kpi-rechnungen', 'kpi-kontingent', 'kpi-ki-token']
    .forEach(id => assert.match(dashHtml, new RegExp('id="' + id + '"'), 'KPI fehlt: ' + id));
});

test('P8: KPI-Grid auf 5 Spalten (statt 4)', () => {
  assert.match(dashHtml, /grid-template-columns:repeat\(5,1fr\)/);
});

test('P8: KI-Token-Widget hat Sub-Label (Token-Anzahl)', () => {
  assert.match(dashHtml, /id="kpi-ki-token-sub"/);
});

test('P8: dashboard-logic.js Skeleton-Liste enthält kpi-ki-token', () => {
  assert.match(dashLogic, /\['kpi-aktiv','kpi-heute','kpi-rechnungen','kpi-kontingent','kpi-ki-token'\]/);
});

test('P8: loadKiTokenKpi-Loader existiert + ruft admin-ki-aggregations auf', () => {
  assert.match(dashLogic, /async function loadKiTokenKpi\(\)/);
  assert.match(dashLogic, /admin-ki-aggregations\?range=month/);
});

test('P8: Eskalations-Farben (rot >=90%, gelb >=75%, accent default)', () => {
  assert.match(dashLogic, /pct>=90[\s\S]*?--danger/);
  assert.match(dashLogic, /pct>=75[\s\S]*?--warning/);
});

test('P8: Auto-Trigger bei DOMContentLoaded mit 500ms Auth-Header-Delay', () => {
  assert.match(dashLogic, /DOMContentLoaded[\s\S]*?setTimeout\(loadKiTokenKpi,500\)/);
});

// ── Mahnwesen 3-Stufen ──
test('P8: Mahnwesen-Cron hat 3 Stufen (Tag 14, 21, 35)', () => {
  assert.match(mahnSrc, /stufe:\s*1[\s\S]*?tage_nach_faellig:\s*14/);
  assert.match(mahnSrc, /stufe:\s*2[\s\S]*?tage_nach_faellig:\s*21/);
  assert.match(mahnSrc, /stufe:\s*3[\s\S]*?tage_nach_faellig:\s*35/);
});

test('P8: Mahnwesen Templates F-05/F-07/F-08', () => {
  assert.match(mahnSrc, /F-05-MAHNUNG-1-FREUNDLICH/);
  assert.match(mahnSrc, /F-07-MAHNUNG-2/);
  assert.match(mahnSrc, /F-08-MAHNUNG-3-LETZTE/);
});

test('P8: Mahnwesen-Gebühren-Eskalation 0€/5€/10€', () => {
  assert.match(mahnSrc, /gebuehr_eur:\s*0/);
  assert.match(mahnSrc, /gebuehr_eur:\s*5/);
  assert.match(mahnSrc, /gebuehr_eur:\s*10/);
});

test('P8: Mahnwesen-Cron Auth via X-Cron-Secret-Header', () => {
  assert.match(mahnSrc, /x-cron-secret/i);
  assert.match(mahnSrc, /Unauthorized/);
});

test('P8: Mahnwesen-Cron unterstützt mehrere ENV-Names für Cron-Secret', () => {
  assert.match(mahnSrc, /PROVA_FRISTEN_CRON_SECRET/);
  assert.match(mahnSrc, /PROVA_MAHN_CRON_SECRET/);
});
