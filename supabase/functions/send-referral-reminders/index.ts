import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-prova-internal'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function findPendingReferralsForReminder(sb: any): Promise<any[]> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 86400000);
  try {
    const { data } = await sb.from('referrals')
      .select('id, code, referrer_email, referrer_user_id, referred_email, expires_at, reminder_count, created_at')
      .eq('status', 'pending')
      .eq('reminder_count', 0)
      .lte('created_at', fiveDaysAgo.toISOString())
      .gte('created_at', sixDaysAgo.toISOString())
      .gt('expires_at', now.toISOString())
      .limit(100);
    return data ?? [];
  } catch { return []; }
}

async function sendReminderEmail(sb: any, referral: any): Promise<{ ok: boolean; reason?: string; error?: string }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no_resend_key' };
  const from = Deno.env.get('PROVA_RESEND_FROM_REFERRAL') ?? Deno.env.get('PROVA_RESEND_FROM') ?? 'PROVA Empfehlung <empfehlung@prova-systems.de>';

  let werberName = referral.referrer_email;
  try {
    const { data: u } = await sb.from('users').select('full_name').eq('id', referral.referrer_user_id).maybeSingle();
    if (u?.full_name) werberName = u.full_name;
  } catch { /* graceful */ }

  const now = new Date();
  const expiresAt = new Date(referral.expires_at);
  const msLeft = Math.max(0, expiresAt.getTime() - now.getTime());
  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
  const daysLeft = Math.max(1, Math.ceil(hoursLeft / 24));
  const baseUrl = Deno.env.get('REFERRAL_BASE_URL') || 'https://prova-systems.de';

  const subject = '⏰ Erinnerung: Dein 50€ Rabatt läuft in ' + daysLeft + ' Tagen ab';
  const text = 'Hi,\n\nnur noch ' + daysLeft + ' Tage, bis dein Rabatt-Code ablaeuft!\n'
    + 'Code: ' + referral.code + '\n'
    + 'Link: ' + baseUrl + '/r/' + referral.code + '\n\n'
    + werberName + ' freut sich, wenn du PROVA testest.\n\nPROVA-Systems';

  const html = '<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:auto;padding:20px;color:#0f172a;line-height:1.55;">'
    + '<h2 style="color:#f59e0b;">⏰ Nur noch ' + daysLeft + ' Tag' + (daysLeft === 1 ? '' : 'e') + '</h2>'
    + '<p>Hi,</p>'
    + '<p><strong>' + escapeHtml(werberName) + '</strong> hat dir PROVA-Systems empfohlen — dein Rabatt-Code wartet noch auf Einlösung.</p>'
    + '<div style="background:linear-gradient(135deg,#92400e 0%,#f59e0b 100%);color:#fff;padding:18px 22px;border-radius:10px;margin:18px 0;">'
    +   '<div style="font-size:14px;font-weight:600;opacity:.95;">DEIN VORTEIL</div>'
    +   '<div style="font-size:22px;font-weight:800;margin:6px 0;">50 € Rabatt im 1. Monat</div>'
    +   '<div style="font-size:13px;">Code: <strong>' + escapeHtml(referral.code) + '</strong></div>'
    + '</div>'
    + '<p style="text-align:center;margin:22px 0;">'
    +   '<a href="' + baseUrl + '/r/' + escapeHtml(referral.code) + '" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 26px;border-radius:9px;text-decoration:none;font-weight:700;">Jetzt einlösen →</a>'
    + '</p>'
    + '<p style="font-size:12px;color:#64748b;">Läuft ab in ' + hoursLeft + ' Stunden.</p>'
    + '</body></html>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [referral.referred_email], subject, text, html, reply_to: referral.referrer_email })
    });
    if (!res.ok) return { ok: false, error: 'http_' + res.status };
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const secret = (req.headers.get('x-prova-internal') ?? '').trim();
  const expected = Deno.env.get('PROVA_INTERNAL_WRITE_SECRET') ?? '';
  if (!expected || secret !== expected) return jsonResponse({ error: 'Forbidden' }, 403);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const candidates = await findPendingReferralsForReminder(sb);
  let sent = 0, failed = 0;
  const errors: any[] = [];

  for (const ref of candidates) {
    try {
      const result = await sendReminderEmail(sb, ref);
      if (result.ok) {
        try {
          await sb.from('referrals').update({ reminder_count: (ref.reminder_count || 0) + 1 }).eq('id', ref.id);
          sent++;
        } catch (e) { errors.push({ id: ref.id, phase: 'update', error: e instanceof Error ? e.message : String(e) }); }
      } else {
        failed++;
        if (result.error) errors.push({ id: ref.id, phase: 'send', error: result.error });
      }
    } catch (e) {
      failed++;
      errors.push({ id: ref.id, phase: 'loop', error: e instanceof Error ? e.message : String(e) });
    }
  }

  return jsonResponse({ ok: true, candidates: candidates.length, sent, failed, errors });
});
