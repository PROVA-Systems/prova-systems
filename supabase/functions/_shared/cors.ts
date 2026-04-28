/* ============================================================
   PROVA Edge Functions — CORS-Helper
   Sprint K-1.2.B1
   ============================================================ */

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',  // K-1.5: auf https://prova-systems.de + app.prova-systems.de einschränken
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, x-prova-workspace, stripe-signature',
    'Access-Control-Max-Age': '86400'
};

/**
 * Behandelt OPTIONS-Preflight-Requests. Returnt Response oder null.
 * Im Handler: `if (req.method === 'OPTIONS') return handleCors();`
 */
export function handleCors(): Response {
    return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Wraps result in JSON-Response mit CORS-Headers.
 */
export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...extraHeaders
        }
    });
}

/**
 * Error-Response in einheitlichem Format.
 */
export function errorResponse(message: string, status = 400, extra: Record<string, unknown> = {}): Response {
    return jsonResponse({ error: message, ...extra }, status);
}
