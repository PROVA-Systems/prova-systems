/**
 * PROVA — send-referral-reminders.js (MEGA²⁷.7 Block 3)
 *
 * Cron-Lambda (täglich 14:00 UTC via netlify.toml).
 * Findet pending referrals (5-6 Tage alt, kein Reminder bisher) und
 * sendet Auto-Reminder-Email an Geworbenen.
 *
 * Anti-Spam: max 1 Auto-Reminder pro referral (reminder_count == 0 Filter).
 *
 * Auth: PROVA_INTERNAL_WRITE_SECRET via X-PROVA-Internal Header
 *       (Netlify-Cron oder externer Trigger)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

/**
 * Findet alle pending referrals im Tag-5-bis-Tag-6-Window mit reminder_count=0.
 */
async function findPendingReferralsForReminder(sb) {
  if (!sb) return [];
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  try {
    const { data } = await sb.from('referrals')
      .select('id, code, referrer_email, referrer_user_id, referred_email, expires_at, reminder_count, created_at')
      .eq('status', 'pending')
      .eq('reminder_count', 0)
      .lte('created_at', fiveDaysAgo.toISOString())
      .gte('created_at', sixDaysAgo.toISOString())
      .gt('expires_at', now.toISOString())
      .limit(100);
    return data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Send Reminder-Email + increment reminder_count.
 */
async function sendReminderEmail(sb, referral) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, skipped: 'no_smtp_env' };
  }
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch (e) { return { ok: false, skipped: 'nodemailer_missing' }; }

  // Werber-Name lookup (best-effort)
  let werberName = referral.referrer_email;
  try {
    const { data: u } = await sb.from('users')
      .select('full_name')
      .eq('id', referral.referrer_user_id)
      .maybeSingle();
    if (u && u.full_name) werberName = u.full_name;
  } catch (_) { /* graceful */ }

  // Time-Math
  const now = new Date();
  const expiresAt = new Date(referral.expires_at);
  const msLeft = Math.max(0, expiresAt.getTime() - now.getTime());
  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
  const daysLeft = Math.max(1, Math.ceil(hoursLeft / 24));

  const baseUrl = process.env.REFERRAL_BASE_URL || 'https://prova-systems.de';

  let html, text;
  try {
    const Renderer = require('../../lib/email-renderer');
    const vars = {
      WERBER_NAME: werberName,
      GEWORBENER_EMAIL: referral.referred_email || '',
      CODE: referral.code || '',
      REDEMPTION_URL: baseUrl + '/r/' + (referral.code || ''),
      HOURS_LEFT: String(hoursLeft),
      DAYS_LEFT: String(daysLeft)
    };
    const rendered = Renderer.renderTemplate('referral-reminder', vars);
    html = rendered.html;
    text = rendered.text;
  } catch (e) {
    text = 'Hi,\n\nnur noch ' + daysLeft + ' Tage, bis dein Rabatt-Code ablaeuft!\n'
      + 'Code: ' + referral.code + '\n'
      + 'Link: ' + baseUrl + '/r/' + referral.code + '\n\n'
      + werberName + ' freut sich, wenn du PROVA testest.\n\nPROVA-Systems';
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const mailOptions = {
      from: process.env.SMTP_FROM_REFERRAL || 'PROVA Empfehlung <empfehlung@prova-systems.de>',
      to: referral.referred_email,
      subject: '⏰ Erinnerung: Dein 50€ Rabatt läuft in ' + daysLeft + ' Tagen ab',
      text: text,
      replyTo: referral.referrer_email || undefined
    };
    if (html) mailOptions.html = html;
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }

  // Auth via Internal-Secret (Cron-Trigger)
  const secret = String(event.headers['x-prova-internal'] || event.headers['X-PROVA-Internal'] || '').trim();
  const expected = String(process.env.PROVA_INTERNAL_WRITE_SECRET || '');
  if (!expected || secret !== expected) {
    return json(event, 403, { error: 'Forbidden' });
  }

  const sb = getSupabase();
  if (!sb) return json(event, 503, { error: 'Supabase not configured' });

  const candidates = await findPendingReferralsForReminder(sb);
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const ref of candidates) {
    try {
      const result = await sendReminderEmail(sb, ref);
      if (result.ok) {
        try {
          await sb.from('referrals').update({
            reminder_count: (ref.reminder_count || 0) + 1
          }).eq('id', ref.id);
          sent++;
        } catch (e) {
          errors.push({ id: ref.id, phase: 'update', error: e.message });
        }
      } else {
        failed++;
        if (result.error) errors.push({ id: ref.id, phase: 'send', error: result.error });
      }
    } catch (e) {
      failed++;
      errors.push({ id: ref.id, phase: 'loop', error: e.message });
    }
  }

  return json(event, 200, {
    ok: true,
    candidates: candidates.length,
    sent,
    failed,
    errors
  });
}, { functionName: 'send-referral-reminders' });

exports._test = { findPendingReferralsForReminder, sendReminderEmail };
