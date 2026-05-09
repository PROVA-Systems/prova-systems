/* PROVA Edge — team-interest (Public Lead-Capture) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  const email = String(body?.email ?? '').trim().toLowerCase();
  const name = body?.name ? String(body.name).slice(0, 100) : null;
  const team_groesse = body?.team_groesse ? String(body.team_groesse).slice(0, 20) : null;
  const message = body?.message ? String(body.message).slice(0, 1000) : null;

  if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(email)) return J({ error: 'gültige email erforderlich' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.from('team_interests').insert({
    email, name, team_groesse, message,
    quelle: 'landing-page',
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
    user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null
  });
  // Tabelle existiert evtl. nicht — defensive Audit-Log fallback
  if (error) {
    await sb.from('audit_trail').insert({
      action: 'create', entity_typ: 'team_interest',
      payload: { email, name, team_groesse, message, fallback_reason: error.message }
    });
  }

  // Notify Marcel
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + resendKey },
      body: JSON.stringify({
        from: 'PROVA Lead <leads@prova-systems.de>',
        to: ['kontakt@prova-systems.de'],
        subject: '[PROVA] Team-Interest: ' + email,
        html: '<p><b>Email:</b> ' + email + '</p><p><b>Name:</b> ' + (name ?? '?') + '</p><p><b>Team:</b> ' + (team_groesse ?? '?') + '</p><p>' + (message ?? '').replace(/\n/g, '<br>') + '</p>'
      })
    }).catch(() => {});
  }

  return J({ ok: true, message: 'Vielen Dank! Wir melden uns binnen 24h.' });
});
