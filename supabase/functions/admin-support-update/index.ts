/* PROVA Edge — admin-support-update (Welle 7) */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const VALID_STATUSES = ['Offen', 'In Bearbeitung', 'Gelöst', 'Geschlossen'];

Deno.serve(adminHandler({ functionName: 'admin-support-update' }, async (req, { sb }) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  if (!body?.ticket_id) return jsonResponse({ error: 'ticket_id pflicht' }, 400);
  if (!VALID_STATUSES.includes(body?.status)) return jsonResponse({ error: 'status ungültig', valid: VALID_STATUSES }, 400);
  const { data, error } = await sb.from('support_tickets')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.ticket_id).select().maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: 'Ticket nicht gefunden' }, 404);
  return jsonResponse({ ticket: data });
}));
