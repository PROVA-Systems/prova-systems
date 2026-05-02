/**
 * PROVA Multi-Tenant Isolation Test — Teardown
 *
 * Loescht alle Test-Workspaces + Test-User.
 * Idempotent.
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
const TEST_EMAILS = [
  'test-pentest-a@prova-systems.de',
  'test-pentest-b@prova-systems.de',
  'test-pentest-c@prova-systems.de'
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('[teardown] Test-Workspaces loeschen...');

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .like('name', TEST_PREFIX + '%');

  if (workspaces && workspaces.length > 0) {
    const ids = workspaces.map(w => w.id);
    console.log('[teardown]   gefunden:', workspaces.length, 'Workspaces');
    const { error } = await supabase.from('workspaces').delete().in('id', ids);
    if (error) console.warn('[teardown]   error:', error.message);
  }

  console.log('[teardown] Test-User loeschen...');
  const { data: { users } } = await supabase.auth.admin.listUsers();
  for (const email of TEST_EMAILS) {
    const u = (users || []).find(x => x.email === email);
    if (u) {
      await supabase.auth.admin.deleteUser(u.id);
      console.log('[teardown]   geloescht:', email);
    }
  }

  // fixtures.json loeschen
  const fs = require('fs');
  const path = require('path');
  const fxPath = path.join(__dirname, 'fixtures.json');
  if (fs.existsSync(fxPath)) {
    fs.unlinkSync(fxPath);
    console.log('[teardown] fixtures.json geloescht');
  }

  console.log('[teardown] DONE');
}

main().catch(e => { console.error('[teardown] FATAL:', e); process.exit(2); });
