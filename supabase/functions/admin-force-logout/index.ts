/* PROVA Edge — admin-force-logout (Welle 7) */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

Deno.serve(adminHandler({ functionName: 'admin-force-logout' }, async (req, { adminEmail, sb }) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const userId = body?.user_id;
  const userEmail = body?.user_email;
  const reason = String(body?.reason ?? '').slice(0, 500);
  if (!userId && !userEmail) return jsonResponse({ error: 'user_id ODER user_email erforderlich' }, 400);
  if (!reason || reason.length < 5) return jsonResponse({ error: 'reason (min 5 Zeichen) Pflicht' }, 400);

  let resolvedId = userId;
  if (!resolvedId && userEmail) {
    const { data: user } = await sb.from('users').select('id, email').eq('email', String(userEmail).toLowerCase()).maybeSingle();
    if (!user) return jsonResponse({ error: 'User nicht gefunden (email)' }, 404);
    resolvedId = user.id;
  }

  let signOutOk = false; let signOutErr: string | null = null;
  try {
    const { error } = await sb.auth.admin.signOut(resolvedId, 'global');
    if (error) signOutErr = error.message; else signOutOk = true;
  } catch (e) { signOutErr = e instanceof Error ? e.message : String(e); }

  await sb.from('audit_trail').insert({
    workspace_id: null, user_id: resolvedId, action: 'logout', entity_typ: 'admin_force_logout', entity_id: resolvedId,
    payload: { admin_email: adminEmail, target_email: userEmail ?? null, reason, success: signOutOk, error: signOutErr }
  });

  if (!signOutOk) return jsonResponse({ error: 'Force-Logout fehlgeschlagen: ' + signOutErr }, 502);
  return jsonResponse({ ok: true, user_id: resolvedId, message: 'Alle Sessions beendet' });
}));
