/* ============================================================
   PROVA Edge Function — lifecycle-trigger
   Sprint K-1.2.B7

   Ersetzt Make-Scenarios L3, L8, L10 (User-Lifecycle-Pipeline).

   Triggers:
     trigger=trial_start            (von stripe-webhook)
     trigger=trial_ending_in_3_days (cron-getriggert)
     trigger=trial_ended            (cron)
     trigger=abo_renewed            (stripe-webhook)
     trigger=abo_canceled           (stripe-webhook)
     trigger=cron_daily             (pg_cron daily 09:00 UTC sweep)

   Aktionen pro Trigger:
     - Email senden (über send-email)
     - onboarding_progress.welcome_*_gesendet_at setzen (Idempotenz)
     - audit_log

   Auth: System-Token (x-prova-system-token) ODER User-JWT mit Founder-Flag.
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { logAuditEvent } from '../_shared/audit.ts';
import type { LifecycleRequest } from '../_shared/types.ts';

const SYSTEM_TOKEN = Deno.env.get('PROVA_SYSTEM_TOKEN') ?? '';
const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/send-email`;

async function sendEmail(workspaceId: string, to: string, subject: string, html: string, zweck: string): Promise<void> {
    const resp = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-prova-system-token': SYSTEM_TOKEN
        },
        body: JSON.stringify({ to, subject, html, workspace_id: workspaceId, zweck })
    });
    if (!resp.ok) console.error(`[lifecycle] send-email ${resp.status}`);
}

interface WorkspaceWithOwner {
    id: string;
    name: string;
    abo_status: string;
    abo_trial_endet_am: string | null;
    abo_aktiv_seit: string | null;
}

/**
 * Holt Owner-Email + onboarding_progress für einen Workspace.
 */
async function getWorkspaceContext(sb: ReturnType<typeof createServiceClient>, workspaceId: string) {
    const { data: ws } = await sb
        .from('workspaces')
        .select('id, name, abo_status, abo_trial_endet_am, abo_aktiv_seit')
        .eq('id', workspaceId)
        .single();
    if (!ws) return null;

    const { data: owner } = await sb
        .from('workspace_memberships')
        .select('user_id, users!inner(email, name)')
        .eq('workspace_id', workspaceId)
        .eq('rolle', 'owner')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

    const ownerEmail = (owner as any)?.users?.email ?? null;  // eslint-disable-line @typescript-eslint/no-explicit-any
    const ownerName = (owner as any)?.users?.name ?? null;
    const userId = owner?.user_id ?? null;

    if (!userId) return { ws, userId: null, ownerEmail: null, ownerName: null, progress: null };

    const { data: progress } = await sb
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    return { ws, userId, ownerEmail, ownerName, progress };
}

async function handleTrialStart(sb: ReturnType<typeof createServiceClient>, workspaceId: string) {
    const c = await getWorkspaceContext(sb, workspaceId);
    if (!c?.ownerEmail) return { skipped: 'no_owner_email' };
    if (c.progress?.welcome_email_gesendet_at) return { skipped: 'already_sent' };

    const html = `<p>Hallo ${c.ownerName ?? 'Sachverständiger'},</p>
<p>willkommen bei PROVA Systems. Deine 14-Tage-Testphase läuft bis ${c.ws.abo_trial_endet_am?.slice(0,10) ?? 'Ende Trial'}.</p>
<p>Erste Schritte: <a href="https://prova-systems.de/onboarding.html">Onboarding</a></p>`;

    await sendEmail(workspaceId, c.ownerEmail, 'Willkommen bei PROVA Systems', html, 'lifecycle_welcome');
    await sb.from('onboarding_progress').update({ welcome_email_gesendet_at: new Date().toISOString() })
            .eq('user_id', c.userId);
    return { sent: true };
}

async function handleTrialEnding(sb: ReturnType<typeof createServiceClient>, workspaceId: string) {
    const c = await getWorkspaceContext(sb, workspaceId);
    if (!c?.ownerEmail) return { skipped: 'no_owner_email' };
    if (c.progress?.trial_endet_warnung_at) return { skipped: 'already_sent' };

    const html = `<p>Hallo ${c.ownerName ?? 'Sachverständiger'},</p>
<p>Deine PROVA-Trial endet in 3 Tagen (am ${c.ws.abo_trial_endet_am?.slice(0,10)}).</p>
<p>Tier wählen: <a href="https://prova-systems.de/upgrade.html">Solo (149 €/Mo) oder Team (279 €/Mo)</a></p>`;

    await sendEmail(workspaceId, c.ownerEmail, 'PROVA-Trial endet bald', html, 'lifecycle_trial_ending');
    await sb.from('onboarding_progress').update({ trial_endet_warnung_at: new Date().toISOString() })
            .eq('user_id', c.userId);
    return { sent: true };
}

async function cronDailySweep(sb: ReturnType<typeof createServiceClient>) {
    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 86400000);

    // 1. Trial endet in 3 Tagen
    const { data: ending } = await sb
        .from('workspaces')
        .select('id')
        .eq('abo_status', 'trial')
        .gte('abo_trial_endet_am', now.toISOString())
        .lte('abo_trial_endet_am', in3days.toISOString());

    let sent = 0;
    for (const ws of (ending ?? [])) {
        const r = await handleTrialEnding(sb, ws.id);
        if ('sent' in r) sent += 1;
    }

    return { trial_ending_warnings_sent: sent };
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const sysToken = req.headers.get('x-prova-system-token');
    if (sysToken !== SYSTEM_TOKEN || !SYSTEM_TOKEN) {
        // Kein System-Token: nur Founder darf manuelle Triggers
        // (vereinfacht: erstmal nur System-Token erlauben)
        throw new HttpError('System token required', 401);
    }

    const sb = createServiceClient();
    const body = await req.json() as LifecycleRequest;

    let result: Record<string, unknown> = {};

    switch (body.trigger) {
        case 'trial_start':
            if (!body.workspace_id) throw new HttpError('workspace_id required', 400);
            result = await handleTrialStart(sb, body.workspace_id);
            break;
        case 'trial_ending_in_3_days':
            if (!body.workspace_id) throw new HttpError('workspace_id required', 400);
            result = await handleTrialEnding(sb, body.workspace_id);
            break;
        case 'cron_daily':
            result = await cronDailySweep(sb);
            break;
        case 'trial_ended':
        case 'abo_renewed':
        case 'abo_canceled':
            // TODO: Email-Templates pro Trigger
            result = { trigger: body.trigger, todo: 'email-template kommt in K-2' };
            break;
        default:
            throw new HttpError(`Unknown trigger: ${body.trigger}`, 400);
    }

    await logAuditEvent(sb, {
        action: 'update',
        entityTyp: 'lifecycle',
        entityId: body.workspace_id ?? null,
        payload: { trigger: body.trigger, result },
        workspaceId: body.workspace_id ?? null,
        userId: null
    }, req);

    return jsonResponse({ ok: true, trigger: body.trigger, ...result });
};

Deno.serve(withErrorHandling(handler));
