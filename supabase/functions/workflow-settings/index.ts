import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const VALID_MODES = ['A', 'B', 'C'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function defaults() {
  return { default_mode: 'A', mode_a_template_pref: null, mode_b_editor_config: null, mode_c_vorlagen_ids: [], onboarding_completed: false, _fallback: true };
}

function validateBody(body: any): { ok: true; updates: any } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
  const updates: any = {};
  const errs: string[] = [];
  if (body.default_mode !== undefined) {
    if (!VALID_MODES.includes(body.default_mode)) errs.push('default_mode must be A|B|C');
    else updates.default_mode = body.default_mode;
  }
  if (body.mode_a_template_pref !== undefined) {
    if (typeof body.mode_a_template_pref !== 'string' && body.mode_a_template_pref !== null) errs.push('mode_a_template_pref must be string|null');
    else updates.mode_a_template_pref = body.mode_a_template_pref;
  }
  if (body.mode_b_editor_config !== undefined) {
    if (typeof body.mode_b_editor_config !== 'object') errs.push('mode_b_editor_config must be object');
    else updates.mode_b_editor_config = body.mode_b_editor_config;
  }
  if (body.mode_c_vorlagen_ids !== undefined) {
    if (!Array.isArray(body.mode_c_vorlagen_ids)) errs.push('mode_c_vorlagen_ids must be array');
    else if (!body.mode_c_vorlagen_ids.every((id: any) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) errs.push('mode_c_vorlagen_ids must contain valid UUIDs');
    else updates.mode_c_vorlagen_ids = body.mode_c_vorlagen_ids;
  }
  if (body.onboarding_completed !== undefined) {
    if (typeof body.onboarding_completed !== 'boolean') errs.push('onboarding_completed must be boolean');
    else updates.onboarding_completed = body.onboarding_completed;
  }
  if (errs.length) return { ok: false, error: errs.join('; ') };
  if (Object.keys(updates).length === 0) return { ok: false, error: 'no valid fields to update' };
  return { ok: true, updates };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  if (req.method === 'GET') {
    try {
      const { data, error } = await sb.from('user_workflow_settings')
        .select('default_mode, mode_a_template_pref, mode_b_editor_config, mode_c_vorlagen_ids, onboarding_completed, updated_at')
        .eq('user_id', user.id).maybeSingle();
      if (error) {
        if (/does not exist/i.test(error.message)) return J(defaults());
        return J({ error: 'db query failed', detail: error.message }, 500);
      }
      if (!data) return J(defaults());
      return J({ ...data, _fallback: false });
    } catch (e) {
      return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    let body: any;
    try { body = await req.json(); } catch { return J({ error: 'invalid JSON' }, 400); }
    const v = validateBody(body);
    if (!v.ok) return J({ error: v.error }, 400);

    const { data, error } = await sb.from('user_workflow_settings')
      .upsert({ user_id: user.id, ...v.updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select().maybeSingle();
    if (error) {
      if (/does not exist/i.test(error.message)) return J({ error: 'workflow-settings table not migrated' }, 503);
      return J({ error: 'upsert failed', detail: error.message }, 500);
    }
    return J({ ...data, _fallback: false });
  }

  return J({ error: 'Method Not Allowed', allowed: ['GET', 'PATCH', 'PUT'] }, 405);
});
