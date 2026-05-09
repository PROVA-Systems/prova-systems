/* PROVA Edge — support-ticket-create (User-JWT) */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const user = userData.user;

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  const betreff = String(body?.betreff ?? '').trim().slice(0, 200);
  const beschreibung = String(body?.beschreibung ?? '').trim().slice(0, 5000);
  const kategorie = String(body?.kategorie ?? 'allgemein').slice(0, 50);
  const prio = String(body?.prio ?? 'normal').slice(0, 20);
  if (!betreff || !beschreibung) return J({ error: 'betreff und beschreibung erforderlich' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.from('support_tickets').insert({
    user_id: user.id,
    sv_email: user.email,
    betreff, beschreibung, kategorie, prio,
    status: 'Offen',
    quelle: 'edge',
    user_agent: req.headers.get('user-agent') ?? null
  }).select('id, status, created_at').maybeSingle();
  if (error) return J({ error: error.message }, 500);

  // Best-effort: Marcel notify via Resend
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + resendKey },
      body: JSON.stringify({
        from: 'PROVA Support <support@prova-systems.de>',
        to: ['kontakt@prova-systems.de'],
        subject: '[PROVA] Neues Ticket: ' + betreff,
        html: '<p><b>Von:</b> ' + (user.email ?? '?') + '</p><p><b>Kategorie:</b> ' + kategorie + ' / Prio: ' + prio + '</p><p>' + beschreibung.replace(/\n/g, '<br>') + '</p><p><i>Ticket-ID: ' + (data as any)?.id + '</i></p>'
      })
    }).catch(() => {});
  }

  return J({ ok: true, ticket: data }, 201);
});
