/* PROVA Edge — admin-cache-clear (Welle 7)
   Edge-Functions sind stateless — kein in-memory Cache zu leeren.
   Stub-Endpoint für Frontend-Kompatibilität. Loggt Aktion in audit_trail.
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

Deno.serve(adminHandler({ functionName: 'admin-cache-clear' }, async (req, { adminEmail, sb }) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!email) return jsonResponse({ error: 'email fehlt' }, 400);

  await sb.from('audit_trail').insert({
    workspace_id: null, user_id: null, action: 'update', entity_typ: 'cache_clear',
    payload: { admin_email: adminEmail, target_email: email, hint: 'edge-stateless-no-op', ts: new Date().toISOString() }
  });
  return jsonResponse({ ok: true, cleared: email, hint: 'Edge ist stateless — Cache-Clear ist No-Op' });
}));
