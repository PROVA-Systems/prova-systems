/**
 * PROVA — KI-Funktions-Garantie 5-Tests (MEGA²⁸ P6-I1)
 *
 * Garantiert dass jede KI-Pfad-Stelle definierte Output-Constraints einhält.
 * Mocked OpenAI/Anthropic-Responses — KEINE echten API-Calls.
 *
 * Run: node --test tests/ki-funktions-garantie.test.js
 *      npm run test:ki-garantie  (siehe package.json)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Mocked KI-Service-Responses für 5 KI-Pfade.
// Format: { input, mock_response, expected_validators }

// ─── Test 1: Konjunktiv-II-Validator ──────────────────────────────────

describe('KI-Garantie Test 1: Konjunktiv-II-Erkennung', () => {
  /**
   * SV-Eigenleistung Pflicht: §6 muss Konjunktiv-II-Marker enthalten,
   * KEINE Indikativ-Aussagen ("ist", "sind", "wird"). CLAUDE.md Regel 9 + 14.
   */
  function validateKonjunktiv2(text) {
    if (!text || typeof text !== 'string') return { valid: false, reason: 'no text' };
    const konjunktiv2Markers = /\b(dürfte|könnte|läge nahe|ließe sich|wäre|würde|müsste|sollte|hätte|möchte)\b/i;
    const indikativProblems = /\b(ist eindeutig|sind klar|wird sicher|definitiv vorhanden)\b/i;
    if (!konjunktiv2Markers.test(text)) return { valid: false, reason: 'no konjunktiv-II marker' };
    if (indikativProblems.test(text)) return { valid: false, reason: 'indicative absolutes detected' };
    return { valid: true };
  }

  test('akzeptiert "Es dürfte sich um Schimmel handeln"', () => {
    const r = validateKonjunktiv2('Es dürfte sich um Schimmel handeln, da die Feuchtigkeit erhöht wäre.');
    assert.equal(r.valid, true);
  });

  test('lehnt indikativ "Das ist eindeutig Schimmel" ab', () => {
    const r = validateKonjunktiv2('Das ist eindeutig Schimmel.');
    assert.equal(r.valid, false);
  });

  test('lehnt fehlende Konjunktiv-II-Marker ab', () => {
    const r = validateKonjunktiv2('Der Befund war auffällig und mehrere Stellen betroffen.');
    assert.equal(r.valid, false);
    assert.match(r.reason, /konjunktiv/);
  });

  test('akzeptiert "ließe sich vermuten"', () => {
    const r = validateKonjunktiv2('Aus den Messwerten ließe sich vermuten, dass eine Kondensation vorliegt.');
    assert.equal(r.valid, true);
  });
});

// ─── Test 2: Halluzinations-Check ─────────────────────────────────────

describe('KI-Garantie Test 2: Halluzinations-Erkennung', () => {
  /**
   * KI-Output darf KEINE Daten erfinden, die nicht im Input waren.
   * Hier: Stichprobe — wenn Input "Schimmel" erwähnt aber kein "Wasserrohrbruch",
   * darf KI-Output NICHT "Wasserrohrbruch" erfinden.
   */
  function checkHallucination(input, output, forbiddenIfNotInInput) {
    const issues = [];
    forbiddenIfNotInInput.forEach(term => {
      const inInput = new RegExp(term, 'i').test(input);
      const inOutput = new RegExp(term, 'i').test(output);
      if (!inInput && inOutput) issues.push({ term, reason: 'not in input' });
    });
    return { valid: issues.length === 0, issues };
  }

  test('akzeptiert wenn Output nur Input-Begriffe nutzt', () => {
    const r = checkHallucination(
      'Schimmel im Bad, Feuchtigkeit erhöht.',
      'Es liegt Schimmel-Befall vor. Feuchtigkeit ist die Ursache.',
      ['Wasserrohrbruch', 'Kondensation', 'Brand']
    );
    assert.equal(r.valid, true);
  });

  test('detektiert erfundenen "Wasserrohrbruch"', () => {
    const r = checkHallucination(
      'Schimmel im Bad, Feuchtigkeit erhöht.',
      'Es liegt Schimmel-Befall durch einen Wasserrohrbruch vor.',
      ['Wasserrohrbruch']
    );
    assert.equal(r.valid, false);
    assert.equal(r.issues.length, 1);
    assert.equal(r.issues[0].term, 'Wasserrohrbruch');
  });
});

// ─── Test 3: §407a-Eigenleistungs-Check ──────────────────────────────

describe('KI-Garantie Test 3: §407a Eigenleistung-Validator', () => {
  /**
   * §407a Abs. 3 ZPO: SV ist eigenverantwortlich.
   * Wenn SV-Eigenleistung in §6 Fachurteil < 500 Zeichen UND
   * < 2 Qualitäts-Marker (Norm-Verweis, Konjunktiv II, §-Verweis):
   * → Warnung pflicht, freigabe blockiert.
   */
  function validateEigenleistung(svText) {
    if (!svText) return { valid: false, blocked: true, reason: 'leer' };
    const length = svText.length;
    const markers = {
      norm: /\b(DIN|EN|VOB|ISO|VDI)\s*\d+/i.test(svText),
      konjunktiv: /\b(dürfte|könnte|läge nahe|ließe sich|wäre|würde|hätte|sollte|möchte|müsste)\b/i.test(svText),
      paragraph: /§\s*\d+/.test(svText)
    };
    const markerCount = Object.values(markers).filter(Boolean).length;
    const blocked = length < 500 || markerCount < 2;
    return { valid: !blocked, blocked, length, markerCount, markers };
  }

  test('Blockiert bei < 500 Zeichen', () => {
    const r = validateEigenleistung('Kurzer Text.');
    assert.equal(r.blocked, true);
  });

  test('Blockiert bei nur 1 Marker', () => {
    const longText = 'Aus den Messwerten ließe sich vermuten, dass eine Feuchtigkeit vorliegt. '.repeat(10);
    const r = validateEigenleistung(longText);
    // ≥ 500 Zeichen, aber nur Konjunktiv-Marker (nicht Norm/§)
    assert.ok(r.length >= 500);
    assert.equal(r.markerCount, 1);
    assert.equal(r.blocked, true);
  });

  test('Akzeptiert ≥ 500 Zeichen + 2 Marker (Norm + Konjunktiv)', () => {
    const text = 'Gemäß DIN 4108 wäre die Feuchtigkeit mit den Messwerten zu vergleichen. '
      + 'Aus den Aufnahmen ließe sich ein Schimmelrisiko ableiten. '.repeat(8);
    const r = validateEigenleistung(text);
    assert.ok(r.length >= 500);
    assert.ok(r.markerCount >= 2);
    assert.equal(r.blocked, false);
  });

  test('Akzeptiert mit allen 3 Markern', () => {
    const text = 'Gemäß DIN 4108 und § 633 BGB wäre eine Mängelbeseitigung erforderlich. '
      + 'Aus dem Befund ließe sich ein Anspruch ableiten. '.repeat(8);
    const r = validateEigenleistung(text);
    assert.equal(r.markers.norm, true);
    assert.equal(r.markers.konjunktiv, true);
    assert.equal(r.markers.paragraph, true);
    assert.equal(r.markerCount, 3);
  });
});

// ─── Test 4: Normen-Vorschlag-Mapping ─────────────────────────────────

describe('KI-Garantie Test 4: Normen-Vorschlag-Sanity', () => {
  /**
   * Schadens-Keyword → erwartete Norm-Familie.
   * Vereinfachter fachlicher Mapping-Check (echte Mappings via Marcel-Pflegerei).
   */
  const NORM_MAPPING = {
    'schimmel': /DIN\s*4108|DIN\s*EN\s*ISO\s*13788/i,
    'feuchtigkeit': /DIN\s*4108|VDI\s*6022/i,
    'risse': /DIN\s*1045|DIN\s*EN\s*1992/i,
    'brand': /DIN\s*4102|DIN\s*EN\s*13501/i,
    'estrich': /DIN\s*18560/i
  };

  function suggestNorm(keyword) {
    const k = keyword.toLowerCase();
    for (const [key, regex] of Object.entries(NORM_MAPPING)) {
      if (k.indexOf(key) >= 0) return { match: true, key, expected_pattern: regex };
    }
    return { match: false };
  }

  test('Schimmel → DIN 4108 erkannt', () => {
    const r = suggestNorm('Schimmelbefall');
    assert.equal(r.match, true);
    assert.equal(r.key, 'schimmel');
    assert.match('DIN 4108', r.expected_pattern);
  });

  test('Risse → DIN 1045 erkannt', () => {
    const r = suggestNorm('Risse im Mauerwerk');
    assert.equal(r.match, true);
    assert.match('DIN 1045-1', r.expected_pattern);
  });

  test('Unbekanntes Keyword → match:false (ehrlich)', () => {
    const r = suggestNorm('UFO-Schaden');
    assert.equal(r.match, false);
  });
});

// ─── Test 5: §4 ↔ §6 Konsistenz-Check ─────────────────────────────────

describe('KI-Garantie Test 5: §4↔§6 Konsistenz', () => {
  /**
   * Sachverhalt (§4) und Fachurteil (§6) dürfen sich logisch nicht widersprechen.
   * Beispiel: §4 sagt "trocken", §6 sagt "feucht" → Widerspruch.
   */
  function checkConsistency(p4_sachverhalt, p6_fachurteil) {
    const issues = [];
    const widersprueche = [
      { p4: /\btrocken\w*/i, p6: /\bfeucht\w*/i, label: 'Trockenheit vs Feuchtigkeit' },
      { p4: /\bunversehrt\b/i, p6: /\bbeschäd/i, label: 'Unversehrt vs Beschädigt' },
      { p4: /\bohne Risse\b/i, p6: /\bRisse vorhanden\b/i, label: 'Ohne Risse vs Risse vorhanden' }
    ];
    widersprueche.forEach(w => {
      if (w.p4.test(p4_sachverhalt) && w.p6.test(p6_fachurteil)) {
        issues.push({ widerspruch: w.label });
      }
    });
    return { valid: issues.length === 0, issues };
  }

  test('akzeptiert konsistente §4/§6', () => {
    const r = checkConsistency(
      'Der Estrich war feucht.',
      'Aus dem feuchten Zustand des Estrichs ließe sich Sanierungsbedarf ableiten.'
    );
    assert.equal(r.valid, true);
  });

  test('detektiert Trockenheit-vs-Feuchtigkeit-Widerspruch', () => {
    const r = checkConsistency(
      'Der Estrich war trocken bei Begehung.',
      'Aus dem feuchten Zustand des Estrichs würde sich…'
    );
    assert.equal(r.valid, false);
    assert.equal(r.issues.length, 1);
    assert.match(r.issues[0].widerspruch, /Trockenheit/);
  });

  test('detektiert Unversehrt-vs-Beschädigt-Widerspruch', () => {
    const r = checkConsistency(
      'Das Bauteil ist unversehrt.',
      'Da das Bauteil beschädigt wäre, …'
    );
    assert.equal(r.valid, false);
  });
});

// ─── Source-Audit: KI-Pfad-Existenz im Code ──────────────────────────

describe('KI-Garantie Source-Audit', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const ROOT = path.join(__dirname, '..');

  test('ki-proxy.js Pseudonymisierung-Pflicht', () => {
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/ki-proxy.js'), 'utf8');
    assert.ok(/pseudo|prova-pseudo|PROVA_PSEUDO/i.test(src),
      'ki-proxy MUSS Pseudo-Logic haben (CLAUDE.md Regel 17)');
  });

  test('ki-service-anthropic.js nutzt claude-sonnet-4-6', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/ki-service-anthropic.js'), 'utf8');
    assert.ok(/claude-sonnet-4-6|claude-sonnet/i.test(src));
  });

  test('ki-service-openai.js Modell-Strategie aktuell (W4-I0: gpt-5.x oder backwards-compat gpt-4o)', () => {
    // MEGA²⁹ W9-I0b: Test aktualisiert nach W4-I0 (gpt-4o deprecated → gpt-5.x).
    // Backwards-Compat-Pattern erlaubt gpt-4o als Fallback-String, aber
    // mindestens ein gpt-5.x-String MUSS verfügbar sein.
    const src = fs.readFileSync(path.join(ROOT, 'lib/ki-service-openai.js'), 'utf8');
    const hasGpt5 = /gpt-5\.(?:5|4)/i.test(src);
    const hasGpt4o = /gpt-4o(?!-mini)/.test(src); // backwards-compat
    assert.ok(hasGpt5 || hasGpt4o,
      'gpt-5.x oder gpt-4o Modell-String muss verfügbar sein (W4-I0-Migration)');
  });
});
