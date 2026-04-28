/* ============================================================
   PROVA Edge Functions — Auth-Helpers
   Sprint K-1.2.B1
   ============================================================ */

import { createSupabaseClient } from './supabase.ts';
import { errorResponse } from './cors.ts';

export interface AuthContext {
    user: {
        id: string;
        email?: string;
        [key: string]: unknown;
    };
    accessToken: string;
}

/**
 * Verifiziert JWT aus Authorization-Header.
 * Returnt AuthContext oder wirft 401.
 */
export async function verifyJwt(req: Request): Promise<AuthContext> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new HttpError('Missing or invalid Authorization header', 401);
    }
    const accessToken = authHeader.slice('Bearer '.length);

    const sb = createSupabaseClient(req);
    const { data: { user }, error } = await sb.auth.getUser(accessToken);

    if (error || !user) {
        throw new HttpError(`JWT invalid: ${error?.message ?? 'no user'}`, 401);
    }

    return { user, accessToken };
}

/**
 * Liefert Workspace-ID des Users (erste aktive Membership).
 *
 * Frontend kann via Header `x-prova-workspace` einen anderen Workspace wählen
 * (Team-Tier, Workspace-Switcher) — wir prüfen dann ob der User dort Mitglied ist.
 */
export async function getWorkspaceId(req: Request, ctx: AuthContext): Promise<string> {
    const overrideHeader = req.headers.get('x-prova-workspace');
    const sb = createSupabaseClient(req);

    if (overrideHeader) {
        // Verifiziere dass User dort aktive Membership hat
        const { data, error } = await sb
            .from('workspace_memberships')
            .select('workspace_id')
            .eq('workspace_id', overrideHeader)
            .eq('user_id', ctx.user.id)
            .eq('is_active', true)
            .maybeSingle();
        if (error || !data) {
            throw new HttpError(`No active membership in workspace ${overrideHeader}`, 403);
        }
        return data.workspace_id;
    }

    // Default: erste aktive Membership
    const { data, error } = await sb
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', ctx.user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
    if (error || !data) {
        throw new HttpError('No workspace for user', 403);
    }
    return data.workspace_id;
}

/**
 * HTTP-Error mit Status-Code (wird im Handler in errorResponse umgewandelt).
 */
export class HttpError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

/**
 * Wraps a handler-function with try/catch. Maps HttpError to errorResponse.
 */
export function withErrorHandling(
    handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
        try {
            return await handler(req);
        } catch (e) {
            if (e instanceof HttpError) {
                return errorResponse(e.message, e.status);
            }
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[edge-function] uncaught:', msg);
            return errorResponse('Internal error', 500, { detail: msg });
        }
    };
}
