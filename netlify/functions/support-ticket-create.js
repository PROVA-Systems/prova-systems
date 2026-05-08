/**
 * PROVA — support-ticket-create.js (MEGA⁴¹ P5)
 *
 * POST { titel, beschreibung, kategorie?, faq_match_id?, faq_match_score?, ai_response_attempted? }
 * → 200 { ticket_id, status }
 *
 * User stellt Ticket. Bei FAQ-Match-Score >= 0.5 wird match_id mitgespeichert.
 * Insert nutzt Service-Role (RLS-Insert blockiert für Frontend).
 *
 * Auth: requireAuth + Workspace-Resolve.
 * RateLimit: 10/h (Anti-Spam).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const VALID_KATEGORIEN = [
  'gutachten', 'rechnungen', 'diktat', 'skizzen', 'bescheinigungen',
  'termine', 'ki', 'vorlagen', 'import', 'account', 'datenschutz', 'sonstiges'
];
const VALID_TYP = 'frage';  // M²⁸ support_tickets Schema-typ-ENUM (vermutet)
const VALID_PRIO = 'normal';

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 10, 3600, { event, functionName: 'support-ticket-create' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht (10/Stunde)' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.titel || typeof body.titel !== 'string' || body.titel.trim().length < 3) {
    return jsonResponse(event, 400, { error: 'titel pflicht (>=3 Zeichen)' });
  }
  if (!body.beschreibung || typeof body.beschreibung !== 'string' || body.beschreibung.trim().length < 10) {
    return jsonResponse(event, 400, { error: 'beschreibung pflicht (>=10 Zeichen)' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    const insertRow = {
      workspace_id: ms.workspace_id,
      user_id: profile.id,
      user_email: context.userEmail,
      titel: body.titel.slice(0, 500),
      beschreibung: body.beschreibung.slice(0, 10000),
      typ: VALID_TYP,
      prioritaet: VALID_PRIO,
      status: 'open',
      kategorie: VALID_KATEGORIEN.indexOf(body.kategorie) >= 0 ? body.kategorie : 'sonstiges',
      faq_match_id: body.faq_match_id || null,
      faq_match_score: typeof body.faq_match_score === 'number' ? body.faq_match_score : null,
      ai_response_attempted: !!body.ai_response_attempted,
      ai_response_text: typeof body.ai_response_text === 'string' ? body.ai_response_text.slice(0, 5000) : null,
      page_url: body.page_url || null,
      user_agent: (event.headers && event.headers['user-agent']) || null
    };

    const { data: inserted, error: insErr } = await sb.from('support_tickets').insert(insertRow).select('id, status').maybeSingle();
    if (insErr) return jsonResponse(event, 500, { error: insErr.message });

    return jsonResponse(event, 200, {
      ticket_id: inserted.id,
      status: inserted.status
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'support-ticket-create' });

module.exports.__VALID_KATEGORIEN = VALID_KATEGORIEN;
