/* ============================================================
   PROVA Edge — audit-log-v1 (MEGA⁸⁴/⁸⁵ Pass 2c Block G)

   Konsolidiert 5 alte Audit-Edges in einen Task-Router:
     audit-write, audit-log, audit-trail-write, audit-source-log,
     prova-audit (Netlify Function)

   Task-Router (Body.task):
     ki_request    — KI-Call Logging (Modell, Tokens, Pseudo-Check)
     login         — Login/Logout/Failed-Login
     gdpr_export   — DSGVO Art.20 Datenexport-Event
     gdpr_delete   — DSGVO Art.17 Lösch-Event
     admin_action  — Admin-Endpoint-Aufruf (mit Reason-Pflicht)
     generic       — Generic create/read/update/delete (Fallback)

   Integrity-Hash-Kette:
     prev_hash      = integrity_hash des letzten audit_trail-Eintrags
                      (per workspace_id, ORDER BY created_at DESC)
     integrity_hash = sha256(prev_hash || canonicalJson(payload))

   Damit ist die Audit-Trail-Reihe tamper-evident: ein nachträglich
   geänderter Eintrag bricht die Kette für alle nachfolgenden.

   Alte Edges bleiben funktional (NICHT löschen), siehe
   docs/MEGA84-AUDIT-EDGES-DEPRECATED.md für Migration-Pfad.
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

// In-Memory Rate-Limiter (per-Edge-Instance)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 200;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

// audit_action ENUM (Stand 2026-05-17 — 18 Werte)
const ALLOWED_ACTIONS = new Set([
  'create', 'read', 'update', 'delete',
  'login', 'logout', 'login_failed',
  'export', 'import',
  'pdf_generate', 'pdf_view', 'pdf_send',
  'ki_request', 'ki_response',
  'workspace_invite', 'workspace_remove_member',
  'data_export_dsgvo', 'data_delete_dsgvo'
]);

// Canonical-JSON für Hash-Stabilität (Keys sortiert, kein Whitespace)
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])).join(',') + '}';
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface TaskInput {
  task?: 'ki_request' | 'login' | 'gdpr_export' | 'gdpr_delete' | 'admin_action' | 'generic';
  action?: string;
  entity_typ?: string | null;
  entity_id?: string | null;
  payload?: Record<string, unknown>;
  source?: string | null;
  ki_model?: string | null;
  ki_confidence?: number | null;
  eu_ai_act_disclosed?: boolean | null;
  kategorie?: string | null;
  reason?: string | null;
}

// Mapped task → audit_action ENUM-Wert (default für jede task-Variante)
function resolveAction(task: string | undefined, fallback: string | undefined): string {
  switch (task) {
    case 'ki_request':   return fallback ?? 'ki_request';
    case 'login':        return fallback ?? 'login';
    case 'gdpr_export':  return 'data_export_dsgvo';
    case 'gdpr_delete':  return 'data_delete_dsgvo';
    case 'admin_action': return fallback ?? 'read';
    case 'generic':      return fallback ?? 'read';
    default:             return fallback ?? 'read';
  }
}

function defaultKategorie(task: string | undefined): string | null {
  switch (task) {
    case 'ki_request':   return 'KI';
    case 'login':        return 'AUTH';
    case 'gdpr_export':
    case 'gdpr_delete':  return 'DSGVO';
    case 'admin_action': return 'ADMIN';
    default:             return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await verifyJwt(req);
  const workspaceId = await getWorkspaceId(req, ctx);
  const sb = createSupabaseClient(req);

  if (!checkRateLimit(ctx.user.id)) {
    return errorResponse('Rate limit (200 events/min)', 429);
  }

  let body: TaskInput;
  try { body = await req.json() as TaskInput; }
  catch { throw new HttpError('Invalid JSON', 400); }

  const task = body.task ?? 'generic';
  const action = resolveAction(task, body.action);
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new HttpError(`action "${action}" not in audit_action ENUM`, 400);
  }

  // Admin-Tasks: reason Pflicht (min 5 Zeichen, wie admin-impersonate)
  if (task === 'admin_action') {
    const r = String(body.reason ?? '').trim();
    if (r.length < 5) throw new HttpError('reason min 5 chars for admin_action', 400);
    body.payload = { ...(body.payload ?? {}), admin_reason: r };
  }

  // ── Integrity-Hash-Kette ──
  let prev_hash: string | null = null;
  try {
    const { data: lastRow } = await sb
      .from('audit_trail')
      .select('integrity_hash')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    prev_hash = lastRow?.integrity_hash ?? null;
  } catch (_) { /* erste Zeile pro workspace — prev_hash bleibt null */ }

  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  const hashSeed = (prev_hash ?? '') + '|' + canonicalJson({
    workspace_id: workspaceId,
    user_id: ctx.user.id,
    action,
    entity_typ: body.entity_typ ?? null,
    entity_id: body.entity_id ?? null,
    payload: body.payload ?? {},
    source: body.source ?? null,
    task
  });
  const integrity_hash = await sha256Hex(hashSeed);

  const row: Record<string, unknown> = {
    workspace_id: workspaceId,
    user_id: ctx.user.id,
    action,
    entity_typ: body.entity_typ ?? null,
    entity_id: body.entity_id ?? null,
    payload: body.payload ?? {},
    ip_address: ipAddress,
    user_agent: userAgent,
    request_id: requestId,
    integrity_hash,
    prev_hash,
    kategorie: body.kategorie ?? defaultKategorie(task)
  };
  if (body.source) row.source = body.source;
  if (body.ki_model) row.ki_model = body.ki_model;
  if (typeof body.ki_confidence === 'number') row.ki_confidence = body.ki_confidence;
  if (typeof body.eu_ai_act_disclosed === 'boolean') row.eu_ai_act_disclosed = body.eu_ai_act_disclosed;

  const { data: inserted, error } = await sb
    .from('audit_trail')
    .insert(row)
    .select('id, created_at, integrity_hash, prev_hash')
    .single();

  if (error) return errorResponse(`audit_trail insert: ${error.message}`, 500);

  return jsonResponse({
    ok: true,
    audit_id: inserted.id,
    created_at: inserted.created_at,
    integrity_hash: inserted.integrity_hash,
    prev_hash: inserted.prev_hash,
    chain_intact: true,
    task
  });
};

Deno.serve(withErrorHandling(handler));
