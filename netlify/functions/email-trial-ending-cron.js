/**
 * PROVA — email-trial-ending-cron.js (MEGA³² W11-I5)
 *
 * Daily-Cron: findet User mit Trial-Ende in 3 Tagen → Trial-Ending-Mail.
 * Auth: X-Cron-Secret (PROVA_EMAIL_CRON_SECRET || EMAIL_CRON_SECRET).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const Email = require('./lib/email-resend-helper');

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };

  const expected = process.env.PROVA_EMAIL_CRON_SECRET || process.env.EMAIL_CRON_SECRET;
  const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
  if (!expected || provided !== expected) return jsonResponse(event, 401, { error: 'Unauthorized' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Trial endet in 3 Tagen → +3 Tage ab heute
  const trialEnd = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  // workspaces.trial_end ist die echte Trial-Spalte
  const { data: workspaces, error } = await sb.from('workspaces')
    .select('id, name, trial_end, owner_user_id')
    .eq('trial_end', trialEnd);
  if (error) return jsonResponse(event, 500, { error: error.message });

  const tpl = Email.loadTemplate('TRIAL-ENDING');
  if (!tpl) return jsonResponse(event, 500, { error: 'Template fehlt' });

  // MEGA³³ M33-I2: Founding-Remaining aus DB statt ENV.
  // Pattern: 10 Founding-Plätze, vergeben in chronologischer Reihenfolge der Signups.
  const FOUNDING_TOTAL = 10;
  const { count: totalWorkspaces } = await sb.from('workspaces').select('id', { count: 'exact', head: true });
  const foundingRemaining = Math.max(0, FOUNDING_TOTAL - (totalWorkspaces || 0));

  let sent = 0, skipped = 0;
  for (const w of (workspaces || [])) {
    const { data: owner } = await sb.from('users').select('email, vorname').eq('id', w.owner_user_id).maybeSingle();
    if (!owner || !owner.email) { skipped++; continue; }
    const html = Email.renderLiquid(tpl, {
      user_email: owner.email,
      user_first_name: owner.vorname || '',
      trial_end_date: new Date(w.trial_end).toLocaleDateString('de-DE'),
      checkout_url: 'https://app.prova-systems.de/pricing.html',
      founding_remaining: foundingRemaining > 0 ? String(foundingRemaining) : ''
    });
    const r = await Email.sendEmail({
      to: owner.email,
      subject: '⏱️ PROVA — Trial endet in 3 Tagen',
      html: html
    });
    if (r.sent) sent++; else skipped++;
  }

  return jsonResponse(event, 200, { processed: (workspaces || []).length, sent, skipped, trial_end: trialEnd });
}, { functionName: 'email-trial-ending-cron' });
