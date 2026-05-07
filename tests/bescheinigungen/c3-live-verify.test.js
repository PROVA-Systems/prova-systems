'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/bescheinigung-generate');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'bescheinigung-generate.js'), 'utf8');
const avvPaket = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'legal', 'AVV-PAKET-FUER-ANWALT.md'), 'utf8');
const anschreiben = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'legal', 'AVV-ANWALT-ANSCHREIBEN.md'), 'utf8');

const TYPEN_8 = [
  'sv_bestaetigung',
  'auftragsannahme_brief',
  'termin_bestaetigung',
  'termin_bestaetigung_brief',
  'maengelfreiheit',
  'zustand',
  'beweissicherung',
  'sv_anerkennung'
];

// Live-Verify pro Bescheinigungs-Typ (8 Tests)
TYPEN_8.forEach(typ => {
  test(`C3: Bescheinigungs-Typ "${typ}" in TEMPLATE_MAP + Template-Referenz`, () => {
    assert.ok(typ in Lambda.__TEMPLATE_MAP, `${typ} fehlt in TEMPLATE_MAP`);
    const tpl = Lambda.__TEMPLATE_MAP[typ];
    assert.ok(tpl.name, `${typ}.name fehlt`);
    assert.ok(['pdf', 'brief'].includes(tpl.kategorie), `${typ}.kategorie ungültig: ${tpl.kategorie}`);
  });
});

test('C3: Lambda hat audit_trail-Insert action=pdf_generate', () => {
  assert.match(lambdaSrc, /action:\s*['"]pdf_generate['"]/);
  assert.match(lambdaSrc, /entity_typ:\s*['"]bescheinigung['"]/);
});

test('C3: Lambda dokumente-Insert mit pdfmonkey_template_id', () => {
  assert.match(lambdaSrc, /pdfmonkey_template_id/);
  assert.match(lambdaSrc, /from\(['"]dokumente['"]\)\.insert/);
});

test('C3: AVV-Paket-Doku alle Sektionen', () => {
  ['AVV-Master-Template', 'Subunternehmer-Liste', 'Technisch-Organisatorische Maßnahmen',
   'Datenschutz-Hinweise', 'Versicherungs-Partner', 'Review-Fragen']
    .forEach(s => assert.match(avvPaket, new RegExp(s)));
});

test('C3: AVV-Paket listet 7 Subunternehmer (Supabase, OpenAI, Anthropic, Resend, PDFMonkey, Stripe, Netlify)', () => {
  ['Supabase', 'OpenAI', 'Anthropic', 'Resend', 'PDFMonkey', 'Stripe', 'Netlify']
    .forEach(p => assert.match(avvPaket, new RegExp(p)));
});

test('C3: AVV-Paket TOMs Art. 32 DSGVO 6 Kategorien', () => {
  ['Vertraulichkeit', 'Integrität', 'Verfügbarkeit', 'Belastbarkeit',
   'Wiederherstellung', 'Pseudonymisierung']
    .forEach(t => assert.match(avvPaket, new RegExp(t)));
});

test('C3: AVV-Paket 6 Review-Fragen für Anwalt', () => {
  for (let i = 1; i <= 6; i++) {
    assert.match(avvPaket, new RegExp(`^${i}\\.`, 'm'));
  }
});

test('C3: Anwalt-Anschreiben mit konkreten Review-Aufträgen', () => {
  assert.match(anschreiben, /Konkrete Review-Aufträge/);
  assert.match(anschreiben, /AVV-Master-Template/);
  assert.match(anschreiben, /Subunternehmer/);
  assert.match(anschreiben, /TOMs Art\. 32/);
  assert.match(anschreiben, /§\s*407a ZPO/);
});

// MEGA³³ Post-Wake-Up: ENV-Var-Resolution für PDFMonkey-Template-IDs
test('C3-ENV: __resolveTemplateId fällt auf .name zurück wenn ENV leer', () => {
  // Sicherstellen dass ENVs nicht gesetzt sind
  delete process.env.PDFMONKEY_TPL_F02;
  delete process.env.PDFMONKEY_TPL_BRIEF_AUFTRAG;
  // Cache-Reload
  delete require.cache[require.resolve('../../netlify/functions/bescheinigung-generate')];
  const Lambda2 = require('../../netlify/functions/bescheinigung-generate');
  assert.strictEqual(Lambda2.__resolveTemplateId('sv_bestaetigung'), 'F-02-AUFTRAGSBESTAETIGUNG');
});

test('C3-ENV: __resolveTemplateId nutzt ENV-Wert wenn gesetzt', () => {
  process.env.PDFMONKEY_TPL_B04 = '12345678-aaaa-bbbb-cccc-deadbeefcafe';
  delete require.cache[require.resolve('../../netlify/functions/bescheinigung-generate')];
  const Lambda2 = require('../../netlify/functions/bescheinigung-generate');
  assert.strictEqual(Lambda2.__resolveTemplateId('maengelfreiheit'), '12345678-aaaa-bbbb-cccc-deadbeefcafe');
  delete process.env.PDFMONKEY_TPL_B04;
});

test('C3-ENV: alle 8 Typen haben env-Lookup-Schlüssel im TEMPLATE_MAP', () => {
  delete require.cache[require.resolve('../../netlify/functions/bescheinigung-generate')];
  const Lambda2 = require('../../netlify/functions/bescheinigung-generate');
  Object.entries(Lambda2.__TEMPLATE_MAP).forEach(([typ, def]) => {
    assert.match(def.env || '', /^PDFMONKEY_TPL_/, typ + ' fehlt env-Key');
  });
});
