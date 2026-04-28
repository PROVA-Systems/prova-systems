/* ============================================================
   PROVA Edge Functions — Audit-Logging
   Sprint K-1.2.B1
   ============================================================ */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

export type AuditAction =
    | 'create' | 'read' | 'update' | 'delete'
    | 'login' | 'logout' | 'login_failed'
    | 'export' | 'import'
    | 'pdf_generate' | 'pdf_view' | 'pdf_send'
    | 'ki_request' | 'ki_response'
    | 'workspace_invite' | 'workspace_remove_member'
    | 'data_export_dsgvo' | 'data_delete_dsgvo';

export interface AuditEvent {
    action: AuditAction;
    entityTyp?: string | null;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    workspaceId?: string | null;
    userId?: string | null;
}

/**
 * Schreibt Audit-Event in audit_trail.
 *
 * @param client — Supabase-Client (User oder Service)
 * @param event  — Action + Entity + Payload
 * @param req    — optional: für IP/User-Agent
 */
export async function logAuditEvent(
    client: SupabaseClient,
    event: AuditEvent,
    req?: Request
): Promise<{ ok: boolean; error?: string }> {
    const ipAddress = req?.headers.get('x-forwarded-for') ?? req?.headers.get('cf-connecting-ip') ?? null;
    const userAgent = req?.headers.get('user-agent') ?? null;
    const requestId = req?.headers.get('x-request-id') ?? crypto.randomUUID();

    const { error } = await client.from('audit_trail').insert({
        workspace_id: event.workspaceId ?? null,
        user_id: event.userId ?? null,
        action: event.action,
        entity_typ: event.entityTyp ?? null,
        entity_id: event.entityId ?? null,
        payload: event.payload ?? {},
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
    });

    if (error) {
        console.error('[audit] insert failed:', error.message);
        return { ok: false, error: error.message };
    }
    return { ok: true };
}

/**
 * Feature-Event-Tracking (für Cockpit-Heatmap + Funnel).
 * Nutzt RPC `log_feature_event` (SECURITY DEFINER, bypasst RLS).
 */
export type FeatureEventTyp =
    | 'page_view' | 'click' | 'form_submit' | 'feature_used'
    | 'document_generated' | 'pdf_downloaded' | 'email_sent'
    | 'audio_recorded' | 'photo_uploaded' | 'search_query'
    | 'ki_request' | 'export_data' | 'login' | 'logout' | 'sonstiges';

export async function trackFeatureEvent(
    client: SupabaseClient,
    workspaceId: string,
    typ: FeatureEventTyp,
    featureKey: string,
    value?: Record<string, unknown> | null
): Promise<void> {
    const { error } = await client.rpc('log_feature_event', {
        p_workspace_id: workspaceId,
        p_typ: typ,
        p_feature_key: featureKey,
        p_value: value ?? null
    });
    if (error) console.warn('[feature-event] RPC failed:', error.message);
}
