/**
 * PROVA Multi-Tenant Isolation Test — Setup
 *
 * Erstellt 3 Test-Workspaces (A, B, C) mit je 1 Test-User + Test-Daten.
 * Nutzt Supabase Service-Role-Key (RLS-Bypass).
 *
 * USAGE:
 *   node tests/multitenant-isolation/setup.js
 *
 * ENV (.env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: räumt vorher alte Test-Daten auf.
 */
'use strict';

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FEHLER: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local benoetigt');
  process.exit(1);
}

const TEST_PREFIX = '__test_pentest_';
const WORKSPACES = [
  { suffix: 'a', name: TEST_PREFIX + 'a__', email: 'test-pentest-a@prova-systems.de', password: 'TestPentestA-' + Date.now() },
  { suffix: 'b', name: TEST_PREFIX + 'b__', email: 'test-pentest-b@prova-systems.de', password: 'TestPentestB-' + Date.now() },
  { suffix: 'c', name: TEST_PREFIX + 'c__', email: 'test-pentest-c@prova-systems.de', password: 'TestPentestC-' + Date.now() },
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanupOldTestData() {
  console.log('[setup] cleanup alte Test-Daten...');

  // Test-Workspaces finden
  const { data: oldWorkspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .like('name', TEST_PREFIX + '%');

  if (oldWorkspaces && oldWorkspaces.length > 0) {
    const ids = oldWorkspaces.map(w => w.id);
    console.log('[setup]   gefunden:', oldWorkspaces.length, 'alte Test-Workspaces');

    // RLS erlaubt CASCADE — alle abhaengigen Daten gehen mit
    const { error } = await supabase.from('workspaces').delete().in('id', ids);
    if (error) console.warn('[setup]   cleanup-error:', error.message);
  }

  // Test-User loeschen via Admin-API (Auth)
  for (const ws of WORKSPACES) {
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const oldUser = (users || []).find(u => u.email === ws.email);
      if (oldUser) {
        await supabase.auth.admin.deleteUser(oldUser.id);
        console.log('[setup]   geloescht User:', ws.email);
      }
    } catch (e) {
      console.warn('[setup]   user-cleanup-error:', e.message);
    }
  }
}

async function createWorkspace(ws) {
  console.log('[setup] erstelle Workspace:', ws.name);

  // 1. Auth-User anlegen
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email: ws.email,
    password: ws.password,
    email_confirm: true
  });
  if (userErr) throw new Error('createUser failed: ' + userErr.message);
  const userId = userData.user.id;

  // 2. users-Row sicherstellen (Trigger sollte das machen, aber sicher ist sicher)
  await supabase.from('users').upsert({ id: userId, email: ws.email });

  // 3. Workspace anlegen
  const { data: wsData, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: ws.name, plan: 'Solo' })
    .select()
    .single();
  if (wsErr) throw new Error('createWorkspace failed: ' + wsErr.message);
  const workspaceId = wsData.id;

  // 4. Membership owner-Rolle
  await supabase.from('workspace_memberships').insert({
    workspace_id: workspaceId,
    user_id: userId,
    rolle: 'owner',
    is_active: true
  });

  // 5. Test-Daten: Auftraege
  const auftraege = [];
  for (let i = 1; i <= 5; i++) {
    const { data } = await supabase
      .from('auftraege')
      .insert({
        workspace_id: workspaceId,
        aktenzeichen: 'TEST-' + ws.suffix.toUpperCase() + '-' + i,
        objekt: 'Testobjekt ' + ws.suffix + i,
        schadensart: 'Wasserschaden'
      })
      .select()
      .single();
    if (data) auftraege.push(data);
  }

  // 6. Test-Daten: Kontakte
  for (let i = 1; i <= 5; i++) {
    await supabase.from('kontakte').insert({
      workspace_id: workspaceId,
      typ: 'auftraggeber',
      vorname: 'TestKontakt',
      nachname: ws.suffix.toUpperCase() + i,
      email: 'kontakt-' + ws.suffix + i + '@test.example'
    });
  }

  // 7. Test-Daten: Dokumente (Rechnungen-Aequivalent)
  for (let i = 1; i <= 3; i++) {
    await supabase.from('dokumente').insert({
      workspace_id: workspaceId,
      typ: 'rechnung',
      titel: 'Testrechnung ' + ws.suffix + i,
      auftrag_id: auftraege[0]?.id || null
    });
  }

  // 8. Briefe (falls Tabelle vorhanden — sonst skip)
  // 9. Audit-Trail-Eintrag
  await supabase.from('audit_trail').insert({
    workspace_id: workspaceId,
    user_id: userId,
    typ: 'Test-Setup',
    sv_email: ws.email,
    details: JSON.stringify({ setup: true, suffix: ws.suffix })
  });

  console.log('[setup]   Workspace ID:', workspaceId);
  console.log('[setup]   User ID:', userId);
  console.log('[setup]   Auftraege:', auftraege.length);

  return { workspaceId, userId, ...ws, auftraege };
}

async function writeFixturesFile(workspaces) {
  const fs = require('fs');
  const path = require('path');
  const out = path.join(__dirname, 'fixtures.json');
  fs.writeFileSync(out, JSON.stringify(workspaces, null, 2));
  console.log('[setup] fixtures.json geschrieben:', out);
}

async function main() {
  console.log('[setup] PROVA Multi-Tenant Test-Setup beginnt');
  console.log('[setup] Supabase:', SUPABASE_URL);

  await cleanupOldTestData();

  const created = [];
  for (const ws of WORKSPACES) {
    const result = await createWorkspace(ws);
    created.push(result);
  }

  await writeFixturesFile(created);

  console.log('[setup] DONE');
  console.log('[setup] Naechste Schritte:');
  console.log('[setup]   node --test tests/multitenant-isolation/isolation.test.js');
}

main().catch(e => {
  console.error('[setup] FATAL:', e);
  process.exit(2);
});
