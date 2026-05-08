import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_BOOKING_URL = 'https://cal.eu/marcel.schreiber/prova-pilot-feedback';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function renderTemplate(name: string, az: string, bookingUrl: string): string {
  return '<!DOCTYPE html><html><body style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">' +
    '<h2>Hallo ' + (name || 'Sachverständiger') + ',</h2>' +
    '<p>Sie haben vor 7 Tagen Ihren ersten echten Auftrag (Az. ' + az + ') in PROVA angelegt — wie läuft’s?</p>' +
    '<p>Ich bin Marcel, Co-Founder von PROVA. Ich würde mich über 15 Min Feedback freuen — buchen Sie sich einen Slot:</p>' +
    '<p><a href="' + bookingUrl + '" style="display: inline-block; background: #4f8ef7; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Termin buchen</a></p>' +
    '<p>Oder einfach diese Mail beantworten.</p>' +
    '<p>Beste Grüße,<br>Marcel Schreiber<br>PROVA Systems</p>' +
    '</body></html>';
}
async function sendResend(to: string, subject: string, html: string, replyTo?: string): Promise<{ sent: boolean }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { sent: false };
  const from = Deno.env.get('PROVA_RESEND_FROM') ?? Deno.env.get('RESEND_FROM') ?? 'Marcel von PROVA <marcel@prova-systems.de>';
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo && { reply_to: replyTo }) }) });
    return { sent: res.ok };
  } catch { return { sent: false }; }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const expected = Deno.env.get('PROVA_EMAIL_CRON_SECRET') ?? Deno.env.get('EMAIL_CRON_SECRET');
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!expected || provided !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
  const { data: auftraege, error } = await sb.from('auftraege').select('id, az, workspace_id, created_at, created_by_user_id').eq('is_demo', false).gte('created_at', eightDaysAgo).lt('created_at', sevenDaysAgo);
  if (error) return jsonResponse({ error: error.message }, 500);
  const byUser: Record<string, any> = {};
  for (const a of (auftraege ?? [])) { if (!a.created_by_user_id) continue; if (!byUser[a.created_by_user_id]) byUser[a.created_by_user_id] = a; }
  const bookingUrl = Deno.env.get('PROVA_BOOKING_URL') ?? Deno.env.get('PROVA_CALENDLY_URL') ?? DEFAULT_BOOKING_URL;
  let sent = 0, skipped = 0;
  for (const userId of Object.keys(byUser)) {
    const a = byUser[userId];
    const { data: user } = await sb.from('users').select('email, vorname').eq('id', userId).maybeSingle();
    if (!user?.email) { skipped++; continue; }
    const html = renderTemplate(user.vorname ?? '', a.az, bookingUrl);
    const r = await sendResend(user.email, '🤝 PROVA — wie läuft’s? (Marcel persönlich)', html, 'marcel@prova-systems.de');
    if (r.sent) sent++; else skipped++;
  }
  return jsonResponse({ processed: Object.keys(byUser).length, sent, skipped });
});
