import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function daysDiff(targetISO: string, today: Date): number { const t = new Date(targetISO + 'T00:00:00Z'); return Math.round((t.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)); }
async function sendReminderEmail(opts: any): Promise<{ sent: boolean; reason?: string; status?: number }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { sent: false, reason: 'no-resend-key' };
  const from = Deno.env.get('RESEND_FROM') ?? 'noreply@prova-systems.de';
  const days = opts.days_until;
  const subject = days === 1 ? 'PROVA: Frist ist morgen fällig' : 'PROVA: Frist in ' + days + ' Tagen';
  const body = '<p>Hallo,</p><p>folgende Frist ist fällig:</p><ul>' + '<li><strong>Typ:</strong> ' + opts.frist_typ + '</li>' + '<li><strong>Datum:</strong> ' + opts.datum_soll + ' (in ' + days + ' Tag' + (days === 1 ? '' : 'en') + ')</li>' + (opts.notiz ? '<li><strong>Notiz:</strong> ' + opts.notiz + '</li>' : '') + (opts.rechtsgrundlage ? '<li><strong>Rechtsgrundlage:</strong> ' + opts.rechtsgrundlage + '</li>' : '') + '</ul><p>—<br>PROVA Fristen-Reminder</p>';
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: opts.to, subject, html: body }) });
    return { sent: res.ok, status: res.status };
  } catch (e) { return { sent: false, reason: e instanceof Error ? e.message : String(e) }; }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const expected = Deno.env.get('FRISTEN_CRON_SECRET');
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!expected || provided !== expected) return jsonResponse({ error: 'Unauthorized — X-Cron-Secret missing or wrong' }, 401);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const todayISO = today.toISOString().slice(0, 10);
  const max = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const { data: fristen, error } = await sb.from('fristen').select('id,auftrag_id,frist_typ,datum_soll,erinnerung_tage_vor,erinnerung_letzte_versendet_am,notiz,rechtsgrundlage,created_by_user_id').eq('status', 'offen').is('deleted_at', null).gte('datum_soll', todayISO).lte('datum_soll', max);
  if (error) return jsonResponse({ error: error.message }, 500);
  let processed = 0, sent = 0, skipped = 0;
  for (const f of (fristen ?? [])) {
    processed++;
    const days = daysDiff(f.datum_soll, today);
    const pattern = Array.isArray(f.erinnerung_tage_vor) ? f.erinnerung_tage_vor : [14, 7, 3, 1];
    if (!pattern.includes(days)) { skipped++; continue; }
    if (f.erinnerung_letzte_versendet_am === todayISO) { skipped++; continue; }
    const { data: profile } = await sb.from('users').select('email').eq('id', f.created_by_user_id).maybeSingle();
    if (!profile?.email) { skipped++; continue; }
    const r = await sendReminderEmail({ to: profile.email, frist_typ: f.frist_typ, datum_soll: f.datum_soll, days_until: days, notiz: f.notiz, rechtsgrundlage: f.rechtsgrundlage });
    if (r.sent) { sent++; await sb.from('fristen').update({ erinnerung_letzte_versendet_am: todayISO }).eq('id', f.id); }
  }
  return jsonResponse({ processed, sent, skipped, today: todayISO });
});
