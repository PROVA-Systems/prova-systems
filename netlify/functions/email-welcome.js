/**
 * PROVA — email-welcome.js (MEGA³² W11-I5)
 *
 * Sendet Welcome-Mail nach erfolgreichem Signup.
 * Trigger: Stripe-Webhook customer.created ODER nach erstem Login.
 *
 * POST { user_email, user_first_name?, trial_end_date?, demo_fall_id? }
 * Auth: X-Cron-Secret ODER requireAuth (Service-Mode oder direkt aus Frontend)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const Email = require('./lib/email-resend-helper');

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  // Cron-Secret-Auth: ENV-Fallback-Chain
  const expected = process.env.PROVA_EMAIL_CRON_SECRET || process.env.EMAIL_CRON_SECRET;
  const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
  if (!expected || provided !== expected) return jsonResponse(event, 401, { error: 'Unauthorized — X-Cron-Secret missing' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.user_email) return jsonResponse(event, 400, { error: 'user_email pflicht' });

  const tpl = Email.loadTemplate('WELCOME');
  if (!tpl) return jsonResponse(event, 500, { error: 'Template WELCOME.liquid.template.html nicht gefunden' });

  const html = Email.renderLiquid(tpl, {
    user_email: body.user_email,
    user_first_name: body.user_first_name || '',
    trial_end_date: body.trial_end_date || new Date(Date.now() + 14 * 86400000).toLocaleDateString('de-DE'),
    login_url: body.login_url || 'https://app.prova-systems.de',
    demo_fall_id: body.demo_fall_id || ''
  });

  const r = await Email.sendEmail({
    to: body.user_email,
    subject: 'Willkommen bei PROVA — deine ersten 5 Schritte',
    html: html
  });

  return jsonResponse(event, r.sent ? 200 : 502, r);
}, { functionName: 'email-welcome' });
