#!/usr/bin/env node
/**
 * PROVA Performance-Suite (MEGA⁴² P4)
 *
 * Misst die 6 kritischen Pfade mit p50/p95/p99 + Throughput:
 *   1. Wizard-Flow-Configs   (in-memory lookup)
 *   2. Workflow-Stepper-Bridge (progress-calc)
 *   3. Global-Search-Engine  (in-memory ranking)
 *   4. FAQ-Search local-rank  (in-memory tsvector-style)
 *   5. Document-Save Module-Init (Lambda-Cold-Start)
 *   6. KI-Proxy Module-Init (Lambda-Cold-Start)
 *
 * Run: node scripts/perf-suite.js [--json] [--n <iterations>]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = {
  json: args.includes('--json'),
  n: (() => {
    const i = args.indexOf('--n');
    return i >= 0 ? parseInt(args[i + 1], 10) || 100 : 100;
  })()
};

function bench(name, fn, n) {
  const samples = [];
  // Warmup
  for (let i = 0; i < 3; i++) fn();
  // Measure
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const p = (q) => samples[Math.floor(samples.length * q)];
  return {
    name,
    n: samples.length,
    p50_ms: +p(0.5).toFixed(3),
    p95_ms: +p(0.95).toFixed(3),
    p99_ms: +p(0.99).toFixed(4),
    avg_ms: +(samples.reduce((s, x) => s + x, 0) / samples.length).toFixed(3),
    min_ms: +samples[0].toFixed(4),
    max_ms: +samples[samples.length - 1].toFixed(3),
    throughput_per_sec: Math.round(1000 / (samples.reduce((s, x) => s + x, 0) / samples.length))
  };
}

// ─── Setup-Module-Mocks ────────────────────────────────
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJtest.test.test';
process.env.NODE_ENV = 'test';

global.window = global.window || {};

// ─── Tests ────────────────────────────────────────────────

function test1_FlowConfigs() {
  const cfg = require(path.join(ROOT, 'lib', 'wizard-flow-configs.js'));
  return bench('Flow-Configs Lookup (getStepsForAuftragstyp)', () => {
    cfg.getStepsForAuftragstyp('gerichtsgutachten');
    cfg.getStepsForAuftragstyp('wertgutachten');
    cfg.getStepsForAuftragstyp('kaufberatung');
    cfg.getStepsForAuftragstyp('baubegleitung');
  }, flags.n);
}

function test2_StepperBridge() {
  const cfg = require(path.join(ROOT, 'lib', 'wizard-flow-configs.js'));
  global.window.ProvaWizardFlowConfigs = cfg;
  delete require.cache[require.resolve(path.join(ROOT, 'lib', 'workflow-stepper-bridge.js'))];
  const bridge = require(path.join(ROOT, 'lib', 'workflow-stepper-bridge.js'));
  const flow = cfg.getFlow('A');
  const fullState = {
    auftrag_typ: 'gerichtsgutachten',
    adresse: 'Hauptstr. 1', plz: '10115', ort: 'Berlin',
    auftraggeber_name: 'Schmidt', auftraggeber_email: 'a@b.de',
    rechtsgrundlage: 'BGB', frist: '2026-12-31'
  };
  return bench('Stepper-Bridge Progress-Calc (full state, 4 steps)', () => {
    bridge._getProgressForStatePure(flow, fullState);
  }, flags.n);
}

function test3_GlobalSearchEngine() {
  delete require.cache[require.resolve(path.join(ROOT, 'lib', 'global-search-engine.js'))];
  let engine;
  try {
    engine = require(path.join(ROOT, 'lib', 'global-search-engine.js'));
  } catch (e) {
    return { name: 'Global-Search-Engine', n: 0, error: e.message };
  }
  // Synthetic-Data: 100 cases
  const cases = [];
  for (let i = 0; i < 100; i++) {
    cases.push({
      id: 'case-' + i,
      title: 'Schaden Bauteil ' + (i % 7),
      kunde: 'Müller-' + i,
      ort: 'Berlin-' + (i % 10),
      status: i % 2 === 0 ? 'offen' : 'fertig'
    });
  }
  return bench('Global-Search-Engine searchCases (100 items, query=bauteil)', () => {
    engine.searchCases(cases, 'bauteil', { limit: 20 });
  }, flags.n);
}

function test4_FAQSearchLocal() {
  // Pure-fn FAQ-ranking similar pattern (without DB)
  const faqEntries = [];
  const TOPICS = ['DSGVO', 'Login', 'Editor', 'PDF', 'Stripe', 'Onboarding', 'Workspace', 'Team', 'Mobile', 'Cookie'];
  for (let i = 0; i < 50; i++) {
    faqEntries.push({
      id: 'faq-' + i,
      title: TOPICS[i % TOPICS.length] + ' Frage ' + i,
      content: 'Antwort zu ' + TOPICS[i % TOPICS.length] + ' mit verschiedenen Wörtern. Schritt für Schritt erklärt.'
    });
  }
  function rank(query, entries) {
    const q = query.toLowerCase();
    return entries
      .map(e => {
        let score = 0;
        if (e.title.toLowerCase().includes(q)) score += 10;
        if (e.content.toLowerCase().includes(q)) score += 1;
        return { entry: e, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
  return bench('FAQ-Search local-rank (50 entries, query=DSGVO)', () => {
    rank('DSGVO', faqEntries);
  }, flags.n);
}

function test5_DocumentSaveModuleInit() {
  return bench('Lambda document-save Module-Init (Cold-Start)', () => {
    delete require.cache[require.resolve(path.join(ROOT, 'netlify', 'functions', 'document-save.js'))];
    require(path.join(ROOT, 'netlify', 'functions', 'document-save.js'));
  }, Math.min(flags.n, 30)); // module-load is heavier, fewer iterations
}

function test6_KiProxyModuleInit() {
  return bench('Lambda ki-proxy Module-Init (Cold-Start)', () => {
    delete require.cache[require.resolve(path.join(ROOT, 'netlify', 'functions', 'ki-proxy.js'))];
    require(path.join(ROOT, 'netlify', 'functions', 'ki-proxy.js'));
  }, Math.min(flags.n, 30));
}

// ─── Main ────────────────────────────────────────────────

function fmtTable(results) {
  const cols = ['name', 'n', 'p50_ms', 'p95_ms', 'p99_ms', 'avg_ms', 'throughput_per_sec'];
  const rows = results.map(r => cols.map(c => String(r[c] !== undefined ? r[c] : '–')));
  const widths = cols.map((c, i) => Math.max(c.length, ...rows.map(r => r[i].length)));
  const head = '| ' + cols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  const sep = '|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|';
  const body = rows.map(r => '| ' + r.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |').join('\n');
  return [head, sep, body].join('\n');
}

function main() {
  const t0 = Date.now();
  const tests = [
    test1_FlowConfigs,
    test2_StepperBridge,
    test3_GlobalSearchEngine,
    test4_FAQSearchLocal,
    test5_DocumentSaveModuleInit,
    test6_KiProxyModuleInit
  ];
  const results = [];
  for (const t of tests) {
    try {
      const r = t();
      results.push(r);
      if (!flags.json) {
        if (r.error) {
          console.error(`❌ ${r.name}: ${r.error}`);
        } else {
          console.log(`✅ ${r.name}: p50=${r.p50_ms}ms p95=${r.p95_ms}ms p99=${r.p99_ms}ms avg=${r.avg_ms}ms (${r.throughput_per_sec}/s)`);
        }
      }
    } catch (e) {
      results.push({ name: t.name, error: e.message });
      if (!flags.json) console.error(`❌ ${t.name} crashed: ${e.message}`);
    }
  }
  const duration = Date.now() - t0;

  if (flags.json) {
    console.log(JSON.stringify({ duration_ms: duration, n: flags.n, results }, null, 2));
  } else {
    console.log('');
    console.log('=== Performance-Suite Results ===');
    console.log(fmtTable(results.filter(r => !r.error)));
    console.log('');
    console.log(`Total duration: ${duration}ms, iterations per test: ${flags.n}`);
  }
  // Force exit (Lambda-Module halten Process via offene Connections offen)
  process.exit(0);
}

main();
