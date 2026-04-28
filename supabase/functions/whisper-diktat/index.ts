/* ============================================================
   PROVA Edge Function — whisper-diktat
   Sprint K-1.2.B3

   Audio aus Supabase Storage → OpenAI Whisper → Text + Pseudonymisierung.
   Ersetzt Netlify Function whisper-diktat.js + chunker.

   Body: { audio_storage_path, auftrag_id?, eintrag_id? }

   Limits:
     - Whisper-API max 25MB pro Datei
     - Chunking: TODO K-2 (für lange Diktate)

   Secrets: OPENAI_API_KEY
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, HttpError, withErrorHandling } from '../_shared/auth.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { logAuditEvent, trackFeatureEvent } from '../_shared/audit.ts';
import type { WhisperRequest, WhisperResponse } from '../_shared/types.ts';

const WHISPER_API = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const STORAGE_BUCKET = 'sv-files';
const WHISPER_MAX_BYTES = 25 * 1024 * 1024;  // 25MB
const COST_PER_MINUTE_EUR = 0.006;  // Whisper-1 (Stand 2026)

function pseudonymize(text: string): { pseudo: string; map: Record<string, string> } {
    const map: Record<string, string> = {};
    let pseudo = text;
    let i = 0;
    pseudo = pseudo.replace(/\b([A-ZÄÖÜ]{2,4}-\d{4}-\d{2,5})\b/g, (m) => {
        i += 1; const t = `[AZ-${i}]`; map[t] = m; return t;
    });
    let j = 0;
    pseudo = pseudo.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g, (m) => {
        j += 1; const t = `[EMAIL-${j}]`; map[t] = m; return t;
    });
    return { pseudo, map };
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
    if (!OPENAI_KEY) return errorResponse('OPENAI_API_KEY not set', 500);

    const ctx = await verifyJwt(req);
    const workspaceId = await getWorkspaceId(req, ctx);
    const sb = createSupabaseClient(req);

    const body = await req.json() as WhisperRequest;
    if (!body.audio_storage_path) throw new HttpError('audio_storage_path required', 400);

    // 1. Download from Storage (RLS schützt — User muss Zugriff haben)
    const { data: blob, error: dlErr } = await sb.storage
        .from(STORAGE_BUCKET)
        .download(body.audio_storage_path);
    if (dlErr || !blob) {
        throw new HttpError(`Storage download failed: ${dlErr?.message ?? 'no blob'}`, 404);
    }

    if (blob.size > WHISPER_MAX_BYTES) {
        throw new HttpError(
            `Audio too large (${blob.size} bytes > 25MB Whisper-Limit). `
            + `Chunking ist TODO K-2 — bitte Datei kürzen.`,
            413
        );
    }

    // 2. Whisper-API call
    const filename = body.audio_storage_path.split('/').pop() || 'audio.opus';
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('model', 'whisper-1');
    form.append('language', 'de');
    form.append('response_format', 'verbose_json');

    const t0 = Date.now();
    const resp = await fetch(WHISPER_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: form
    });
    const dauerMs = Date.now() - t0;

    if (!resp.ok) {
        const err = await resp.text();
        throw new HttpError(`Whisper ${resp.status}: ${err.slice(0, 300)}`, 502);
    }

    const whisperJson = await resp.json();
    const transcriptText = whisperJson.text ?? '';
    const durationSeconds = whisperJson.duration ?? null;

    // 3. Pseudonymisierung (für Audit-Log und transcript_pseudonym-Spalte)
    const { pseudo: transcriptPseudo } = pseudonymize(transcriptText);

    // 4. audio_dateien-Insert
    const { data: audioRow, error: insErr } = await sb.from('audio_dateien').insert({
        workspace_id: workspaceId,
        auftrag_id: body.auftrag_id ?? null,
        eintrag_id: body.eintrag_id ?? null,
        storage_bucket: STORAGE_BUCKET,
        storage_path: body.audio_storage_path,
        original_filename: filename,
        mime_type: blob.type || 'audio/opus',
        bytes: blob.size,
        duration_seconds: durationSeconds ? Math.round(durationSeconds) : null,
        transkript_text: transcriptText,
        transkript_pseudonym: transcriptPseudo,
        transkribiert_am: new Date().toISOString(),
        transkriptions_modell: 'whisper-1',
        transkriptions_dauer_ms: dauerMs,
        transkriptions_kosten_eur: durationSeconds
            ? +(durationSeconds / 60 * COST_PER_MINUTE_EUR).toFixed(4)
            : null,
        pseudonymisiert: true,
        pseudonymisiert_am: new Date().toISOString()
    }).select('id').single();

    if (insErr) {
        throw new HttpError(`audio_dateien insert: ${insErr.message}`, 500);
    }

    // 5. ki_protokoll
    await sb.from('ki_protokoll').insert({
        workspace_id: workspaceId,
        user_id: ctx.user.id,
        auftrag_id: body.auftrag_id ?? null,
        audio_id: audioRow.id,
        purpose: 'sonstiges',
        feature_kontext: 'whisper-diktat',
        modell: 'whisper_1',
        modell_version: 'whisper-1',
        provider: 'openai',
        token_input: 0,
        token_output: 0,
        kosten_eur: durationSeconds ? +(durationSeconds / 60 * COST_PER_MINUTE_EUR).toFixed(6) : 0,
        dauer_ms: dauerMs,
        status: 'erfolg'
    });

    // 6. Audit + Feature-Event
    await logAuditEvent(sb, {
        action: 'ki_request',
        entityTyp: 'audio_dateien',
        entityId: audioRow.id,
        payload: { duration_seconds: durationSeconds },
        workspaceId,
        userId: ctx.user.id
    }, req);

    await trackFeatureEvent(sb, workspaceId, 'audio_recorded', 'whisper.transcribe');

    const response: WhisperResponse = {
        audio_id: audioRow.id,
        transcript_pseudo: transcriptPseudo,
        transcript_text: transcriptText,
        duration_seconds: durationSeconds
    };
    return jsonResponse(response);
};

Deno.serve(withErrorHandling(handler));
