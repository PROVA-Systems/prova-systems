// MEGA63 — asset-to-fragments-v1 FULL IMPLEMENTATION
// Datum: 2026-05-12
// Pipeline: Asset (Diktat/Foto/Skizze/Notiz) -> 1-N befund_fragmente
//
// Pro Asset:
//   1. Auth + Load Asset-Row
//   2. Extract Text/Captions (Provider abhaengig vom Typ)
//   3. Auto-Tagging + Raumbezug-Extract (LLM-Call)
//   4. Embedding pro Fragment
//   5. INSERT in befund_fragmente mit Provenance
//   6. ki_protokoll-Eintrag pro KI-Call
//
// Modelle:
//   - Audio: existing whisper-diktat (separater Call) + gpt-5.5-instant fuer Tags
//   - Foto:  Anthropic claude-sonnet-4-6 (Vision EU)
//   - Skizze: SVG-Parse direct + Vision-Fallback
//   - Notiz: gpt-5.5-instant fuer Split + Tags
//   - Embedding: openai text-embedding-3-small

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// ═══════════════════════════════════════════════════════════════════
// HELPERS (inline aus _shared/*; siehe Repo fuer DRY-Versionen)
// ═══════════════════════════════════════════════════════════════════

type PseudoMap = Record<string, string>;
function pseudonymize(text: string): { pseudo: string; map: PseudoMap } {
  const map: PseudoMap = {};
  let pseudo = text ?? '';
  let i: number;
  i = 0;
  pseudo = pseudo.replace(/\b([A-ZÄÖÜ]{2,4}-\d{4}-\d{2,5}|\d{1,3}\s*[A-Z]\s*\d{1,4}\/\d{2,4})\b/g,
    (m) => { i++; const t = `[AZ-${i}]`; map[t] = m; return t; });
  i = 0;
  pseudo = pseudo.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
    (m) => { i++; const t = `[EMAIL-${i}]`; map[t] = m; return t; });
  i = 0;
  pseudo = pseudo.replace(/\b[A-Z]{2}\d{2}\s?(?:\d{4}\s?){4,7}\d{0,4}\b/g,
    (m) => { i++; const t = `[IBAN-${i}]`; map[t] = m; return t; });
  i = 0;
  pseudo = pseudo.replace(/\b(?:\+49|0049|0)\s?\d{2,5}[\s\-/]?\d{4,12}\b/g,
    (m) => { i++; const t = `[TEL-${i}]`; map[t] = m; return t; });
  return { pseudo, map };
}
function reidentify(text: string, map: PseudoMap): string {
  if (!text) return text;
  let out = text;
  for (const [t, o] of Object.entries(map)) out = out.split(t).join(o);
  return out;
}
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const PRICE_PER_M: Record<string, { in: number; out: number }> = {
  'gpt-5.5':                { in: 2.50, out: 10.00 },
  'gpt-5.5-instant':        { in: 0.15, out: 0.60 },
  'text-embedding-3-small': { in: 0.02, out: 0 },
  'claude-sonnet-4-6':      { in: 3.00, out: 15.00 },
  'claude-opus-4-7':        { in: 15.00, out: 75.00 }
};
function calcCost(api: string, tIn: number, tOut: number): number {
  const p = PRICE_PER_M[api]; if (!p) return 0;
  return (tIn * p.in + tOut * p.out) / 1_000_000;
}

interface KiCtx {
  workspace_id: string;
  user_id: string;
  auftrag_id: string;
  audio_id?: string | null;
}

async function logKiCall(sb: SupabaseClient, row: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await sb.from('ki_protokoll').insert(row).select('id').single();
  if (error) { console.error('[ki_protokoll]', error.message); return null; }
  return data?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// EMBEDDING (text-embedding-3-small via OpenAI)
// ═══════════════════════════════════════════════════════════════════

async function embed(sb: SupabaseClient, text: string, ctx: KiCtx, feature: string): Promise<{ vec: number[]; ki_id: string | null }> {
  const truncated = text.length > 8000 ? text.slice(0, 8000) : text;
  const input_hash = await sha256Hex(truncated);
  const t0 = Date.now();
  let vec: number[] = [];
  let tokens = 0;
  let status = 'erfolg';
  let err: string | null = null;
  try {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: truncated, encoding_format: 'float' })
    });
    if (!resp.ok) {
      status = resp.status === 429 ? 'rate_limit' : 'fehler';
      err = `${resp.status}: ${(await resp.text()).slice(0, 200)}`;
    } else {
      const d = await resp.json();
      vec = d.data?.[0]?.embedding ?? [];
      tokens = d.usage?.prompt_tokens ?? 0;
    }
  } catch (e) { status = 'fehler'; err = e instanceof Error ? e.message : String(e); }
  const dauer = Date.now() - t0;
  const ki_id = await logKiCall(sb, {
    workspace_id: ctx.workspace_id, user_id: ctx.user_id, auftrag_id: ctx.auftrag_id,
    purpose: 'embedding', feature_kontext: feature,
    modell: 'embedding_3_small', modell_version: 'text-embedding-3-small', provider: 'openai',
    token_input: tokens, token_output: 0, kosten_eur: calcCost('text-embedding-3-small', tokens, 0),
    dauer_ms: dauer, status, fehler_message: err,
    input_pseudonymisiert: true, input_hash, output_laenge_chars: vec.length,
    started_at: new Date(Date.now() - dauer).toISOString(), completed_at: new Date().toISOString()
  });
  if (status !== 'erfolg') throw new Error(`EMBEDDING_FAILED: ${err}`);
  return { vec, ki_id };
}

// ═══════════════════════════════════════════════════════════════════
// OPENAI CHAT (gpt-5.5 / gpt-5.5-instant) — JSON-Mode
// ═══════════════════════════════════════════════════════════════════

async function callGpt(
  sb: SupabaseClient,
  model: 'gpt-5.5' | 'gpt-5.5-instant',
  system: string,
  user: string,
  ctx: KiCtx,
  purpose: string,
  feature: string,
  maxTokens = 800
): Promise<{ text: string; ki_id: string | null }> {
  const { pseudo, map } = pseudonymize(user);
  const input_hash = await sha256Hex(pseudo);
  const t0 = Date.now();
  let text = '';
  let tIn = 0, tOut = 0;
  let status = 'erfolg';
  let err: string | null = null;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: pseudo }]
      })
    });
    if (!resp.ok) {
      status = resp.status === 429 ? 'rate_limit' : 'fehler';
      err = `${resp.status}: ${(await resp.text()).slice(0, 200)}`;
    } else {
      const d = await resp.json();
      text = d.choices?.[0]?.message?.content ?? '';
      tIn = d.usage?.prompt_tokens ?? 0;
      tOut = d.usage?.completion_tokens ?? 0;
    }
  } catch (e) { status = 'fehler'; err = e instanceof Error ? e.message : String(e); }
  const dauer = Date.now() - t0;
  const reidentified = reidentify(text, map);
  const output_hash = await sha256Hex(reidentified);
  const ki_id = await logKiCall(sb, {
    workspace_id: ctx.workspace_id, user_id: ctx.user_id, auftrag_id: ctx.auftrag_id,
    purpose, feature_kontext: feature,
    modell: model === 'gpt-5.5' ? 'gpt_4o' : 'gpt_4o_mini', modell_version: model, provider: 'openai',
    token_input: tIn, token_output: tOut, kosten_eur: calcCost(model, tIn, tOut),
    dauer_ms: dauer, status, fehler_message: err,
    input_pseudonymisiert: true, output_repseudonymisiert: Object.keys(map).length > 0,
    pseudonymisierung_token_count: Object.keys(map).length,
    input_hash, output_hash, output_laenge_chars: reidentified.length,
    output_preview: reidentified.slice(0, 500),
    started_at: new Date(Date.now() - dauer).toISOString(), completed_at: new Date().toISOString()
  });
  if (status !== 'erfolg') throw new Error(`GPT_FAILED: ${err}`);
  return { text: reidentified, ki_id };
}

// ═══════════════════════════════════════════════════════════════════
// ANTHROPIC VISION (claude-sonnet-4-6) — Image + Text Prompt
// ═══════════════════════════════════════════════════════════════════

async function callClaudeVision(
  sb: SupabaseClient,
  imageBase64: string,
  mediaType: string,
  prompt: string,
  ctx: KiCtx,
  purpose: string,
  feature: string,
  maxTokens = 600
): Promise<{ text: string; ki_id: string | null }> {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY_MISSING');
  const t0 = Date.now();
  let text = '';
  let tIn = 0, tOut = 0;
  let status = 'erfolg';
  let err: string | null = null;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    if (!resp.ok) {
      status = resp.status === 429 ? 'rate_limit' : 'fehler';
      err = `${resp.status}: ${(await resp.text()).slice(0, 200)}`;
    } else {
      const d = await resp.json();
      text = d.content?.[0]?.text ?? '';
      tIn = d.usage?.input_tokens ?? 0;
      tOut = d.usage?.output_tokens ?? 0;
    }
  } catch (e) { status = 'fehler'; err = e instanceof Error ? e.message : String(e); }
  const dauer = Date.now() - t0;
  const ki_id = await logKiCall(sb, {
    workspace_id: ctx.workspace_id, user_id: ctx.user_id, auftrag_id: ctx.auftrag_id,
    purpose, feature_kontext: feature,
    modell: 'claude_sonnet', modell_version: 'claude-sonnet-4-6', provider: 'anthropic',
    token_input: tIn, token_output: tOut, kosten_eur: calcCost('claude-sonnet-4-6', tIn, tOut),
    dauer_ms: dauer, status, fehler_message: err,
    input_pseudonymisiert: false,  // Bilder werden nicht pseudonymisiert (kein PII-Text)
    output_laenge_chars: text.length,
    output_preview: text.slice(0, 500),
    started_at: new Date(Date.now() - dauer).toISOString(), completed_at: new Date().toISOString()
  });
  if (status !== 'erfolg') throw new Error(`CLAUDE_VISION_FAILED: ${err}`);
  return { text, ki_id };
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-TAGGING (kontrolliertes Vokabular)
// ═══════════════════════════════════════════════════════════════════

const TAG_VOKABULAR = [
  'außen','innen','riss','feuchtigkeit','setzung','wasserschaden',
  'strukturell','optisch','elektro','sanitär','heizung','wärmebrücke',
  'schimmel','dämmung','fenster','tür','dach','keller','dachgeschoss',
  'fassade','putz','beton','holz','metall','glas','fliesen','estrich',
  'mauerwerk','fundament','abdichtung','treppe','balkon','terrasse'
];

const GUTACHTEN_TEILE = ['sachverhalt','befund','fachurteil','zusammenfassung'];

async function autoTagAndClassify(
  sb: SupabaseClient,
  text: string,
  ctx: KiCtx,
  feature: string,
  defaultGutachtenTeil: string | null = null
): Promise<{ tags: string[]; raumbezug: string | null; gutachten_teil: string | null; ki_id: string | null }> {
  const sys = 'Du bist Klassifizierer fuer deutsche Bau-Befundtexte. '
    + 'Antworte ausschliesslich als JSON-Object mit Schluesseln tags (Array of String), raumbezug (String|null), gutachten_teil (String|null). '
    + 'tags MUSS Teilmenge aus diesem Vokabular sein: ' + TAG_VOKABULAR.join(', ') + '. '
    + 'gutachten_teil MUSS einer von: ' + GUTACHTEN_TEILE.join(', ') + ' oder null. '
    + 'raumbezug ist die Raumbezeichnung (z.B. "Bad EG", "Schlafzimmer OG", "Aussenwand Nord") oder null wenn nicht erkennbar. '
    + 'Erfinde NICHTS. Wenn unklar: null oder leeres Array.';
  const user = `Text:\n${text}\n\nDefault gutachten_teil falls unklar: ${defaultGutachtenTeil ?? 'null'}`;
  const { text: out, ki_id } = await callGpt(sb, 'gpt-5.5-instant', sys, user, ctx, 'auto_tagging', feature, 300);
  try {
    const parsed = JSON.parse(out);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string' && TAG_VOKABULAR.includes(t))
      : [];
    const raumbezug = typeof parsed.raumbezug === 'string' && parsed.raumbezug.length > 0 ? parsed.raumbezug : null;
    let gutachten_teil = typeof parsed.gutachten_teil === 'string' ? parsed.gutachten_teil : null;
    if (gutachten_teil && !GUTACHTEN_TEILE.includes(gutachten_teil)) gutachten_teil = null;
    if (!gutachten_teil) gutachten_teil = defaultGutachtenTeil;
    return { tags, raumbezug, gutachten_teil, ki_id };
  } catch {
    return { tags: [], raumbezug: null, gutachten_teil: defaultGutachtenTeil, ki_id };
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHUNKING — Satz-basiert (2-3 Saetze pro Chunk)
// ═══════════════════════════════════════════════════════════════════

interface AudioChunk {
  text: string;
  start_ms: number | null;
}

function chunkSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  // Aufteilung an Satz-Enden (Punkt/!/? gefolgt von Whitespace+Grossbuchstabe)
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/).map(s => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  // 2-3 Saetze pro Chunk (fester Stride 2)
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(sentences.slice(i, i + 3).join(' '));
  }
  return chunks;
}

/**
 * Mappt Chunk-Text auf Audio-Zeitstempel via Word-Array (Whisper verbose_json).
 * Heuristik: erstes Wort des Chunk-Texts ueber Word-Array suchen,
 * Position-Match liefert start-ms.
 */
function chunkWithTimestamps(chunks: string[], words: Array<{ word: string; start: number }> | null): AudioChunk[] {
  if (!words || words.length === 0) return chunks.map(c => ({ text: c, start_ms: null }));
  let wordIdx = 0;
  return chunks.map(chunkText => {
    const firstWord = chunkText.split(/\s+/)[0]?.replace(/[.,;:!?"']/g, '').toLowerCase() ?? '';
    while (wordIdx < words.length) {
      const w = words[wordIdx].word.replace(/[.,;:!?"']/g, '').toLowerCase();
      if (w === firstWord) break;
      wordIdx++;
    }
    const start_ms = wordIdx < words.length ? Math.round(words[wordIdx].start * 1000) : null;
    return { text: chunkText, start_ms };
  });
}

function isSubstring(needle: string, haystack: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(haystack).includes(norm(needle));
}

// ═══════════════════════════════════════════════════════════════════
// SUB-FUNCTION 1.1: extract-from-audio
// ═══════════════════════════════════════════════════════════════════

async function extractFromAudio(sb: SupabaseClient, audio_id: string, auftrag_id: string, ctx: KiCtx): Promise<unknown[]> {
  // 1. Load Audio-Row
  const { data: audio, error: audioErr } = await sb
    .from('audio_dateien')
    .select('id, transkript_text, transkript_pseudonym, word_timestamps, workspace_id')
    .eq('id', audio_id)
    .is('deleted_at', null)
    .maybeSingle();
  if (audioErr || !audio) throw new Error(`AUDIO_NOT_FOUND: ${audio_id}`);
  if (!audio.transkript_text) throw new Error('AUDIO_NO_TRANSCRIPT — rufe whisper-diktat zuerst auf');

  const transkript = audio.transkript_text;
  const words = (audio.word_timestamps as { words?: Array<{ word: string; start: number }> } | null)?.words ?? null;

  // 2. Chunking (2-3 Saetze)
  const chunkTexts = chunkSentences(transkript);
  if (chunkTexts.length === 0) throw new Error('AUDIO_EMPTY_TRANSCRIPT');

  // 3. Halluzinations-Check: jeder Chunk muss Substring vom Transkript sein
  for (const c of chunkTexts) {
    if (!isSubstring(c, transkript)) throw new Error('AUDIO_CHUNK_HALLUCINATION');
  }

  // 4. Map auf Audio-Zeitstempel
  const chunks = chunkWithTimestamps(chunkTexts, words);

  // 5. Pro Chunk: Auto-Tag + Embedding parallel (Batches von 5)
  const ctxAudio = { ...ctx, audio_id };
  const results: unknown[] = [];
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(async (chunk) => {
      const [tag, emb] = await Promise.all([
        autoTagAndClassify(sb, chunk.text, ctxAudio, 'asset-to-fragments-v1/audio', 'befund'),
        embed(sb, chunk.text, ctxAudio, 'asset-to-fragments-v1/audio/embedding')
      ]);
      const ki_protokoll_id = tag.ki_id ?? emb.ki_id;
      const { data: fragRow, error: fragErr } = await sb.from('befund_fragmente').insert({
        auftrag_id, workspace_id: ctx.workspace_id, created_by: ctx.user_id,
        quelle_typ: 'diktat', quelle_asset_id: audio_id,
        quelle_startzeit_ms: chunk.start_ms,
        text: chunk.text, tags: tag.tags, raumbezug: tag.raumbezug,
        gutachten_teil: tag.gutachten_teil,
        embedding: emb.vec.length > 0 ? JSON.stringify(emb.vec) : null,
        status: 'roh', ki_generiert: true, ki_protokoll_id
      }).select('id').single();
      if (fragErr) throw new Error(`FRAG_INSERT_FAILED: ${fragErr.message}`);
      return { id: fragRow.id, text: chunk.text, start_ms: chunk.start_ms, tags: tag.tags };
    }));
    results.push(...batchResults);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// SUB-FUNCTION 1.2: extract-from-photo (Anthropic Claude Vision)
// ═══════════════════════════════════════════════════════════════════

async function extractFromPhoto(sb: SupabaseClient, foto_id: string, auftrag_id: string, ctx: KiCtx): Promise<unknown[]> {
  const { data: foto, error: fotoErr } = await sb
    .from('fotos')
    .select('id, storage_bucket, storage_path, beweisfrage_ref, beschreibung, mime_type')
    .eq('id', foto_id)
    .is('deleted_at', null)
    .maybeSingle();
  if (fotoErr || !foto) throw new Error(`FOTO_NOT_FOUND: ${foto_id}`);

  // Download Storage -> Base64
  const { data: blob, error: dlErr } = await sb.storage.from(foto.storage_bucket).download(foto.storage_path);
  if (dlErr || !blob) throw new Error(`FOTO_DOWNLOAD_FAILED: ${dlErr?.message}`);
  const arrayBuf = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
  const mediaType = foto.mime_type || 'image/jpeg';

  // Vision-Prompt: 3 Aspekte (Uebersicht + 2 Details), objektiv, Konjunktiv II bei Unklarheit
  const prompt = 'Beschreibe diesen Bauschaden-Foto in genau 3 deutschen Saetzen, '
    + 'als JSON-Array von Strings: ["satz1","satz2","satz3"]. '
    + 'Regeln: '
    + '1) Erster Satz: Uebersicht (was zeigt das Bild). '
    + '2) Zweiter Satz: konkretes Detail 1 (Position/Ausdehnung/Beschaffenheit). '
    + '3) Dritter Satz: konkretes Detail 2 (Beschaedigung/Risse/Verfaerbung). '
    + 'STRIKT verboten: "ich sehe", Bewertungen ("gefaehrlich","kritisch"), Mutmassungen ueber Ursachen. '
    + 'Bei Unklarheit: Konjunktiv II ("koennte", "duerfte"). '
    + 'Max 200 Zeichen pro Satz. '
    + (foto.beweisfrage_ref ? `\n\nBeweisfrage-Kontext: ${foto.beweisfrage_ref}` : '');

  const { text: visionOut, ki_id: visionKiId } = await callClaudeVision(
    sb, base64, mediaType, prompt, ctx, 'asset_zu_fragment_foto', 'asset-to-fragments-v1/foto', 700
  );

  // Parse JSON-Array (Robust)
  let captions: string[] = [];
  try {
    const m = visionOut.match(/\[[\s\S]*\]/);
    if (m) captions = JSON.parse(m[0]).filter((c: unknown) => typeof c === 'string' && c.length > 5);
  } catch {
    captions = [visionOut.slice(0, 200)];  // Fallback: ganzer Text als 1 Caption
  }
  if (captions.length === 0) throw new Error('FOTO_NO_CAPTIONS');

  // Halluzinations-Check: keine Subjektivierung / Bewertung
  const SUBJEKTIV = /\b(ich\s+(sehe|denke|glaube|meine|finde))/i;
  const BEWERTUNG = /\b(gef[äa]hrlich|kritisch|schwerwiegend|katastrophal)\b/i;
  captions = captions.filter(c => !SUBJEKTIV.test(c) && !BEWERTUNG.test(c)).slice(0, 3);
  if (captions.length === 0) throw new Error('FOTO_ALL_CAPTIONS_REJECTED_BY_KI_DISZIPLIN');

  // Pro Caption: Auto-Tag + Embedding + INSERT (parallel)
  const results = await Promise.all(captions.map(async (caption, idx) => {
    const [tag, emb] = await Promise.all([
      autoTagAndClassify(sb, caption, ctx, 'asset-to-fragments-v1/foto', 'befund'),
      embed(sb, caption, ctx, 'asset-to-fragments-v1/foto/embedding')
    ]);
    const { data: fragRow, error: fragErr } = await sb.from('befund_fragmente').insert({
      auftrag_id, workspace_id: ctx.workspace_id, created_by: ctx.user_id,
      quelle_typ: 'foto', quelle_asset_id: foto_id,
      quelle_koordinaten: { caption_idx: idx, total: captions.length },
      text: caption, tags: tag.tags, raumbezug: tag.raumbezug,
      gutachten_teil: tag.gutachten_teil ?? 'befund',
      embedding: emb.vec.length > 0 ? JSON.stringify(emb.vec) : null,
      status: 'roh', ki_generiert: true, ki_protokoll_id: visionKiId
    }).select('id').single();
    if (fragErr) throw new Error(`FRAG_INSERT_FAILED: ${fragErr.message}`);
    return { id: fragRow.id, text: caption, idx, tags: tag.tags };
  }));
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// SUB-FUNCTION 1.3: extract-from-sketch (SVG-Parse + Vision-Fallback)
// ═══════════════════════════════════════════════════════════════════

interface SkizzeAnnotation {
  text: string;
  x: number;
  y: number;
  marker_id: string | null;
}

function parseSvgAnnotations(svg: string): SkizzeAnnotation[] {
  const annotations: SkizzeAnnotation[] = [];
  // Match <text x="..." y="..." ...>text</text>
  const textRe = /<text\b[^>]*\bx="([\d.-]+)"[^>]*\by="([\d.-]+)"[^>]*>([\s\S]*?)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = textRe.exec(svg)) !== null) {
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    const inner = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (inner.length === 0) continue;
    annotations.push({ text: inner, x, y, marker_id: null });
  }
  return annotations;
}

async function extractFromSketch(sb: SupabaseClient, skizze_id: string, auftrag_id: string, ctx: KiCtx): Promise<unknown[]> {
  const { data: skizze, error: skErr } = await sb
    .from('skizzen')
    .select('id, svg_content, foto_referenz_id, titel, notiz')
    .eq('id', skizze_id)
    .is('deleted_at', null)
    .maybeSingle();
  if (skErr || !skizze) throw new Error(`SKIZZE_NOT_FOUND: ${skizze_id}`);

  let annotations: SkizzeAnnotation[] = [];
  if (skizze.svg_content && skizze.svg_content.includes('<text')) {
    annotations = parseSvgAnnotations(skizze.svg_content);
  }
  // Fallback: wenn keine SVG-Text-Annotationen, nutze titel + notiz als ein Fragment
  if (annotations.length === 0) {
    const combinedText = [skizze.titel, skizze.notiz].filter(Boolean).join('. ').trim();
    if (combinedText.length > 0) {
      annotations = [{ text: combinedText, x: 0, y: 0, marker_id: null }];
    }
  }
  if (annotations.length === 0) throw new Error('SKIZZE_NO_ANNOTATIONS');

  // Cross-Ref-Tag wenn Foto-Bezug vorhanden
  const crossRefTag = skizze.foto_referenz_id ? ['verweist_auf_foto'] : [];

  const results = await Promise.all(annotations.map(async (anno, idx) => {
    const [tag, emb] = await Promise.all([
      autoTagAndClassify(sb, anno.text, ctx, 'asset-to-fragments-v1/skizze', 'befund'),
      embed(sb, anno.text, ctx, 'asset-to-fragments-v1/skizze/embedding')
    ]);
    const allTags = Array.from(new Set([...tag.tags, ...crossRefTag]));
    const { data: fragRow, error: fragErr } = await sb.from('befund_fragmente').insert({
      auftrag_id, workspace_id: ctx.workspace_id, created_by: ctx.user_id,
      quelle_typ: 'skizze', quelle_asset_id: skizze_id,
      quelle_koordinaten: { x: anno.x, y: anno.y, marker_id: anno.marker_id, anno_idx: idx },
      text: anno.text, tags: allTags, raumbezug: tag.raumbezug,
      gutachten_teil: tag.gutachten_teil ?? 'befund',
      embedding: emb.vec.length > 0 ? JSON.stringify(emb.vec) : null,
      status: 'roh', ki_generiert: true, ki_protokoll_id: tag.ki_id
    }).select('id').single();
    if (fragErr) throw new Error(`FRAG_INSERT_FAILED: ${fragErr.message}`);
    return { id: fragRow.id, text: anno.text, x: anno.x, y: anno.y, tags: allTags };
  }));
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// SUB-FUNCTION 1.4: extract-from-note
// ═══════════════════════════════════════════════════════════════════

async function extractFromNote(sb: SupabaseClient, notiz_id: string, auftrag_id: string, ctx: KiCtx): Promise<unknown[]> {
  const { data: notiz, error: nErr } = await sb
    .from('notizen')
    .select('id, content, titel, tags, important, pinned')
    .eq('id', notiz_id)
    .is('deleted_at', null)
    .maybeSingle();
  if (nErr || !notiz) throw new Error(`NOTIZ_NOT_FOUND: ${notiz_id}`);
  if (!notiz.content || notiz.content.trim().length === 0) throw new Error('NOTIZ_EMPTY');

  // Split nach Absaetzen (\n\n), falls keine Absaetze: nach Saetzen
  let chunks: string[];
  if (notiz.content.includes('\n\n')) {
    chunks = notiz.content.split(/\n{2,}/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  } else {
    chunks = chunkSentences(notiz.content);
  }
  if (chunks.length === 0) throw new Error('NOTIZ_NO_CHUNKS');

  // Halluzinations-Check: jeder Chunk muss Substring der Notiz sein
  for (const c of chunks) {
    if (!isSubstring(c, notiz.content)) throw new Error('NOTIZ_CHUNK_HALLUCINATION');
  }

  const inheritedTags: string[] = Array.isArray(notiz.tags) ? notiz.tags : [];
  const defaultGutachtenTeil = notiz.important || notiz.pinned ? 'fachurteil' : 'befund';

  const results: unknown[] = [];
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(async (text, idx) => {
      const [tag, emb] = await Promise.all([
        autoTagAndClassify(sb, text, ctx, 'asset-to-fragments-v1/notiz', defaultGutachtenTeil),
        embed(sb, text, ctx, 'asset-to-fragments-v1/notiz/embedding')
      ]);
      // Merge inherited + auto tags
      const allTags = Array.from(new Set([...inheritedTags, ...tag.tags]));
      const { data: fragRow, error: fragErr } = await sb.from('befund_fragmente').insert({
        auftrag_id, workspace_id: ctx.workspace_id, created_by: ctx.user_id,
        quelle_typ: 'notiz', quelle_asset_id: notiz_id,
        text, tags: allTags, raumbezug: tag.raumbezug,
        gutachten_teil: tag.gutachten_teil ?? defaultGutachtenTeil,
        reihenfolge: i + idx,
        embedding: emb.vec.length > 0 ? JSON.stringify(emb.vec) : null,
        status: 'roh', ki_generiert: true, ki_protokoll_id: tag.ki_id
      }).select('id').single();
      if (fragErr) throw new Error(`FRAG_INSERT_FAILED: ${fragErr.message}`);
      return { id: fragRow.id, text, tags: allTags, reihenfolge: i + idx };
    }));
    results.push(...batchResults);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════

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
  const { asset_typ, asset_id, auftrag_id } = body || {};
  if (!asset_typ || !asset_id || !auftrag_id) {
    return J({ error: 'BAD_REQUEST', detail: 'asset_typ, asset_id, auftrag_id required' }, 400);
  }

  // Workspace lookup ueber auftrag
  const { data: auftrag } = await sb.from('auftraege').select('workspace_id').eq('id', auftrag_id).maybeSingle();
  if (!auftrag) return J({ error: 'AUFTRAG_NOT_FOUND' }, 404);

  const ctx: KiCtx = {
    workspace_id: auftrag.workspace_id,
    user_id: userData.user.id,
    auftrag_id
  };

  const t0 = Date.now();
  try {
    let fragments: unknown[];
    switch (asset_typ) {
      case 'diktat':
        fragments = await extractFromAudio(sb, asset_id, auftrag_id, ctx);
        break;
      case 'foto':
        fragments = await extractFromPhoto(sb, asset_id, auftrag_id, ctx);
        break;
      case 'skizze':
        fragments = await extractFromSketch(sb, asset_id, auftrag_id, ctx);
        break;
      case 'notiz':
        fragments = await extractFromNote(sb, asset_id, auftrag_id, ctx);
        break;
      default:
        return J({ error: 'UNKNOWN_ASSET_TYPE', asset_typ }, 400);
    }
    return J({
      success: true,
      asset_typ,
      asset_id,
      auftrag_id,
      fragments_count: fragments.length,
      fragments,
      dauer_ms: Date.now() - t0
    }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return J({ error: 'EXTRACTION_FAILED', detail: msg, dauer_ms: Date.now() - t0 }, 500);
  }
});
