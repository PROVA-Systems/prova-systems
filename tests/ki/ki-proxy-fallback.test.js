/**
 * PROVA — ki-proxy Fallback-Logic E2E-Tests
 * MEGA¹² W12 (2026-05-05)
 *
 * Tests dass callKIWithFallback richtige Decision macht:
 *   - OpenAI 200 → kein Fallback
 *   - OpenAI 5xx → Anthropic-Fallback
 *   - OpenAI 401 → KEIN Fallback (Auth-Fehler)
 *   - OpenAI Network-Error → Anthropic-Fallback
 *   - Anthropic auch fail → Original-OpenAI-Error
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Reproduktion der callKIWithFallback-Logik (isolation fuer Test ohne ki-proxy.js zu laden)
const { isOutageError } = require('../../netlify/functions/lib/ki-anthropic');

async function callKIWithFallbackMocked(params, openaiKey, mocks) {
  // Mocks: { callOpenAIRaw, callAnthropic, anthropicKey, auditFn }
  try {
    const result = await mocks.callOpenAIRaw(params, openaiKey);
    return result;
  } catch (openaiErr) {
    if (!isOutageError(openaiErr)) throw openaiErr;
    if (!mocks.anthropicKey) throw openaiErr;
    if (mocks.auditFn) mocks.auditFn({ original_error: String(openaiErr.message) });
    try {
      const result = await mocks.callAnthropic(params, mocks.anthropicKey);
      result._fallback = true;
      result._fallback_provider = 'anthropic';
      return result;
    } catch (anthropicErr) {
      throw new Error('OpenAI nicht erreichbar UND Anthropic-Fallback fehlgeschlagen: ' + openaiErr.message);
    }
  }
}

describe('callKIWithFallback — Decision-Logic', () => {

  test('OpenAI 200 → kein Fallback, Original-Response', async () => {
    let anthropicCalled = false;
    const result = await callKIWithFallbackMocked(
      { messages: [], model: 'gpt-4o' },
      'sk-test',
      {
        callOpenAIRaw: async () => ({ choices: [{ message: { content: 'OpenAI ok' } }] }),
        callAnthropic: async () => { anthropicCalled = true; return {}; },
        anthropicKey: 'sk-ant-test'
      }
    );
    assert.equal(anthropicCalled, false);
    assert.equal(result.choices[0].message.content, 'OpenAI ok');
    assert.equal(result._fallback, undefined);
  });

  test('OpenAI 503 → Anthropic-Fallback, Response mit _fallback=true', async () => {
    let anthropicCalled = false;
    let auditCalled = false;
    const result = await callKIWithFallbackMocked(
      { messages: [], model: 'gpt-4o' },
      'sk-test',
      {
        callOpenAIRaw: async () => { throw new Error('OpenAI 503: Service Unavailable'); },
        callAnthropic: async () => { anthropicCalled = true; return { choices: [{ message: { content: 'Anthropic ok' } }] }; },
        anthropicKey: 'sk-ant-test',
        auditFn: () => { auditCalled = true; }
      }
    );
    assert.equal(anthropicCalled, true);
    assert.equal(auditCalled, true, 'Fallback-Aktivierung sollte audit-loggen');
    assert.equal(result._fallback, true);
    assert.equal(result._fallback_provider, 'anthropic');
    assert.equal(result.choices[0].message.content, 'Anthropic ok');
  });

  test('OpenAI 401 (Auth-Fehler) → KEIN Fallback, Error durchgereicht', async () => {
    let anthropicCalled = false;
    await assert.rejects(
      callKIWithFallbackMocked(
        { messages: [] },
        'sk-test',
        {
          callOpenAIRaw: async () => { throw new Error('OpenAI 401: Invalid API key'); },
          callAnthropic: async () => { anthropicCalled = true; return {}; },
          anthropicKey: 'sk-ant-test'
        }
      ),
      /OpenAI 401/
    );
    assert.equal(anthropicCalled, false, 'Bei 401 darf kein Fallback aktiviert werden');
  });

  test('OpenAI 429 (Rate-Limit) → KEIN Fallback', async () => {
    let anthropicCalled = false;
    await assert.rejects(
      callKIWithFallbackMocked(
        { messages: [] },
        'sk-test',
        {
          callOpenAIRaw: async () => { throw new Error('OpenAI 429: Too many requests'); },
          callAnthropic: async () => { anthropicCalled = true; return {}; },
          anthropicKey: 'sk-ant-test'
        }
      ),
      /OpenAI 429/
    );
    assert.equal(anthropicCalled, false);
  });

  test('Network-Error → Fallback aktiviert', async () => {
    let anthropicCalled = false;
    const result = await callKIWithFallbackMocked(
      { messages: [], model: 'gpt-4o-mini' },
      'sk-test',
      {
        callOpenAIRaw: async () => { throw new Error('fetch failed: ENOTFOUND'); },
        callAnthropic: async () => { anthropicCalled = true; return { choices: [{ message: { content: 'fb' } }] }; },
        anthropicKey: 'sk-ant-test'
      }
    );
    assert.equal(anthropicCalled, true);
    assert.equal(result._fallback, true);
  });

  test('OpenAI 5xx + Anthropic-Key fehlt → Original-Error', async () => {
    await assert.rejects(
      callKIWithFallbackMocked(
        { messages: [] },
        'sk-test',
        {
          callOpenAIRaw: async () => { throw new Error('OpenAI 502: Bad Gateway'); },
          callAnthropic: async () => { throw new Error('should not be called'); },
          anthropicKey: null
        }
      ),
      /OpenAI 502/
    );
  });

  test('OpenAI 5xx + Anthropic auch fail → kombinierter Error', async () => {
    await assert.rejects(
      callKIWithFallbackMocked(
        { messages: [] },
        'sk-test',
        {
          callOpenAIRaw: async () => { throw new Error('OpenAI 503'); },
          callAnthropic: async () => { throw new Error('Anthropic 500'); },
          anthropicKey: 'sk-ant-test'
        }
      ),
      /OpenAI nicht erreichbar UND Anthropic-Fallback fehlgeschlagen/
    );
  });

  test('Audit-Fn wird genau 1x bei Fallback aufgerufen', async () => {
    let auditCallCount = 0;
    await callKIWithFallbackMocked(
      { messages: [] },
      'sk-test',
      {
        callOpenAIRaw: async () => { throw new Error('OpenAI 503'); },
        callAnthropic: async () => ({ choices: [{ message: { content: 'x' } }] }),
        anthropicKey: 'sk-ant-test',
        auditFn: () => { auditCallCount++; }
      }
    );
    assert.equal(auditCallCount, 1);
  });

  test('Audit-Fn wird NICHT aufgerufen wenn OpenAI ok', async () => {
    let auditCallCount = 0;
    await callKIWithFallbackMocked(
      { messages: [] },
      'sk-test',
      {
        callOpenAIRaw: async () => ({ choices: [{}] }),
        callAnthropic: async () => ({}),
        anthropicKey: 'sk-ant-test',
        auditFn: () => { auditCallCount++; }
      }
    );
    assert.equal(auditCallCount, 0);
  });
});

describe('ki-proxy.js Code-Integration-Verification', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'ki-proxy.js'), 'utf8');

  test('ki-proxy.js requires lib/ki-anthropic', () => {
    assert.match(src, /require\(['"]\.\/lib\/ki-anthropic['"]\)/);
  });

  test('ki-proxy.js hat callKIWithFallback Funktion', () => {
    assert.ok(src.includes('callKIWithFallback'));
  });

  test('ki-proxy.js callOpenAI ist jetzt Wrapper um Fallback', () => {
    // callOpenAI sollte zu callKIWithFallback delegieren
    assert.match(src, /async function callOpenAI[\s\S]*return callKIWithFallback/);
  });

  test('ki-proxy.js auditFallbackEvent fire-and-forget', () => {
    assert.ok(src.includes('_auditFallbackEvent'));
    assert.match(src, /setImmediate/);  // fire-and-forget pattern
  });

  test('ki-proxy.js zweite OpenAI-Call-Site (assistInline) refactored', () => {
    // assertions: kein direkter fetch zu api.openai.com mehr in Inline-Pfad
    // Statt dessen: callOpenAI verwendet
    // Wir pruefen dass der Inline-Pfad jetzt _fallback an Frontend weitergibt
    assert.match(src, /_fallback: data\._fallback === true/);
    assert.match(src, /_provider: data\._fallback \?/);
  });
});

describe('ki-proxy.js Backwards-Compat (existing call-sites)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'ki-proxy.js'), 'utf8');

  test('callOpenAI wird weiterhin von existing call-sites aufgerufen', () => {
    // Existing call-sites in handleFachurteil etc. nutzen callOpenAI(...)
    // → Refactor sollte transparent sein
    const callSites = (src.match(/await callOpenAI\(/g) || []).length;
    assert.ok(callSites >= 4, 'Mindestens 4 callOpenAI-Aufrufe (existing) erwartet, gefunden: ' + callSites);
  });
});
