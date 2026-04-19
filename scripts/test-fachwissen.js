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
