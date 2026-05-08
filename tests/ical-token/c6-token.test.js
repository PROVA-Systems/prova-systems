'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/termine-ical-token');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'termine-ical-token.js'), 'utf8');

test('C6: TOKEN_VALIDITY_DAYS = 90', () => {
  assert.strictEqual(Lambda.__TOKEN_VALIDITY_DAYS, 90);
});

test('C6: buildSubscribeUrl liefert RFC-konformen URL', () => {
  const url = Lambda.__buildSubscribeUrl('https://app.prova-systems.de', 'TOKEN123');
  assert.match(url, /^https:\/\/app\.prova-systems\.de\/\.netlify\/functions\/termine-ical-export\?token=TOKEN123$/);
});

test('C6: buildSubscribeUrl URL-encoded Token', () => {
  const url = Lambda.__buildSubscribeUrl('https://x.com', 'a/b+c=');
  assert.match(url, /token=a%2Fb%2Bc%3D/);
});

test('C6: Lambda nutzt signToken aus termine-ical-export', () => {
  assert.match(lambdaSrc, /__signToken.*=\s*require\(['"]\.\/termine-ical-export['"]/);
});

test('C6: Token-Hash via SHA-256 (nicht Klartext gespeichert)', () => {
  assert.match(lambdaSrc, /crypto\.createHash\(['"]sha256['"]\)/);
  assert.match(lambdaSrc, /token_hash:\s*tokenHash/);
});

test('C6: Idempotenz: alte Tokens revoked vor neuem Insert', () => {
  assert.match(lambdaSrc, /revoked_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(lambdaSrc, /\.is\(['"]revoked_at['"], null\)/);
});

test('C6: Rate-Limit max 10/Stunde (nicht spam-bar)', () => {
  assert.match(lambdaSrc, /RateLimit\.check\(context\.userEmail, 10, 3600/);
});

test('C6: requireAuth + POST-only', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /event\.httpMethod !== 'POST'/);
});
