'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '07-korrespondenz');
const briefe = ['BRIEF-AUFTRAG-ANNAHME', 'BRIEF-TERMIN-BESTAETIGUNG', 'BRIEF-SACHVERSTANDIGE-ANERKENNUNG'];

briefe.forEach(name => {
  test('B2: ' + name + ' Template existiert', () => {
    assert.ok(fs.existsSync(path.join(dir, name + '.liquid.template.html')));
  });

  test('B2: ' + name + ' DIN-5008-Header (.absender + .empfaenger + .bezugszeile)', () => {
    const tpl = fs.readFileSync(path.join(dir, name + '.liquid.template.html'), 'utf8');
    assert.match(tpl, /class="absender"/);
    assert.match(tpl, /class="empfaenger"/);
    assert.match(tpl, /class="bezugszeile"/);
  });

  test('B2: ' + name + ' nutzt empfaenger_* Liquid-Variablen', () => {
    const tpl = fs.readFileSync(path.join(dir, name + '.liquid.template.html'), 'utf8');
    assert.match(tpl, /\{\{\s*empfaenger_anrede\s*\}\}/);
    assert.match(tpl, /\{\{\s*empfaenger_name\s*\}\}/);
  });
});
