/**
 * PROVA — admin-support-inbox.js (MEGA²⁸ V3.2-W8-I7)
 *
 * Support-Inbox für Admin-Cockpit Section 7.
 * Aggregiert Support-Tickets aus dem support_tickets-Tabelle (oder make-proxy 'sup'-Webhook-Logs)
 * und liefert eine zusammenfassende Übersicht für Marcel.
 *
 * Datenquelle (defensive Fallback-Kette):
 *  1. Supabase support_tickets-Table falls existiert
 *  2. Supabase audit_trail mit function_name='make-proxy?key=sup' Filter (Fallback)
 *  3. Sample-Data falls Daten noch nicht akkumuliert (Pre-Pilot)
 *
 * Auth: requireAdmin (super_admin only)
 * GET /.netlify/functions/admin-support-inbox?range=7d
 *   → 200 { open_count, closed_count, recent: [...], range, source }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

function parseSince(s) {
  const m = String(s || '7d').match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 7 * 86400000).toISOString();
  const n = parseInt(m[1]);
  const ms = n * (m[2] === 'h' ? 3600000 : 86400000);
  return new Date(Date.now() - ms).toISOString();
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const range = (event.queryStringParameters && event.queryStringParameters.range) || '7d';
  const sinceIso = parseSince(range);
  const limit = Math.min(50, Math.max(1, parseInt((event.queryStringParameters && event.queryStringParameters.limit) || '10', 10)));

  // 1. Versuch: support_tickets-Tabelle (falls in Schema)
  let tickets = null;
  let source = 'support_tickets';
  try {
    const { data, error } = await sb.from('support_tickets')
      .select('id, status, betreff, sv_email, created_at, last_reply_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && Array.isArray(data)) tickets = data;
  } catch (_) { /* Tabelle vielleicht nicht da */ }

  // 2. Fallback: audit_trail mit Support-Function-Name
  if (!tickets) {
    source = 'audit_trail-fallback';
    try {
      const { data: audit } = await sb.from('audit_trail')
        .select('id, function_name, payload, created_at')
        .gte('created_at', sinceIso)
        .ilike('function_name', '%support%')
        .order('created_at', { ascending: false })
        .limit(limit);
      tickets = (audit || []).map(row => ({
        id: row.id,
        status: 'open',
        betreff: (row.payload && row.payload.betreff) || '(kein Betreff)',
        sv_email: '(pseudonymisiert)',
        created_at: row.created_at,
        last_reply_at: null
      }));
    } catch (_) { tickets = []; }
  }

  // 3. Pre-Pilot Sample falls nichts gefunden
  if (!tickets || tickets.length === 0) {
    source = 'no-data-pre-pilot';
    tickets = [];
  }

  const open = tickets.filter(t => t.status === 'open' || !t.status).length;
  const closed = tickets.filter(t => t.status === 'closed').length;

  return jsonResponse(event, 200, {
    range,
    since: sinceIso,
    open_count: open,
    closed_count: closed,
    total: tickets.length,
    source,
    recent: tickets.slice(0, 5).map(t => ({
      betreff: t.betreff,
      status: t.status || 'open',
      created_at: t.created_at
    }))
  });
}), { functionName: 'admin-support-inbox' });
