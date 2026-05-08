const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret' };
function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function renderTemplate(vars: Record<string, string>): string {
  const trial = vars.trial_end_date || new Date(Date.now() + 14 * 86400000).toLocaleDateString('de-DE');
  const name = vars.user_first_name || 'Sachverständiger';
  const loginUrl = vars.login_url || 'https://app.prova-systems.de';
  const demoLine = vars.demo_fall_id ? '<p>Schauen Sie sich Ihren Demo-Fall an: <a href="' + loginUrl + '/akte.html?id=' + vars.demo_fall_id + '">Demo-Fall öffnen</a></p>' : '';
  return '<!DOCTYPE html><html><body style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0b1120; color: #e8eaf0;">' +
    '<h1 style="color: #4f8ef7;">Willkommen bei PROVA, ' + name + '!</h1>' +
    '<p>Ihre 14-Tage-Trial läuft bis: <strong>' + trial + '</strong></p>' +
    '<h2>Ihre ersten 5 Schritte</h2>' +
    '<ol><li>Profil + Briefkopf einrichten</li><li>Ersten Auftrag anlegen</li><li>Diktat aufnehmen</li><li>§6 Fachurteil schreiben</li><li>PDF generieren</li></ol>' +
    demoLine +
    '<p style="margin-top: 24px;"><a href="' + loginUrl + '" style="display: inline-block; background: #4f8ef7; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Jetzt einloggen</a></p>' +
    '<p style="margin-top: 32px; font-size: 12px; color: #64748b;">PROVA Systems · prova-systems.de</p>' +
    '</body></html>';
}
async function sendResend(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string; status?: number }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { sent: false, reason: 'no-resend-key' };
  const from = Deno.env.get('PROVA_RESEND_FROM') ?? Deno.env.get('RESEND_FROM') ?? 'PROVA Systems <noreply@prova-systems.de>';
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) });
    return { sent: res.ok, status: res.status };
  } catch (e) { return { sent: false, reason: e instanceof Error ? e.message : String(e) }; }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const expected = Deno.env.get('PROVA_EMAIL_CRON_SECRET') ?? Deno.env.get('EMAIL_CRON_SECRET');
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!expected || provided !== expected) return jsonResponse({ error: 'Unauthorized — X-Cron-Secret missing' }, 401);
  let body: any; try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  if (!body?.user_email) return jsonResponse({ error: 'user_email pflicht' }, 400);
  const html = renderTemplate({ user_email: body.user_email, user_first_name: body.user_first_name, trial_end_date: body.trial_end_date, login_url: body.login_url, demo_fall_id: body.demo_fall_id });
  const r = await sendResend(body.user_email, 'Willkommen bei PROVA — deine ersten 5 Schritte', html);
  return jsonResponse(r, r.sent ? 200 : 502);
});
