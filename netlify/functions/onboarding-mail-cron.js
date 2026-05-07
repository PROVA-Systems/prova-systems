/**
 * netlify/functions/onboarding-mail-cron.js — MEGA³⁴ B2
 *
 * Daily 09:00 UTC Cron.
 * Findet User mit signup_date_minus_now in {0, 1, 3, 7, 14}.
 * Schickt entsprechendes Onboarding-Template via Resend.
 *
 * Idempotent: prüft onboarding_mails_sent vor Versand.
 *
 * Schedule registriert in netlify.toml.
 */
'use strict';

const SCHEDULE_DAYS = [
  { day: 0, template: 'WELCOME-DAY-0', subject: 'Willkommen bei PROVA Systems' },
  { day: 1, template: 'FIRST-AUFTRAG-DAY-1', subject: 'Bereit für Ihren ersten Fall?' },
  { day: 3, template: 'CHECK-IN-DAY-3', subject: 'Tag 3 — wie läuft\'s?' },
  { day: 7, template: 'FEEDBACK-DAY-7', subject: 'Halbzeit — Ihr Feedback zählt' },
  { day: 14, template: 'RENEWAL-DAY-14', subject: 'Ihre Trial endet morgen' }
];

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

function daysSince(dateIso) {
  if (!dateIso) return null;
  const ms = Date.now() - new Date(dateIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function sendViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no-api-key' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        from: 'PROVA Systems <onboarding@prova-systems.de>',
        to: [to],
        subject: subject,
        html: html
      })
    });
    if (!res.ok) return { ok: false, reason: 'http-' + res.status };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

exports.handler = async function (event) {
  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 200, body: JSON.stringify({ sent: 0, reason: 'supabase-not-configured' }) };
  }

  let totalSent = 0;
  const results = [];

  // Alle User mit Trial-Start in den letzten 30 Tagen laden
  const { data: users, error } = await sb.from('users')
    .select('id, email, vorname, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  for (const user of (users || [])) {
    const days = daysSince(user.created_at);
    const slot = SCHEDULE_DAYS.find(s => s.day === days);
    if (!slot) continue;

    // Idempotenz-Check
    const { data: existing } = await sb.from('onboarding_mails_sent')
      .select('id').eq('user_id', user.id).eq('template', slot.template).maybeSingle();
    if (existing) continue;

    // Template laden (production: PDFMonkey-Template-Render-Endpoint oder static file)
    // Hier: Subject + simpler HTML, Marcel kann später PDFMonkey-Render einsetzen
    const html = '<p>Hallo ' + (user.vorname || 'Sachverständiger') + ',</p>'
               + '<p>Tag ' + slot.day + ' Ihrer Trial — Template ' + slot.template + '.</p>';

    const sendResult = await sendViaResend(user.email, slot.subject, html);

    // Log in onboarding_mails_sent (idempotent)
    await sb.from('onboarding_mails_sent').insert({
      user_id: user.id,
      template: slot.template,
      sent_at: new Date().toISOString(),
      success: sendResult.ok,
      error_reason: sendResult.ok ? null : sendResult.reason
    });

    if (sendResult.ok) totalSent++;
    results.push({ user_id: user.id, template: slot.template, ok: sendResult.ok });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent: totalSent, total_checked: (users || []).length, results })
  };
};

module.exports.__SCHEDULE_DAYS = SCHEDULE_DAYS;
module.exports.__daysSince = daysSince;
