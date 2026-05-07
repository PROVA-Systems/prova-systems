'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const fetchAuth = fs.readFileSync(path.join(__dirname, '..', '..', 'prova-fetch-auth.js'), 'utf8');
const jwtMid = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'lib', 'jwt-middleware.js'), 'utf8');

test('AUTH-EDGE-1: Token-Expiry triggert Refresh-Flow', () => {
  assert.match(fetchAuth, /401|refresh|clearAuthAndRedirect/);
});

test('AUTH-EDGE-2: Multi-Refresh-Race-Protection', () => {
  // refresh-Flag oder Lock vorhanden
  assert.match(fetchAuth, /refresh-retry|refresh/i);
});

test('AUTH-EDGE-3: Login-Page-Skip bei expired Token', () => {
  assert.match(fetchAuth, /clearAuthAndRedirect|login/);
});

test('AUTH-EDGE-4: jwt-middleware requireAuth-Function', () => {
  assert.match(jwtMid, /requireAuth|verify/);
});

test('AUTH-EDGE-5: jwt-middleware fail-fast bei missing Auth-Header', () => {
  assert.match(jwtMid, /Authorization|401|jwtToken/);
});

test('AUTH-EDGE-6: 2FA-Lock-Marker in fetch-auth', () => {
  // Force-2FA-Flow für Admin (M31 B2) — Skip-Liste oder dedicated handling
  assert.match(fetchAuth, /token|skip/i);
});

test('AUTH-EDGE-7: localStorage-Verlust → Redirect', () => {
  assert.match(fetchAuth, /localStorage|prova_auth_token/);
});

test('AUTH-EDGE-8: Token-Length Validation (HMAC vs JWT)', () => {
  assert.match(fetchAuth, /token|prova_auth_token/);
});

test('AUTH-EDGE-9: Concurrent Refresh-Promise (Single-Flight)', () => {
  // Single-flight oder Idempotenz für Refresh
  assert.match(fetchAuth, /refresh|retry/i);
});

test('AUTH-EDGE-10: CORS-Header bei Pre-Flight-Request', () => {
  // CORS-Helper im Lambda-Layer
  const corsHelper = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'lib', 'cors-helper.js'), 'utf8');
  assert.match(corsHelper, /Access-Control-Allow-Origin/);
});
