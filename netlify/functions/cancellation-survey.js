/**
 * PROVA — cancellation-survey.js
 * MEGA⁷ U4 (04.05.2026)
 *
 * Endpoint fuer Cancellation-Survey aus einstellungen.html.
 * Speichert Reason + Feedback in audit_trail (typ='stripe.subscription.cancelled').
 * Backend-side Quelle fuer admin-churn-Cockpit-Sektion (S1).
 *
 * Pflicht: requireAuth (User muss eingeloggt sein um seine Subscription zu kuendigen).
 * Rate-Limit: 5/min/User (verhindert Spam aber erlaubt Wiederholungen).
 */
'use strict';

const { z } = require('zod');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { writeDual, getSupabase } = require('./lib/storage-router');
const RateLimitUser = require('./lib/rate-limit-user');

const surveySchema = z.object({
  cancellation_reason: z.enum([
    'too_expensive',
    'missing_feature',
    'low_quality',
    'switched_service',
    'unused',
    'too_complex',
    'customer_service',
    'other'
  ]),
  feedback: z.string().min(0).max(2000).optional(),
  feature_request: z.string().min(0).max(500).optional(),
  recommend_anyway: z.boolean().optional()
});

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const rl = RateLimitUser.check(context.userEmail, 5, 60, { event, functionName: 'cancellation-survey' });
  if (!rl.allowed) {
    return { statusCode: 429, headers: { ...baseHeaders, 'Retry-After': String(rl.retryAfter) },
             body: JSON.stringify({ error: 'Rate-Limit erreicht', retryAfter: rl.retryAfter }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const parsed = surveySchema.safeParse(body);
  if (!parsed.success) {
    return { statusCode: 400, headers: baseHeaders,
             body: JSON.stringify({ error: 'Schema-Validation fehlgeschlagen', details: parsed.error.message }) };
  }

  const data = parsed.data;
  const sb = getSupabase();
  const userEmail = context.userEmail || 'unknown';

  // Audit-Eintrag (Quelle fuer admin-churn-Cockpit)
  if (sb) {
    try {
      await sb.from('audit_trail').insert({
        typ: 'stripe.subscription.cancelled',
        sv_email: userEmail,
        details: JSON.stringify({
          cancellation_reason: data.cancellation_reason,
          feedback: data.feedback || null,
          feature_request: data.feature_request || null,
          recommend_anyway: data.recommend_anyway,
          submitted_at: new Date().toISOString(),
          // NICHT: actual stripe-cancel — das macht Marcel separat in Stripe-Portal
          source: 'cancellation_survey'
        })
      });
    } catch (e) {
      console.warn('[cancellation-survey] audit insert fail:', e.message);
    }
  }

  // Marcel-Notification (best-effort via SMTP)
  // → Email an kontakt@prova-systems.de mit Survey-Inhalt
  // (nicht hier implementiert — Marcel kriegt es ueber Cockpit-Push-Alerts)

  return {
    statusCode: 200,
    headers: baseHeaders,
    body: JSON.stringify({
      ok: true,
      message: 'Vielen Dank fuer dein Feedback. Wir werden uns ggf. melden.',
      next_step: 'Bitte fahre mit der Stripe-Customer-Portal-Kuendigung fort.'
    })
  };
}), { functionName: 'cancellation-survey' });
