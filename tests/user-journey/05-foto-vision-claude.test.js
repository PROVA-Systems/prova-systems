/**
 * PROVA — User-Journey 05: Foto-Vision via Claude Sonnet 4.6 (MEGA²⁴ Block 6)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Journey 05 — KI-Service-Routing (Vision)', () => {
  // KI_VISION_PROVIDER=anthropic → claude-sonnet-4-6
  // Fallback: openai gpt-4o-vision
  function pickVisionProvider(envProvider) {
    const valid = ['anthropic', 'openai'];
    if (!envProvider || !valid.includes(envProvider)) return 'anthropic'; // default
    return envProvider;
  }

  function buildVisionPayload(provider, imageBase64, prompt) {
    if (!imageBase64 || imageBase64.length < 100) return null;
    if (provider === 'anthropic') {
      return {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }},
            { type: 'text', text: prompt }
          ]
        }]
      };
    }
    if (provider === 'openai') {
      return {
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64 }},
            { type: 'text', text: prompt }
          ]
        }]
      };
    }
    return null;
  }

  test('default-Provider ist anthropic (Marcel-Decision MEGA²²)', () => {
    assert.equal(pickVisionProvider(undefined), 'anthropic');
    assert.equal(pickVisionProvider(''), 'anthropic');
  });

  test('anthropic-Payload nutzt claude-sonnet-4-6', () => {
    const p = buildVisionPayload('anthropic', 'a'.repeat(200), 'Was zeigt das Bild?');
    assert.equal(p.model, 'claude-sonnet-4-6');
    assert.equal(p.messages[0].content[0].type, 'image');
  });

  test('openai-Payload nutzt gpt-4o + image_url', () => {
    const p = buildVisionPayload('openai', 'a'.repeat(200), 'Was zeigt das Bild?');
    assert.equal(p.model, 'gpt-4o');
    assert.equal(p.messages[0].content[0].type, 'image_url');
  });

  test('null bei leerem Base64', () => {
    assert.equal(buildVisionPayload('anthropic', '', 'prompt'), null);
    assert.equal(buildVisionPayload('anthropic', 'short', 'prompt'), null);
  });
});

describe('Journey 05 — Foto-KI Disclaimer-Integration', () => {
  function buildVisionResponse(provider, raw) {
    return {
      provider,
      model: provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o',
      content: raw && raw.content ? raw.content : '',
      disclaimer: '📷 Foto-KI-Hinweis: Erkennung ist erste Strukturierungs-Hilfe. SV bleibt §407a ZPO letztverantwortlich.'
    };
  }

  test('Response enthaelt Disclaimer mit §407a', () => {
    const r = buildVisionResponse('anthropic', { content: 'Schaden erkannt' });
    assert.match(r.disclaimer, /§407a/);
    assert.match(r.disclaimer, /Foto-KI/);
  });

  test('Provider-Info wird durchgereicht (Audit)', () => {
    const r = buildVisionResponse('anthropic', { content: 'x' });
    assert.equal(r.provider, 'anthropic');
    assert.equal(r.model, 'claude-sonnet-4-6');
  });
});

describe('Journey 05 — Foto-Limit pro Monat (10/Monat Solo-Tier)', () => {
  function checkFotoLimit(usedThisMonth, tier) {
    const limits = { 'starter': 5, 'solo': 10, 'team': 50 };
    const limit = limits[tier] || 0;
    return {
      used: usedThisMonth,
      limit,
      remaining: Math.max(0, limit - usedThisMonth),
      blocked: usedThisMonth >= limit
    };
  }

  test('Solo erlaubt 10/Monat', () => {
    const r = checkFotoLimit(5, 'solo');
    assert.equal(r.limit, 10);
    assert.equal(r.remaining, 5);
    assert.equal(r.blocked, false);
  });

  test('Solo bei 10 → blocked', () => {
    const r = checkFotoLimit(10, 'solo');
    assert.equal(r.blocked, true);
    assert.equal(r.remaining, 0);
  });

  test('Team hat 50/Monat', () => {
    const r = checkFotoLimit(20, 'team');
    assert.equal(r.limit, 50);
  });
});
