/* PROVA Edge — log-legal-acceptance (Welle 6)
   POST { types: [...], onboarding_schritt? } — RPC record_einwilligung.
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const VALID_TYPES = ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung', 'newsletter', 'cookies_marketing', 'cookies_analytics', 'ki_einsatz'];
const PFLICHT_TYPES = ['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung'];
const NO_DOC_TYPES = ['newsletter', 'cookies_marketing', 'cookies_analytics'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const types = Array.isArray(body?.types) ? body.types : null;
  if (!types?.length) return J({ error: 'types[] erforderlich' }, 400);
  for (const t of types) {
    if (typeof t !== 'string' || !VALID_TYPES.includes(t)) {
      return J({ error: 'invalid type', value: t, valid: VALID_TYPES }, 400);
    }
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const ua = req.headers.get('user-agent') ?? null;
  const pageUrl = req.headers.get('referer') ?? null;
  const onboardingSchritt = typeof body?.onboarding_schritt === 'string' ? body.onboarding_schritt : null;

  const results: Array<Record<string, unknown>> = [];
  for (const typ of types) {
    try {
      const { data: rd, error: rdErr } = await sb.from('rechtsdokumente')
        .select('id, version, inhalt_hash').eq('typ', typ).eq('aktuell', true).maybeSingle();

      let rpcParams: Record<string, unknown>;
      if (rdErr) { results.push({ type: typ, error: rdErr.message, code: 'RD_QUERY_FAILED' }); continue; }
      if (!rd) {
        if (NO_DOC_TYPES.includes(typ)) {
          rpcParams = { p_typ: typ, p_rechtsdokument_id: null, p_version: 'no-document', p_inhalt_hash: 'no-document' };
        } else {
          results.push({ type: typ, error: 'kein aktuelles rechtsdokument', code: 'NO_ACTIVE_DOC' });
          continue;
        }
      } else {
        rpcParams = { p_typ: typ, p_rechtsdokument_id: rd.id, p_version: rd.version, p_inhalt_hash: rd.inhalt_hash };
      }
      Object.assign(rpcParams, {
        p_ip_address: ip, p_user_agent: ua, p_session_id: null,
        p_onboarding_schritt: onboardingSchritt, p_page_url: pageUrl
      });

      const { data: einwId, error: rpcErr } = await sb.rpc('record_einwilligung', rpcParams);
      if (rpcErr) results.push({ type: typ, error: rpcErr.message, code: 'RPC_FAILED' });
      else results.push({ type: typ, einwilligung_id: einwId, ok: true, version: (rd as any)?.version });
    } catch (e) {
      results.push({ type: typ, error: e instanceof Error ? e.message : String(e), code: 'UNEXPECTED' });
    }
  }

  const successTypes = results.filter(r => r.ok).map(r => r.type);
  const failedTypes = results.filter(r => !r.ok).map(r => r.type);
  const pflichtAsked = PFLICHT_TYPES.filter(t => types.includes(t));
  const pflichtOk = pflichtAsked.every(t => successTypes.includes(t as string));

  if (!pflichtOk && successTypes.length === 0) {
    return J({ error: 'Alle Pflicht-Einwilligungen fehlgeschlagen', results }, 500);
  }
  return J({
    ok: true, results, partial: failedTypes.length > 0,
    success_count: successTypes.length, failed_count: failedTypes.length,
    force_later: !pflichtOk
  });
});
