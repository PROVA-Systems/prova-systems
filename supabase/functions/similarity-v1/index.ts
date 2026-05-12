// MEGA62 Phase 0 Item 0.10 — similarity-v1 (FULL)
// Datum: 2026-05-12
// pgvector cosine-similarity wrapper. Ruft RPC find_similar_fragments auf.
//
// Input:  { fragment_id: uuid, scope?: 'auftrag'|'workspace', limit?: number }
// Output: { results: [{ id, text, similarity, auftrag_id, status }] }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

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
  const { fragment_id, scope, limit } = body || {};
  if (!fragment_id || typeof fragment_id !== 'string') {
    return J({ error: 'BAD_REQUEST', detail: 'fragment_id (uuid) required' }, 400);
  }
  const scopeNorm = scope === 'auftrag' ? 'auftrag' : 'workspace';
  const limitNorm = Math.max(1, Math.min(100, Number(limit ?? 10)));

  const { data, error } = await sb.rpc('find_similar_fragments', {
    p_fragment_id: fragment_id,
    p_scope: scopeNorm,
    p_limit: limitNorm
  });

  if (error) {
    const msg = error.message || String(error);
    if (msg.includes('INVALID_SCOPE') || msg.includes('INVALID_LIMIT')) {
      return J({ error: 'BAD_REQUEST', detail: msg }, 400);
    }
    return J({ error: 'DB_ERROR', detail: msg }, 500);
  }

  return J({
    success: true,
    scope: scopeNorm,
    limit: limitNorm,
    count: (data ?? []).length,
    results: data ?? []
  }, 200);
});
