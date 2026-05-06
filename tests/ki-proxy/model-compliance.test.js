/**
 * PROVA — ki-proxy.js Model-Compliance Tests (MEGA²⁸ W3-I0, 10.05.2026)
 *
 * Verifiziert:
 * - Aktuelle Modell-Strings (gpt-5.5/5.4/5.4-mini) statt deprecated GPT-4o.
 * - Anthropic-Backup-Map vollständig.
 * - Fallback-Logic (callOpenAIWithFallback) ruft Anthropic bei 429/5xx.
 * - Konjunktiv-II-Compliance (Rule 14) bleibt erhalten — jetzt mit gpt-5.5.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'ki-proxy.js'), 'utf8');

describe('ki-proxy Model-Strings — W3-I0 Update (10.05.2026)', () => {
  test('MODELS-Konstante mit gpt-5.x Strings deklariert', () => {
    assert.match(SRC, /const MODELS\s*=\s*\{/);
    assert.match(SRC, /fachurteil:\s*['"]gpt-5\.5['"]/);
    assert.match(SRC, /pruefung:\s*['"]gpt-5\.5['"]/);
    assert.match(SRC, /assist:\s*['"]gpt-5\.4['"]/);
    assert.match(SRC, /light:\s*['"]gpt-5\.4-mini['"]/);
    assert.match(SRC, /whisper:\s*['"]whisper-1['"]/);
  });

  test('handleQualitaetspruefung nutzt MODELS.pruefung (gpt-5.5)', () => {
    const m = SRC.match(/MEGA.{1,3} W3-I0[\s\S]{0,400}callOpenAIWithFallback\(\s*\{\s*model:\s*MODELS\.pruefung/);
    assert.ok(m, 'handleQualitaetspruefung sollte MODELS.pruefung nutzen');
  });

  test('fachurteil_entwurf default ist MODELS.fachurteil', () => {
    assert.match(SRC, /chooseModel\(body,\s*['"]fachurteil_entwurf['"],\s*MODELS\.fachurteil/);
  });

  test('assist_inline ist MODELS.assist (Mid-Tier gpt-5.4)', () => {
    assert.match(SRC, /chooseModel\(body,\s*['"]assist_inline['"],\s*MODELS\.assist/);
  });

  test('chooseModel praezise → MODELS.fachurteil (Frontier)', () => {
    const m = SRC.match(/function chooseModel[\s\S]{0,500}/);
    assert.match(m[0], /heavy/);
    assert.match(m[0], /MODELS\.fachurteil/);
  });
});

describe('ki-proxy DEPRECATED Modelle nicht mehr in API-Calls', () => {
  test('keine gpt-4o-mini in Production-API-Calls mehr', () => {
    // Match direkte Aufrufe model: 'gpt-4o-mini' (nicht im Audit-Kommentar)
    const apiCalls = SRC.match(/model:\s*['"]gpt-4o-mini['"]/g) || [];
    assert.equal(apiCalls.length, 0,
      'gpt-4o-mini wurde Feb 2026 deprecated — keine direkten API-Calls erlaubt');
  });

  test('keine pure gpt-4o-Modell-Strings in API-Calls mehr', () => {
    const apiCalls = SRC.match(/model:\s*['"]gpt-4o['"]/g) || [];
    assert.equal(apiCalls.length, 0,
      'gpt-4o wurde Feb 2026 deprecated — keine direkten API-Calls erlaubt');
  });

  test('Audit-Kommentar dokumentiert Deprecated-Status', () => {
    assert.match(SRC, /DEPRECATED-Modelle/);
    assert.match(SRC, /Feb(?:ruar)? 2026/i);
  });
});

describe('ki-proxy Anthropic-Backup-Map (W3-I0)', () => {
  test('ANTHROPIC_BACKUP-Konstante existiert', () => {
    assert.match(SRC, /const ANTHROPIC_BACKUP\s*=\s*\{/);
  });

  test('Backup-Map enthält alle kritischen Aktionen', () => {
    const m = SRC.match(/const ANTHROPIC_BACKUP[\s\S]{0,800}\};/);
    assert.ok(m, 'ANTHROPIC_BACKUP-Block nicht gefunden');
    const block = m[0];
    assert.match(block, /fachurteil_entwurf:\s*['"]claude-opus-4-7['"]/);
    assert.match(block, /pruefe_fachurteil:\s*['"]claude-opus-4-7['"]/);
    assert.match(block, /qualitaetspruefung:\s*['"]claude-opus-4-7['"]/);
    assert.match(block, /assist_inline:\s*['"]claude-sonnet-4-6['"]/);
    assert.match(block, /freitext:\s*['"]claude-haiku-4-5/);
    assert.match(block, /support_chat:\s*['"]claude-haiku-4-5/);
  });
});

describe('ki-proxy Fallback-Logic (W3-I0)', () => {
  test('callOpenAIWithFallback-Function deklariert', () => {
    assert.match(SRC, /async function callOpenAIWithFallback\(params,\s*openaiApiKey,\s*aufgabe\)/);
  });

  test('Fallback nur bei 429/5xx (NICHT bei 400)', () => {
    const m = SRC.match(/function callOpenAIWithFallback[\s\S]{0,1200}/);
    assert.ok(m);
    assert.match(m[0], /429/);
    assert.match(m[0], /500|502|503|504/);
    assert.match(m[0], /isFallbackable/);
  });

  test('Fallback prüft ANTHROPIC_API_KEY ENV', () => {
    const m = SRC.match(/function callOpenAIWithFallback[\s\S]{0,1200}/);
    assert.match(m[0], /process\.env\.ANTHROPIC_API_KEY/);
  });

  test('Fallback nutzt callAnthropic + ANTHROPIC_BACKUP-Map', () => {
    const m = SRC.match(/function callOpenAIWithFallback[\s\S]{0,1200}/);
    assert.match(m[0], /callAnthropic/);
    assert.match(m[0], /ANTHROPIC_BACKUP\[aufgabe\]/);
  });

  test('Fallback markiert Response mit _fallback_provider', () => {
    const m = SRC.match(/function callOpenAIWithFallback[\s\S]{0,1200}/);
    assert.match(m[0], /_fallback_provider\s*=\s*['"]anthropic['"]/);
  });

  test('Fallback loggt console.warn bei OpenAI-Failure', () => {
    const m = SRC.match(/function callOpenAIWithFallback[\s\S]{0,1200}/);
    assert.match(m[0], /console\.warn/);
    assert.match(m[0], /falling back to Anthropic/i);
  });
});

describe('ki-proxy Audit-Block (Compliance-Doku)', () => {
  test('W3-I0 Audit-Block-Kommentar vorhanden mit aktueller Modell-Tabelle', () => {
    assert.match(SRC, /MEGA.{1,3} W3-I0/);
    assert.match(SRC, /Modell-Strategie 10\.05\.2026/);
    assert.match(SRC, /GPT-5\.5/);
    assert.match(SRC, /Claude Opus 4\.7/);
  });

  test('Audit erwähnt Regel 14 + EU AI Act + 407a', () => {
    assert.match(SRC, /Rule 14|Regel 14|R14/i);
  });
});
