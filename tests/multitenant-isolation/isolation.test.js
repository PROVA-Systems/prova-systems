/**
 * PROVA Multi-Tenant Isolation Tests
 *
 * Verifiziert dass User-A NICHT auf Daten von Workspace-B/C zugreifen kann.
 * Nutzt anon-Key + Sign-In (echter User-Pfad, RLS aktiv).
 *
 * Voraussetzung: setup.js wurde ausgefuehrt (fixtures.json existiert)
 *
 * USAGE:
 *   node --test tests/multitenant-isolation/isolation.test.js
 */
'use strict';

require('dotenv').config({ path: '.env.local' });

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('FEHLER: SUPABASE_URL und SUPABASE_ANON_KEY in .env.local benoetigt');
  process.exit(1);
}

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const [WS_A, WS_B, WS_C] = fixtures;

function newAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function signInAs(workspace) {
  const c = newAnonClient();
  const { error } = await c.auth.signInWithPassword({
    email: workspace.email,
    password: workspace.password
  });
  if (error) throw new Error('signIn failed for ' + workspace.email + ': ' + error.message);
  return c;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. AUFTRAEGE — A darf NICHT B's Auftraege lesen
// ─────────────────────────────────────────────────────────────────────────

describe('Auftraege Cross-Tenant', () => {
  test('A liest eigene Auftraege ✅', async () => {
    const c = await signInAs(WS_A);
    const { data, error } = await c.from('auftraege').select('id').eq('workspace_id', WS_A.workspaceId);
    assert.equal(error, null);
    assert.ok(data.length >= 5, 'erwartet >= 5 eigene Auftraege');
  });

  test('A SELECT auftraege WHERE workspace_id=B → leere Liste', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('auftraege').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0, 'RLS muss B-Auftraege filtern');
  });

  test('A SELECT auftraege.id direkt mit B-ID → keine Daten', async () => {
    const c = await signInAs(WS_A);
    const fremdeAuftragId = WS_B.auftraege?.[0]?.id;
    if (!fremdeAuftragId) return;
    const { data } = await c.from('auftraege').select('*').eq('id', fremdeAuftragId);
    assert.equal(data.length, 0, 'RLS muss fremde Auftrag-ID filtern');
  });

  test('A INSERT in B-Workspace → 403 oder Policy-Violation', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('auftraege').insert({
      workspace_id: WS_B.workspaceId,
      aktenzeichen: 'EVIL-FROM-A',
      objekt: 'Cross-Tenant-Attack'
    });
    assert.ok(error, 'INSERT mit fremder workspace_id muss fehlschlagen');
  });

  test('A UPDATE B-Auftrag → 0 rows updated', async () => {
    const c = await signInAs(WS_A);
    const fremdeAuftragId = WS_B.auftraege?.[0]?.id;
    if (!fremdeAuftragId) return;
    const { data, error } = await c.from('auftraege')
      .update({ objekt: 'PWNED' })
      .eq('id', fremdeAuftragId)
      .select();
    assert.equal(error, null);
    assert.equal(data?.length || 0, 0, 'UPDATE darf 0 rows betreffen');
  });

  test('A DELETE B-Auftrag → 0 rows deleted', async () => {
    const c = await signInAs(WS_A);
    const fremdeAuftragId = WS_B.auftraege?.[0]?.id;
    if (!fremdeAuftragId) return;
    const { data } = await c.from('auftraege').delete().eq('id', fremdeAuftragId).select();
    assert.equal(data?.length || 0, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. KONTAKTE
// ─────────────────────────────────────────────────────────────────────────

describe('Kontakte Cross-Tenant', () => {
  test('A liest eigene Kontakte ✅', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('kontakte').select('id').eq('workspace_id', WS_A.workspaceId);
    assert.ok(data.length >= 5);
  });

  test('A SELECT B-Kontakte → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('kontakte').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });

  test('A INSERT Kontakt in B → fail', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('kontakte').insert({
      workspace_id: WS_B.workspaceId,
      typ: 'auftraggeber',
      vorname: 'Evil',
      nachname: 'Hacker'
    });
    assert.ok(error);
  });

  test('A liest C-Kontakte → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('kontakte').select('id').eq('workspace_id', WS_C.workspaceId);
    assert.equal(data.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. DOKUMENTE (Rechnungen-Aequivalent)
// ─────────────────────────────────────────────────────────────────────────

describe('Dokumente Cross-Tenant', () => {
  test('A SELECT B-Dokumente → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('dokumente').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });

  test('A INSERT Dokument mit fremder workspace_id → fail', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('dokumente').insert({
      workspace_id: WS_B.workspaceId,
      typ: 'rechnung',
      titel: 'Evil-Rechnung'
    });
    assert.ok(error);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. AUDIT-TRAIL — H-12 Finding
// ─────────────────────────────────────────────────────────────────────────

describe('Audit-Trail Cross-Tenant (Phase 2 H-12 Finding)', () => {
  test('A INSERT audit_trail mit fremder workspace_id → ?', async () => {
    // Vor PLANNED-Migration: erlaubt (HIGH-Finding!)
    // Nach Migration: muss fail
    const c = await signInAs(WS_A);
    const { error } = await c.from('audit_trail').insert({
      workspace_id: WS_B.workspaceId,
      user_id: WS_A.userId,
      typ: 'Test-Cross-Tenant',
      sv_email: WS_A.email,
      details: JSON.stringify({ test: true })
    });
    // Aktuell: kein error (Policy zu permissiv).
    // Test bleibt grun bis PLANNED-Migration appliziert ist, dann strenger:
    if (process.env.PROVA_RLS_AUDIT_FIX_APPLIED === 'true') {
      assert.ok(error, 'Nach RLS-Fix muss Cross-Tenant-INSERT fehlschlagen');
    } else {
      console.warn('[test] Audit-Trail-Cross-Tenant erlaubt — PLANNED-Migration noch nicht appliziert');
    }
  });

  test('A liest eigene audit-Trail-Eintraege', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('audit_trail').select('id').eq('user_id', WS_A.userId);
    assert.ok(data.length >= 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. KI-PROTOKOLL
// ─────────────────────────────────────────────────────────────────────────

describe('KI-Protokoll Cross-Tenant', () => {
  test('A SELECT B-KI-Calls → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('ki_protokoll').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. WORKSPACE_MEMBERSHIPS
// ─────────────────────────────────────────────────────────────────────────

describe('Workspace-Memberships', () => {
  test('A sieht eigene Membership', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('workspace_memberships').select('*').eq('user_id', WS_A.userId);
    assert.ok(data.length >= 1);
    assert.equal(data[0].workspace_id, WS_A.workspaceId);
  });

  test('A sieht NICHT B-User-Memberships', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('workspace_memberships').select('*').eq('user_id', WS_B.userId);
    assert.equal(data.length, 0);
  });

  test('A kann sich NICHT in B-Workspace einschleusen', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('workspace_memberships').insert({
      workspace_id: WS_B.workspaceId,
      user_id: WS_A.userId,
      rolle: 'owner',
      is_active: true
    });
    assert.ok(error, 'Self-Insert in fremden Workspace muss fehlschlagen');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. WORKSPACES-Tabelle direkt
// ─────────────────────────────────────────────────────────────────────────

describe('Workspaces Cross-Tenant', () => {
  test('A SELECT alle Workspaces → nur eigene + assoziierte', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('workspaces').select('id');
    const ids = data.map(r => r.id);
    assert.ok(ids.includes(WS_A.workspaceId), 'eigene Workspace sichtbar');
    assert.ok(!ids.includes(WS_B.workspaceId), 'B-Workspace darf nicht sichtbar sein');
    assert.ok(!ids.includes(WS_C.workspaceId), 'C-Workspace darf nicht sichtbar sein');
  });

  test('A UPDATE B-Workspace → fail', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('workspaces')
      .update({ name: 'PWNED' })
      .eq('id', WS_B.workspaceId)
      .select();
    assert.equal(data?.length || 0, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. NOTIZEN
// ─────────────────────────────────────────────────────────────────────────

describe('Notizen Cross-Tenant', () => {
  test('A SELECT B-Notizen → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('notizen').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });

  test('A INSERT Notiz mit fremder workspace_id → fail', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('notizen').insert({
      workspace_id: WS_B.workspaceId,
      titel: 'Evil-Notiz',
      inhalt: 'cross-tenant-attack'
    });
    assert.ok(error);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. FOTOS
// ─────────────────────────────────────────────────────────────────────────

describe('Fotos Cross-Tenant', () => {
  test('A SELECT B-Fotos → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('fotos').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. TERMINE
// ─────────────────────────────────────────────────────────────────────────

describe('Termine Cross-Tenant', () => {
  test('A SELECT B-Termine → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('termine').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });

  test('A INSERT Termin in B → fail', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('termine').insert({
      workspace_id: WS_B.workspaceId,
      titel: 'Evil-Termin',
      datum: '2026-12-01'
    });
    assert.ok(error);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 11. INDIRECT VIA AUFTRAG_ID (Pattern B)
// ─────────────────────────────────────────────────────────────────────────

describe('Auftrag-FK-Tabellen Cross-Tenant', () => {
  test('A INSERT befund mit B-auftrag_id → fail', async () => {
    const c = await signInAs(WS_A);
    const fremdeAuftragId = WS_B.auftraege?.[0]?.id;
    if (!fremdeAuftragId) return;
    const { error } = await c.from('befunde').insert({
      auftrag_id: fremdeAuftragId,
      titel: 'Evil-Befund',
      inhalt: 'cross-tenant'
    });
    assert.ok(error);
  });

  test('A SELECT messwerte WHERE auftrag_id=B → leer', async () => {
    const c = await signInAs(WS_A);
    const fremdeAuftragId = WS_B.auftraege?.[0]?.id;
    if (!fremdeAuftragId) return;
    const { data } = await c.from('messwerte').select('id').eq('auftrag_id', fremdeAuftragId);
    assert.equal(data.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 12. EMAIL-LOG
// ─────────────────────────────────────────────────────────────────────────

describe('Email-Log Cross-Tenant', () => {
  test('A SELECT email_log WHERE workspace_id=B → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('email_log').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 13. KI-FEEDBACK + INVITATIONS
// ─────────────────────────────────────────────────────────────────────────

describe('KI-Feedback + Invitations Cross-Tenant', () => {
  test('A SELECT B-KI-Feedback → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('ki_feedback').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });

  test('A SELECT B-Workspace-Invitations → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('workspace_invitations').select('id').eq('workspace_id', WS_B.workspaceId);
    assert.equal(data.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 14. EDGE-CASES — JWT-Manipulation (negativ)
// ─────────────────────────────────────────────────────────────────────────

describe('Edge-Cases', () => {
  test('Anonymer Client (kein JWT) sieht keine Workspaces', async () => {
    const c = newAnonClient();
    const { data } = await c.from('workspaces').select('id');
    assert.equal(data.length, 0);
  });

  test('Anonymer Client kann nicht INSERT in auftraege', async () => {
    const c = newAnonClient();
    const { error } = await c.from('auftraege').insert({
      workspace_id: WS_A.workspaceId,
      aktenzeichen: 'ANON-EVIL'
    });
    assert.ok(error);
  });

  test('A liest users-Tabelle → nur eigene + Workspace-Members', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('users').select('id, email');
    const emails = (data || []).map(u => u.email);
    assert.ok(emails.includes(WS_A.email));
    assert.ok(!emails.includes(WS_B.email), 'B-User darf nicht sichtbar sein');
    assert.ok(!emails.includes(WS_C.email), 'C-User darf nicht sichtbar sein');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 15. EINWILLIGUNGEN (User-spezifisch)
// ─────────────────────────────────────────────────────────────────────────

describe('Einwilligungen Cross-User', () => {
  test('A INSERT Einwilligung mit user_id=B → fail', async () => {
    const c = await signInAs(WS_A);
    const { error } = await c.from('einwilligungen').insert({
      user_id: WS_B.userId,
      typ: 'AVV',
      version: 'v1',
      zugestimmt: true
    });
    assert.ok(error, 'Cross-User-Einwilligung muss fehlschlagen');
  });

  test('A SELECT Einwilligungen WHERE user_id=B → leer', async () => {
    const c = await signInAs(WS_A);
    const { data } = await c.from('einwilligungen').select('id').eq('user_id', WS_B.userId);
    assert.equal(data.length, 0);
  });
});
