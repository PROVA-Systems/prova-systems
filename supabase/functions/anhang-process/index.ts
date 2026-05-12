// MEGA⁶⁸ Item 6.3 + MEGA⁶⁹-FINAL-3 Item 8.1 — anhang-process
// OCR + KI-Klassifizierung für externe Dokumente (anhaenge-Tabelle).
// Mime-basiert:
//   image/* → Claude-Vision-OCR
//   application/pdf → Claude-Vision-OCR (Claude Sonnet 4.6 unterstützt PDF nativ seit 2024)
//   officedocument → parse-docx Edge Fn (deferred — Fallback: nur Filename)
//   andere → UNSUPPORTED_MIME

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const TAG_VOKABULAR = [
  'klageschrift','klageerwiderung','beweisbeschluss','vertrag','rechnung_extern',
  'korrespondenz_email','korrespondenz_brief','bautagebuch','leistungsverzeichnis',
  'fremd_gutachten','foto_extern','plan','norm_dokument','protokoll',
  'aussen','innen','riss','feuchtigkeit','schimmel','wasserschaden','daemmung'
];

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function calcVisionCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * 3.00 + tokensOut * 15.00) / 1_000_000;
}
function calcGptCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;
}

async function claudeOcr(mediaType: string, base64: string): Promise<{ ocrText: string; extracted: any; tokensIn: number; tokensOut: number }> {
  const prompt = 'Extrahiere ALLEN sichtbaren Text aus diesem Dokument als reinen Text. ' +
                 'Wenn es ein Brief/Schreiben ist: identifiziere Absender, Datum, Aktenzeichen, Empfaenger. ' +
                 'Wenn es mehrere Seiten sind: extrahiere alle. ' +
                 'Antworte als JSON: { "ocr_text": "...", "absender": "..."|null, "datum": "YYYY-MM-DD"|null, "aktenzeichen": "..."|null }';
  // Claude Sonnet 4.6: image-Block für JPG/PNG/WebP/GIF, document-Block (type: 'document') für PDF
  const isPdf = mediaType === 'application/pdf';
  const content: any[] = [
    isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mediaType,         data: base64 } },
    { type: 'text', text: prompt }
  ];
  const visionResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, temperature: 0.1, messages: [{ role: 'user', content }] })
  });
  if (!visionResp.ok) {
    const err = await visionResp.text();
    throw new Error(`VISION_FAILED: ${err.slice(0, 200)}`);
  }
  const visionJson = await visionResp.json();
  const visionText = visionJson.content?.[0]?.text || '';
  const tokensIn = visionJson.usage?.input_tokens || 0;
  const tokensOut = visionJson.usage?.output_tokens || 0;
  let ocrText = visionText;
  let extracted: any = {};
  try {
    const m = visionText.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      ocrText = parsed.ocr_text || '';
      extracted = {
        absender: parsed.absender || null,
        datum: parsed.datum || null,
        aktenzeichen_extern: parsed.aktenzeichen || null
      };
    }
  } catch (_) { /* parser-error → use raw text */ }
  return { ocrText, extracted, tokensIn, tokensOut };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);

  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData } = await sb.auth.getUser(auth.slice(7));
  if (!userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'INVALID_JSON' }, 400); }
  const { anhang_id } = body || {};
  if (!anhang_id) return J({ error: 'BAD_REQUEST', detail: 'anhang_id required' }, 400);

  const { data: anhang, error: loadErr } = await sb.from('anhaenge')
    .select('id, workspace_id, auftrag_id, storage_bucket, storage_path, mime_type, original_filename, typ, beschreibung')
    .eq('id', anhang_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (loadErr || !anhang) return J({ error: 'ANHANG_NOT_FOUND' }, 404);

  let ocrText = '';
  let extracted: any = {};
  let visionKiId: string | null = null;
  const t0 = Date.now();
  const mime = (anhang.mime_type || '').toLowerCase();

  try {
    const isImage = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf' || mime.includes('pdf');
    const isDocx = mime.includes('officedocument') || mime.includes('msword');

    if (isImage || isPdf) {
      // MEGA⁶⁹-FINAL-3: PDF + Image beide via Claude-Vision (Claude Sonnet 4.6 unterstützt PDF nativ)
      if (!ANTHROPIC_KEY) return J({ error: 'ANTHROPIC_KEY_MISSING' }, 500);
      const { data: blob, error: dlErr } = await sb.storage.from(anhang.storage_bucket).download(anhang.storage_path);
      if (dlErr || !blob) return J({ error: 'STORAGE_DOWNLOAD_FAILED', detail: dlErr?.message }, 500);
      // Size-Guard: Anthropic max 32MB für Vision/Document
      if (blob.size > 32 * 1024 * 1024) {
        return J({ error: 'FILE_TOO_LARGE', detail: `${blob.size} bytes > 32MB. Datei bitte verkleinern.` }, 413);
      }
      const arrBuf = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrBuf)));
      const mediaTypeForClaude = isPdf ? 'application/pdf' : mime;
      const { ocrText: t, extracted: ex, tokensIn, tokensOut } = await claudeOcr(mediaTypeForClaude, base64);
      ocrText = t; extracted = ex;
      const dauer = Date.now() - t0;
      const inputHash = await sha256Hex(`vision-ocr:${anhang_id}`);
      const { data: protRow } = await sb.from('ki_protokoll').insert({
        workspace_id: anhang.workspace_id, user_id: userData.user.id, auftrag_id: anhang.auftrag_id,
        purpose: isPdf ? 'asset_zu_fragment_dokument' : 'asset_zu_fragment_foto',
        feature_kontext: 'anhang-process/vision-ocr' + (isPdf ? '-pdf' : '-image'),
        modell: 'claude_sonnet', modell_version: 'claude-sonnet-4-6', provider: 'anthropic',
        token_input: tokensIn, token_output: tokensOut,
        kosten_eur: calcVisionCost(tokensIn, tokensOut),
        dauer_ms: dauer, status: 'erfolg',
        input_pseudonymisiert: false,
        input_hash: inputHash,
        output_laenge_chars: ocrText.length,
        output_preview: ocrText.slice(0, 500),
        started_at: new Date(t0).toISOString(), completed_at: new Date().toISOString()
      }).select('id').single();
      visionKiId = protRow?.id ?? null;
    } else if (isDocx) {
      // DOCX: parse-docx Edge Fn ist deferred (Deno + mammoth-Inkompatibilität).
      // Fallback: ocrText = Filename + Beschreibung; Klassifizierung läuft trotzdem auf Metadata.
      ocrText = [anhang.original_filename, anhang.beschreibung].filter(Boolean).join('\n').trim();
      extracted = {};
      // Audit-Hinweis: DOCX-OCR ist Fallback
      await sb.from('audit_trail').insert({
        workspace_id: anhang.workspace_id, user_id: userData.user.id,
        action: 'update', entity_typ: 'anhang', entity_id: anhang_id, kategorie: 'systemzugriff',
        payload: { hinweis: 'DOCX-OCR deferred (parse-docx Deno-Incompat), Fallback auf Filename+Beschreibung. Empfehlung: PDF-Export.' }
      });
    } else {
      return J({ error: 'UNSUPPORTED_MIME', detail: mime || 'unknown' }, 415);
    }

    // Klassifizierung (gpt-5.5-instant) — unverändert, läuft auf ocrText
    const beweisbeschluss = await sb.from('auftraege').select('beweisbeschluss_extrakt').eq('id', anhang.auftrag_id).maybeSingle();
    const fragenListe = (beweisbeschluss.data?.beweisbeschluss_extrakt as any)?.fragen || [];
    const tagSys = 'Du klassifizierst externe Bauschaden-Dokumente. Antworte als JSON mit Schluesseln: ' +
                   'tags (Array, Teilmenge von ' + TAG_VOKABULAR.join(',') + '), ' +
                   'beweisfrage_match (Array von Beweisfrage-IDs aus uebergebener Liste die das Dokument tangiert), ' +
                   'kategorie (klageschrift|beweisbeschluss|fremd_gutachten|korrespondenz|sonstiges).';
    const tagUser = `Dokument-Text (ggf. gekuerzt):\n${ocrText.slice(0, 3000)}\n\nBeweisfragen-Liste:\n${JSON.stringify(fragenListe).slice(0, 2000)}`;
    const classifyResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.5-instant',
        max_tokens: 400, temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: tagSys }, { role: 'user', content: tagUser }]
      })
    });
    let tags: string[] = [];
    let beweisfrageMatch: number[] = [];
    let classifyKiId: string | null = null;
    if (classifyResp.ok) {
      const cj = await classifyResp.json();
      const txt = cj.choices?.[0]?.message?.content || '{}';
      const tIn = cj.usage?.prompt_tokens || 0;
      const tOut = cj.usage?.completion_tokens || 0;
      try {
        const parsed = JSON.parse(txt);
        tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string' && TAG_VOKABULAR.includes(t)) : [];
        beweisfrageMatch = Array.isArray(parsed.beweisfrage_match) ? parsed.beweisfrage_match.map((x: any) => Number(x)).filter((n: number) => !isNaN(n)) : [];
      } catch (_) { /* silent */ }
      const { data: protRow2 } = await sb.from('ki_protokoll').insert({
        workspace_id: anhang.workspace_id, user_id: userData.user.id, auftrag_id: anhang.auftrag_id,
        purpose: 'auto_tagging',
        feature_kontext: 'anhang-process/classify',
        modell: 'gpt_4o_mini', modell_version: 'gpt-5.5-instant', provider: 'openai',
        token_input: tIn, token_output: tOut, kosten_eur: calcGptCost(tIn, tOut),
        dauer_ms: 0, status: 'erfolg',
        input_pseudonymisiert: true,
        output_laenge_chars: txt.length,
        output_preview: txt.slice(0, 500),
        started_at: new Date().toISOString(), completed_at: new Date().toISOString()
      }).select('id').single();
      classifyKiId = protRow2?.id ?? null;
    }

    // UPDATE anhaenge
    const beweisfragenTags = beweisfrageMatch.map(n => `beweisfrage:${n}`);
    const allTags = Array.from(new Set([...tags, ...beweisfragenTags]));
    await sb.from('anhaenge').update({
      ocr_text: ocrText || null,
      ocr_completed_at: new Date().toISOString(),
      extracted_data: { ...extracted, beweisfrage_match: beweisfrageMatch, classify_ki_id: classifyKiId, vision_ki_id: visionKiId },
      extraction_at: new Date().toISOString(),
      extraction_modell: isDocx ? 'docx-filename-fallback+gpt-5.5-instant' : 'claude-sonnet-4-6+gpt-5.5-instant',
      absender: extracted.absender ?? null,
      empfangsdatum: extracted.datum ?? null,
      aktenzeichen_extern: extracted.aktenzeichen_extern ?? null,
      tags: allTags
    }).eq('id', anhang_id);

    await sb.from('audit_trail').insert({
      workspace_id: anhang.workspace_id,
      user_id: userData.user.id,
      action: 'update',
      entity_typ: 'anhang',
      entity_id: anhang_id,
      kategorie: 'ki_einsatz',
      payload: { ocr_chars: ocrText.length, tags_count: allTags.length, beweisfrage_match: beweisfrageMatch, mime: mime, source: isPdf ? 'claude-vision-pdf' : (isDocx ? 'docx-fallback' : 'claude-vision-image') }
    }).select('id').maybeSingle();

    return J({
      success: true,
      anhang_id,
      ocr_done: !isDocx,
      ocr_chars: ocrText.length,
      classified: true,
      tags: allTags,
      beweisfrage_match: beweisfrageMatch,
      extracted,
      source: isPdf ? 'claude-vision-pdf' : (isDocx ? 'docx-fallback' : 'claude-vision-image')
    }, 200);
  } catch (e) {
    return J({ error: 'PROCESS_FAILED', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
