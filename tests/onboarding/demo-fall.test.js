'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const createSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'onboarding-create-demo.js'), 'utf8');
const deleteSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'onboarding-delete-demo.js'), 'utf8');

test('Demo: AZ ist SCH-DEMO-001', () => {
  const { __DEMO_AZ } = require('../../netlify/functions/onboarding-create-demo');
  assert.strictEqual(__DEMO_AZ, 'SCH-DEMO-001');
});

test('Demo: Auftrag-Schema is_demo=true', () => {
  const { __DEMO_AUFTRAG } = require('../../netlify/functions/onboarding-create-demo');
  assert.strictEqual(__DEMO_AUFTRAG.is_demo, true);
  assert.strictEqual(__DEMO_AUFTRAG.az, 'SCH-DEMO-001');
});

test('Demo: typ aus echtem ENUM (kurzstellungnahme)', () => {
  const { __DEMO_AUFTRAG } = require('../../netlify/functions/onboarding-create-demo');
  const validTypes = ['schaden', 'beweis', 'ergaenzung', 'gegen', 'kurzstellungnahme', 'wertgutachten', 'beratung', 'baubegleitung', 'schied', 'gericht'];
  assert.ok(validTypes.includes(__DEMO_AUFTRAG.typ));
});

test('Demo: status aus auftrag_status ENUM', () => {
  const { __DEMO_AUFTRAG } = require('../../netlify/functions/onboarding-create-demo');
  const validStatus = ['entwurf', 'aktiv', 'abgeschlossen', 'archiv', 'storniert'];
  assert.ok(validStatus.includes(__DEMO_AUFTRAG.status));
});

test('Demo: 3 Einträge', () => {
  const { __DEMO_EINTRAEGE } = require('../../netlify/functions/onboarding-create-demo');
  assert.strictEqual(__DEMO_EINTRAEGE.length, 3);
  __DEMO_EINTRAEGE.forEach(e => {
    assert.ok(['diktat', 'text', 'foto', 'mix'].includes(e.typ));
    assert.ok(e.titel);
    assert.ok(e.content);
  });
});

test('Demo: Idempotenz-Check', () => {
  // existiert prüfen-Block muss vor Insert kommen
  assert.match(createSrc, /eq\(['"]az['"]\s*,\s*DEMO_AZ\)/);
  assert.match(createSrc, /existiert bereits/);
});

test('Demo: workspace_memberships RLS-konforme Auflösung', () => {
  assert.match(createSrc, /workspace_memberships/);
  assert.match(createSrc, /is_active.*true/);
});

test('Demo: created_by_user_id (NICHT erstellt_von)', () => {
  assert.match(createSrc, /created_by_user_id:/);
  assert.ok(!/erstellt_von:/.test(createSrc));
});

test('Demo-Delete: prüft is_demo=true vor Hard-Delete (Schutz)', () => {
  assert.match(deleteSrc, /is_demo/);
  assert.match(deleteSrc, /verweigert/);
});

test('Demo-Delete: Soft-Delete eintraege + auftrag', () => {
  assert.match(deleteSrc, /deleted_at: new Date/);
  assert.match(deleteSrc, /from\(['"]eintraege['"]\)/);
  assert.match(deleteSrc, /from\(['"]auftraege['"]\)/);
});

test('Demo-Schema: details JSONB strukturiert', () => {
  const { __DEMO_AUFTRAG } = require('../../netlify/functions/onboarding-create-demo');
  assert.ok(__DEMO_AUFTRAG.details);
  assert.ok(__DEMO_AUFTRAG.details.versicherung);
  assert.ok(__DEMO_AUFTRAG.details.wasser);
});

test('Demo-Schema: objekt JSONB Adresse', () => {
  const { __DEMO_AUFTRAG } = require('../../netlify/functions/onboarding-create-demo');
  assert.strictEqual(__DEMO_AUFTRAG.objekt.plz, '12345');
  assert.strictEqual(__DEMO_AUFTRAG.objekt.adresse_strasse, 'Musterstraße');
});
