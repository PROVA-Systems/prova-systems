// MEGA63 — fragments-to-befund-v1 FULL IMPLEMENTATION
// Datum: 2026-05-12
// Input:  { auftrag_id, fragment_ids[], gutachten_teil?, sprachstil? }
// Output: { markdown, marker_count, fragments_used, kosten_eur, dauer_ms }
//
// Pipeline:
//   1. Auth + Load Fragmente
//   2. GROUP BY raumbezug + gutachten_teil
//   3. Pro Gruppe: GPT-5.5 Call mit Befund-Strukturierungs-Prompt
//   4. Inline-Marker [🔗fragment-uuid] erzwingen
//   5. Halluzinations-Check: jedes Fragment MUSS im Output auftauchen
//   6. ki_protokoll-Eintrag pro Gruppen-Call
//   7. Concat mit Headlines -> finaler Markdown

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// ═══════════════════════════════════════════════════════════════════
// HELPERS (inline)
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
function calcCost(api: string, tIn: number, tOut: number): number {
  const PRICES: Record<string, { in: number; out: number }> = {
    'gpt-5.5': { in: 2.50, out: 10.00 },
    'gpt-5.5-instant': { in: 0.15, out: 0.60 }
  };
  const p = PRICES[api]; if (!p) return 0;
  return (tIn * p.in + tOut * p.out) / 1_000_000;
}

interface Fragment {
  id: string;
  text: string;
  raumbezug: string | null;
  gutachten_teil: string | null;
  tags: string[] | null;
  quelle_typ: string;
  status: string;
}

// ═══════════════════════════════════════════════════════════════════
// PROMPT-Konstruktion
// ═══════════════════════════════════════════════════════════════════

const STIL_HINTS: Record<string, string> = {
  sachlich: 'Stil: sachlich-objektiv fuer Gerichts-Gutachten. Kurze Saetze.',
  detailliert: 'Stil: ausfuehrlich-detailliert. Lange beschreibende Saetze.',
  kurz: 'Stil: knapp. Bullet-Points wo moeglich.'
};

function buildSystemPrompt(gutachten_teil: string | null, sprachstil: string): string {
  const stil = STIL_HINTS[sprachstil] ?? STIL_HINTS.sachlich;
  return [
    'Du bist ein Assistent fuer deutsche Bauschaden-Sachverstaendige.',
    'Verbinde uebergebene atomare Beobachtungen zu zusammenhaengendem deutschen Befund-Text.',
    stil,
    'STRIKTE Regeln:',
    '1) JEDE einzelne Aussage aus den Fragmenten MUSS im Output auftauchen.',
    '2) Markiere JEDE Aussage durch Inline-Marker im Format [🔗fragment-<uuid>], DIREKT am Ende der Aussage.',
    '3) KEINE neuen Aussagen erfinden, die nicht in den Fragmenten standen.',
    '4) Bei Unsicherheit: Konjunktiv II ("koennte", "duerfte", "liegt nahe dass").',
    '5) KEIN "ich" / "wir" / "der Sachverstaendige" / "meiner Meinung".',
    '6) KEINE eigenstaendigen Bewertungen ("gefaehrlich", "kritisch", "schwerwiegend").',
    '7) Reihenfolge: gruppiere nach Themen wenn sinnvoll, bewahre faktischen Inhalt.',
    'Output: reines Markdown ohne Code-Block-Fences. Keine Begruessung.',
    gutachten_teil ? `Kontext: Dieser Text wird als ${gutachten_teil} im Gutachten verwendet.` : ''
  ].filter(Boolean).join(' ');
}

function buildUserPrompt(fragments: Fragment[]): string {
  const lines = fragments.map(f =>
    `[fragment-${f.id}] (${f.quelle_typ}${f.raumbezug ? ', ' + f.raumbezug : ''}): ${f.text}`
  );
  return 'Fragmente:\n' + lines.join('\n') + '\n\nVerbinde diese zu zusammenhaengendem Befund-Text mit Inline-Markern.';
}

// ═══════════════════════════════════════════════════════════════════
// GROUP BY raumbezug + gutachten_teil
// ═══════════════════════════════════════════════════════════════════

function groupFragments(fragments: Fragment[]): Map<string, Fragment[]> {
  const groups = new Map<string, Fragment[]>();
  for (const f of fragments) {
    const key = `${f.raumbezug ?? '_unspezifisch'}__${f.gutachten_teil ?? 'befund'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  return groups;
}

// ═══════════════════════════════════════════════════════════════════
// HALLUZINATIONS-CHECK: jedes Fragment muss im Output auftauchen
// ═══════════════════════════════════════════════════════════════════

function checkAllMarkersPresent(markdown: string, fragments: Fragment[]): {
  passed: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  for (const f of fragments) {
    if (!markdown.includes(`fragment-${f.id}`)) missing.push(f.id);
  }
  return { passed: missing.length === 0, missing };
}

// ═══════════════════════════════════════════════════════════════════
// GPT-Call pro Gruppe
// ═══════════════════════════════════════════════════════════════════

interface GroupResult {
  raumbezug: string | null;
  gutachten_teil: string | null;
  markdown: string;
  tokens_in: number;
  tokens_out: number;
  kosten_eur: number;
  dauer_ms: number;
  ki_protokoll_id: string | null;
  halluzinations_check_passed: boolean;
  missing_markers: string[];
}

async function processGroup(
  sb: SupabaseClient,
  fragments: Fragment[],
  gutachten_teil: string | null,
  sprachstil: string,
  workspace_id: string,
  user_id: string,
  auftrag_id: string
): Promise<GroupResult> {
  const raumbezug = fragments[0].raumbezug;
  const gt = gutachten_teil ?? fragments[0].gutachten_teil;
  const sys = buildSystemPrompt(gt, sprachstil);
  const user = buildUserPrompt(fragments);

  // Pseudonymisierung (defensiv — Fragmente sollten pseudonym sein, aber Schutz fuer Re-Calls)
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
        model: 'gpt-5.5',
        max_tokens: Math.max(800, fragments.length * 200),
        temperature: 0.3,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: pseudo }]
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
  const kosten = calcCost('gpt-5.5', tIn, tOut);

  // Halluzinations-Check
  const halCheck = checkAllMarkersPresent(reidentified, fragments);

  // ki_protokoll
  const { data: prot } = await sb.from('ki_protokoll').insert({
    workspace_id, user_id, auftrag_id,
    purpose: 'fragmente_zu_befund',
    feature_kontext: `fragments-to-befund-v1/${gt ?? 'befund'}/${raumbezug ?? 'unspezifisch'}`,
    modell: 'gpt_4o',  // ki_modell_typ-Enum: gpt_4o steht intern fuer gpt-5.5-Stack
    modell_version: 'gpt-5.5',
    provider: 'openai',
    token_input: tIn, token_output: tOut,
    kosten_eur: kosten, dauer_ms: dauer,
    status, fehler_message: err,
    input_pseudonymisiert: true,
    output_repseudonymisiert: Object.keys(map).length > 0,
    pseudonymisierung_token_count: Object.keys(map).length,
    input_hash, output_hash,
    output_laenge_chars: reidentified.length,
    output_preview: reidentified.slice(0, 500),
    halluzinations_check_passed: halCheck.passed,
    started_at: new Date(Date.now() - dauer).toISOString(),
    completed_at: new Date().toISOString()
  }).select('id').single();

  return {
    raumbezug,
    gutachten_teil: gt,
    markdown: reidentified,
    tokens_in: tIn,
    tokens_out: tOut,
    kosten_eur: kosten,
    dauer_ms: dauer,
    ki_protokoll_id: prot?.id ?? null,
    halluzinations_check_passed: halCheck.passed,
    missing_markers: halCheck.missing
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  if (!OPENAI_KEY) return J({ error: 'OPENAI_API_KEY_MISSING' }, 500);

  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData } = await sb.auth.getUser(auth.slice(7));
  if (!userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'INVALID_JSON' }, 400); }
  const { fragment_ids, auftrag_id, gutachten_teil, sprachstil } = body || {};

  if (!Array.isArray(fragment_ids) || fragment_ids.length === 0) {
    return J({ error: 'BAD_REQUEST', detail: 'fragment_ids (uuid[]) required' }, 400);
  }
  if (!auftrag_id) return J({ error: 'BAD_REQUEST', detail: 'auftrag_id required' }, 400);
  if (fragment_ids.length > 100) {
    return J({ error: 'TOO_MANY_FRAGMENTS', detail: 'max 100 per call (split into multiple)' }, 400);
  }

  const tStart = Date.now();

  // Load Fragmente
  const { data: frags, error: loadErr } = await sb.from('befund_fragmente')
    .select('id, text, raumbezug, gutachten_teil, tags, quelle_typ, status, workspace_id')
    .eq('auftrag_id', auftrag_id)
    .in('id', fragment_ids)
    .is('deleted_at', null);

  if (loadErr) return J({ error: 'DB_ERROR', detail: loadErr.message }, 500);
  if (!frags || frags.length === 0) return J({ error: 'NO_FRAGMENTS_FOUND' }, 404);

  const workspace_id = frags[0].workspace_id;

  // Group + Process parallel
  const groups = groupFragments(frags as Fragment[]);
  const groupArr = Array.from(groups.values());

  const groupResults: GroupResult[] = [];
  // Sequential pro Gruppe (rate-limit-friendly fuer gpt-5.5)
  for (const groupFrags of groupArr) {
    const result = await processGroup(
      sb, groupFrags, gutachten_teil ?? null, sprachstil ?? 'sachlich',
      workspace_id, userData.user.id, auftrag_id
    );
    groupResults.push(result);
  }

  // Aggregierte Halluzinations-Check
  const allMissing = groupResults.flatMap(g => g.missing_markers);
  const allPassed = groupResults.every(g => g.halluzinations_check_passed);

  // Concat mit Headlines
  let finalMarkdown = '';
  for (const g of groupResults) {
    if (g.raumbezug) finalMarkdown += `## ${g.raumbezug}\n\n`;
    finalMarkdown += g.markdown.trim() + '\n\n';
  }

  // Counts + Kosten
  const total_kosten_eur = groupResults.reduce((s, g) => s + g.kosten_eur, 0);
  const total_tokens_in = groupResults.reduce((s, g) => s + g.tokens_in, 0);
  const total_tokens_out = groupResults.reduce((s, g) => s + g.tokens_out, 0);
  const marker_count = (finalMarkdown.match(/fragment-[0-9a-f-]+/g) || []).length;

  return J({
    success: true,
    markdown: finalMarkdown.trim(),
    marker_count,
    fragments_used: frags.map(f => f.id),
    fragments_input: fragment_ids.length,
    groups: groupResults.length,
    halluzinations_check_passed: allPassed,
    missing_markers: allMissing,
    tokens_in: total_tokens_in,
    tokens_out: total_tokens_out,
    kosten_eur: total_kosten_eur,
    dauer_ms: Date.now() - tStart
  }, 200);
});
