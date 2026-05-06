/**
 * PROVA — KI-Service-Interface Tests (MEGA²¹+²² W109)
 */
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Iface = require(path.join(ROOT, 'lib', 'ki-service-interface.js'));

const _origEnv = {
  KI_VISION_PROVIDER: process.env.KI_VISION_PROVIDER,
  KI_TEXT_PROVIDER: process.env.KI_TEXT_PROVIDER
};

function restoreEnv() {
  Object.entries(_origEnv).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
}

describe('ki-service-interface — resolveProvider', () => {
  beforeEach(() => Iface._resetCache());
  afterEach(() => { restoreEnv(); Iface._resetCache(); });

  test('Default Vision = anthropic (Marcel-Direktive)', () => {
    delete process.env.KI_VISION_PROVIDER;
    assert.equal(Iface.resolveProvider('vision'), 'anthropic');
  });

  test('Default Text = openai (Marcel-G2)', () => {
    delete process.env.KI_TEXT_PROVIDER;
    assert.equal(Iface.resolveProvider('text'), 'openai');
  });

  test('ENV-Switch Vision auf openai', () => {
    process.env.KI_VISION_PROVIDER = 'openai';
    assert.equal(Iface.resolveProvider('vision'), 'openai');
  });

  test('Case-insensitive', () => {
    process.env.KI_VISION_PROVIDER = 'ANTHROPIC';
    assert.equal(Iface.resolveProvider('vision'), 'anthropic');
  });

  test('Unknown Provider faellt auf default zurueck', () => {
    process.env.KI_VISION_PROVIDER = 'unknown';
    assert.equal(Iface.resolveProvider('vision'), 'anthropic');
  });
});

describe('ki-service-interface — getService', () => {
  beforeEach(() => Iface._resetCache());
  afterEach(() => { restoreEnv(); Iface._resetCache(); });

  test('getService(vision) → anthropic Adapter', () => {
    const svc = Iface.getService('vision');
    assert.equal(svc.serviceName, 'anthropic');
    assert.equal(typeof svc.analyzeImage, 'function');
    assert.equal(typeof svc.generateText, 'function');
  });

  test('getService(text) → openai Adapter', () => {
    const svc = Iface.getService('text');
    assert.equal(svc.serviceName, 'openai');
  });

  test('Cached', () => {
    const a = Iface.getService('vision');
    const b = Iface.getService('vision');
    assert.equal(a, b);
  });
});

describe('ki-service-interface — validateAdapter', () => {
  test('Valid Anthropic-Adapter', () => {
    const svc = require(path.join(ROOT, 'lib', 'ki-service-anthropic.js'));
    assert.equal(Iface.validateAdapter(svc), true);
  });

  test('Valid OpenAI-Adapter', () => {
    const svc = require(path.join(ROOT, 'lib', 'ki-service-openai.js'));
    assert.equal(Iface.validateAdapter(svc), true);
  });

  test('null invalid', () => {
    assert.equal(Iface.validateAdapter(null), false);
  });

  test('Object ohne analyzeImage invalid', () => {
    assert.equal(Iface.validateAdapter({ serviceName: 'x', isAvailable: () => true, generateText: async () => {} }), false);
  });

  test('Object ohne generateText invalid', () => {
    assert.equal(Iface.validateAdapter({ serviceName: 'x', isAvailable: () => true, analyzeImage: async () => {} }), false);
  });
});

describe('ki-service-interface — Result-Helpers', () => {
  test('errorResult Shape', () => {
    const r = Iface.errorResult('boom', 'API_FAILED');
    assert.equal(r.ok, false);
    assert.equal(r.content, null);
    assert.equal(r.error, 'boom');
    assert.equal(r.code, 'API_FAILED');
    assert.deepEqual(r.tokens, { input: 0, output: 0 });
    assert.equal(r.cost_eur, 0);
  });

  test('successResult Shape', () => {
    const r = Iface.successResult('Hello', { model: 'gpt-4o', tokens: { input: 10, output: 5 }, cost_eur: 0.001 });
    assert.equal(r.ok, true);
    assert.equal(r.content, 'Hello');
    assert.equal(r.error, null);
    assert.equal(r.model, 'gpt-4o');
  });
});

describe('ki-service-interface — calculateCostEur (Marcel-I1)', () => {
  test('gpt-4o: 1000+500 tokens', () => {
    const cost = Iface.calculateCostEur('openai', 'gpt-4o', 1000, 500);
    // (1000/1M)*2.5 + (500/1M)*10 = 0.0025+0.005 = 0.0075 USD * 0.92 ≈ 0.0069
    assert.ok(cost > 0);
    assert.ok(cost < 0.01);
  });

  test('gpt-4o-mini billiger als gpt-4o', () => {
    const mini = Iface.calculateCostEur('openai', 'gpt-4o-mini', 1000, 500);
    const full = Iface.calculateCostEur('openai', 'gpt-4o', 1000, 500);
    assert.ok(mini < full);
  });

  test('claude-sonnet-4-6 ist gepricet', () => {
    const cost = Iface.calculateCostEur('anthropic', 'claude-sonnet-4-6', 1000, 500);
    assert.ok(cost > 0);
  });

  test('Unknown Modell faellt auf gpt-4o-mini-Pricing', () => {
    const unknown = Iface.calculateCostEur('openai', 'unknown-model', 1000, 500);
    const fallback = Iface.calculateCostEur('openai', 'gpt-4o-mini', 1000, 500);
    assert.equal(unknown, fallback);
  });

  test('6 decimals (analog ki_protokoll.kosten_eur)', () => {
    const cost = Iface.calculateCostEur('openai', 'gpt-4o', 100, 50);
    const str = String(cost);
    // Maximum 6 decimal places
    if (str.includes('.')) {
      const decimals = str.split('.')[1].length;
      assert.ok(decimals <= 6);
    }
  });
});

describe('ki-service-anthropic — Validation (no API call, kein Network)', () => {
  const Adapter = require(path.join(ROOT, 'lib', 'ki-service-anthropic.js'));
  const _origKey = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (_origKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = _origKey;
  });

  test('isAvailable false ohne Key', () => {
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(Adapter.isAvailable(), false);
  });

  test('analyzeImage CONFIG_MISSING ohne Key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await Adapter.analyzeImage('base64data');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'CONFIG_MISSING');
  });

  test('analyzeImage BAD_INPUT ohne imageBase64', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-keylongenough';
    const r = await Adapter.analyzeImage(null);
    assert.equal(r.code, 'BAD_INPUT');
  });

  test('generateText BAD_INPUT bei leerem Array', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-keylongenough';
    const r = await Adapter.generateText([]);
    assert.equal(r.code, 'BAD_INPUT');
  });

  test('serviceName = anthropic', () => {
    assert.equal(Adapter.serviceName, 'anthropic');
  });

  test('Default Vision-Modell = claude-sonnet-4-6', () => {
    assert.equal(Adapter._config.DEFAULT_VISION_MODEL, 'claude-sonnet-4-6');
  });
});

describe('ki-service-openai — Validation (no API call)', () => {
  const Adapter = require(path.join(ROOT, 'lib', 'ki-service-openai.js'));
  const _origKey = process.env.OPENAI_API_KEY;
  afterEach(() => {
    if (_origKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = _origKey;
  });

  test('isAvailable false ohne Key', () => {
    delete process.env.OPENAI_API_KEY;
    assert.equal(Adapter.isAvailable(), false);
  });

  test('Default Vision = gpt-4o (Marcel-G2)', () => {
    assert.equal(Adapter._config.DEFAULT_VISION_MODEL, 'gpt-4o');
  });

  test('Default Text = gpt-4o-mini (Marcel-G2)', () => {
    assert.equal(Adapter._config.DEFAULT_TEXT_MODEL, 'gpt-4o-mini');
  });

  test('serviceName = openai', () => {
    assert.equal(Adapter.serviceName, 'openai');
  });
});
