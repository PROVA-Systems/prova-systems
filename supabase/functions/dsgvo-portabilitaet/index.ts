/* PROVA Edge — dsgvo-portabilitaet (Welle 6)
   GET — JSON-Export aller User-Daten via RPC dsgvo_user_portabilitaet (DSGVO Art. 20).
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await sb.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const userId = userData.user.id;
  const { data, error } = await sb.rpc('dsgvo_user_portabilitaet', { p_user_id: userId });
  if (error) {
    const status = error.code === '42501' ? 403 : 500;
    return new Response(JSON.stringify({ error: error.message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  await sb.from('audit_trail').insert({
    user_id: userId, action: 'data_export_dsgvo', entity_typ: 'user', entity_id: userId,
    payload: { gdpr_article: 'Art. 20', format: 'json' }
  });

  const filename = 'prova-export-' + userId + '-' + new Date().toISOString().slice(0, 10) + '.json';
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
});
