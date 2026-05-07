'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
function read(f) { return fs.readFileSync(path.join(root, f), 'utf8'); }

test('B4: VISION-MASTER hat 100%-Komplett-Header + MEGA³⁴-Eintrag', () => {
  const src = read('docs/master/PROVA-VISION-MASTER.md');
  assert.match(src, /100% Komplett/);
  assert.match(src, /v950/);
  assert.match(src, /MEGA³⁴/);
});

test('B4: SPRINTS-MASTERPLAN listet 5 MEGA-Wellen (³⁰-³⁴)', () => {
  const src = read('docs/master/PROVA-SPRINTS-MASTERPLAN.md');
  ['MEGA³⁰', 'MEGA³¹', 'MEGA³²', 'MEGA³³', 'MEGA³⁴'].forEach(w => {
    assert.match(src, new RegExp(w));
  });
  assert.match(src, /v950/);
  assert.match(src, /Marathon-Statistik/);
});

test('B4: CHAT-TRANSPORT-vAKTUELL Tag-Liste + IDs', () => {
  const src = read('docs/master/PROVA-CHAT-TRANSPORT-vAKTUELL.md');
  assert.match(src, /MEGA³⁴ live/);
  assert.match(src, /v900/);
  assert.match(src, /v950/);
  assert.match(src, /cngteblrbpwsyypexjrv/);
});

test('B4: CHANGELOG hat MEGA³⁴-Sektion', () => {
  const src = read('CHANGELOG-MASTER.md');
  assert.match(src, /## MEGA³⁴/);
  assert.match(src, /v950/);
  assert.match(src, /Cookie-Banner DSGVO/);
});

test('B4: README.md mit 100%-Status + Quick-Stats', () => {
  const src = read('README.md');
  assert.match(src, /Vision 100% Komplett/);
  assert.match(src, /v950/);
  assert.match(src, /4-Flow-Architektur/);
});

test('B4: Cross-References zwischen Master-Dokus konsistent', () => {
  const vision = read('docs/master/PROVA-VISION-MASTER.md');
  const sprints = read('docs/master/PROVA-SPRINTS-MASTERPLAN.md');
  const transport = read('docs/master/PROVA-CHAT-TRANSPORT-vAKTUELL.md');
  // Alle drei müssen das gleiche Tag v950 referenzieren
  [vision, sprints, transport].forEach(s => assert.match(s, /v950/));
  // Alle drei datieren auf 07.05.2026
  [vision, sprints, transport].forEach(s => assert.match(s, /07\.05\.2026/));
});
