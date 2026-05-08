import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FOUNDING_TOTAL = 10;
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function renderTemplate(name: string, trialEndDate: string, foundingRemaining: number): string {
  const foundingHint = foundingRemaining > 0 ? '<p style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 12px;"><strong>⚡ Nur noch ' + foundingRemaining + ' Founding-Plätze</strong> — 99€ lifetime statt 179€/Mo. Aktion endet bei 10 Plätzen.</p>' : '';
  return '<!DOCTYPE html><html><body style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">' +
    '<h2>Hallo ' + (name || 'Sachverständiger') + ',</h2>' +
    '<p>Ihre PROVA-Trial endet am <strong>' + trialEndDate + '</strong> — in 3 Tagen.</p>' +
    '<p>Damit Sie ohne Unterbrechung weiterarbeiten können, wählen Sie jetzt Ihren Plan:</p>' +
    foundingHint +
    '<p><a href="https://app.prova-systems.de/pricing.html" style="display: inline-block; background: #4f8ef7; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Plan wählen</a></p>' +
    '<p>Bei Fragen einfach antworten.</p>' +
    '<p>Beste Grüße,<br>PROVA Team</p>' +
    '</body></html>';
}
async function sendResend(to: string, subject: string, html: string): Promise<{ sent: boolean }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { sent: false };
  const from = Deno.env.get('PROVA_RESEND_FROM') ?? Deno.env.get('RESEND_FROM') ?? 'PROVA Systems <noreply@prova-systems.de>';
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) });
    return { sent: res.ok };
  } catch { return { sent: false }; }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const expected = Deno.env.get('PROVA_EMAIL_CRON_SECRET') ?? Deno.env.get('EMAIL_CRON_SECRET');
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!expected || provided !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const trialEnd = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const { data: workspaces, error } = await sb.from('workspaces').select('id, name, trial_end, owner_user_id').eq('trial_end', trialEnd);
  if (error) return jsonResponse({ error: error.message }, 500);
  const { count: totalWorkspaces } = await sb.from('workspaces').select('id', { count: 'exact', head: true });
  const foundingRemaining = Math.max(0, FOUNDING_TOTAL - (totalWorkspaces ?? 0));
  let sent = 0, skipped = 0;
  for (const w of (workspaces ?? [])) {
    const { data: owner } = await sb.from('users').select('email, vorname').eq('id', w.owner_user_id).maybeSingle();
    if (!owner?.email) { skipped++; continue; }
    const html = renderTemplate(owner.vorname ?? '', new Date(w.trial_end).toLocaleDateString('de-DE'), foundingRemaining);
    const r = await sendResend(owner.email, '⏱️ PROVA — Trial endet in 3 Tagen', html);
    if (r.sent) sent++; else skipped++;
  }
  return jsonResponse({ processed: (workspaces ?? []).length, sent, skipped, trial_end: trialEnd });
});
