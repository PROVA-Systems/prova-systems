'use strict';

/**
 * MEGA³⁶ W4.6 — generate-bescheinigungs-aktenzeichen Lambda Tests
 *
 * Verifiziert:
 *  - pad3-Helper (3-stellig zero-padded)
 *  - nextNr mit Mock-Supabase (Optimistic-Locking + Retry)
 *  - resolveWorkspaceId-Logik
 *  - Lambda hat requireAuth + Rate-Limit
 *  - Format BES-YYYY-NNN
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const Lambda = require('../../netlify/functions/generate-bescheinigungs-aktenzeichen');
const lambdaSrc = fs.readFileSync(
  path.join(__dirname, '..', '..', 'netlify', 'functions', 'generate-bescheinigungs-aktenzeichen.js'),
  'utf8'
);

test('W4.6: pad3 — Format 1 → "001", 7 → "007", 99 → "099", 100 → "100"', () => {
  assert.strictEqual(Lambda.__pad3(1), '001');
  assert.strictEqual(Lambda.__pad3(7), '007');
  assert.strictEqual(Lambda.__pad3(99), '099');
  assert.strictEqual(Lambda.__pad3(100), '100');
});

test('W4.6: pad3 — über 999 nicht mehr 3-stellig (Akzeptanz: BES-YYYY-NNNN)', () => {
  // ≥1000 Bescheinigungen/Jahr ist akzeptables Overflow-Verhalten
  assert.strictEqual(Lambda.__pad3(1000), '1000');
});

test('W4.6: MAX_RETRIES ist 5 (akzeptabel für SV-Solo-Concurrency)', () => {
  assert.strictEqual(Lambda.__MAX_RETRIES, 5);
});

test('W4.6: nextNr — atomic increment auf existing row (oldNr=3 → newNr=4)', async () => {
  let upsertCalled = false;
  let updateCalled = false;
  const mockSb = {
    from(table) {
      assert.strictEqual(table, 'bescheinigungs_sequences');
      return {
        upsert(_row, _opts) { upsertCalled = true; return Promise.resolve({ data: null, error: null }); },
        select(_cols) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: { letzte_nr: 3 }, error: null }); }
          };
        },
        update(payload) {
          updateCalled = true;
          assert.strictEqual(payload.letzte_nr, 4);
          assert.match(payload.updated_at, /^\d{4}-\d{2}-\d{2}T/);
          return {
            eq() { return this; },
            select() { return this; },
            maybeSingle() { return Promise.resolve({ data: { letzte_nr: 4 }, error: null }); }
          };
        }
      };
    }
  };
  const newNr = await Lambda.__nextNr(mockSb, 'ws-1', 2026);
  assert.strictEqual(newNr, 4);
  assert.ok(upsertCalled, 'upsert (idempotent ensure row) wurde aufgerufen');
  assert.ok(updateCalled, 'update mit increment wurde aufgerufen');
});

test('W4.6: nextNr — start mit leerer Tabelle (oldNr=0 → newNr=1, BES-YYYY-001)', async () => {
  const mockSb = {
    from() {
      return {
        upsert() { return Promise.resolve({ data: null, error: null }); },
        select() { return { eq() { return this; }, maybeSingle() { return Promise.resolve({ data: null, error: null }); } }; },
        update() { return { eq() { return this; }, select() { return this; }, maybeSingle() { return Promise.resolve({ data: { letzte_nr: 1 }, error: null }); } }; }
      };
    }
  };
  const nr = await Lambda.__nextNr(mockSb, 'ws-2', 2026);
  assert.strictEqual(nr, 1);
});

test('W4.6: nextNr — Konflikt-Retry (erste UPDATE returns null, zweite OK)', async () => {
  let attempts = 0;
  const mockSb = {
    from() {
      return {
        upsert() { return Promise.resolve({ data: null, error: null }); },
        select() { return { eq() { return this; }, maybeSingle() { return Promise.resolve({ data: { letzte_nr: 5 }, error: null }); } }; },
        update() {
          return {
            eq() { return this; },
            select() { return this; },
            maybeSingle() {
              attempts++;
              if (attempts === 1) return Promise.resolve({ data: null, error: null });
              return Promise.resolve({ data: { letzte_nr: 6 }, error: null });
            }
          };
        }
      };
    }
  };
  const nr = await Lambda.__nextNr(mockSb, 'ws-3', 2026);
  assert.strictEqual(nr, 6);
  assert.strictEqual(attempts, 2);
});

test('W4.6: nextNr — wirft nach 5 fehlgeschlagenen Retries', async () => {
  const mockSb = {
    from() {
      return {
        upsert() { return Promise.resolve({ data: null, error: null }); },
        select() { return { eq() { return this; }, maybeSingle() { return Promise.resolve({ data: { letzte_nr: 0 }, error: null }); } }; },
        update() { return { eq() { return this; }, select() { return this; }, maybeSingle() { return Promise.resolve({ data: null, error: null }); } }; }
      };
    }
  };
  await assert.rejects(
    () => Lambda.__nextNr(mockSb, 'ws-fail', 2026),
    /Sequenz-Konflikt nach 5 Versuchen/
  );
});

test('W4.6: resolveWorkspaceId — Email → profiles.id → workspace_memberships.workspace_id', async () => {
  let profilesQueried = false;
  let membershipsQueried = false;
  const mockSb = {
    from(table) {
      if (table === 'profiles') {
        profilesQueried = true;
        return {
          select(cols) { assert.strictEqual(cols, 'id'); return this; },
          eq(col, val) { assert.strictEqual(col, 'email'); assert.strictEqual(val, 'sv@test.de'); return this; },
          maybeSingle() { return Promise.resolve({ data: { id: 'user-uuid' }, error: null }); }
        };
      }
      if (table === 'workspace_memberships') {
        membershipsQueried = true;
        return {
          select(cols) { assert.strictEqual(cols, 'workspace_id'); return this; },
          eq(col, val) { assert.strictEqual(col, 'user_id'); assert.strictEqual(val, 'user-uuid'); return this; },
          limit() { return this; },
          maybeSingle() { return Promise.resolve({ data: { workspace_id: 'ws-xyz' }, error: null }); }
        };
      }
    }
  };
  const ws = await Lambda.__resolveWorkspaceId(mockSb, 'sv@test.de');
  assert.strictEqual(ws, 'ws-xyz');
  assert.ok(profilesQueried, 'profiles wurde abgefragt');
  assert.ok(membershipsQueried, 'workspace_memberships wurde abgefragt');
});

test('W4.6: resolveWorkspaceId — null wenn User keine Membership hat', async () => {
  const mockSb = {
    from(table) {
      if (table === 'profiles') {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle() { return Promise.resolve({ data: { id: 'user-x' }, error: null }); }
        };
      }
      return {
        select() { return this; },
        eq() { return this; },
        limit() { return this; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); }
      };
    }
  };
  const ws = await Lambda.__resolveWorkspaceId(mockSb, 'lonely@test.de');
  assert.strictEqual(ws, null);
});

test('W4.6: Lambda ist requireAuth + Rate-Limit-protected', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /RateLimit\.check/);
});

test('W4.6: Lambda lehnt Methoden außer POST/OPTIONS ab (405)', () => {
  assert.match(lambdaSrc, /event\.httpMethod !== ['"]POST['"]/);
  assert.match(lambdaSrc, /405/);
});

test('W4.6: Aktenzeichen-Format BES-YYYY-NNN konstruiert', () => {
  // Im Lambda: 'BES-' + jahr + '-' + pad3(nr)
  assert.match(lambdaSrc, /'BES-' \+ jahr \+ '-' \+ pad3\(nr\)/);
});

test('W4.6: Jahr-Validierung 2020 ≤ jahr ≤ 2099 (Default = aktuelles Jahr)', () => {
  assert.match(lambdaSrc, /body\.jahr >= 2020 && body\.jahr <= 2099/);
  assert.match(lambdaSrc, /new Date\(\)\.getFullYear\(\)/);
});

test('W4.6: Rate-Limit auf 10 Calls/min/User (Aktenzeichen ist nicht Hot-Path)', () => {
  assert.match(lambdaSrc, /RateLimit\.check\(context\.userEmail,\s*10,\s*60/);
});
