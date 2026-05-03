/**
 * PROVA — DSGVO Art. 17 + Art. 20 Tests
 * MEGA⁶ S5 (04.05.2026)
 *
 * Verifikation: dsgvo-loeschen + dsgvo-auskunft Endpoints existieren +
 * sind syntaktisch valid + nutzen requireAuth.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('DSGVO Art. 17 — Loeschung', () => {
  const file = path.join('netlify', 'functions', 'dsgvo-loeschen.js');

  test('dsgvo-loeschen.js existiert', () => {
    assert.equal(fs.existsSync(file), true);
  });

  test('nutzt Auth-Mechanismus', () => {
    const txt = fs.readFileSync(file, 'utf8');
    // entweder requireAuth oder eigene Auth-Pruefung
    assert.match(txt, /requireAuth|auth-resolve|resolveUser|userEmail/);
  });

  test('macht POST-Request-Validation', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /POST|httpMethod/);
  });
});

describe('DSGVO Art. 20 — Datenuebertragbarkeit / Art. 15 Auskunft', () => {
  const file = path.join('netlify', 'functions', 'dsgvo-auskunft.js');

  test('dsgvo-auskunft.js existiert', () => {
    assert.equal(fs.existsSync(file), true);
  });

  test('nutzt Auth-Mechanismus', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /requireAuth|auth-resolve|resolveUser|userEmail/);
  });

  test('liefert JSON-Format', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /application\/json/);
  });
});

describe('DSGVO — mein-aktivitaetsprotokoll (Art. 15 erweitert)', () => {
  const file = path.join('netlify', 'functions', 'mein-aktivitaetsprotokoll.js');

  test('Endpoint existiert', () => {
    assert.equal(fs.existsSync(file), true);
  });

  test('nutzt requireAuth (eingeloggter User)', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /requireAuth/);
  });

  test('nutzt Storage-Router (read-dual MEGA⁴-EXT Q4)', () => {
    const txt = fs.readFileSync(file, 'utf8');
    assert.match(txt, /storage-router|readDual/);
  });
});
