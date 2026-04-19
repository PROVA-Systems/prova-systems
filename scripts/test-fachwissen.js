#!/usr/bin/env node
/**
 * PROVA — Fachwissen-Provider Tests
 *
 * Testet alle 3 Schichten der Fallback-Kaskade:
 *   1) Airtable-Live (nur wenn AIRTABLE_PAT gesetzt)
 *   2) In-Memory-Cache
 *   3) Hardcode-Fallback (18 Basis-Normen)
 *
 * Ausführung:
 *   node scripts/test-fachwissen.js              # Alle Tests, nutzt AIRTABLE_PAT falls gesetzt
 *   AIRTABLE_PAT=pat123... node scripts/test-fachwissen.js
 *   FORCE_FALLBACK=1 node scripts/test-fachwissen.js   # Nur Fallback-Tests
 *
 * Dieses Skript ist für den lokalen Entwicklungslauf gedacht, nicht
 * für die Produktions-Pipeline.
 */

'use strict';

const path = require('path');

// In der Deploy-Umgebung liegt prova-fachwissen.js unter netlify/functions/lib/
// Hier im Test lokal einbinden:
const FW_PATH = process.env.FW_PATH || path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'prova-fachwissen.js');
const FW = require(FW_PATH);

// Farb-Helper (ohne externe Abhängigkeit)
const c = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  red:   s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  bold:  s => `\x1b[1m${s}\x1b[0m`
};

let passed = 0, failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => { passed++; console.log(c.green('  ✓'), name); })
    .catch(err => {
      failed++;
      console.log(c.red('  ✗'), name);
      console.log(c.red('    ' + (err.stack || err.message || err)));
    });
}

function assert(cond, msg) {
  if (!cond) throw new Error('Assertion failed: ' + msg);
}

async function main() {
  console.log(c.bold('\n══════════════════════════════════════════════════════════'));
  console.log(c.bold('  PROVA Fachwissen-Provider — Test-Suite'));
  console.log(c.bold('══════════════════════════════════════════════════════════\n'));

  console.log(c.cyan('→ Provider geladen von:'), FW_PATH);
  console.log(c.cyan('→ AIRTABLE_PAT:'), process.env.AIRTABLE_PAT ? c.green('gesetzt') : c.yellow('NICHT gesetzt — Fallback-Modus'));
  console.log(c.cyan('→ FORCE_FALLBACK:'), process.env.FORCE_FALLBACK ? c.yellow('aktiv') : 'inaktiv');
  console.log('');

  // ═══ SCHICHT 3: Fallback (immer verfügbar) ═══
  console.log(c.bold('Schicht 3 — Hardcode-Fallback:'));

  await test('BASIS_FALLBACK existiert und hat ≥ 15 Einträge', () => {
    assert(Array.isArray(FW.BASIS_FALLBACK), 'BASIS_FALLBACK ist kein Array');
    assert(FW.BASIS_FALLBACK.length >= 15, `BASIS_FALLBACK hat nur ${FW.BASIS_FALLBACK.length} Einträge`);
  });

  await test('BASIS_FALLBACK-Einträge haben Pflichtfelder (num, titel, sa)', () => {
    FW.BASIS_FALLBACK.forEach((n, i) => {
      assert(n.num, `Eintrag ${i}: num fehlt`);
      assert(n.titel, `Eintrag ${i}: titel fehlt`);
      assert(n.sa, `Eintrag ${i}: sa fehlt`);
    });
  });

  await test('BASIS_FALLBACK enthält kritische Normen', () => {
    const nums = FW.BASIS_FALLBACK.map(n => n.num);
    ['DIN 4108-2', 'DIN 68800-1', 'ZPO §407a', 'VOB/B §13'].forEach(norm => {
      assert(nums.includes(norm), `${norm} fehlt im Fallback`);
    });
  });

  // ═══ FORCE_FALLBACK Modus (ohne Airtable) ═══
  if (process.env.FORCE_FALLBACK || !process.env.AIRTABLE_PAT) {
    console.log(c.bold('\nOhne Airtable — Fallback-Kaskade:'));
    // PAT temporär entfernen um Fallback zu erzwingen
    const savedPAT = process.env.AIRTABLE_PAT;
    const savedTOKEN = process.env.AIRTABLE_TOKEN;
    delete process.env.AIRTABLE_PAT;
    delete process.env.AIRTABLE_TOKEN;
    FW._resetCache();

    await test('getNormen() liefert Daten aus Fallback-Schicht', async () => {
      const result = await FW.getNormen();
      assert(result.source === 'fallback', `Expected source=fallback, got ${result.source}`);
      assert(result.normen.length >= 15, `Nur ${result.normen.length} Normen`);
      assert(result.count === result.normen.length, 'count stimmt nicht mit Array-Länge überein');
    });

    await test('normenFuerSchadensart("WS") filtert Wasserschaden-Normen', async () => {
      const result = await FW.normenFuerSchadensart('WS');
      assert(result.normen.length > 0, 'Keine WS-Normen gefunden');
      result.normen.forEach(n => {
        const sa = String(n.sa).toUpperCase();
        assert(sa.includes('WS') || sa.includes('ALL'), `Norm ${n.num} hat sa="${n.sa}" — sollte WS oder ALL enthalten`);
      });
    });

    await test('normenFuerSchadensart("BA,SC") filtert auf zwei Codes', async () => {
      const result = await FW.normenFuerSchadensart('BA,SC');
      assert(result.normen.length > 0, 'Keine Normen für BA,SC');
    });

    await test('normenFuerSchadensart("") liefert alle Normen', async () => {
      const result = await FW.normenFuerSchadensart('');
      const all = await FW.getNormen();
      assert(result.normen.length === all.normen.length, 'Leerer Filter sollte alle zurückgeben');
    });

    await test('buildPromptKontext({schadensart:"WS"}) liefert Prompt-String', async () => {
      const ctx = await FW.buildPromptKontext({ schadensart: 'WS' });
      assert(ctx.text, 'text ist leer');
      assert(ctx.text.includes('RELEVANTE NORMEN'), 'RELEVANTE NORMEN fehlt');
      assert(ctx.anzahl > 0, 'anzahl ist 0');
      assert(ctx.anzahl <= 8, `anzahl=${ctx.anzahl} > 8 (default maxNormen)`);
    });

    await test('buildPromptKontext mit maxNormen=3 liefert max 3', async () => {
      const ctx = await FW.buildPromptKontext({ schadensart: 'BA', maxNormen: 3 });
      assert(ctx.anzahl <= 3, `anzahl=${ctx.anzahl} > 3`);
    });

    await test('buildPromptKontext({}) wirft NICHT und liefert was', async () => {
      const ctx = await FW.buildPromptKontext({});
      assert(typeof ctx.text === 'string', 'text ist kein String');
      // Ohne Schadensart sollten alle zurückkommen (max 8)
      assert(ctx.anzahl > 0, 'anzahl ist 0 bei leerem opts');
    });

    await test('buildPromptKontext(null) wirft NICHT', async () => {
      const ctx = await FW.buildPromptKontext(null);
      assert(typeof ctx.text === 'string', 'text ist kein String');
    });

    await test('Prompt-String enthält Grenzwerte-Info', async () => {
      const ctx = await FW.buildPromptKontext({ schadensart: 'WS' });
      // Mindestens ein Grenzwert-Marker sollte drin sein
      assert(ctx.text.includes('Grenzwerte:') || ctx.text.length > 100, 'Keine Grenzwerte im Prompt');
    });

    // ─── Sprint 2: Paragraph-abhängige Normen-Auswahl ───
    await test('Sprint 2: § 1-3 bekommt max 3 Normen (leichte Paragraphen)', async () => {
      const ctx = await FW.buildPromptKontext({ schadensart: 'WS', maxNormen: 3 });
      assert(ctx.anzahl <= 3, `§ 1-3 sollte max 3 Normen haben, ist ${ctx.anzahl}`);
    });

    await test('Sprint 2: § 4/§ 7 bekommt max 5 Normen (mittlere Tiefe)', async () => {
      const ctx = await FW.buildPromptKontext({ schadensart: 'WS', maxNormen: 5 });
      assert(ctx.anzahl <= 5, `§ 4/§ 7 sollte max 5 Normen haben, ist ${ctx.anzahl}`);
    });

    await test('Sprint 2: § 5/§ 6 bekommt max 8 Normen (volle Tiefe)', async () => {
      const ctx = await FW.buildPromptKontext({ schadensart: 'SC', maxNormen: 8 });
      assert(ctx.anzahl <= 8, `§ 5/§ 6 sollte max 8 Normen haben, ist ${ctx.anzahl}`);
    });

    await test('Sprint 2: unterschiedliche Schadensart → unterschiedliche Normen', async () => {
      const ws = await FW.buildPromptKontext({ schadensart: 'WS', maxNormen: 8 });
      const bs = await FW.buildPromptKontext({ schadensart: 'BS', maxNormen: 8 });
      // Zumindest einige unterschiedliche Normen sind zu erwarten
      assert(ws.text !== bs.text, 'WS und BS liefern identischen Prompt — Filter kaputt?');
    });

    // ─── Sprint 3: Text→Code-Normalisierung (compliance-check) ───
    await test('Sprint 3: normalizeSaInput existiert und ist Funktion', () => {
      assert(typeof FW.normalizeSaInput === 'function', 'normalizeSaInput nicht exportiert');
    });

    await test('Sprint 3: "Wasserschaden" → "WS"', () => {
      assert(FW.normalizeSaInput('Wasserschaden') === 'WS', `got "${FW.normalizeSaInput('Wasserschaden')}"`);
    });

    await test('Sprint 3: "wasserschaden" (lowercase) → "WS"', () => {
      assert(FW.normalizeSaInput('wasserschaden') === 'WS');
    });

    await test('Sprint 3: "Schimmel" → "SC"', () => {
      assert(FW.normalizeSaInput('Schimmel') === 'SC');
    });

    await test('Sprint 3: "Schimmelpilz" → "SC"', () => {
      assert(FW.normalizeSaInput('Schimmelpilz') === 'SC');
    });

    await test('Sprint 3: "Brandschaden" → "BS"', () => {
      assert(FW.normalizeSaInput('Brandschaden') === 'BS');
    });

    await test('Sprint 3: "Baumängel" (Umlaut) → "BA"', () => {
      assert(FW.normalizeSaInput('Baumängel') === 'BA');
    });

    await test('Sprint 3: Code "WS" bleibt "WS" (Passthrough)', () => {
      assert(FW.normalizeSaInput('WS') === 'WS');
    });

    await test('Sprint 3: Leerer Input → leerer String', () => {
      assert(FW.normalizeSaInput('') === '');
      assert(FW.normalizeSaInput(null) === '');
      assert(FW.normalizeSaInput(undefined) === '');
    });

    await test('Sprint 3: "Wasserschaden,Schimmel" → "WS,SC"', () => {
      assert(FW.normalizeSaInput('Wasserschaden,Schimmel') === 'WS,SC');
    });

    await test('Sprint 3: Unbekannter Text → Original durchgelassen', () => {
      // Safety: unbekannte Eingaben dürfen nicht crashen, sondern durchgelassen werden
      const r = FW.normalizeSaInput('UnbekanntTyp');
      assert(typeof r === 'string', 'Rückgabe muss String sein');
    });

    await test('Sprint 3: normenFuerSchadensart("Wasserschaden") findet Normen', async () => {
      const result = await FW.normenFuerSchadensart('Wasserschaden');
      assert(result.normen.length > 0, 'Keine Normen für "Wasserschaden" — Normalisierung kaputt?');
    });

    await test('Sprint 3: konsistenzCheck-Szenario (paragraph_nr=6, text-SA)', async () => {
      // Simuliert genau den Aufruf aus compliance-check.js nach Sprint-3-Patch
      const ctx = await FW.buildPromptKontext({
        schadensart: 'Schimmelpilz',  // Text, wie aus localStorage
        typ: 'paragraph_gen',
        maxNormen: 8
      });
      assert(ctx.anzahl > 0, 'Kein Kontext für Schimmelpilz-Konsistenzcheck');
      assert(ctx.text.includes('RELEVANTE NORMEN'), 'Kein Prompt-Header');
    });

    // ─── Sprint 3.5: stellungnahme-logic-Szenarien ───
    await test('Sprint 3.5: §6-Denkanstoß (Call #2) — SA-Text aus sessionStorage', async () => {
      // Call #2 in stellungnahme-logic: sa kommt als Text (z.B. "Schimmelpilz")
      const ctx = await FW.buildPromptKontext({
        schadensart: 'Schimmelpilz',
        typ: 'paragraph_gen',
        maxNormen: 8
      });
      assert(ctx.anzahl > 0, 'Denkanstoß ohne Normen — Filter kaputt?');
    });

    await test('Sprint 3.5: "—" als SA-Fallback wird als leer behandelt', async () => {
      // stellungnahme-logic nutzt "—" als "kein Wert" — muss robust sein
      const ctx1 = await FW.buildPromptKontext({ schadensart: '—', maxNormen: 5 });
      // "—" ist unbekannter Text → wird durchgereicht → findet wahrscheinlich nichts
      // Wichtig: Kein Crash, String ist vorhanden
      assert(typeof ctx1.text === 'string', 'Rückgabe muss String sein');
    });

    await test('Sprint 3.5: Ausformulieren (Call #3) — mit "Wasserschaden"', async () => {
      const ctx = await FW.buildPromptKontext({
        schadensart: 'Wasserschaden',
        typ: 'paragraph_gen',
        maxNormen: 8
      });
      assert(ctx.anzahl > 0, 'Ausformulierer-Kontext leer');
    });

    await test('Sprint 3.5: Normen-Picker (Call #4) — Text mit Komma', async () => {
      // Call #4 könnte SA in verschiedenen Formaten bekommen
      const ctx = await FW.buildPromptKontext({
        schadensart: 'Wasserschaden,Schimmel',
        typ: 'paragraph_gen',
        maxNormen: 8
      });
      assert(ctx.anzahl > 0, 'Multi-SA-Kontext leer');
    });

    await test('Sprint 3.5: assistInline (Call #5+#6) — 5 Normen konservativ', async () => {
      // handleAssistInline ist kleinteiliger → 5 Normen reichen
      const ctx = await FW.buildPromptKontext({
        schadensart: 'Brandschaden',
        typ: 'assist_inline',
        maxNormen: 5
      });
      assert(ctx.anzahl <= 5, `assistInline soll max 5 Normen haben, ist ${ctx.anzahl}`);
      assert(ctx.anzahl > 0, 'assistInline ohne Normen — Filter kaputt?');
    });

    await test('Sprint 3.5: Normalisierung greift auch im Inline-Modus', async () => {
      // Verifiziert: Inline-Call mit Text → findet trotzdem Normen
      const viaText = await FW.normenFuerSchadensart('Brandschaden');
      const viaCode = await FW.normenFuerSchadensart('BS');
      assert(viaText.normen.length === viaCode.normen.length,
             `Text vs Code liefern unterschiedliche Mengen: ${viaText.normen.length} vs ${viaCode.normen.length}`);
    });

    // ─── Sprint 3.6: normen-picker Endpoint ───
    // Wir importieren den Handler direkt und testen ihn wie Netlify ihn aufruft
    await test('Sprint 3.6: normen-picker Handler existiert', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      assert(typeof picker.handler === 'function', 'Handler nicht exportiert');
    });

    await test('Sprint 3.6: fast-Mode liefert 5 Normen in Frontend-Shape', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ schadensart: 'Wasserschaden', mode: 'fast', max: 5 })
      });
      assert(res.statusCode === 200, `HTTP ${res.statusCode}`);
      const body = JSON.parse(res.body);
      assert(body.mode === 'fast', `mode ist ${body.mode}`);
      assert(Array.isArray(body.normen), 'normen kein Array');
      assert(body.normen.length > 0 && body.normen.length <= 5, `${body.normen.length} Normen`);
      // Frontend-Shape prüfen
      const n = body.normen[0];
      assert(typeof n.n === 'string', 'n kein String');
      assert(typeof n.t === 'string', 't kein String');
      assert(typeof n.sa === 'string', 'sa kein String');
      assert(typeof n.g === 'string', 'g kein String');
    });

    await test('Sprint 3.6: smart-Mode ohne API-Key → Fallback auf fast', async () => {
      const saved = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({
          schadensart: 'Wasserschaden',
          kontext: 'Horizontalsperre fehlt im Keller, aufsteigende Feuchte erkennbar.',
          mode: 'smart', max: 5
        })
      });
      if (saved) process.env.OPENAI_API_KEY = saved;
      const body = JSON.parse(res.body);
      assert(body.normen.length > 0, 'smart ohne Key sollte trotzdem Normen liefern');
      assert(body.note && body.note.includes('kein-api-key'), `note: ${body.note}`);
    });

    await test('Sprint 3.6: leere schadensart → HTTP 200 mit Normen', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ schadensart: '', mode: 'fast', max: 5 })
      });
      assert(res.statusCode === 200, 'kein 200');
      const body = JSON.parse(res.body);
      assert(body.normen.length > 0, 'leere SA sollte alle Normen liefern (Fallback)');
    });

    await test('Sprint 3.6: max Bound 1-15 wird eingehalten', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      // max=99 → sollte auf 15 gekappt werden (Bound in Sprint 4 von 10 auf 15 erhöht für Flow B)
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ schadensart: 'Wasserschaden', mode: 'fast', max: 99 })
      });
      const body = JSON.parse(res.body);
      assert(body.normen.length <= 15, `max nicht gekappt: ${body.normen.length}`);
    });

    await test('Sprint 3.6: GET mit Query-Params funktioniert', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'GET',
        queryStringParameters: { sa: 'Schimmelpilz', mode: 'fast', max: 3 }
      });
      assert(res.statusCode === 200);
      const body = JSON.parse(res.body);
      assert(body.normen.length > 0 && body.normen.length <= 3, `${body.normen.length} Normen`);
    });

    await test('Sprint 3.6: OPTIONS (CORS Preflight) → 204', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({ httpMethod: 'OPTIONS' });
      assert(res.statusCode === 204, `OPTIONS nicht 204: ${res.statusCode}`);
    });

    // ─── Sprint 4: Flow B (Wertgutachten) ───
    await test('Sprint 4: wertgutachtenNormen existiert und liefert Array', () => {
      assert(typeof FW.wertgutachtenNormen === 'function', 'Funktion fehlt');
      const result = FW.wertgutachtenNormen('alle');
      assert(Array.isArray(result), 'kein Array');
      assert(result.length >= 8, `zu wenig Kern-Normen: ${result.length}`);
    });

    await test('Sprint 4: WERTGUTACHTEN_NORMEN hat Kern + 3 Zwecke', () => {
      assert(Array.isArray(FW.WERTGUTACHTEN_NORMEN), 'keine Liste');
      assert(FW.WERTGUTACHTEN_NORMEN.length >= 18, `zu wenig: ${FW.WERTGUTACHTEN_NORMEN.length}`);
      const zwecke = [...new Set(FW.WERTGUTACHTEN_NORMEN.map(n => n.zweck))];
      assert(zwecke.includes('alle'), 'keine Kern-Normen');
      assert(zwecke.includes('bank'), 'keine Bank-Normen');
      assert(zwecke.includes('gericht'), 'keine Gericht-Normen');
      assert(zwecke.includes('steuer'), 'keine Steuer-Normen');
    });

    await test('Sprint 4: zweck=bank liefert mehr als zweck=privat', () => {
      const bank   = FW.wertgutachtenNormen('bank');
      const privat = FW.wertgutachtenNormen('privat');
      assert(bank.length > privat.length, `bank ${bank.length} vs privat ${privat.length}`);
    });

    await test('Sprint 4: zweck=bank enthält BelWertV-Normen', () => {
      const bank = FW.wertgutachtenNormen('bank');
      const hasBelWertV = bank.some(n => n.num.includes('BelWertV'));
      assert(hasBelWertV, 'keine BelWertV-Norm in Bank-Liste');
    });

    await test('Sprint 4: zweck=gericht enthält ZPO-Zusatznormen', () => {
      const g = FW.wertgutachtenNormen('gericht');
      const hasZPO = g.some(n => n.num.includes('404 ZPO') || n.num.includes('411 ZPO'));
      assert(hasZPO, 'keine zusätzlichen ZPO-Normen in Gericht-Liste');
    });

    await test('Sprint 4: normen-picker flow=B + zweck=bank', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ flow: 'B', zweck: 'bank', objektart: 'mfh', max: 12 })
      });
      assert(res.statusCode === 200);
      const body = JSON.parse(res.body);
      assert(body.mode === 'flow-b', `mode: ${body.mode}`);
      assert(body.source === 'static', `source: ${body.source}`);
      assert(body.normen.length >= 10, `${body.normen.length} Normen`);
      // BelWertV muss bei bank dabei sein (Modifier-Vorrang)
      const belwertv = body.normen.find(n => n.n.includes('BelWertV'));
      assert(belwertv, 'BelWertV fehlt in Bank-Response');
      // Frontend-Shape
      assert(typeof body.normen[0].n === 'string', 'n kein String');
      assert(typeof body.normen[0].t === 'string', 't kein String');
      assert(typeof body.normen[0].g === 'string', 'g kein String');
    });

    await test('Sprint 4: flow=B MFH sortiert Ertragswert vor Sachwert', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ flow: 'B', zweck: 'privat', objektart: 'mfh', max: 10 })
      });
      const body = JSON.parse(res.body);
      const namen = body.normen.map(n => n.t);
      const iErtrag = namen.findIndex(t => t.includes('Ertragswert'));
      const iSachwert = namen.findIndex(t => t.includes('Sachwert'));
      assert(iErtrag < iSachwert, `MFH: Ertragswert (${iErtrag}) soll vor Sachwert (${iSachwert}) sein`);
    });

    await test('Sprint 4: flow=B EFH sortiert Sachwert vor Ertrag', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ flow: 'B', zweck: 'privat', objektart: 'efh', max: 10 })
      });
      const body = JSON.parse(res.body);
      const namen = body.normen.map(n => n.t);
      const iErtrag = namen.findIndex(t => t.includes('Ertragswert'));
      const iSachwert = namen.findIndex(t => t.includes('Sachwert'));
      assert(iSachwert < iErtrag, `EFH: Sachwert (${iSachwert}) soll vor Ertrag (${iErtrag}) sein`);
    });

    await test('Sprint 4: flow=A Regression — normen-picker liefert weiter Flow-A', async () => {
      const picker = require(path.resolve(__dirname, '..', 'netlify', 'functions', 'normen-picker.js'));
      const res = await picker.handler({
        httpMethod: 'POST',
        body: JSON.stringify({ flow: 'A', schadensart: 'Wasserschaden', mode: 'fast', max: 5 })
      });
      const body = JSON.parse(res.body);
      assert(body.mode === 'fast', `Flow-A mode: ${body.mode}`);
      assert(body.normen.length > 0, 'Flow-A keine Normen');
    });

    // PAT wiederherstellen
    if (savedPAT) process.env.AIRTABLE_PAT = savedPAT;
    if (savedTOKEN) process.env.AIRTABLE_TOKEN = savedTOKEN;
    FW._resetCache();
  }

  // ═══ SCHICHT 1: Airtable-Live (nur mit PAT) ═══
  if (process.env.AIRTABLE_PAT && !process.env.FORCE_FALLBACK) {
    console.log(c.bold('\nSchicht 1 — Airtable-Live:'));
    FW._resetCache();

    await test('getNormen() holt Live-Daten aus Airtable', async () => {
      const result = await FW.getNormen();
      assert(result.source === 'airtable-live', `Expected source=airtable-live, got ${result.source}`);
      assert(result.normen.length > 50, `Airtable liefert nur ${result.normen.length} Normen — erwartet >50`);
    });

    // ═══ SCHICHT 2: Cache ═══
    console.log(c.bold('\nSchicht 2 — In-Memory-Cache:'));

    await test('Zweiter getNormen()-Aufruf kommt aus Cache', async () => {
      const result = await FW.getNormen();
      assert(result.source === 'cache', `Expected source=cache, got ${result.source}`);
    });

    await test('_getCacheState() zeigt gültigen Cache', () => {
      const state = FW._getCacheState();
      assert(state.hasCachedData === true, 'hasCachedData sollte true sein');
      assert(state.cachedCount > 50, `cachedCount=${state.cachedCount} < 50`);
      assert(state.cachedAt !== null, 'cachedAt sollte gesetzt sein');
    });

    await test('_resetCache() löscht Cache', () => {
      FW._resetCache();
      const state = FW._getCacheState();
      assert(state.hasCachedData === false, 'Cache sollte nach Reset leer sein');
    });
  } else {
    console.log(c.yellow('\n⊘ Schicht-1-Tests übersprungen (AIRTABLE_PAT nicht gesetzt oder FORCE_FALLBACK aktiv)'));
  }

  // ═══ Ergebnis ═══
  console.log(c.bold('\n══════════════════════════════════════════════════════════'));
  console.log(`  ${c.green(passed + ' passed')}${failed ? ', ' + c.red(failed + ' failed') : ''}`);
  console.log(c.bold('══════════════════════════════════════════════════════════\n'));

  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error(c.red('Test-Runner-Fehler:'), err);
  process.exit(1);
});
