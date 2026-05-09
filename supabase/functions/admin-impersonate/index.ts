/* PROVA Edge — admin-impersonate (Welle 7)
   Erzeugt Read-Only Impersonation-Token (HMAC) für Admin-Zugriff auf Workspace.
   30 Min TTL. Audit-Trail + DSGVO-Email-Notify (best-effort via Resend).
   Rate-Limit: 5/min in admin-auth (default).
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const TTL_SECONDS = 30 * 60;

function b64url(bytes: Uint8Array | string): string {
  let s = ''; if (typeof bytes === 'string') s = bytes; else for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const head = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(head)));
  return head + '.' + b64url(sigBytes);
}

async function notifyImpersonation(opts: {
  to: string; adminEmail: string; workspaceName: string; reason: string; ttlMinutes: number; adminIp: string; userAgent: string;
}): Promise<{ ok: boolean; skipped?: string }> {
  if (!opts.to || !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(opts.to)) return { ok: false, skipped: 'invalid_to' };
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, skipped: 'no_resend_key' };
  const text = [
    'Hallo,', '',
    'ein PROVA-Administrator (' + opts.adminEmail + ') hat sich gerade in Ihrem Workspace',
    '"' + opts.workspaceName + '" angemeldet (Read-Only-Modus, ' + opts.ttlMinutes + ' Min).',
    '', 'Grund: ' + opts.reason,
    'IP-Adresse: ' + opts.adminIp, 'User-Agent: ' + opts.userAgent,
    'Zeitpunkt: ' + new Date().toISOString(), '',
    'Der Admin kann KEINE Daten ändern (Read-Only-Token). Jede Aktion ist im Audit-Trail',
    'dokumentiert. Bei Fragen: support@prova-systems.de.', '',
    'PROVA Systems — DSGVO-Transparenz (§ 32 BDSG · Art. 5 DSGVO)'
  ].join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        from: 'PROVA Admin <no-reply@prova-systems.de>',
        to: [opts.to],
        subject: '[PROVA] Admin-Login auf Ihrem Workspace',
        text
      })
    });
    return { ok: res.ok, skipped: res.ok ? undefined : 'http-' + res.status };
  } catch (e) {
    return { ok: false, skipped: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(adminHandler({ functionName: 'admin-impersonate' }, async (req, { adminEmail, sb }) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const secret = Deno.env.get('PROVA_AUTH_HMAC_SECRET') ?? Deno.env.get('AUTH_HMAC_SECRET') ?? '';
  if (!secret || secret.length < 32) return jsonResponse({ error: 'AUTH_HMAC_SECRET fehlt/zu kurz' }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const targetWs = body?.workspace_id;
  const reason = String(body?.reason ?? '').slice(0, 500);
  if (!targetWs || !/^[0-9a-f-]{36}$/i.test(String(targetWs))) {
    return jsonResponse({ error: 'workspace_id (UUID) erforderlich' }, 400);
  }
  if (!reason || reason.length < 5) return jsonResponse({ error: 'reason (min 5 Zeichen) Pflicht — DSGVO-Doku' }, 400);

  const { data: ws } = await sb.from('workspaces')
    .select('id, name, billing_email, abo_status').eq('id', targetWs).maybeSingle();
  if (!ws) return jsonResponse({ error: 'Workspace nicht gefunden' }, 404);

  // Rate-Limit: max 3/day pro Admin
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await sb.from('audit_trail')
    .select('id', { count: 'exact', head: true })
    .eq('entity_typ', 'admin_impersonation')
    .gte('created_at', since)
    .contains('payload', { admin_email: adminEmail });
  if ((count ?? 0) >= 3) {
    return jsonResponse({ error: 'Rate-Limit: max 3 Impersonations/24h pro Admin' }, 429);
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    sub: adminEmail,
    impersonated_workspace_id: targetWs,
    impersonated_workspace_name: ws.name,
    read_only: true,
    iat: now, exp: now + TTL_SECONDS,
    purpose: 'admin_impersonation'
  };
  const token = await signToken(tokenPayload, secret);

  const adminIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const userAgent = (req.headers.get('user-agent') ?? 'unknown').slice(0, 500);

  await sb.from('audit_trail').insert({
    workspace_id: targetWs, user_id: null,
    action: 'login', entity_typ: 'admin_impersonation', entity_id: targetWs,
    payload: {
      admin_email: adminEmail,
      target_workspace_id: targetWs,
      target_workspace_name: ws.name,
      target_billing_email: ws.billing_email,
      reason, ttl_seconds: TTL_SECONDS,
      admin_ip: adminIp, user_agent: userAgent
    }
  });

  if (Deno.env.get('PROVA_IMPERSONATION_NOTIFY') === 'on' && ws.billing_email) {
    notifyImpersonation({
      to: ws.billing_email,
      adminEmail, workspaceName: ws.name, reason,
      ttlMinutes: Math.round(TTL_SECONDS / 60),
      adminIp, userAgent
    }).catch((e) => console.warn('[admin-impersonate] notify failed:', e));
  }

  return jsonResponse({
    ok: true, token,
    workspace: { id: ws.id, name: ws.name, billing_email: ws.billing_email, abo_status: ws.abo_status },
    expires_at: new Date((now + TTL_SECONDS) * 1000).toISOString(),
    read_only: true,
    warning: 'Token ist read-only für 30 Min. JEDE Aktion ist im audit_trail dokumentiert.'
  });
}));
