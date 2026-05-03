/**
 * PROVA — admin-impersonate.js
 * MEGA-MEGA N3 (03.05.2026) — Admin-Cockpit Bereich 4 (Quick-Action)
 *
 * Erzeugt einen Read-Only-Impersonation-Token fuer Marcel um einen Pilot-SV
 * Workspace anzusehen ohne Daten zu manipulieren.
 *
 * SICHERHEIT:
 *  - Whitelist-Email-Pflicht (admin-auth-guard)
 *  - 30 Min Token-TTL (kurz)
 *  - Eintrag in impersonation_log + audit_trail
 *  - Read-Only-Flag im Token-Payload (Frontend MUSS das respektieren)
 *
 * NICHT verwenden um Pilot-Daten zu modifizieren — nur Read.
 */
'use strict';

const crypto = require('crypto');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const TTL_SECONDS = 30 * 60;

function b64url(buf) {
  if (typeof buf === 'string') buf = Buffer.from(buf, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signImpersonationToken(payload, secret) {
  const head = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(head).digest();
  return head + '.' + b64url(sig);
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  const secret = process.env.AUTH_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    return jsonResponse(event, 500, { error: 'AUTH_HMAC_SECRET fehlt/zu kurz' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const targetWorkspaceId = body.workspace_id;
  const reason = String(body.reason || '').slice(0, 500);

  if (!targetWorkspaceId || typeof targetWorkspaceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(targetWorkspaceId)) {
    return jsonResponse(event, 400, { error: 'workspace_id (UUID) erforderlich' });
  }
  if (!reason || reason.length < 5) {
    return jsonResponse(event, 400, { error: 'reason (min 5 Zeichen) Pflicht — DSGVO-Doku' });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });
  }

  // Workspace existieren?
  const { data: ws } = await sb
    .from('workspaces')
    .select('id, name, billing_email, abo_status')
    .eq('id', targetWorkspaceId)
    .maybeSingle();

  if (!ws) {
    return jsonResponse(event, 404, { error: 'Workspace nicht gefunden' });
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    sub: context.adminEmail,
    impersonated_workspace_id: targetWorkspaceId,
    impersonated_workspace_name: ws.name,
    read_only: true,                // KRITISCH — Frontend MUSS respektieren
    iat: now,
    exp: now + TTL_SECONDS,
    purpose: 'admin_impersonation'
  };

  const token = signImpersonationToken(tokenPayload, secret);

  // Impersonation-Log (extra Tabelle, ggf. nicht vorhanden — best-effort)
  try {
    await sb.from('impersonation_log').insert({
      founder_user_id: null,           // Admin-Email statt UUID
      target_user_id: null,
      details: {
        admin_email: context.adminEmail,
        target_workspace_id: targetWorkspaceId,
        reason: reason,
        ttl_seconds: TTL_SECONDS,
        ts: new Date().toISOString()
      }
    });
  } catch (e) {
    // Tabelle ggf. mit anderem Schema — best-effort. Audit-Trail haben wir parallel.
    console.warn('[admin-impersonate] impersonation_log insert skipped:', e.message);
  }

  // Audit-Trail-Hauptlog (per requireAdmin schon vorhanden, hier zusaetzlich mit Detail)
  try {
    await sb.from('audit_trail').insert({
      workspace_id: targetWorkspaceId,
      user_id: null,
      typ: 'admin.impersonation_started',
      sv_email: context.adminEmail,
      details: JSON.stringify({
        target_workspace_id: targetWorkspaceId,
        target_workspace_name: ws.name,
        target_billing_email: ws.billing_email,
        reason: reason,
        ttl_seconds: TTL_SECONDS,
        admin_ip: (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown')
      })
    });
  } catch (e) {
    console.warn('[admin-impersonate] audit_trail insert failed:', e.message);
  }

  return jsonResponse(event, 200, {
    ok: true,
    token: token,
    workspace: { id: ws.id, name: ws.name, billing_email: ws.billing_email, abo_status: ws.abo_status },
    expires_at: new Date((now + TTL_SECONDS) * 1000).toISOString(),
    read_only: true,
    warning: 'Token ist read-only fuer 30 Min. JEDE Aktion ist im audit_trail dokumentiert.'
  });
}, { functionName: 'admin-impersonate', rateLimit: { max: 5, windowSec: 60 } }), { functionName: 'admin-impersonate' });
