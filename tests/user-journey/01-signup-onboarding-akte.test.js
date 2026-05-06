/**
 * PROVA — User-Journey 01: Signup → Welcome-Wizard → Akte (MEGA²⁴ Block 6)
 *
 * Story: Neuer SV registriert sich, durchläuft den 4-Step-Wizard und erstellt
 * die erste Akte. Mock-Supabase + Mock-Lambdas — pure-functional.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Journey 01 — Signup mit AGB-Checkboxes', () => {
  function validateSignupPayload(payload) {
    if (!payload) return { ok: false, error: 'no payload' };
    if (!payload.email || !/^[^@]+@[^@]+\.[^@]+$/.test(payload.email)) {
      return { ok: false, error: 'invalid email' };
    }
    if (!payload.password || payload.password.length < 8) {
      return { ok: false, error: 'password too short' };
    }
    if (!payload.agb_accepted) return { ok: false, error: 'agb required' };
    if (!payload.avv_accepted) return { ok: false, error: 'avv required' };
    if (!payload.dse_accepted) return { ok: false, error: 'dse required' };
    return { ok: true };
  }

  test('akzeptiert valides Signup mit allen 3 Checkboxen', () => {
    const r = validateSignupPayload({
      email: 'test@sv.de',
      password: 'SecurePass1!',
      agb_accepted: true,
      avv_accepted: true,
      dse_accepted: true
    });
    assert.equal(r.ok, true);
  });

  test('lehnt fehlende AGB ab', () => {
    const r = validateSignupPayload({
      email: 'a@b.de', password: 'SecurePass1!',
      agb_accepted: false, avv_accepted: true, dse_accepted: true
    });
    assert.equal(r.ok, false);
    assert.match(r.error, /agb/);
  });

  test('lehnt fehlende AVV ab', () => {
    const r = validateSignupPayload({
      email: 'a@b.de', password: 'SecurePass1!',
      agb_accepted: true, avv_accepted: false, dse_accepted: true
    });
    assert.equal(r.ok, false);
  });

  test('lehnt zu kurzes Password ab', () => {
    const r = validateSignupPayload({
      email: 'a@b.de', password: 'short',
      agb_accepted: true, avv_accepted: true, dse_accepted: true
    });
    assert.equal(r.ok, false);
    assert.match(r.error, /password/);
  });

  test('lehnt invalides Email-Format ab', () => {
    const r = validateSignupPayload({
      email: 'not-email', password: 'SecurePass1!',
      agb_accepted: true, avv_accepted: true, dse_accepted: true
    });
    assert.equal(r.ok, false);
    assert.match(r.error, /email/);
  });
});

describe('Journey 01 — Welcome-Wizard 4 Steps', () => {
  // 4-Step Wizard: Persona → Mode → Tour → Demo-Akte
  function nextWizardStep(currentStep, data) {
    if (currentStep === 1) {
      if (!data.persona || !['solo', 'team', 'sv-anwalt', 'sachverstaendige'].includes(data.persona)) {
        return { ok: false, error: 'persona required' };
      }
      return { ok: true, next: 2 };
    }
    if (currentStep === 2) {
      if (!data.mode || !['A', 'B', 'C'].includes(data.mode)) {
        return { ok: false, error: 'mode required' };
      }
      return { ok: true, next: 3 };
    }
    if (currentStep === 3) {
      return { ok: true, next: 4, tourCompleted: !!data.tourCompleted };
    }
    if (currentStep === 4) {
      return { ok: true, next: 'done', demoAkteCreated: !!data.demoAkteCreated };
    }
    return { ok: false, error: 'invalid step' };
  }

  test('Step 1 Persona-Wahl: solo akzeptiert', () => {
    const r = nextWizardStep(1, { persona: 'solo' });
    assert.equal(r.ok, true);
    assert.equal(r.next, 2);
  });

  test('Step 1 lehnt fehlende Persona ab', () => {
    const r = nextWizardStep(1, {});
    assert.equal(r.ok, false);
  });

  test('Step 2 Mode-Wahl: A/B/C akzeptiert', () => {
    ['A', 'B', 'C'].forEach(mode => {
      const r = nextWizardStep(2, { mode });
      assert.equal(r.ok, true);
    });
  });

  test('Step 4 Demo-Akte-Done -> Wizard-Ende', () => {
    const r = nextWizardStep(4, { demoAkteCreated: true });
    assert.equal(r.next, 'done');
    assert.equal(r.demoAkteCreated, true);
  });
});

describe('Journey 01 — Erste echte Akte erstellen', () => {
  function createAkte(workspace_id, payload) {
    if (!workspace_id) return { ok: false, error: 'no workspace' };
    if (!payload || !payload.aktenzeichen) return { ok: false, error: 'aktenzeichen required' };
    if (payload.aktenzeichen.length < 3) return { ok: false, error: 'aktenzeichen too short' };
    return {
      ok: true,
      akte: {
        id: 'a-' + Date.now(),
        workspace_id,
        aktenzeichen: payload.aktenzeichen,
        status: 'in_bearbeitung',
        created_at: new Date().toISOString()
      }
    };
  }

  test('erstellt Akte mit gueltigem Aktenzeichen', () => {
    const r = createAkte('ws-123', { aktenzeichen: '5 C 678/26' });
    assert.equal(r.ok, true);
    assert.equal(r.akte.aktenzeichen, '5 C 678/26');
    assert.equal(r.akte.status, 'in_bearbeitung');
  });

  test('lehnt Akte ohne Workspace ab', () => {
    const r = createAkte(null, { aktenzeichen: 'AZ-1' });
    assert.equal(r.ok, false);
  });

  test('lehnt zu kurzes Aktenzeichen', () => {
    const r = createAkte('ws-1', { aktenzeichen: 'X' });
    assert.equal(r.ok, false);
  });
});
