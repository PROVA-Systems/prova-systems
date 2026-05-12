// MEGA⁶⁵ Item 3.5 — set-ki-wirkung Edge Function
// Datum: 2026-05-12
//
// Updated ki_protokoll.wirkung nach SV-Entscheidung (Accept/Reject/Bearbeitet).
// Trigger update_ki_wirkung_timestamp (MEGA⁶²) setzt wirkung_set_at + wirkung_set_by automatisch.
//
// Input:  { ki_protokoll_id: uuid, wirkung: 'uebernommen'|'verworfen'|'bearbeitet' }
// Auth:   JWT (verify_jwt=true)

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

const VALID_WIRKUNG = new Set(['uebernommen', 'verworfen', 'bearbeitet']);

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
  const { ki_protokoll_id, wirkung } = body || {};

  if (!ki_protokoll_id || typeof ki_protokoll_id !== 'string') {
    return J({ error: 'BAD_REQUEST', detail: 'ki_protokoll_id (uuid) required' }, 400);
  }
  if (!VALID_WIRKUNG.has(wirkung)) {
    return J({ error: 'BAD_REQUEST', detail: `wirkung must be one of: ${[...VALID_WIRKUNG].join('|')}` }, 400);
  }

  // RLS schuetzt automatisch — nur eigener Workspace
  const { data: row, error: loadErr } = await sb
    .from('ki_protokoll')
    .select('id, workspace_id, auftrag_id, purpose, wirkung')
    .eq('id', ki_protokoll_id)
    .maybeSingle();

  if (loadErr) return J({ error: 'DB_ERROR', detail: loadErr.message }, 500);
  if (!row) return J({ error: 'NOT_FOUND_OR_FORBIDDEN' }, 404);

  if (row.wirkung === wirkung) {
    return J({ success: true, already_set: true, wirkung }, 200);
  }

  const { error: updErr } = await sb
    .from('ki_protokoll')
    .update({ wirkung })
    .eq('id', ki_protokoll_id);
  // Trigger update_ki_wirkung_timestamp setzt wirkung_set_at + wirkung_set_by automatisch.

  if (updErr) return J({ error: 'UPDATE_FAILED', detail: updErr.message }, 500);

  // Audit-Trail-Eintrag bei uebernommen/bearbeitet
  if (wirkung === 'uebernommen' || wirkung === 'bearbeitet') {
    try {
      await sb.from('audit_trail').insert({
        workspace_id: row.workspace_id,
        user_id: userData.user.id,
        action: 'ki_response',
        entity_typ: 'ki_protokoll',
        entity_id: ki_protokoll_id,
        kategorie: 'ki_einsatz',
        source: 'sv_uebernommen',
        payload: { purpose: row.purpose, wirkung, auftrag_id: row.auftrag_id }
      });
    } catch (e) {
      console.warn('[set-ki-wirkung] audit_trail insert failed:', e);
    }
  }

  return J({ success: true, ki_protokoll_id, wirkung }, 200);
});
