'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/dsgvo-loeschen-antrag');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'dsgvo-loeschen-antrag.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'dsgvo-mein-konto.html'), 'utf8');

test('C5: 30-Tage-Soft-Delete-Konstante', () => {
  assert.strictEqual(Lambda.__SOFT_DELETE_DAYS, 30);
});

test('C5: requireAuth (Bedingung 1)', () => {
  assert.match(lambdaSrc, /requireAuth/);
});

test('C5: 30-Tage-Soft-Delete via dsgvo_loeschen_geplant_am (Bedingung 2)', () => {
  assert.match(lambdaSrc, /dsgvo_loeschen_geplant_am:\s*scheduledFor/);
  assert.match(lambdaSrc, /30 \* 24 \* 60 \* 60 \* 1000|SOFT_DELETE_DAYS \* 24/);
});

test('C5: Audit-Trail-Insert action=data_delete_dsgvo (Bedingung 3)', () => {
  assert.match(lambdaSrc, /action:\s*['"]data_delete_dsgvo['"]/);
  assert.match(lambdaSrc, /entity_typ:\s*['"]user['"]/);
  assert.match(lambdaSrc, /gdpr_article:\s*['"]Art\. 17['"]/);
});

test('C5: Bestätigungs-Email via Resend (Bedingung 4)', () => {
  assert.strictEqual(typeof Lambda.__sendConfirmEmail, 'function');
  assert.match(lambdaSrc, /api\.resend\.com\/emails/);
  assert.match(lambdaSrc, /datenschutz@prova-systems\.de/);
});

test('C5: confirm:true pflicht (DSGVO Art. 17 ausdrückliche Bestätigung)', () => {
  assert.match(lambdaSrc, /body\.confirm !== true/);
});

test('C5: Konflikt-Handling bei doppelt-Antrag (409)', () => {
  assert.match(lambdaSrc, /Bereits geplant/);
  assert.match(lambdaSrc, /409/);
});

test('C5: Rate-Limit max 5/h (Schutz gegen Spam)', () => {
  assert.match(lambdaSrc, /RateLimit\.check\(context\.userEmail, 5, 3600/);
});

test('C5: HTML dsgvo-mein-konto.html zeigt auf /dsgvo-loeschen-antrag', () => {
  assert.match(html, /\/\.netlify\/functions\/dsgvo-loeschen-antrag/);
});

test('C5: 10-Jahre-IHK-SVO-Aufbewahrung im Email-Text erwähnt', () => {
  assert.match(lambdaSrc, /10 Jahre/);
  assert.match(lambdaSrc, /§ 11 IHK-SVO/);
});
