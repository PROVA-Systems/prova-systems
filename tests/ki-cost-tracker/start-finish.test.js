'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Tracker = require('../../netlify/functions/lib/ki-cost-tracker');

test('Tracker.start: liefert Track-Object mit started_at + Pflicht-Felder', () => {
  const t = Tracker.start({
    workspace_id: 'ws-1', user_id: 'u-1', purpose: 'fachurteil_entwurf',
    modell: 'gpt-5.5', provider: 'openai', input_pseudonymisiert: true
  });
  assert.ok(t.started_at);
  assert.strictEqual(t.workspace_id, 'ws-1');
  assert.strictEqual(t.user_id, 'u-1');
  assert.strictEqual(t.purpose, 'fachurteil_entwurf');
  assert.strictEqual(t.modell, 'gpt-5.5');
  assert.strictEqual(t.input_pseudonymisiert, true);
});

test('Tracker.start: defaults provider=openai + input_pseudonymisiert=true', () => {
  const t = Tracker.start({});
  assert.strictEqual(t.provider, 'openai');
  assert.strictEqual(t.input_pseudonymisiert, true);
  assert.strictEqual(t.purpose, 'sonstiges');
});

test('Tracker.finish: schreibt vollständigen Insert via Mock-Supabase', async () => {
  const inserts = [];
  const mockSb = {
    from: (table) => ({
      insert: async (row) => {
        inserts.push({ table, row });
        return { error: null };
      }
    })
  };
  const t = Tracker.start({ purpose: 'fachurteil_entwurf', modell: 'gpt-5.5', user_id: 'u-1' });
  await new Promise(r => setTimeout(r, 5)); // dauer_ms > 0
  const res = await Tracker.finish(mockSb, t, {
    token_input: 1000,
    token_output: 500,
    status: 'erfolg',
    output: 'Test-Output'
  });
  assert.strictEqual(res.logged, true);
  assert.strictEqual(inserts.length, 1);
  assert.strictEqual(inserts[0].table, 'ki_protokoll');
  const r = inserts[0].row;
  assert.strictEqual(r.token_input, 1000);
  assert.strictEqual(r.token_output, 500);
  assert.strictEqual(r.token_total, 1500);
  assert.ok(r.kosten_eur > 0);
  assert.ok(r.dauer_ms >= 0);
  assert.strictEqual(r.output_laenge_chars, 11); // 'Test-Output'
  assert.strictEqual(r.output_preview, 'Test-Output');
  assert.strictEqual(r.status, 'erfolg');
});

test('Tracker.finish: Defensive — DB-Error → { logged: false } statt throw', async () => {
  const mockSb = {
    from: () => ({
      insert: async () => ({ error: { message: 'connection refused' } })
    })
  };
  const t = Tracker.start({ modell: 'gpt-5.5' });
  const res = await Tracker.finish(mockSb, t, { token_input: 100, token_output: 50 });
  assert.strictEqual(res.logged, false);
  assert.match(res.reason, /connection refused/);
});

test('Tracker.finish: Defensive — Throw → { logged: false }', async () => {
  const mockSb = {
    from: () => ({
      insert: async () => { throw new Error('network'); }
    })
  };
  const t = Tracker.start({ modell: 'gpt-5.5' });
  const res = await Tracker.finish(mockSb, t, { token_input: 100, token_output: 50 });
  assert.strictEqual(res.logged, false);
  assert.match(res.reason, /network/);
});

test('Tracker.finish: kein Supabase → { logged: false, reason: no-supabase-or-track }', async () => {
  const t = Tracker.start({ modell: 'gpt-5.5' });
  const res = await Tracker.finish(null, t, { token_input: 100, token_output: 50 });
  assert.strictEqual(res.logged, false);
  assert.match(res.reason, /no-supabase/);
});

test('Tracker.finish: Output > 500 chars wird truncated im Preview', async () => {
  const inserts = [];
  const mockSb = { from: () => ({ insert: async (row) => { inserts.push(row); return { error: null }; } }) };
  const t = Tracker.start({ modell: 'gpt-5.4-mini' });
  const longOutput = 'X'.repeat(2000);
  await Tracker.finish(mockSb, t, { token_input: 10, token_output: 100, output: longOutput });
  assert.strictEqual(inserts[0].output_laenge_chars, 2000);
  assert.strictEqual(inserts[0].output_preview.length, 500);
});

test('Tracker.finish: cached_tokens_in reduziert Kosten via ai-router', async () => {
  const inserts = [];
  const mockSb = { from: () => ({ insert: async (row) => { inserts.push(row); return { error: null }; } }) };
  const t1 = Tracker.start({ modell: 'gpt-5.5' });
  await Tracker.finish(mockSb, t1, { token_input: 10000, token_output: 5000 });
  const t2 = Tracker.start({ modell: 'gpt-5.5' });
  await Tracker.finish(mockSb, t2, { token_input: 10000, token_output: 5000, cached_tokens_in: 5000 });
  assert.ok(inserts[1].kosten_eur < inserts[0].kosten_eur, 'mit Cache muss billiger sein');
});

test('Tracker: Pseudonymisierungs-Flags + Compliance-Markers durchgereicht', async () => {
  const inserts = [];
  const mockSb = { from: () => ({ insert: async (row) => { inserts.push(row); return { error: null }; } }) };
  const t = Tracker.start({ modell: 'gpt-5.5', input_pseudonymisiert: true, pseudonymisierung_token_count: 7 });
  await Tracker.finish(mockSb, t, {
    token_input: 100, token_output: 50,
    konjunktiv_check_passed: true,
    halluzinations_check_passed: true,
    output_repseudonymisiert: true
  });
  assert.strictEqual(inserts[0].input_pseudonymisiert, true);
  assert.strictEqual(inserts[0].pseudonymisierung_token_count, 7);
  assert.strictEqual(inserts[0].konjunktiv_check_passed, true);
  assert.strictEqual(inserts[0].halluzinations_check_passed, true);
});
