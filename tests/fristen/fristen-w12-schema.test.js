'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function r(p) { return fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8'); }
const list = r('netlify/functions/fristen-list.js');
const create = r('netlify/functions/fristen-create.js');
const update = r('netlify/functions/fristen-update.js');
const markErf = r('netlify/functions/fristen-mark-erfuellt.js');
const cron = r('netlify/functions/fristen-reminder-cron.js');
const html = r('fristen.html');
const migration = r('supabase/migrations/2026_05_11_w12_fristen_system.sql');

const stripComments = s => s.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('Migration: FK auf auftraege', () => {
  assert.match(migration, /REFERENCES public\.auftraege/);
});

test('Migration: RLS via workspace_memberships + is_active', () => {
  const c = stripComments(migration);
  assert.match(c, /workspace_memberships/);
  assert.match(c, /is_active/);
});

test('Migration: created_by_user_id', () => {
  const c = stripComments(migration);
  assert.match(c, /created_by_user_id/);
});

test('Migration: 8 frist_typ ENUM-Werte', () => {
  ['gericht', 'gutachten-erstattung', 'honorar', 'widerspruch', 'akteneinsicht', 'zeugen', 'parteien', 'ortstermin'].forEach(v =>
    assert.match(migration, new RegExp(`'${v}'`)));
});

test('Migration: 4 frist_status ENUM-Werte', () => {
  ['offen', 'erfuellt', 'verfallen', 'verlaengert'].forEach(v =>
    assert.match(migration, new RegExp(`'${v}'`)));
});

test('fristen-list: auftrag_id (Backwards-Compat schadensfall_id)', () => {
  assert.match(list, /eq\(['"]auftrag_id['"]/);
  assert.match(list, /q\.auftrag_id \|\| q\.schadensfall_id/);
});

test('fristen-create: auftrag_id-Routing + Backwards-Compat', () => {
  assert.match(create, /body\.auftrag_id \|\| body\.schadensfall_id/);
  const c = stripComments(create);
  assert.match(c, /auftrag_id:/);
});

test('fristen-create: created_by_user_id (NICHT erstellt_von)', () => {
  const c = stripComments(create);
  assert.match(c, /created_by_user_id:/);
  assert.ok(!/erstellt_von:/.test(c));
});

test('fristen-create: Pipeline-Bulk nutzt auftrag_id', () => {
  const c = stripComments(create);
  assert.match(c, /pipeline_key/);
  assert.match(c, /auftrag_id: auftrag_id/);
});

test('fristen-update: updated_at (NICHT geaendert_am)', () => {
  assert.match(update, /updated_at:/);
  assert.ok(!/geaendert_am/.test(update));
});

test('fristen-mark-erfuellt: updated_at', () => {
  assert.match(markErf, /updated_at:/);
});

test('fristen-reminder-cron: liest auftrag_id + created_by_user_id', () => {
  assert.match(cron, /auftrag_id/);
  assert.match(cron, /created_by_user_id/);
});

test('fristen-reminder-cron: User-Email aus public.users', () => {
  assert.match(cron, /from\(['"]users['"]\).*select\(['"]email['"]\)/);
  assert.ok(!/user_workspaces|user_profiles/.test(cron));
});

test('Frontend: m-auftrag_id (NICHT m-schadensfall_id)', () => {
  assert.match(html, /id="m-auftrag_id"/);
  assert.match(html, /id="p-auftrag_id"/);
  assert.ok(!/id="m-schadensfall_id"/.test(html));
});

test('Frontend: Body-Field auftrag_id', () => {
  assert.match(html, /auftrag_id:/);
});
