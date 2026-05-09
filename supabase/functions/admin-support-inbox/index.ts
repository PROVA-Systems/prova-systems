/* PROVA Edge — admin-support-inbox (Welle 7) */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

function parseSince(s: string): string {
  const m = s.match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 7 * 86400000).toISOString();
  const ms = parseInt(m[1]) * (m[2] === 'h' ? 3600000 : 86400000);
  return new Date(Date.now() - ms).toISOString();
}

Deno.serve(adminHandler({ functionName: 'admin-support-inbox' }, async (req, { sb }) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '7d';
  const since = parseSince(range);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '10')));

  let tickets: any[] | null = null;
  let source = 'support_tickets';
  try {
    const { data, error } = await sb.from('support_tickets')
      .select('id, status, betreff, sv_email, created_at, last_reply_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false }).limit(limit);
    if (!error && Array.isArray(data)) tickets = data;
  } catch (_) { /* table may not exist */ }

  if (!tickets) tickets = [];
  const open = tickets.filter(t => t.status === 'open' || t.status === 'Offen' || !t.status).length;
  const closed = tickets.filter(t => t.status === 'closed' || t.status === 'Geschlossen' || t.status === 'Gelöst').length;

  return jsonResponse({
    range, since, open_count: open, closed_count: closed, total: tickets.length, source,
    recent: tickets.slice(0, 5).map(t => ({ id: t.id, betreff: t.betreff, status: t.status ?? 'open', created_at: t.created_at }))
  });
}));
