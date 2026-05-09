/* PROVA Edge — dsgvo-loeschen (Welle 6)
   Hard-Delete via RPC dsgvo_user_loeschen nach 30-Tage-Grace.
   Aufruf: User selbst (sofortig) ODER Cron mit FRISTEN_CRON_SECRET.
   Anti-Pattern: Service-Role da User-RPC zu restriktiv für Cascade-Delete.
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('FRISTEN_CRON_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const cronHeader = req.headers.get('x-cron-secret');
  const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  if (isCron) {
    // Cron-Modus: alle User mit dsgvo_loeschen_geplant_am < NOW() hard-deleten
    const { data: due, error: dueErr } = await sb
      .from('users')
      .select('id, email')
      .lt('dsgvo_loeschen_geplant_am', new Date().toISOString())
      .not('dsgvo_loeschen_geplant_am', 'is', null);
    if (dueErr) return J({ error: dueErr.message }, 500);
    const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];
    for (const u of (due ?? [])) {
      const { error: delErr } = await sb.rpc('dsgvo_user_loeschen', { p_user_id: u.id });
      results.push({ user_id: u.id, ok: !delErr, error: delErr?.message });
    }
    return J({ ok: true, mode: 'cron', processed: results.length, results });
  }

  // User-Modus: muss authentifiziert sein
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);

  if (body?.confirm !== true) return J({ error: 'confirm:true pflicht (DSGVO Art. 17)' }, 400);

  const userId = userData.user.id;
  const { error: delErr } = await sb.rpc('dsgvo_user_loeschen', { p_user_id: userId });
  if (delErr) return J({ error: 'Löschung fehlgeschlagen: ' + delErr.message }, 500);

  await sb.from('audit_trail').insert({
    user_id: userId, action: 'data_delete_dsgvo', entity_typ: 'user', entity_id: userId,
    payload: { gdpr_article: 'Art. 17', mode: 'user-self', reason: body?.reason ?? null }
  });

  return J({ ok: true, hinweis: 'Personenbezogene Daten gelöscht. Rechnungen werden gem. §257 HGB 10 Jahre pseudonymisiert aufbewahrt.' });
});
