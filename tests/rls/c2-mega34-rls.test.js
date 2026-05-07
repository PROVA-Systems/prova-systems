'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '22_enable_rls_mega34_tables.sql'), 'utf8');

test('C2: ENABLE RLS auf 4 Tabellen', () => {
  ['cookie_consents', 'ical_tokens', 'onboarding_mails_sent', 'incidents'].forEach(t => {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
  });
});

test('C2: Idempotent (DROP POLICY IF EXISTS vor jedem CREATE)', () => {
  const drops = (sql.match(/DROP POLICY IF EXISTS/g) || []).length;
  const creates = (sql.match(/CREATE POLICY/g) || []).length;
  assert.ok(drops >= creates, 'Jedes CREATE braucht ein DROP IF EXISTS davor (idempotent)');
});

test('C2: cookie_consents — SELECT nur eigene + INSERT auch anonym + service_role-Bypass', () => {
  // 3 Policies separat prüfen statt sequenziell
  assert.match(sql, /CREATE POLICY cookie_consents_self_select/);
  assert.match(sql, /FOR SELECT USING \(\s*user_id = auth\.uid\(\)\s*\)/);
  assert.match(sql, /CREATE POLICY cookie_consents_insert/);
  assert.match(sql, /FOR INSERT WITH CHECK \(\s*user_id IS NULL OR user_id = auth\.uid\(\)\s*\)/);
  assert.match(sql, /CREATE POLICY cookie_consents_service_all/);
});

test('C2: ical_tokens — User sieht/edit nur eigene', () => {
  assert.match(sql, /ical_tokens_self[\s\S]+?user_id = auth\.uid\(\)[\s\S]+?WITH CHECK \(user_id = auth\.uid\(\)\)/);
});

test('C2: onboarding_mails_sent — User-Read + Service-Write', () => {
  assert.match(sql, /onboarding_mails_self_read[\s\S]+?FOR SELECT USING \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /onboarding_mails_service_all/);
});

test('C2: incidents — Public-Read + Service-Write (Status-Page)', () => {
  assert.match(sql, /incidents_public_read[\s\S]+?FOR SELECT USING \(true\)/);
  assert.match(sql, /incidents_service_write/);
});

test('C2: 9 Policies definiert (3+2+2+2)', () => {
  const creates = (sql.match(/CREATE POLICY/g) || []).length;
  assert.strictEqual(creates, 9);
});
