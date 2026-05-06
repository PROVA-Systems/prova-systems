/**
 * Tests für whisper-diktat.js Sentry-Wrap (MEGA²⁸ V3.2-W6-I2)
 * Strukturelle Verifikation des Sentry-Wraps + Pseudonymisierungs-Pattern.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'netlify', 'functions', 'whisper-diktat.js'),
  'utf8'
);

test('whisper-diktat: hat withSentry-Import', () => {
  assert.match(SRC, /require\(['"]\.\/lib\/sentry-wrap['"]\)/);
});

test('whisper-diktat: handler ist withSentry(requireAuth(...)) gewrappt', () => {
  assert.match(SRC, /exports\.handler\s*=\s*withSentry\(\s*requireAuth\(/);
});

test('whisper-diktat: Sentry-functionName parameter gesetzt', () => {
  assert.match(SRC, /functionName:\s*['"]whisper-diktat['"]/);
});

test('whisper-diktat: Pseudonymisierung des Transkripts vor Logging', () => {
  // ProvaPseudo.apply für transkript MUSS aufgerufen werden
  assert.match(SRC, /ProvaPseudo\.apply\(transkript\)/);
});

test('whisper-diktat: Pseudonymisierung der Segments', () => {
  // Multi-Segment-Pattern
  assert.match(SRC, /ProvaPseudo\.apply\(\(s\.text/);
});

test('whisper-diktat: bestehender Rate-Limit (10/60s) erhalten', () => {
  assert.match(SRC, /RateLimit\.check\(context\.userEmail,\s*10,\s*60/);
});

test('whisper-diktat: ProvaPseudo Import erhalten', () => {
  assert.match(SRC, /require\(['"]\.\/lib\/prova-pseudo['"]\)/);
});
