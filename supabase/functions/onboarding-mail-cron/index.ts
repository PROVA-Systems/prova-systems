import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SCHEDULE_DAYS = [
  { day: 0, template: 'WELCOME-DAY-0', subject: 'Willkommen bei PROVA Systems' },
  { day: 1, template: 'FIRST-AUFTRAG-DAY-1', subject: 'Bereit für Ihren ersten Fall?' },
  { day: 3, template: 'CHECK-IN-DAY-3', subject: 'Tag 3 — wie läufts?' },
  { day: 7, template: 'FEEDBACK-DAY-7', subject: 'Halbzeit — Ihr Feedback zählt' },
  { day: 14, template: 'RENEWAL-DAY-14', subject: 'Ihre Trial endet morgen' }
];
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function daysSince(dateIso: string | null): number | null { if (!dateIso) return null; return Math.floor((Date.now() - new Date(dateIso).getTime()) / 86400000); }
async function sendViaResend(to: string, subject: string, html: string): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no-api-key' };
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey }, body: JSON.stringify({ from: 'PROVA Systems <onboarding@prova-systems.de>', to: [to], subject, html }) });
    if (!res.ok) return { ok: false, reason: 'http-' + res.status };
    return { ok: true };
  } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let totalSent = 0;
  const results: any[] = [];
  const { data: users, error } = await sb.from('users').select('id, email, vorname, created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  if (error) return jsonResponse({ error: error.message }, 500);
  for (const user of (users ?? [])) {
    const days = daysSince(user.created_at);
    const slot = SCHEDULE_DAYS.find(s => s.day === days);
    if (!slot) continue;
    const { data: existing } = await sb.from('onboarding_mails_sent').select('id').eq('user_id', user.id).eq('template', slot.template).maybeSingle();
    if (existing) continue;
    const html = '<p>Hallo ' + (user.vorname || 'Sachverständiger') + ',</p>' + '<p>Tag ' + slot.day + ' Ihrer Trial — Template ' + slot.template + '.</p>';
    const sendResult = await sendViaResend(user.email, slot.subject, html);
    await sb.from('onboarding_mails_sent').insert({ user_id: user.id, template: slot.template, sent_at: new Date().toISOString(), success: sendResult.ok, error_reason: sendResult.ok ? null : sendResult.reason });
    if (sendResult.ok) totalSent++;
    results.push({ user_id: user.id, template: slot.template, ok: sendResult.ok });
  }
  return jsonResponse({ sent: totalSent, total_checked: (users ?? []).length, results });
});
