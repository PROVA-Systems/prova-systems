import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SOFT_DELETE_DAYS = 30;
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
async function sendConfirmEmail(toEmail: string, vorname: string | null, scheduledFor: string): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no-resend-key' };
  const html = '<p>Hallo ' + (vorname || 'Sachverständiger') + ',</p>' + '<p>Wir haben Ihren Antrag auf Löschung Ihrer Daten gemäß DSGVO Art. 17 erhalten.</p>' + '<p><strong>Geplante Löschung:</strong> ' + scheduledFor + ' (in ' + SOFT_DELETE_DAYS + ' Tagen)</p>' + '<p>Bis dahin sind Ihre Daten gesperrt — Sie können sich noch einloggen, aber kein neuer Auftrag wird erstellt. Sollten Sie den Antrag widerrufen wollen, antworten Sie auf diese Email innerhalb von 30 Tagen.</p>' + '<p>Nach Ablauf werden alle personenbezogenen Daten unwiderruflich gelöscht. Gutachten-PDFs werden gemäß § 11 IHK-SVO 10 Jahre archiviert (gesetzliche Aufbewahrungspflicht), aber pseudonymisiert (kein Personenbezug mehr).</p>' + '<p>PROVA Systems · marcel.schreiber891@gmail.com</p>';
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey }, body: JSON.stringify({ from: 'PROVA Systems <datenschutz@prova-systems.de>', to: [toEmail], subject: 'DSGVO-Löschungs-Antrag bestätigt — Bearbeitung in ' + SOFT_DELETE_DAYS + ' Tagen', html }) });
    if (!res.ok) return { ok: false, reason: 'http-' + res.status };
    return { ok: true };
  } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(auth.slice(7));
  if (userError || !userData?.user?.email) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
  const userEmail = userData.user.email;
  let body: any; try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  if (body?.confirm !== true) return jsonResponse({ error: 'confirm:true pflicht — DSGVO Art. 17 erfordert ausdrückliche Bestätigung' }, 400);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: user, error: uErr } = await sb.from('users').select('id, email, vorname, dsgvo_loeschen_geplant_am, workspace_memberships!inner(workspace_id)').eq('email', userEmail).maybeSingle();
  if (uErr || !user) return jsonResponse({ error: 'User nicht gefunden: ' + (uErr?.message ?? 'no-row') }, 404);
  if ((user as any).dsgvo_loeschen_geplant_am) return jsonResponse({ error: 'Bereits geplant', scheduled_for: (user as any).dsgvo_loeschen_geplant_am }, 409);
  const scheduledFor = new Date(Date.now() + SOFT_DELETE_DAYS * 86400000).toISOString();
  const { error: updErr } = await sb.from('users').update({ dsgvo_loeschen_geplant_am: scheduledFor }).eq('id', (user as any).id);
  if (updErr) return jsonResponse({ error: 'Soft-Delete fehlgeschlagen: ' + updErr.message }, 500);
  const workspaceId = (user as any).workspace_memberships?.[0]?.workspace_id;
  const { data: audit, error: auditErr } = await sb.from('audit_trail').insert({ workspace_id: workspaceId, user_id: (user as any).id, action: 'data_delete_dsgvo', entity_typ: 'user', entity_id: (user as any).id, payload: { requested_at: new Date().toISOString(), scheduled_for: scheduledFor, soft_delete_days: SOFT_DELETE_DAYS, gdpr_article: 'Art. 17', ip_country: req.headers.get('cf-ipcountry') ?? null } }).select('id').maybeSingle();
  const mailResult = await sendConfirmEmail((user as any).email, (user as any).vorname ?? null, scheduledFor);
  return jsonResponse({ antrag_id: (audit as any)?.id, user_id: (user as any).id, scheduled_for: scheduledFor, soft_delete_days: SOFT_DELETE_DAYS, audit_trail_logged: !auditErr, mail_sent: mailResult.ok, mail_error: mailResult.ok ? null : mailResult.reason, next_steps: 'Sie können den Antrag binnen ' + SOFT_DELETE_DAYS + ' Tagen widerrufen (Email an datenschutz@prova-systems.de).' }, 201);
});
