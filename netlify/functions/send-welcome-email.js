/**
 * PROVA — send-welcome-email.js (MEGA²⁶ Phase 6)
 *
 * Trigger: nach erfolgreichem Pilot-Signup oder Founding-Member-Activation.
 *
 * POST /.netlify/functions/send-welcome-email
 *   Body: { email, firstname?, persona?, founding_member? }
 *
 * Best-Effort Email via SMTP (siehe admin-impersonate.js Pattern).
 * Fire-and-forget — Failure blockt Signup-Flow nicht.
 *
 * Auth: PROVA_INTERNAL_WRITE_SECRET im Header `X-PROVA-Internal`
 *       (Lambda-zu-Lambda-Call von signup-Flow).
 *
 * ENV-Vars: SMTP_HOST/USER/PASS/FROM/PORT, PROVA_INTERNAL_WRITE_SECRET
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

/**
 * Build Welcome-Email-Body (DE).
 * @param {object} opts { firstname, persona, founding_member, referrer_name }
 * @returns {{subject:string, text:string, html:string}}
 */
function buildWelcomeEmail(opts) {
  opts = opts || {};
  const fn = String(opts.firstname || '').trim() || 'Sachverständiger';
  const isFounding = !!opts.founding_member;
  const referrerName = String(opts.referrer_name || '').trim();
  const isReferred = referrerName.length > 0;
  const subject = isFounding
    ? '🎯 Willkommen als Founding-Member bei PROVA — Deine ersten 30 Min'
    : 'Willkommen bei PROVA — Deine ersten 30 Min';

  const greeting = `Hallo ${fn},`;

  const intro = isFounding
    ? `danke für deine Anmeldung als Founding-Member. Du gehörst zu den ersten 10 SVs, die PROVA produktiv nutzen — mit 125 €/Monat lifetime statt 179 €.`
    : `danke für deine Anmeldung als Pilot-SV. Die nächsten 90 Tage sind Trial-Phase, danach 179 €/Monat (oder Founding 125 €/Monat lifetime falls du noch einen Spot ergatterst).`;

  const steps = [
    '',
    'DEINE ERSTEN 30 MINUTEN MIT PROVA:',
    '',
    '1. Welcome-Wizard (5 Min)',
    '   → app.prova-systems.de',
    '   → Persona wählen: Solo / Team / SV-Anwalt',
    '   → Modus wählen: A (Standard) / B (Editor) / C (Vorlage)',
    '   → Tour starten',
    '   → Demo-Akte ansehen',
    '',
    '2. Erste echte Akte (5 Min)',
    '   → "Neue Akte" → Aktenzeichen + Schadenart',
    '   → Auftraggeber-Daten ausfüllen',
    '   → Speichern',
    '',
    '3. Diktat + Strukturierung (10 Min)',
    '   → "Vor-Ort-Diktat starten"',
    '   → Mikrofon-Berechtigung erteilen',
    '   → Befunde diktieren (Whisper transkribiert)',
    '',
    '4. §6 Fachurteil (10 Min)',
    '   → SV-Editor öffnen',
    '   → Mindestens 500 Zeichen + 2 Qualitäts-Marker',
    '   → Freigabe → automatisches PDF',
    '',
    'WICHTIG — §407a ZPO:',
    'KI ist Strukturhilfe, KEIN Gutachten-Generator.',
    'Du bleibst nach §407a Abs. 3 ZPO eigenverantwortlich.',
    '',
    'HILFE?',
    'Schreibe einfach diese Email zurück. Antwortzeit < 24h,',
    'in der Pilot-Phase oft < 1h.',
    '',
    'Vollständige FAQ: prova-systems.de/pilot-faq.html',
    '',
    'Beste Grüße,',
    'Marcel Schreiber',
    '',
    '— PROVA Systems',
    'ö.b.u.v. Sachverständiger nach §36 GewO'
  ].join('\n');

  // MEGA²⁷.6 Block 2: IS_REFERRED-Block (wenn User durch Empfehlung kam)
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

  // Minimal-HTML-Variante (text-Hauptverwendung)
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

/**
 * MEGA²⁷.6 Block 2: Lookup ob User durch Empfehlung kam.
 * Returns referrer-name oder null.
 */
async function lookupReferrerForUser(sb, userId) {
  if (!sb || !userId) return null;
  try {
    const { data: ref } = await sb.from('referrals')
      .select('referrer_user_id, referrer_email')
      .eq('referred_user_id', userId)
      .in('status', ['active', 'hold', 'rewarded'])
      .limit(1)
      .maybeSingle();
    if (!ref) return null;
    // Lookup name via users-table (best-effort)
    try {
      const { data: u } = await sb.from('users')
        .select('full_name')
        .eq('id', ref.referrer_user_id)
        .maybeSingle();
      if (u && u.full_name) return u.full_name;
    } catch (_) { /* graceful */ }
    // Fallback: email als Name
    return ref.referrer_email || null;
  } catch (_) {
    return null;
  }
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Send via nodemailer (best-effort).
 */
async function sendEmail(to, email) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, skipped: 'no_smtp_env' };
  }
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch (e) { return { ok: false, skipped: 'nodemailer_missing' }; }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'PROVA <noreply@prova-systems.de>',
    to,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
  return { ok: true };
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  // Auth: Internal-Secret-Pattern (Lambda-zu-Lambda)
  const secret = String(event.headers['x-prova-internal'] || event.headers['X-PROVA-Internal'] || '').trim();
  const expected = String(process.env.PROVA_INTERNAL_WRITE_SECRET || '');
  if (!expected || secret !== expected) {
    return json(event, 403, { error: 'Forbidden — Internal-Secret required' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(event, 400, { error: 'Invalid JSON' }); }

  const to = String(body.email || '').trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return json(event, 400, { error: 'valid email required' });
  }

  // MEGA²⁷.6 Block 2: Referrer-Lookup wenn user_id vorhanden
  let referrerName = null;
  if (body.user_id) {
    try {
      const sbMod = require('./lib/storage-router');
      const sb = sbMod && sbMod.getSupabase ? sbMod.getSupabase() : null;
      if (sb) referrerName = await lookupReferrerForUser(sb, body.user_id);
    } catch (_) { /* graceful: kein Referrer-Block, normale Welcome */ }
  }

  const email = buildWelcomeEmail({
    firstname: body.firstname,
    persona: body.persona,
    founding_member: body.founding_member,
    referrer_name: referrerName
  });

  try {
    const result = await sendEmail(to, email);
    if (!result.ok) {
      // Best-effort fail mit klarem Status
      return json(event, 200, {
        ok: false,
        skipped: result.skipped,
        message: 'Email queued but not sent (env missing)',
        subject: email.subject
      });
    }
    return json(event, 200, { ok: true, subject: email.subject, is_referred: !!email.is_referred });
  } catch (e) {
    return json(event, 500, { error: 'send failed', detail: e.message });
  }
}, { functionName: 'send-welcome-email' });

// Test-Exports
exports._test = {
  buildWelcomeEmail,
  lookupReferrerForUser,
  sendEmail,
  escapeHtml
};
