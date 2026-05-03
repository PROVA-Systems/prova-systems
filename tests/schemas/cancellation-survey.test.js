/**
 * PROVA — Cancellation-Survey Schema-Tests
 * MEGA⁷ U5 (04.05.2026)
 *
 * Re-implementiert die zod-Schemas aus netlify/functions/cancellation-survey.js
 * fuer isolated Test-Run.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');

const surveySchema = z.object({
  cancellation_reason: z.enum([
    'too_expensive', 'missing_feature', 'low_quality', 'switched_service',
    'unused', 'too_complex', 'customer_service', 'other'
  ]),
  feedback: z.string().min(0).max(2000).optional(),
  feature_request: z.string().min(0).max(500).optional(),
  recommend_anyway: z.boolean().optional()
});

describe('cancellation-survey schema', () => {
  test('valid: minimaler Survey', () => {
    const r = surveySchema.safeParse({ cancellation_reason: 'too_expensive' });
    assert.equal(r.success, true);
  });

  test('valid: vollstaendiger Survey', () => {
    const r = surveySchema.safeParse({
      cancellation_reason: 'missing_feature',
      feedback: 'Ich haette gern Excel-Export gehabt.',
      feature_request: 'Excel-Export fuer Rechnungen',
      recommend_anyway: true
    });
    assert.equal(r.success, true);
  });

  test('invalid: ohne Reason', () => {
    const r = surveySchema.safeParse({ feedback: 'Test' });
    assert.equal(r.success, false);
  });

  test('invalid: unbekannte Reason', () => {
    const r = surveySchema.safeParse({ cancellation_reason: 'random' });
    assert.equal(r.success, false);
  });

  test('invalid: feedback zu lang', () => {
    const r = surveySchema.safeParse({
      cancellation_reason: 'other',
      feedback: 'A'.repeat(2001)
    });
    assert.equal(r.success, false);
  });

  test('valid: feedback exakt 2000 Zeichen', () => {
    const r = surveySchema.safeParse({
      cancellation_reason: 'other',
      feedback: 'A'.repeat(2000)
    });
    assert.equal(r.success, true);
  });

  test('invalid: feature_request zu lang', () => {
    const r = surveySchema.safeParse({
      cancellation_reason: 'other',
      feature_request: 'B'.repeat(501)
    });
    assert.equal(r.success, false);
  });

  test('alle 8 Reasons valid', () => {
    const reasons = ['too_expensive', 'missing_feature', 'low_quality',
      'switched_service', 'unused', 'too_complex', 'customer_service', 'other'];
    for (const r of reasons) {
      assert.equal(surveySchema.safeParse({ cancellation_reason: r }).success, true);
    }
  });

  test('valid: recommend_anyway false default', () => {
    const r = surveySchema.safeParse({ cancellation_reason: 'too_complex' });
    assert.equal(r.success, true);
    assert.equal(r.data.recommend_anyway, undefined);
  });

  test('invalid: recommend_anyway als String', () => {
    const r = surveySchema.safeParse({
      cancellation_reason: 'other',
      recommend_anyway: 'yes'
    });
    assert.equal(r.success, false);
  });
});
