/**
 * PROVA — admin-ki-stats-frontend.js Tests (MEGA²³ Block 4)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'lib', 'admin-ki-stats-frontend.js'));

describe('admin-ki-stats-frontend — aggregateModelDistribution', () => {
  test('berechnet Prozent korrekt fuer 3 Provider', () => {
    const rows = [
      { provider: 'anthropic' }, { provider: 'anthropic' }, { provider: 'anthropic' },
      { provider: 'openai' }, { provider: 'openai' },
      { provider: 'whisper' }
    ];
    const r = Lib.aggregateModelDistribution(rows);
    assert.equal(r.length, 3);
    assert.equal(r[0].provider, 'anthropic');
    assert.equal(r[0].count, 3);
    assert.equal(r[0].percent, 50);
    assert.equal(r[1].provider, 'openai');
    assert.equal(r[1].percent, 33.3);
  });

  test('returnt empty array fuer leeres input', () => {
    assert.deepEqual(Lib.aggregateModelDistribution([]), []);
  });

  test('returnt empty array fuer non-array', () => {
    assert.deepEqual(Lib.aggregateModelDistribution(null), []);
  });

  test('fallback unknown wenn provider fehlt', () => {
    const r = Lib.aggregateModelDistribution([{}, {}]);
    assert.equal(r[0].provider, 'unknown');
    assert.equal(r[0].count, 2);
  });
});

describe('admin-ki-stats-frontend — aggregateCostsPerUser', () => {
  test('aggregiert Cost + Avg-Dauer pro User', () => {
    const rows = [
      { user_id: 'u1', cost_eur: 0.10, dauer_ms: 1000 },
      { user_id: 'u1', cost_eur: 0.20, dauer_ms: 2000 },
      { user_id: 'u2', cost_eur: 0.50, dauer_ms: 3000 }
    ];
    const r = Lib.aggregateCostsPerUser(rows);
    assert.equal(r.length, 2);
    // u2 hat hoehere total cost → kommt zuerst
    assert.equal(r[0].user_id, 'u2');
    assert.equal(r[0].total_cost_eur, 0.50);
    assert.equal(r[1].user_id, 'u1');
    assert.equal(r[1].total_cost_eur, 0.30);
    assert.equal(r[1].avg_dauer_ms, 1500);
  });

  test('limitiert auf topN', () => {
    const rows = [];
    for (let i = 0; i < 20; i++) rows.push({ user_id: 'u' + i, cost_eur: i * 0.01, dauer_ms: 1000 });
    const r = Lib.aggregateCostsPerUser(rows, 5);
    assert.equal(r.length, 5);
  });

  test('returnt empty array fuer non-array', () => {
    assert.deepEqual(Lib.aggregateCostsPerUser(null), []);
  });
});

describe('admin-ki-stats-frontend — aggregateFotoUsage', () => {
  test('zaehlt nur foto_analyse-Calls', () => {
    const rows = [
      { user_id: 'u1', purpose: 'foto_analyse' },
      { user_id: 'u1', purpose: 'foto_analyse' },
      { user_id: 'u1', purpose: 'diktat_strukturierung' },
      { user_id: 'u2', purpose: 'foto_analyse' }
    ];
    const r = Lib.aggregateFotoUsage(rows);
    assert.equal(r.length, 2);
    assert.equal(r[0].user_id, 'u1');
    assert.equal(r[0].foto_calls, 2);
    assert.equal(r[0].limit_pct, 20);
  });

  test('limit_pct = 100 bei genau 10 calls', () => {
    const rows = [];
    for (let i = 0; i < 10; i++) rows.push({ user_id: 'u1', purpose: 'foto_analyse' });
    const r = Lib.aggregateFotoUsage(rows);
    assert.equal(r[0].foto_calls, 10);
    assert.equal(r[0].limit_pct, 100);
  });

  test('returnt empty bei 0 foto-calls', () => {
    const rows = [{ user_id: 'u1', purpose: 'diktat_strukturierung' }];
    assert.deepEqual(Lib.aggregateFotoUsage(rows), []);
  });
});

describe('admin-ki-stats-frontend — aggregateDiktatStats', () => {
  test('berechnet Total + Avg', () => {
    const rows = [
      { purpose: 'diktat_strukturierung', dauer_ms: 60000 },  // 1 min
      { purpose: 'diktat_strukturierung', dauer_ms: 120000 }, // 2 min
      { purpose: 'foto_analyse', dauer_ms: 999999 }
    ];
    const r = Lib.aggregateDiktatStats(rows);
    assert.equal(r.total_calls, 2);
    assert.equal(r.total_minutes, 3);
    assert.equal(r.avg_dauer_ms, 90000);
  });

  test('returnt zero-defaults bei leerem input', () => {
    const r = Lib.aggregateDiktatStats([]);
    assert.deepEqual(r, { total_calls: 0, total_minutes: 0, avg_dauer_ms: 0 });
  });

  test('returnt zero-defaults bei null', () => {
    const r = Lib.aggregateDiktatStats(null);
    assert.deepEqual(r, { total_calls: 0, total_minutes: 0, avg_dauer_ms: 0 });
  });
});

describe('admin-ki-stats-frontend — Renderer', () => {
  test('renderModelPie rendert HTML mit % Werten', () => {
    const html = Lib.renderModelPie([
      { provider: 'anthropic', count: 3, percent: 60 },
      { provider: 'openai', count: 2, percent: 40 }
    ]);
    assert.match(html, /anthropic/);
    assert.match(html, /60%/);
    assert.match(html, /openai/);
  });

  test('renderModelPie escaped HTML', () => {
    const html = Lib.renderModelPie([{ provider: '<script>x</script>', count: 1, percent: 100 }]);
    assert.doesNotMatch(html, /<script>x<\/script>/);
    assert.match(html, /&lt;script&gt;/);
  });

  test('renderModelPie zeigt Empty-State', () => {
    assert.match(Lib.renderModelPie([]), /Keine Daten/);
  });

  test('renderCostsTable rendert Table mit Cost in € (2 Decimal)', () => {
    const html = Lib.renderCostsTable([
      { user_id: 'aaaa1234-bbbb-cccc', count: 5, total_cost_eur: 1.25, avg_dauer_ms: 800 }
    ]);
    assert.match(html, /1\.25/);
    assert.match(html, /aaaa1234/);
  });

  test('renderFotoUsage zeigt Limit-Bar mit %', () => {
    const html = Lib.renderFotoUsage([{ user_id: 'u1', foto_calls: 7, limit_pct: 70 }]);
    assert.match(html, /7\/10/);
    assert.match(html, /70%/);
  });

  test('renderDiktatStats zeigt Calls + Minuten + Avg', () => {
    const html = Lib.renderDiktatStats({ total_calls: 5, total_minutes: 12, avg_dauer_ms: 144000 });
    assert.match(html, /5/);
    assert.match(html, /12/);
    assert.match(html, /Calls/);
  });
});
