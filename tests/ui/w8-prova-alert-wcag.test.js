/**
 * PROVA — W8 prova-alert Helper + WCAG-Audit-Tool Tests
 * MEGA¹¹ W8 (2026-05-04)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

describe('prova-alert Helper Library', () => {

  test('lib/prova-alert.js existiert', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(REPO, 'lib/prova-alert.js')));
  });

  test('window.provaAlert wird global exposed', () => {
    const src = read('lib/prova-alert.js');
    assert.ok(src.includes('window.provaAlert = provaAlert'));
  });

  test('window.provaConfirm wird global exposed', () => {
    const src = read('lib/prova-alert.js');
    assert.ok(src.includes('window.provaConfirm = provaConfirm'));
  });

  test('Default-Severity ist "info"', () => {
    const src = read('lib/prova-alert.js');
    // Should default to 'info' when severity is not 'error' or 'success'
    assert.match(src, /severity === 'error' \|\| severity === 'success'\) \? severity : 'info'/);
  });

  test('Defense-in-Depth: alert() Fallback bei ProvaUI nicht geladen', () => {
    const src = read('lib/prova-alert.js');
    assert.match(src, /try \{ alert\(text\); \} catch/);
    assert.ok(src.includes('window.ProvaUI && typeof window.ProvaUI.toast === \'function\''));
  });

  test('Defense-in-Depth: Try/Catch um toast() (Library-Fail-Defense)', () => {
    const src = read('lib/prova-alert.js');
    assert.match(src, /try \{[\s\S]*window\.ProvaUI\.toast/);
    assert.match(src, /catch \(e\) \{[\s\S]*toast failed, falling back to alert/);
  });
});

describe('WCAG-Audit-Tool', () => {

  const { audit } = require('../../tools/wcag-audit');

  test('Erkennt <img> ohne alt', () => {
    const html = '<html><body><img src="foo.jpg"></body></html>';
    const findings = audit(html, 'test.html');
    const imgFinding = findings.find(f => f.rule === 'WCAG-1.1.1');
    assert.ok(imgFinding, 'Sollte WCAG-1.1.1 Finding produzieren');
    assert.equal(imgFinding.severity, 'error');
  });

  test('Erkennt <img> mit alt nicht', () => {
    const html = '<html lang="de"><body><img src="foo.jpg" alt="Foo"></body></html>';
    const findings = audit(html, 'test.html');
    const imgFinding = findings.find(f => f.rule === 'WCAG-1.1.1');
    assert.equal(imgFinding, undefined, 'Sollte KEIN WCAG-1.1.1 Finding haben');
  });

  test('Erkennt <html> ohne lang-Attribut', () => {
    const html = '<html><body></body></html>';
    const findings = audit(html, 'test.html');
    const langFinding = findings.find(f => f.rule === 'WCAG-3.1.1');
    assert.ok(langFinding);
    assert.equal(langFinding.severity, 'error');
  });

  test('<html lang="de"> = kein Finding', () => {
    const html = '<html lang="de"><body></body></html>';
    const findings = audit(html, 'test.html');
    const langFinding = findings.find(f => f.rule === 'WCAG-3.1.1');
    assert.equal(langFinding, undefined);
  });

  test('Erkennt Icon-only Button ohne aria-label', () => {
    const html = '<html lang="de"><body><button>✕</button></body></html>';
    const findings = audit(html, 'test.html');
    const btnFinding = findings.find(f => f.rule === 'WCAG-4.1.2');
    assert.ok(btnFinding, 'Sollte WCAG-4.1.2 Finding haben');
    assert.equal(btnFinding.severity, 'warning');
  });

  test('Button mit aria-label = kein Finding', () => {
    const html = '<html lang="de"><body><button aria-label="Schliessen">✕</button></body></html>';
    const findings = audit(html, 'test.html');
    const btnFinding = findings.find(f => f.rule === 'WCAG-4.1.2');
    assert.equal(btnFinding, undefined);
  });

  test('Button mit normalem Text-Content = kein Finding', () => {
    const html = '<html lang="de"><body><button>Speichern</button></body></html>';
    const findings = audit(html, 'test.html');
    const btnFinding = findings.find(f => f.rule === 'WCAG-4.1.2');
    assert.equal(btnFinding, undefined);
  });

  test('Erkennt Heading-Hierarchy-Sprung (h1 -> h3)', () => {
    const html = '<html lang="de"><body><h1>Title</h1><h3>Subtitle</h3></body></html>';
    const findings = audit(html, 'test.html');
    const headingFinding = findings.find(f => f.message && f.message.includes('Heading-Hierarchy-Sprung'));
    assert.ok(headingFinding);
  });

  test('Korrekte Heading-Hierarchy = kein Finding', () => {
    const html = '<html lang="de"><body><h1>A</h1><h2>B</h2><h3>C</h3></body></html>';
    const findings = audit(html, 'test.html');
    const headingFinding = findings.find(f => f.message && f.message.includes('Heading-Hierarchy-Sprung'));
    assert.equal(headingFinding, undefined);
  });

  test('Erkennt <a> ohne href aber mit onclick', () => {
    const html = '<html lang="de"><body><a onclick="foo()">Click</a></body></html>';
    const findings = audit(html, 'test.html');
    const aFinding = findings.find(f => f.rule === 'WCAG-2.4.4');
    assert.ok(aFinding);
  });

  test('<a href="..."> = kein Finding', () => {
    const html = '<html lang="de"><body><a href="/foo">Click</a></body></html>';
    const findings = audit(html, 'test.html');
    const aFinding = findings.find(f => f.rule === 'WCAG-2.4.4');
    assert.equal(aFinding, undefined);
  });

  test('Erkennt fehlende Skip-to-Content-Link', () => {
    const html = '<html lang="de"><body><main>content</main></body></html>';
    const findings = audit(html, 'test.html');
    const skipFinding = findings.find(f => f.message && f.message.includes('Skip-to-Content'));
    assert.ok(skipFinding);
    assert.equal(skipFinding.severity, 'info');
  });

  test('Vorhandene Skip-Link wird erkannt', () => {
    const html = '<html lang="de"><body><a href="#main" class="skip-link">Zum Inhalt</a><main>x</main></body></html>';
    const findings = audit(html, 'test.html');
    const skipFinding = findings.find(f => f.message && f.message.includes('Skip-to-Content'));
    assert.equal(skipFinding, undefined);
  });
});

describe('WCAG-Audit: Fixed Pages bleiben clean (Regression-Schutz)', () => {

  const { audit } = require('../../tools/wcag-audit');

  for (const page of ['dashboard.html', 'archiv.html', 'akte.html']) {
    test(`${page} hat 0 Errors + 0 Warnings + 0 Info`, () => {
      const html = read(page);
      const findings = audit(html, page);
      const errors = findings.filter(f => f.severity === 'error');
      const warnings = findings.filter(f => f.severity === 'warning');
      const info = findings.filter(f => f.severity === 'info');
      assert.equal(errors.length, 0, page + ' Errors: ' + JSON.stringify(errors));
      assert.equal(warnings.length, 0, page + ' Warnings: ' + JSON.stringify(warnings));
      assert.equal(info.length, 0, page + ' Info (Skip-Link): ' + JSON.stringify(info));
    });
  }
});

describe('Form-Validate Register/Reset Migration (W8 Erweiterung)', () => {

  test('app-login-logic.js hat _validateRegisterInputs Helper', () => {
    const src = read('app-login-logic.js');
    assert.ok(src.includes('_validateRegisterInputs'));
  });

  test('Register validiert name + email + password', () => {
    const src = read('app-login-logic.js');
    assert.ok(src.includes('nameRule'));
    assert.ok(src.includes('emailRule'));
    assert.ok(src.includes('pwRule'));
    // Password-MinLength 8 (Marcel-Pflicht laut Form-Doc)
    assert.match(src, /name: 'reg-pw'[\s\S]*minLength: 8/);
  });

  test('resetPasswort validiert email-pattern', () => {
    const src = read('app-login-logic.js');
    assert.ok(src.includes('resetRule'));
    assert.match(src, /name: 'reset-email'[\s\S]*pattern:/);
  });

  test('Defense-in-Depth: alter alert/error-Fallback bleibt', () => {
    const src = read('app-login-logic.js');
    // Bei fehlender ProvaForm-Library soll Code weiterlaufen
    assert.ok(src.includes("if (!window.ProvaForm || !window.ProvaForm.validateField) return true"));
  });
});
