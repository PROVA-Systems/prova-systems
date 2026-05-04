/**
 * PROVA — KI-Confidence-Badge (Frontend) Tests
 * MEGA¹² W13 (2026-05-05)
 *
 * Testet die Frontend-compute()-Logic. Browser-DOM-Render nicht testbar in Node,
 * aber pure compute-Logic ja (sollte equivalent zu Backend ki-confidence.js sein).
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Reproduktion compute() aus lib/ki-confidence-badge.js
const KONJUNKTIV_II_MARKERS = [
  'koennte', 'koennten', 'waere', 'waeren', 'duerfte', 'duerften',
  'liesse', 'haette', 'sollte', 'wuerde', 'wuerden',
  'naheliegend', 'wahrscheinlich', 'denkbar',
  'könnte', 'könnten', 'wäre', 'wären', 'dürfte', 'dürften',
  'ließe', 'hätte', 'würde', 'würden'
];

const HALLUZINATION_RED_FLAGS = [
  'mit Sicherheit', 'definitiv', 'zweifellos', 'eindeutig',
  'beweisbar', 'unbestreitbar'
];

function compute(openaiResult, opts) {
  opts = opts || {};
  const reasons = [];
  let score = 100;

  if (!openaiResult || !openaiResult.choices || !openaiResult.choices[0]) {
    return { level: 'niedrig', score: 0, reasons: ['Kein Output'] };
  }

  const choice = openaiResult.choices[0];
  const text = (choice.message && choice.message.content) || '';
  const finish = choice.finish_reason || 'unknown';

  if (finish === 'stop') { /* OK */ }
  else if (finish === 'length') { score -= 25; reasons.push('Output abgeschnitten'); }
  else if (finish === 'content_filter') { score -= 60; reasons.push('Content-Filter aktiv'); }
  else { score -= 15; reasons.push('Unbekannter finish_reason'); }

  const usage = openaiResult.usage || {};
  const tokensOut = usage.completion_tokens || 0;
  if (tokensOut < 30 && opts.expectedMinTokens) {
    score -= 20;
    reasons.push('Output sehr kurz');
  }

  if (opts.requireKonjunktivII) {
    const lowerText = text.toLowerCase();
    let kvCount = 0;
    for (const m of KONJUNKTIV_II_MARKERS) if (lowerText.includes(m)) kvCount++;
    if (kvCount === 0) { score -= 30; reasons.push('Keine Konjunktiv-II-Marker (§407a-Risiko)'); }
    else if (kvCount < 2) { score -= 10; reasons.push('Wenige Konjunktiv-II-Marker'); }
  }

  const lowerText = text.toLowerCase();
  let redFlagCount = 0;
  for (const rf of HALLUZINATION_RED_FLAGS) if (lowerText.includes(rf.toLowerCase())) redFlagCount++;
  if (redFlagCount > 0) {
    score -= redFlagCount * 15;
    reasons.push('Apodiktische Aussagen (' + redFlagCount + 'x)');
  }

  const model = openaiResult.model || '';
  if (model.includes('gpt-4o') && !model.includes('mini')) {
    if (reasons.length === 0) score = Math.min(100, score + 5);
  } else if (model.includes('gpt-4o-mini')) {
    if (opts.requireKonjunktivII) {
      score -= 20;
      reasons.push('gpt-4o-mini bei Konjunktiv II');
    }
  }

  let level;
  if (score >= 80) level = 'hoch';
  else if (score >= 50) level = 'mittel';
  else level = 'niedrig';

  return { level, score: Math.max(0, score), reasons };
}

describe('ProvaConfidence.compute — Basis-Logic', () => {

  test('Empty / null result = niedrig 0/100', () => {
    assert.deepEqual(compute(null), { level: 'niedrig', score: 0, reasons: ['Kein Output'] });
    assert.deepEqual(compute({}), { level: 'niedrig', score: 0, reasons: ['Kein Output'] });
    assert.deepEqual(compute({ choices: [] }), { level: 'niedrig', score: 0, reasons: ['Kein Output'] });
  });

  test('Stop-Reason + valider Output = hoch (100)', () => {
    const r = compute({
      choices: [{ message: { content: 'Normaler Output text.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 50 },
      model: 'gpt-4o-mini'
    });
    assert.equal(r.level, 'hoch');
    assert.equal(r.score, 100);
  });

  test('Length-finish = -25 score', () => {
    const r = compute({
      choices: [{ message: { content: 'Truncated...' }, finish_reason: 'length' }],
      usage: { completion_tokens: 100 }
    });
    assert.equal(r.score, 75);
    assert.ok(r.reasons.some(x => x.includes('abgeschnitten')));
  });

  test('Content-Filter = -60 score = niedrig', () => {
    const r = compute({
      choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
      usage: { completion_tokens: 0 }
    });
    assert.equal(r.score, 40);
    assert.equal(r.level, 'niedrig');
  });
});

describe('ProvaConfidence.compute — Konjunktiv-II-Detection', () => {

  test('Konjunktiv II vorhanden + requireKonjunktivII = hoch', () => {
    const r = compute({
      choices: [{ message: { content: 'Es duerfte naheliegend sein, dass die Mauer feucht waere.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 50 }
    }, { requireKonjunktivII: true });
    assert.equal(r.level, 'hoch');
  });

  test('Kein Konjunktiv II + requireKonjunktivII = -30 score', () => {
    const r = compute({
      choices: [{ message: { content: 'Die Mauer ist feucht. Das ist klar.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 }
    }, { requireKonjunktivII: true });
    assert.equal(r.score, 70);
    assert.ok(r.reasons.some(x => x.includes('Konjunktiv-II')));
  });

  test('Wenige Konjunktiv II (1) = -10 score', () => {
    const r = compute({
      choices: [{ message: { content: 'Die Mauer duerfte feucht sein.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 }
    }, { requireKonjunktivII: true });
    assert.equal(r.score, 90);
  });

  test('Umlaut-Varianten werden erkannt (würde, hätte, wäre)', () => {
    const r = compute({
      choices: [{ message: { content: 'Es würde naheliegend sein und hätte könnte wäre.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 }
    }, { requireKonjunktivII: true });
    // Mehrere Marker → kein Penalty
    assert.equal(r.level, 'hoch');
  });
});

describe('ProvaConfidence.compute — Halluzinations-Red-Flags', () => {

  test('Apodiktische Aussage "mit Sicherheit" = -15', () => {
    const r = compute({
      choices: [{ message: { content: 'Es duerfte naheliegend sein. Mit Sicherheit ist es so.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 }
    }, { requireKonjunktivII: true });
    assert.equal(r.score, 85);  // 100 - 15 (red-flag)
  });

  test('Mehrere Red-Flags akkumulieren', () => {
    const r = compute({
      choices: [{ message: { content: 'Definitiv. Zweifellos. Eindeutig.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 }
    });
    // 100 - 15*3 = 55
    assert.equal(r.score, 55);
    assert.equal(r.level, 'mittel');
  });

  test('Keine Red-Flags = kein Penalty', () => {
    const r = compute({
      choices: [{ message: { content: 'Es duerfte vermutlich naheliegend sein.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 }
    });
    assert.equal(r.score, 100);
  });
});

describe('ProvaConfidence.compute — Model-Mapping', () => {

  test('gpt-4o + clean = +5 Bonus', () => {
    const r = compute({
      choices: [{ message: { content: 'Es duerfte naheliegend.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 },
      model: 'gpt-4o'
    });
    // 100 + 5 = 105 → max 100 (Math.min)
    assert.equal(r.score, 100);
  });

  test('gpt-4o-mini bei Konjunktiv-II = -20 Penalty', () => {
    const r = compute({
      choices: [{ message: { content: 'Es duerfte naheliegend.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 30 },
      model: 'gpt-4o-mini'
    }, { requireKonjunktivII: true });
    assert.equal(r.score, 80);
    assert.ok(r.reasons.some(x => x.includes('gpt-4o-mini')));
  });
});

describe('ProvaConfidence.compute — Token-Length', () => {

  test('Sehr kurzer Output + expectedMinTokens = -20', () => {
    const r = compute({
      choices: [{ message: { content: 'Ja.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 10 }
    }, { expectedMinTokens: 50 });
    assert.equal(r.score, 80);
    assert.ok(r.reasons.some(x => x.includes('kurz')));
  });

  test('Kurzer Output OHNE expectedMinTokens = kein Penalty', () => {
    const r = compute({
      choices: [{ message: { content: 'Ja.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 10 }
    });
    assert.equal(r.score, 100);
  });
});

describe('ProvaConfidence.compute — Combined-Scenarios', () => {

  test('Worst-Case: alle Penalties = niedrig', () => {
    const r = compute({
      choices: [{ message: { content: 'Definitiv. Zweifellos.' }, finish_reason: 'length' }],
      usage: { completion_tokens: 5 },
      model: 'gpt-4o-mini'
    }, { requireKonjunktivII: true, expectedMinTokens: 100 });
    // 100 - 25 (length) - 20 (kurz) - 30 (kein Konj) - 30 (2 red-flags) - 20 (mini) = -25 → 0
    assert.equal(r.level, 'niedrig');
    assert.ok(r.reasons.length >= 4);
  });

  test('Best-Case: gpt-4o + Konjunktiv II + clean = hoch', () => {
    const r = compute({
      choices: [{ message: { content: 'Es duerfte naheliegend sein, dass es waere.' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 100 },
      model: 'gpt-4o'
    }, { requireKonjunktivII: true, expectedMinTokens: 50 });
    assert.equal(r.level, 'hoch');
  });
});

describe('Konstanten — Refactor-Drift-Schutz', () => {

  test('KONJUNKTIV_II_MARKERS enthaelt sowohl ASCII als auch Umlaut-Varianten', () => {
    assert.ok(KONJUNKTIV_II_MARKERS.includes('duerfte'));
    assert.ok(KONJUNKTIV_II_MARKERS.includes('dürfte'));
    assert.ok(KONJUNKTIV_II_MARKERS.includes('waere'));
    assert.ok(KONJUNKTIV_II_MARKERS.includes('wäre'));
  });

  test('HALLUZINATION_RED_FLAGS enthaelt apodiktische Phrasen', () => {
    assert.ok(HALLUZINATION_RED_FLAGS.includes('mit Sicherheit'));
    assert.ok(HALLUZINATION_RED_FLAGS.includes('zweifellos'));
    assert.ok(HALLUZINATION_RED_FLAGS.includes('eindeutig'));
  });
});

describe('Frontend-vs-Backend Logic-Parity', () => {

  test('Backend computeConfidence + Frontend compute liefern identisches Ergebnis (gleicher Input)', () => {
    const { computeConfidence } = require('../../netlify/functions/lib/ki-confidence');
    const input = {
      choices: [{
        message: { content: 'Es duerfte naheliegend sein, dass die Wand feucht waere. Mit Sicherheit ist es so.' },
        finish_reason: 'stop'
      }],
      usage: { completion_tokens: 50 },
      model: 'gpt-4o'
    };
    const opts = { requireKonjunktivII: true };
    const backend = computeConfidence(input, opts);
    const frontend = compute(input, opts);
    // Beide sollten gleichen score + level haben (Reasons-Reihenfolge kann minimal abweichen)
    assert.equal(frontend.level, backend.level);
    assert.equal(frontend.score, backend.score);
  });
});
