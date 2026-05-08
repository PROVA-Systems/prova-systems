/**
 * PROVA — fristen-reminder-cron.js (MEGA³⁰ W10b-I6)
 *
 * Scheduled-Function (Netlify @daily oder Make-Webhook):
 *   Sucht alle offenen Fristen, deren (datum_soll - heute) im erinnerung_tage_vor-Array liegt.
 *   Sendet Reminder-Mail via Resend (oder Make-Webhook), markiert erinnerung_letzte_versendet_am.
 *
 * Trigger: Netlify Scheduled-Function (`netlify.toml [[scheduled.functions]]`) ODER Make-Cron.
 *
 * Header-Auth: X-Cron-Secret muss FRISTEN_CRON_SECRET matchen (verhindert öffentlichen Trigger).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

function daysDiff(targetISO, today) {
  const t = new Date(targetISO + 'T00:00:00Z');
  const d = (t.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
  return Math.round(d);
}

async function sendReminderEmail(opts) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no-resend-key' };
  const from = process.env.RESEND_FROM || 'noreply@prova-systems.de';
  const to = opts.to;
  const days = opts.days_until;
  const subject = days === 1 ? 'PROVA: Frist ist morgen fällig' : 'PROVA: Frist in ' + days + ' Tagen';
  const body = '<p>Hallo,</p>' +
    '<p>folgende Frist ist fällig:</p>' +
    '<ul>' +
    '<li><strong>Typ:</strong> ' + opts.frist_typ + '</li>' +
    '<li><strong>Datum:</strong> ' + opts.datum_soll + ' (in ' + days + ' Tag' + (days === 1 ? '' : 'en') + ')</li>' +
    (opts.notiz ? '<li><strong>Notiz:</strong> ' + opts.notiz + '</li>' : '') +
    (opts.rechtsgrundlage ? '<li><strong>Rechtsgrundlage:</strong> ' + opts.rechtsgrundlage + '</li>' : '') +
    '</ul>' +
    '<p>—<br>PROVA Fristen-Reminder</p>';
  try {
    const fetch = global.fetch;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from, to: to, subject: subject, html: body })
    });
    return { sent: res.ok, status: res.status };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };

  // Cron-Secret-Auth
  const expected = process.env.FRISTEN_CRON_SECRET;
  const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
  if (!expected || provided !== expected) {
    return jsonResponse(event, 401, { error: 'Unauthorized — X-Cron-Secret missing or wrong' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const todayISO = today.toISOString().slice(0, 10);

  // Hole alle offenen Fristen mit datum_soll in den nächsten 30 Tagen
  const max = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: fristen, error } = await sb.from('fristen')
    .select('id,auftrag_id,frist_typ,datum_soll,erinnerung_tage_vor,erinnerung_letzte_versendet_am,notiz,rechtsgrundlage,created_by_user_id')
    .eq('status', 'offen').is('deleted_at', null)
    .gte('datum_soll', todayISO).lte('datum_soll', max);
  if (error) return jsonResponse(event, 500, { error: error.message });

  let processed = 0, sent = 0, skipped = 0;
  for (const f of (fristen || [])) {
    processed++;
    const days = daysDiff(f.datum_soll, today);
    const pattern = Array.isArray(f.erinnerung_tage_vor) ? f.erinnerung_tage_vor : [14, 7, 3, 1];
    if (pattern.indexOf(days) < 0) { skipped++; continue; }
    if (f.erinnerung_letzte_versendet_am === todayISO) { skipped++; continue; } // schon heute gesendet

    // User-Email holen aus public.users (Schema W12-I0)
    const { data: profile } = await sb.from('users').select('email').eq('id', f.created_by_user_id).maybeSingle();
    if (!profile || !profile.email) { skipped++; continue; }

    const r = await sendReminderEmail({
      to: profile.email,
      frist_typ: f.frist_typ,
      datum_soll: f.datum_soll,
      days_until: days,
      notiz: f.notiz,
      rechtsgrundlage: f.rechtsgrundlage
    });
    if (r.sent) {
      sent++;
      await sb.from('fristen').update({ erinnerung_letzte_versendet_am: todayISO }).eq('id', f.id);
    }
  }

  return jsonResponse(event, 200, { processed: processed, sent: sent, skipped: skipped, today: todayISO });
}, { functionName: 'fristen-reminder-cron' });

module.exports.__daysDiff = daysDiff;
