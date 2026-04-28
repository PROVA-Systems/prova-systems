/* ============================================================
   PROVA Edge Function — ical-feed
   Sprint K-1.2.B9

   iCal-Feed für Outlook/Google-Kalender-Subscription.

   URL-Format:
     https://<project>.supabase.co/functions/v1/ical-feed?token=<token>

   Token-Format:
     <workspace_id>:<hmac>
     hmac = HMAC-SHA256(workspace_id, PROVA_ICAL_SECRET) hex
     URL-safe-Base64-encoded

   KEINE JWT — Token wird vom externen Kalender-Tool periodisch abgerufen.

   Cache-Header: 15 Min (max-age=900).

   Secrets: PROVA_ICAL_SECRET (Marcel generiert random bei Setup)
   ============================================================ */

import { createServiceClient } from '../_shared/supabase.ts';
import { withErrorHandling } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SECRET = Deno.env.get('PROVA_ICAL_SECRET') ?? '';

async function verifyToken(token: string): Promise<string | null> {
    if (!SECRET) return null;
    let decoded: string;
    try {
        decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
        return null;
    }
    const [workspaceId, hmacHex] = decoded.split(':');
    if (!workspaceId || !hmacHex) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', enc.encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(workspaceId));
    const expected = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time compare
    if (expected.length !== hmacHex.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hmacHex.charCodeAt(i);
    return diff === 0 ? workspaceId : null;
}

function escapeIcal(s: string | null | undefined): string {
    if (!s) return '';
    return String(s)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function formatIcalDate(iso: string): string {
    // 20260428T140000Z
    return iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z');
}

interface Termin {
    id: string;
    titel: string | null;
    start_at: string;
    end_at: string | null;
    ort: string | null;
    beschreibung: string | null;
    auftrag_id: string | null;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
        return new Response('Bad Request: token required', { status: 400 });
    }

    const workspaceId = await verifyToken(token);
    if (!workspaceId) {
        return new Response('Forbidden: invalid token', { status: 403 });
    }

    // Termine laden (alle künftigen + 30 Tage Vergangenheit)
    const sb = createServiceClient();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: termine, error } = await sb
        .from('termine')
        .select('id, titel, start_at, end_at, ort, beschreibung, auftrag_id')
        .eq('workspace_id', workspaceId)
        .gte('start_at', since)
        .order('start_at', { ascending: true });

    if (error) {
        console.error('[ical-feed] termine load:', error.message);
        return new Response('Internal error', { status: 500 });
    }

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PROVA Systems//PROVA-iCal-Feed//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:PROVA Termine',
        'X-WR-TIMEZONE:Europe/Berlin'
    ];

    const dtstamp = formatIcalDate(new Date().toISOString());

    for (const t of (termine ?? []) as Termin[]) {
        const dtstart = formatIcalDate(t.start_at);
        const dtend = t.end_at
            ? formatIcalDate(t.end_at)
            : formatIcalDate(new Date(new Date(t.start_at).getTime() + 3600_000).toISOString());

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${t.id}@prova-systems.de`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART:${dtstart}`);
        lines.push(`DTEND:${dtend}`);
        lines.push(`SUMMARY:${escapeIcal(t.titel ?? 'Termin')}`);
        if (t.ort) lines.push(`LOCATION:${escapeIcal(t.ort)}`);
        if (t.beschreibung) lines.push(`DESCRIPTION:${escapeIcal(t.beschreibung)}`);
        if (t.auftrag_id) lines.push(`URL:https://prova-systems.de/akte.html?id=${t.auftrag_id}`);
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const body = lines.join('\r\n') + '\r\n';

    return new Response(body, {
        status: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="prova-termine.ics"',
            'Cache-Control': 'public, max-age=900'  // 15 Min
        }
    });
};

Deno.serve(withErrorHandling(handler));
