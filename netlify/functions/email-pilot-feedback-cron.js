/**
 * PROVA — email-pilot-feedback-cron.js (MEGA³² W11-I5)
 *
 * Daily-Cron: findet User die vor 7 Tagen ihren ersten echten Auftrag (NICHT Demo) erstellt haben.
 * Sendet Feedback-Mail via Calendly-Link.
 *
 * Auth: X-Cron-Secret (PROVA_EMAIL_CRON_SECRET || EMAIL_CRON_SECRET).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const Email = require('./lib/email-resend-helper');

// MEGA³³ M33-I1-PATCH: Cal.com EU + Whereby (DSGVO-perfekt). Default hardcoded mit ENV-Override.
// Marcel nutzt cal.eu (EU-Domain) + Whereby (Norwegen). Backwards-Compat für PROVA_CALENDLY_URL bleibt.
const DEFAULT_BOOKING_URL = 'https://cal.eu/marcel.schreiber/prova-pilot-feedback';

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };

  const expected = process.env.PROVA_EMAIL_CRON_SECRET || process.env.EMAIL_CRON_SECRET;
  const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
  if (!expected || provided !== expected) return jsonResponse(event, 401, { error: 'Unauthorized' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Erster echter Auftrag vor 7 Tagen (NICHT Demo)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();

  const { data: auftraege, error } = await sb.from('auftraege')
    .select('id, az, workspace_id, created_at, created_by_user_id')
    .eq('is_demo', false)
    .gte('created_at', eightDaysAgo)
    .lt('created_at', sevenDaysAgo);
  if (error) return jsonResponse(event, 500, { error: error.message });

  const tpl = Email.loadTemplate('PILOT-FEEDBACK');
  if (!tpl) return jsonResponse(event, 500, { error: 'Template fehlt' });

  // Pro User nur einmal — Map by user_id
  const byUser = {};
  (auftraege || []).forEach(a => {
    if (!a.created_by_user_id) return;
    if (!byUser[a.created_by_user_id]) byUser[a.created_by_user_id] = a;
  });

  let sent = 0, skipped = 0;
  // Defensive ENV-Fallback-Chain: neue PROVA_BOOKING_URL > legacy PROVA_CALENDLY_URL > Default
  const bookingUrl = process.env.PROVA_BOOKING_URL
    || process.env.PROVA_CALENDLY_URL
    || DEFAULT_BOOKING_URL;

  for (const userId of Object.keys(byUser)) {
    const a = byUser[userId];
    const { data: user } = await sb.from('users').select('email, vorname').eq('id', userId).maybeSingle();
    if (!user || !user.email) { skipped++; continue; }
    const html = Email.renderLiquid(tpl, {
      user_email: user.email,
      user_first_name: user.vorname || '',
      first_auftrag_az: a.az,
      booking_url: bookingUrl,    // NEU: korrekte Variable (Cal.com + Whereby)
      calendly_url: bookingUrl    // BACKWARDS-COMPAT: alte Template-Variable
    });
    const r = await Email.sendEmail({
      to: user.email,
      subject: '🤝 PROVA — wie läuft\'s? (Marcel persönlich)',
      html: html,
      reply_to: 'marcel@prova-systems.de'
    });
    if (r.sent) sent++; else skipped++;
  }

  return jsonResponse(event, 200, { processed: Object.keys(byUser).length, sent, skipped });
}, { functionName: 'email-pilot-feedback-cron' });
