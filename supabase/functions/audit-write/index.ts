/* ============================================================
   PROVA Edge Function — audit-write
   Sprint K-1.2.B8

   Generisches Audit-Endpoint für Frontend.
   Ersetzt Netlify Function netlify/functions/prova-audit.js.

   Body { action, entity_typ?, entity_id?, payload?, feature_event? }

   Flow:
     1. JWT-verify
     2. Rate-Limit check (max 100 events/min/user, in-memory)
     3. audit_trail INSERT
     4. optional: feature_events via RPC log_feature_event
     5. JSON ok
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { logAuditEvent, trackFeatureEvent } from '../_shared/audit.ts';
import type { AuditWriteRequest } from '../_shared/types.ts';

// In-Memory Rate-Limiter (per-Edge-Instance — ausreichend für Solo-User)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;          // events
const RATE_WINDOW_MS = 60_000;   // 1 min

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

const ALLOWED_ACTIONS = new Set([
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'login_failed',
    'export', 'import',
    'pdf_generate', 'pdf_view', 'pdf_send',
    'ki_request', 'ki_response',
    'workspace_invite', 'workspace_remove_member',
    'data_export_dsgvo', 'data_delete_dsgvo'
]);

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const ctx = await verifyJwt(req);
    const workspaceId = await getWorkspaceId(req, ctx);
    const sb = createSupabaseClient(req);

    if (!checkRateLimit(ctx.user.id)) {
        return errorResponse('Rate limit (100 events/min)', 429);
    }

    const body = await req.json() as AuditWriteRequest;
    if (!body.action) throw new HttpError('action required', 400);
    if (!ALLOWED_ACTIONS.has(body.action)) {
        throw new HttpError(`action "${body.action}" not in audit_action ENUM`, 400);
    }

    // 1. audit_trail
    const auditResult = await logAuditEvent(sb, {
        action: body.action as Parameters<typeof logAuditEvent>[1]['action'],
        entityTyp: body.entity_typ ?? null,
        entityId: body.entity_id ?? null,
        payload: body.payload ?? {},
        workspaceId,
        userId: ctx.user.id
    }, req);

    if (!auditResult.ok) {
        return errorResponse(`audit_trail insert: ${auditResult.error}`, 500);
    }

    // 2. optional feature_event
    if (body.feature_event) {
        await trackFeatureEvent(
            sb,
            workspaceId,
            body.feature_event.typ as Parameters<typeof trackFeatureEvent>[2],
            body.feature_event.feature_key,
            body.feature_event.value
        );
    }

    return jsonResponse({ ok: true });
};

Deno.serve(withErrorHandling(handler));
