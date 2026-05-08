/**
 * netlify/functions/dsgvo-loeschen-antrag.js — MEGA³⁵ C5
 *
 * DSGVO Art. 17 — Recht auf Löschung (Antrag-Workflow).
 * Existing dsgvo-loeschen.js ist Airtable-Legacy mit Hard-Delete.
 * Dieses Lambda nutzt Supabase + 4 Pflicht-Bedingungen:
 *
 *   1. requireAuth (Identity-Check)
 *   2. 30-Tage-Soft-Delete via users.dsgvo_loeschen_geplant_am
 *   3. Audit-Trail-Eintrag (action='data_delete_dsgvo')
 *   4. Bestätigungs-Email an User via Resend
 *
 * POST /.netlify/functions/dsgvo-loeschen-antrag
 * Body: { confirm: true }
 * Returns: { antrag_id, scheduled_for, audit_trail_id }
 */
'use strict';

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

const SOFT_DELETE_DAYS = 30;

async function sendConfirmEmail(toEmail, vorname, scheduledFor) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no-resend-key' };
  const html = ''
    + '<p>Hallo ' + (vorname || 'Sachverständiger') + ',</p>'
    + '<p>Wir haben Ihren Antrag auf Löschung Ihrer Daten gemäß DSGVO Art. 17 erhalten.</p>'
    + '<p><strong>Geplante Löschung:</strong> ' + scheduledFor + ' (in ' + SOFT_DELETE_DAYS + ' Tagen)</p>'
    + '<p>Bis dahin sind Ihre Daten gesperrt — Sie können sich noch einloggen, aber kein neuer Auftrag wird erstellt. '
    + 'Sollten Sie den Antrag widerrufen wollen, antworten Sie auf diese Email innerhalb von 30 Tagen.</p>'
    + '<p>Nach Ablauf werden alle personenbezogenen Daten unwiderruflich gelöscht. '
    + 'Gutachten-PDFs werden gemäß § 11 IHK-SVO 10 Jahre archiviert (gesetzliche Aufbewahrungspflicht), '
    + 'aber pseudonymisiert (kein Personenbezug mehr).</p>'
    + '<p>PROVA Systems · marcel.schreiber891@gmail.com</p>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        from: 'PROVA Systems <datenschutz@prova-systems.de>',
        to: [toEmail],
        subject: 'DSGVO-Löschungs-Antrag bestätigt — Bearbeitung in ' + SOFT_DELETE_DAYS + ' Tagen',
        html: html
      })
    });
    if (!res.ok) return { ok: false, reason: 'http-' + res.status };
    return { ok: true };
  } catch (e) { return { ok: false, reason: e.message }; }
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 5, 3600, { event: event, functionName: 'dsgvo-loeschen-antrag' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit (max 5 Anträge/Stunde) erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (body.confirm !== true) {
    return jsonResponse(event, 400, { error: 'confirm:true pflicht — DSGVO Art. 17 erfordert ausdrückliche Bestätigung' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // 1. User-Identity-Check via JWT-Email → users-Row holen
  const { data: user, error: uErr } = await sb.from('users')
    .select('id, email, vorname, dsgvo_loeschen_geplant_am, workspace_memberships!inner(workspace_id)')
    .eq('email', context.userEmail)
    .maybeSingle();
  if (uErr || !user) {
    return jsonResponse(event, 404, { error: 'User nicht gefunden: ' + (uErr && uErr.message || 'no-row') });
  }

  if (user.dsgvo_loeschen_geplant_am) {
    return jsonResponse(event, 409, {
      error: 'Bereits geplant',
      scheduled_for: user.dsgvo_loeschen_geplant_am
    });
  }

  // 2. Soft-Delete: dsgvo_loeschen_geplant_am = NOW + 30 Tage
  const scheduledFor = new Date(Date.now() + SOFT_DELETE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: updErr } = await sb.from('users')
    .update({ dsgvo_loeschen_geplant_am: scheduledFor })
    .eq('id', user.id);
  if (updErr) return jsonResponse(event, 500, { error: 'Soft-Delete fehlgeschlagen: ' + updErr.message });

  const workspaceId = user.workspace_memberships && user.workspace_memberships[0] && user.workspace_memberships[0].workspace_id;

  // 3. Audit-Trail-Insert
  const { data: audit, error: auditErr } = await sb.from('audit_trail').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    action: 'data_delete_dsgvo',
    entity_typ: 'user',
    entity_id: user.id,
    payload: {
      requested_at: new Date().toISOString(),
      scheduled_for: scheduledFor,
      soft_delete_days: SOFT_DELETE_DAYS,
      gdpr_article: 'Art. 17',
      ip_country: (event.headers && (event.headers['x-country'] || event.headers['cf-ipcountry'])) || null
    }
  }).select('id').maybeSingle();

  // 4. Bestätigungs-Email via Resend
  const mailResult = await sendConfirmEmail(user.email, user.vorname, scheduledFor);

  return jsonResponse(event, 201, {
    antrag_id: audit && audit.id,
    user_id: user.id,
    scheduled_for: scheduledFor,
    soft_delete_days: SOFT_DELETE_DAYS,
    audit_trail_logged: !auditErr,
    mail_sent: mailResult.ok,
    mail_error: mailResult.ok ? null : mailResult.reason,
    next_steps: 'Sie können den Antrag binnen ' + SOFT_DELETE_DAYS + ' Tagen widerrufen (Email an datenschutz@prova-systems.de).'
  });
});

module.exports.__SOFT_DELETE_DAYS = SOFT_DELETE_DAYS;
module.exports.__sendConfirmEmail = sendConfirmEmail;
