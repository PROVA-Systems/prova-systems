'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'demo.html'), 'utf8');

test('E1: demo.html existiert + Mobile-viewport + Sandbox-Title', () => {
  assert.match(html, /<title>[^<]*PROVA[^<]*Live-Demo[^<]*Sandbox/);
  assert.match(html, /viewport-fit=cover/);
});

test('E1: 6-Step-Tour mit demo-step-1 bis demo-step-6', () => {
  for (let i = 1; i <= 6; i++) {
    assert.match(html, new RegExp(`id="demo-step-${i}"`));
  }
});

test('E1: Progress-Bar mit 6 Dots', () => {
  const matches = html.match(/<div class="demo-step[^"]*"><\/div>/g) || [];
  assert.strictEqual(matches.length, 6);
});

test('E1: Alle 6 Schritte sind PROVA-Workflow-konform', () => {
  // Step 1: Auftrag, Step 2: Diktat+Foto, Step 3: KI-Struktur,
  // Step 4: §6 Fachurteil, Step 5: Freigabe+PDF, Step 6: Zahlung+Audit
  assert.match(html, /Auftrag anlegen/);
  assert.match(html, /Diktat \+ Fotos|Vor-Ort/);
  assert.match(html, /KI strukturiert/);
  assert.match(html, /§6 Fachurteil/);
  assert.match(html, /Freigabe \+ PDF/);
  assert.match(html, /Zahlung.*Audit-Trail/);
});

test('E1: Mock-Daten KEIN Klardaten (nur Beispiel-Namen)', () => {
  // Müller / Mustergasse sind Mock-Daten, OK
  assert.match(html, /Mustergasse/);
  // KEINE echten Emails
  const emailMatches = html.match(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  emailMatches.forEach(e => {
    assert.match(e, /beispiel\.de|example\.com|müller@beispiel\.de/i, 'Echte Email gefunden: ' + e);
  });
});

test('E1: §6 Fachurteil Demo zeigt Marcel-formuliert (NICHT KI)', () => {
  assert.match(html, /Marcel formuliert SELBST|macht.*Marcel.*Fachurteil/);
  assert.match(html, /Konjunktiv II/);
  assert.match(html, /KI hilft nur/);
});

test('E1: KI-Disclaimer in Step 3 (§407a + Konjunktiv + Halluzinations)', () => {
  assert.match(html, /§407a-Hinweis/);
  assert.match(html, /Halluzinations-Check/);
  assert.match(html, /Konjunktiv-II-Check/);
});

test('E1: Foto-Upload zeigt EXIF-Strip + Geo-Tag (DSGVO-konform demonstriert)', () => {
  assert.match(html, /EXIF-Strip/);
  assert.match(html, /Geo-Tag/);
});

test('E1: CTA am Ende mit utm_source=demo', () => {
  assert.match(html, /utm_source=demo/);
  assert.match(html, /14 Tage kostenlos/);
  assert.match(html, /onboarding\/start/);
});

test('E1: next(stepNum) JS-Function für Tour-Navigation', () => {
  assert.match(html, /function next\(stepNum\)/);
  assert.match(html, /classList\.add\(['"]done['"]\)/);
  assert.match(html, /classList\.add\(['"]active['"]\)/);
});
