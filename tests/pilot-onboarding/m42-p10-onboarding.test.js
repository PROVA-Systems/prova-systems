/**
 * MEGA⁴² P10 — Pilot-Onboarding-Material Tests
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

// ─── 5 Pilot-Welcome-Mails ────────────────────────────────

const PILOT_MAILS = [
  '01-pilot-day-1-welcome.html',
  '02-pilot-day-3-first-fall.html',
  '03-pilot-day-7-checkin.html',
  '04-pilot-day-14-deepdive.html',
  '05-pilot-day-30-feedback.html'
];

for (const m of PILOT_MAILS) {
  test('P10: Pilot-Mail ' + m + ' existiert', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'email-templates', 'pilot', m)));
  });
}

test('P10: Pilot-Mails haben {{SV_VORNAME}}-Platzhalter', () => {
  for (const m of PILOT_MAILS) {
    const c = fs.readFileSync(path.join(ROOT, 'email-templates', 'pilot', m), 'utf8');
    assert.match(c, /\{\{SV_VORNAME\}\}/, 'kein SV_VORNAME in ' + m);
  }
});

test('P10: Pilot-Day-1-Mail referenziert {{PILOT_NUMMER}} + {{TUTORIAL_LINK}}', () => {
  const c = fs.readFileSync(path.join(ROOT, 'email-templates', 'pilot', '01-pilot-day-1-welcome.html'), 'utf8');
  assert.match(c, /\{\{PILOT_NUMMER\}\}/);
  assert.match(c, /\{\{TUTORIAL_LINK\}\}/);
});

test('P10: Pilot-Day-3-Mail referenziert /push-setup oder Action-CTA', () => {
  const c = fs.readFileSync(path.join(ROOT, 'email-templates', 'pilot', '02-pilot-day-3-first-fall.html'), 'utf8');
  // CTA fuer ersten Fall
  assert.match(c, /Neuen?\s+Fall\s+anlegen|NEUER_FALL_LINK/i);
});

test('P10: Day-7 ist 3-Fragen-Feedback-Format', () => {
  const c = fs.readFileSync(path.join(ROOT, 'email-templates', 'pilot', '03-pilot-day-7-checkin.html'), 'utf8');
  // 3 questions
  const questionCount = (c.match(/\?/g) || []).length;
  assert.ok(questionCount >= 3);
});

test('P10: Day-14 erklärt 3 Power-Features (Cmd-K + Skizzen + §6 KI-Stufen)', () => {
  const c = fs.readFileSync(path.join(ROOT, 'email-templates', 'pilot', '04-pilot-day-14-deepdive.html'), 'utf8');
  assert.match(c, /Cmd\+K|Cmd-K/i);
  assert.match(c, /Skizzen/i);
  assert.match(c, /(§6|S1|S2|S3)/);
});

test('P10: Day-30 hat Feedback-Call-Einladung (Calendly oder Zoom)', () => {
  const c = fs.readFileSync(path.join(ROOT, 'email-templates', 'pilot', '05-pilot-day-30-feedback.html'), 'utf8');
  assert.match(c, /calendly|Zoom|Anruf|Call/i);
});

// ─── Pilot-Tutorial ───────────────────────────────────────

test('P10: pilot-tutorial.html existiert', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'pilot-tutorial.html')));
});

test('P10: pilot-tutorial.html hat 12 Steps', () => {
  const c = fs.readFileSync(path.join(ROOT, 'pilot-tutorial.html'), 'utf8');
  assert.match(c, /Schritt 1 von 12/);
  assert.match(c, /Schritt 12 von 12/);
});

test('P10: pilot-tutorial.html nutzt localStorage für Resume', () => {
  const c = fs.readFileSync(path.join(ROOT, 'pilot-tutorial.html'), 'utf8');
  assert.match(c, /localStorage\.\w+\(['"]pilot_tutorial_step/);
});

test('P10: pilot-tutorial.html requires Auth', () => {
  const c = fs.readFileSync(path.join(ROOT, 'pilot-tutorial.html'), 'utf8');
  assert.match(c, /prova_auth_token/);
  assert.match(c, /\/login\?next=\/pilot-tutorial\.html/);
});

test('P10: pilot-tutorial.html erklärt 4-Flow-Architektur', () => {
  const c = fs.readFileSync(path.join(ROOT, 'pilot-tutorial.html'), 'utf8');
  assert.match(c, /Flow A|A — Schaden/);
  assert.match(c, /Flow B|B — Wert/);
  assert.match(c, /Flow C|C — Beratung/);
  assert.match(c, /Flow D|D — Baubegleitung/);
});

// ─── Demo-Seed-Script ─────────────────────────────────────

test('P10: scripts/seed-demo-data.js existiert', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'seed-demo-data.js')));
});

test('P10: seed-demo-data hat DEMO_KONTAKTE + DEMO_AKTEN exports', () => {
  const seeder = require(path.join(ROOT, 'scripts', 'seed-demo-data.js'));
  assert.ok(Array.isArray(seeder.DEMO_KONTAKTE));
  assert.ok(Array.isArray(seeder.DEMO_AKTEN));
  assert.ok(seeder.DEMO_KONTAKTE.length >= 3);
  assert.ok(seeder.DEMO_AKTEN.length >= 2);
});

test('P10: Demo-Daten haben "DEMO:" prefix für sichere Cleanup', () => {
  const seeder = require(path.join(ROOT, 'scripts', 'seed-demo-data.js'));
  for (const a of seeder.DEMO_AKTEN) {
    assert.match(a.titel, /^DEMO:/);
  }
});

// ─── Pilot-Vereinbarung ───────────────────────────────────

test('P10: docs/runbook/PILOT-VEREINBARUNG.md existiert', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'runbook', 'PILOT-VEREINBARUNG.md')));
});

test('P10: Pilot-Vereinbarung dokumentiert 99€ Einmal-Preis', () => {
  const c = fs.readFileSync(path.join(ROOT, 'docs', 'runbook', 'PILOT-VEREINBARUNG.md'), 'utf8');
  assert.match(c, /99\s*€/);
  assert.match(c, /lifetime|Lifetime/i);
});

test('P10: Pilot-Vereinbarung hat Click-Through-Bestätigung', () => {
  const c = fs.readFileSync(path.join(ROOT, 'docs', 'runbook', 'PILOT-VEREINBARUNG.md'), 'utf8');
  assert.match(c, /\[\s?\]/);  // Checkbox-Pattern
  assert.match(c, /FOUNDING-99/);
});
