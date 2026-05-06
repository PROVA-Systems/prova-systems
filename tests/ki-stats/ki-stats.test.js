/**
 * PROVA — ki-stats.js Tests (MEGA²¹+²² W112)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const KiStats = require(path.join(ROOT, 'lib', 'ki-stats.js'));

describe('ki-stats — VALID_PURPOSES + VALID_PROVIDERS', () => {
  test('VALID_PURPOSES enthaelt key purposes', () => {
    ['fachurteil_entwurf', 'foto_analyse', 'beweisbeschluss_extraktion', 'mode_c_interpolation']
      .forEach(p => assert.ok(KiStats.VALID_PURPOSES.indexOf(p) !== -1, 'missing: ' + p));
  });

  test('VALID_PROVIDERS = [openai, anthropic, whisper, sonstiges]', () => {
    assert.deepEqual(KiStats.VALID_PROVIDERS, ['openai', 'anthropic', 'whisper', 'sonstiges']);
  });
});

describe('ki-stats — logKiCall Validation', () => {
  test('null sb → error', async () => {
    const r = await KiStats.logKiCall(null, { user_id: 'x', purpose: 'foto_analyse', modell: 'claude_sonnet' });
    assert.equal(r.ok, false);
    assert.match(r.error, /supabase/i);
  });

  test('Missing entry-Felder → error', async () => {
    const fakeSb = { from: () => ({}) };
    const r = await KiStats.logKiCall(fakeSb, {});
    assert.equal(r.ok, false);
    assert.match(r.error, /required/);
  });

  test('Missing user_id', async () => {
    const fakeSb = { from: () => ({}) };
    const r = await KiStats.logKiCall(fakeSb, { purpose: 'foto_analyse', modell: 'claude_sonnet' });
    assert.equal(r.ok, false);
  });

  test('Missing modell', async () => {
    const fakeSb = { from: () => ({}) };
    const r = await KiStats.logKiCall(fakeSb, { user_id: 'x', purpose: 'foto_analyse' });
    assert.equal(r.ok, false);
  });
});

describe('ki-stats — logKiCall Insert-Pattern (mock-sb)', () => {
  test('Insert-Call mit korrekten Spalten', async () => {
    let inserted = null;
    const fakeSb = {
      from: function (table) {
        if (table === 'workspace_memberships') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { workspace_id: 'ws-123' } })
                  })
                })
              })
            })
          };
        }
        if (table === 'ki_protokoll') {
          return {
            insert: function (data) {
              inserted = data;
              return {
                select: () => ({
                  single: async () => ({ data: { id: 'kp-456' }, error: null })
                })
              };
            }
          };
        }
      }
    };

    const r = await KiStats.logKiCall(fakeSb, {
      user_id: 'user-1',
      purpose: 'foto_analyse',
      modell: 'claude_sonnet',
      modell_version: 'claude-sonnet-4-6',
      provider: 'anthropic',
      tokens_in: 100, tokens_out: 50,
      cost_eur: 0.0015,
      dauer_ms: 2300,
      auftrag_id: 'auf-1',
      feature_kontext: 'foto-captioning'
    });

    assert.equal(r.ok, true);
    assert.equal(r.ki_protokoll_id, 'kp-456');
    assert.equal(inserted.workspace_id, 'ws-123');
    assert.equal(inserted.user_id, 'user-1');
    assert.equal(inserted.modell_version, 'claude-sonnet-4-6');
    assert.equal(inserted.provider, 'anthropic');
    assert.equal(inserted.token_input, 100);
    assert.equal(inserted.token_output, 50);
    assert.equal(inserted.kosten_eur, 0.0015);
    assert.equal(inserted.dauer_ms, 2300);
  });

  test('output_preview wird auf 200 Zeichen gekuerzt', async () => {
    const longOutput = 'x'.repeat(500);
    let inserted = null;
    const fakeSb = {
      from: function (table) {
        if (table === 'workspace_memberships') {
          return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { workspace_id: 'ws' } }) }) }) }) }) };
        }
        if (table === 'ki_protokoll') {
          return {
            insert: function (data) { inserted = data; return { select: () => ({ single: async () => ({ data: { id: 'kp' }, error: null }) }) }; }
          };
        }
      }
    };
    await KiStats.logKiCall(fakeSb, {
      user_id: 'u', purpose: 'foto_analyse', modell: 'gpt_4o',
      output_preview: longOutput
    });
    assert.ok(inserted.output_preview.length <= 200);
  });

  test('Migration-Pending-Detection (does not exist)', async () => {
    const fakeSb = {
      from: function (table) {
        if (table === 'workspace_memberships') {
          return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { workspace_id: 'ws' } }) }) }) }) }) };
        }
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: 'relation "ki_protokoll" does not exist' } })
            })
          })
        };
      }
    };
    const r = await KiStats.logKiCall(fakeSb, { user_id: 'u', purpose: 'foto_analyse', modell: 'gpt_4o' });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'MIGRATION_PENDING');
  });
});

describe('ki-stats — getCostsForUser Aggregation', () => {
  test('Aggregiert nach modell mit Counts + Costs', async () => {
    const fakeData = [
      { modell: 'gpt_4o', token_input: 100, token_output: 50, kosten_eur: 0.001 },
      { modell: 'gpt_4o', token_input: 200, token_output: 100, kosten_eur: 0.002 },
      { modell: 'claude_sonnet', token_input: 500, token_output: 200, kosten_eur: 0.005 }
    ];
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            then: function (cb) { return cb({ data: fakeData, error: null }); },
            // also support direct await
            gte: () => ({ lte: () => ({ then: function (cb) { return cb({ data: fakeData, error: null }); } }) })
          })
        })
      })
    };
    // use simpler resolved promise pattern
    const sb2 = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: fakeData, error: null })
        })
      })
    };
    const r = await KiStats.getCostsForUser(sb2, 'user-1');
    assert.equal(r.ok, true);
    assert.equal(r.calls_count, 3);
    assert.ok(r.total_cost_eur > 0.007);
    assert.equal(r.by_modell.gpt_4o.count, 2);
    assert.equal(r.by_modell.claude_sonnet.count, 1);
  });

  test('Fehlende Args → error', async () => {
    const r = await KiStats.getCostsForUser(null, null);
    assert.equal(r.ok, false);
  });
});
