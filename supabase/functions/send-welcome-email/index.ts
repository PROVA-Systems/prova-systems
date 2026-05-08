import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-prova-internal'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildWelcomeEmail(opts: any): { subject: string; text: string; html: string; is_referred: boolean } {
  const fn = String(opts.firstname || '').trim() || 'Sachverständiger';
  const isFounding = !!opts.founding_member;
  const referrerName = String(opts.referrer_name || '').trim();
  const isReferred = referrerName.length > 0;
  const subject = isFounding
    ? '🎯 Willkommen als Founding-Member bei PROVA — Deine ersten 30 Min'
    : 'Willkommen bei PROVA — Deine ersten 30 Min';
  const greeting = 'Hallo ' + fn + ',';
  const intro = isFounding
    ? 'danke für deine Anmeldung als Founding-Member. Du gehörst zu den ersten 10 SVs, die PROVA produktiv nutzen — mit 99 €/Monat lifetime statt 179 €.'
    : 'danke für deine Anmeldung als Pilot-SV. Die nächsten 90 Tage sind Trial-Phase, danach 179 €/Monat (oder Founding 99 €/Monat lifetime falls du noch einen Spot ergatterst).';
  const steps = [
    '', 'DEINE ERSTEN 30 MINUTEN MIT PROVA:', '',
    '1. Welcome-Wizard (5 Min)', '   → app.prova-systems.de', '   → Persona wählen: Solo / Team / SV-Anwalt', '   → Modus wählen: A (Standard) / B (Editor) / C (Vorlage)', '   → Tour starten', '   → Demo-Akte ansehen', '',
    '2. Erste echte Akte (5 Min)', '   → "Neue Akte" → Aktenzeichen + Schadenart', '   → Auftraggeber-Daten ausfüllen', '   → Speichern', '',
    '3. Diktat + Strukturierung (10 Min)', '   → "Vor-Ort-Diktat starten"', '   → Mikrofon-Berechtigung erteilen', '   → Befunde diktieren (Whisper transkribiert)', '',
    '4. §6 Fachurteil (10 Min)', '   → SV-Editor öffnen', '   → Mindestens 500 Zeichen + 2 Qualitäts-Marker', '   → Freigabe → automatisches PDF', '',
    'WICHTIG — §407a ZPO:', 'KI ist Strukturhilfe, KEIN Gutachten-Generator.', 'Du bleibst nach §407a Abs. 3 ZPO eigenverantwortlich.', '',
    'HILFE?', 'Schreibe einfach diese Email zurück. Antwortzeit < 24h,', 'in der Pilot-Phase oft < 1h.', '',
    'Vollständige FAQ: prova-systems.de/pilot-faq.html', '',
    'Beste Grüße,', 'Marcel Schreiber', '', '— PROVA Systems', 'ö.b.u.v. Sachverständiger nach §36 GewO'
  ].join('\n');

  const referredTextBlock = isReferred
    ? '\n🎉 EMPFOHLEN VON ' + referrerName.toUpperCase() + '\n'
      + 'Du sparst 50 € in deinem 1. Monat dank ' + referrerName + '.\n'
      + 'Dein Kollege bekommt 1 Monat gratis, sobald deine Sub 30 Tage aktiv ist.\n'
    : '';
  const referredHtmlBlock = isReferred
    ? '<div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#ffffff;padding:18px 22px;border-radius:10px;margin:12px 0 18px;">'
      + '<div style="font-size:16px;font-weight:700;margin-bottom:6px;">🎉 Empfohlen von ' + escapeHtml(referrerName) + '!</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,0.92);line-height:1.55;">Du sparst <strong>50 € in deinem 1. Monat</strong>. '
      + escapeHtml(referrerName) + ' bekommt 1 Monat gratis, sobald deine Sub 30 Tage aktiv ist.</div>'
      + '</div>'
    : '';

  const text = greeting + '\n\n' + referredTextBlock + intro + '\n' + steps;
  const html = '<!DOCTYPE html><html lang="de"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:auto;padding:20px;color:#0f172a;line-height:1.6;">'
    + '<h2 style="color:#3b82f6;">' + escapeHtml(subject) + '</h2>'
    + '<p>' + escapeHtml(greeting) + '</p>'
    + referredHtmlBlock
    + '<p>' + escapeHtml(intro) + '</p>'
    + '<pre style="background:#f8fafc;padding:14px;border-radius:8px;font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;">'
    + escapeHtml(steps) + '</pre>'
    + '<p style="font-size:11px;color:#64748b;margin-top:20px;">— PROVA Systems · §36 GewO</p>'
    + '</body></html>';
  return { subject, text, html, is_referred: isReferred };
}

async function lookupReferrerForUser(sb: any, userId: string): Promise<string | null> {
  if (!sb || !userId) return null;
  try {
    const { data: ref } = await sb.from('referrals')
      .select('referrer_user_id, referrer_email')
      .eq('referred_user_id', userId)
      .in('status', ['active', 'hold', 'rewarded'])
      .limit(1)
      .maybeSingle();
    if (!ref) return null;
    try {
      const { data: u } = await sb.from('users').select('full_name').eq('id', ref.referrer_user_id).maybeSingle();
      if (u?.full_name) return u.full_name;
    } catch { /* graceful */ }
    return ref.referrer_email ?? null;
  } catch { return null; }
}

async function sendResend(to: string, email: { subject: string; text: string; html: string }): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no_resend_key' };
  const from = Deno.env.get('PROVA_RESEND_FROM') ?? Deno.env.get('RESEND_FROM') ?? 'PROVA Systems <noreply@prova-systems.de>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: email.subject, text: email.text, html: email.html })
    });
    if (!res.ok) return { ok: false, reason: 'http_' + res.status };
    return { ok: true };
  } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const secret = (req.headers.get('x-prova-internal') ?? '').trim();
  const expected = Deno.env.get('PROVA_INTERNAL_WRITE_SECRET') ?? '';
  if (!expected || secret !== expected) return jsonResponse({ error: 'Forbidden — Internal-Secret required' }, 403);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const to = String(body.email || '').trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return jsonResponse({ error: 'valid email required' }, 400);

  let referrerName: string | null = null;
  if (body.user_id) {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      referrerName = await lookupReferrerForUser(sb, body.user_id);
    } catch { /* graceful */ }
  }

  const email = buildWelcomeEmail({ firstname: body.firstname, persona: body.persona, founding_member: body.founding_member, referrer_name: referrerName });
  const result = await sendResend(to, email);
  if (!result.ok) return jsonResponse({ ok: false, skipped: result.reason, message: 'Email queued but not sent', subject: email.subject });
  return jsonResponse({ ok: true, subject: email.subject, is_referred: email.is_referred });
});
