import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const MAX_RETRIES = 5;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function pad3(n: number): string { return String(n).padStart(3, '0'); }

async function nextNr(sb: any, workspaceId: string, jahr: number): Promise<number> {
  await sb.from('bescheinigungs_sequences').upsert(
    { workspace_id: workspaceId, jahr, letzte_nr: 0 },
    { onConflict: 'workspace_id,jahr', ignoreDuplicates: true }
  );
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: cur, error: sErr } = await sb.from('bescheinigungs_sequences')
      .select('letzte_nr').eq('workspace_id', workspaceId).eq('jahr', jahr).maybeSingle();
    if (sErr) throw new Error('SELECT-Fehler: ' + sErr.message);
    const oldNr = cur?.letzte_nr ?? 0;
    const newNr = oldNr + 1;
    const { data: upd, error: uErr } = await sb.from('bescheinigungs_sequences')
      .update({ letzte_nr: newNr, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId).eq('jahr', jahr).eq('letzte_nr', oldNr)
      .select('letzte_nr').maybeSingle();
    if (uErr) throw new Error('UPDATE-Fehler: ' + uErr.message);
    if (upd && upd.letzte_nr === newNr) return newNr;
    await new Promise((r) => setTimeout(r, 30 + attempt * 20));
  }
  throw new Error('Sequenz-Konflikt nach ' + MAX_RETRIES + ' Versuchen');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* graceful */ }
  const jahr = (typeof body.jahr === 'number' && body.jahr >= 2020 && body.jahr <= 2099) ? body.jahr : new Date().getFullYear();

  const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
  if (!ms) return J({ error: 'Kein Workspace für User gefunden' }, 404);

  try {
    const nr = await nextNr(sb, ms.workspace_id, jahr);
    return J({ aktenzeichen: 'BES-' + jahr + '-' + pad3(nr), nr, jahr, workspace_id: ms.workspace_id });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
