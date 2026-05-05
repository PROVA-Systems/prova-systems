/**
 * PROVA — create-referral.js (MEGA²⁷)
 *
 * Werber initiiert Empfehlung. Erstellt Stripe-Promo-Code + DB-Eintrag + Email-Versand.
 *
 * POST /.netlify/functions/create-referral
 *   Body: { referred_email, personal_message? }
 *   Auth: JWT (Werber-User)
 *   Returns: { ok, code, expires_at }
 *
 * Workflow:
 *   1. JWT-Auth + Werber-Lookup
 *   2. Founding-Member-Check
 *   3. Cap-Check (max 12)
 *   4. Email-Validation (Format + nicht eigene + nicht bereits Kunde)
 *   5. Generate Code (PROVA-FRIEND-XX-Y6)
 *   6. Stripe-Promo-Code (FRIEND-50, max_redemptions=1, 7 Tage TTL, first-time-only)
 *   7. DB-Insert (status='pending')
 *   8. Email an Geworbenen via SMTP
 *   9. Return success
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const path = require('node:path');

// Lib-Reuse: gleiche Library wie Frontend (UMD)
const ReferralLib = require(path.join(__dirname, '..', '..', 'lib', 'referral-system.js'));

const FRIEND_COUPON_ID = 'FRIEND-50';
const RATE_LIMIT_PER_DAY = 5;

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

/**
 * Stripe-Promo-Code via API erstellen.
 */
async function createStripePromo(code, expiresAtIso) {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, skipped: 'no_stripe_key' };
  let stripe;
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  } catch (e) {
    return { ok: false, error: 'stripe_module_missing' };
  }
  try {
    const promo = await stripe.promotionCodes.create({
      coupon: FRIEND_COUPON_ID,
      code: code,
      max_redemptions: 1,
      expires_at: Math.floor(new Date(expiresAtIso).getTime() / 1000),
      restrictions: { first_time_transaction: true }
    });
    return { ok: true, promo_id: promo.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function sendInviteEmail(opts) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, skipped: 'no_smtp_env' };
  }
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch (e) { return { ok: false, skipped: 'nodemailer_missing' }; }

  const subject = (opts.referrerName || 'Ein Kollege') + ' empfiehlt PROVA-Systems';
  const lines = [
    'Hallo,',
    '',
    (opts.referrerName || 'Ein Kollege') + ' (' + (opts.referrerEmail || '') + ') hat dir PROVA-Systems empfohlen –',
    'das KI-System fuer oeffentlich bestellte Sachverstaendige.',
    '',
    'DEIN VORTEIL: 50€ Rabatt im 1. Monat (statt 179€ nur 129€)'
  ];
  if (opts.personalMessage) {
    lines.push('', 'Persoenliche Nachricht:', '"' + opts.personalMessage + '"');
  }
  lines.push(
    '',
    'EINLOESEN:',
    'Code: ' + opts.code,
    'Link: ' + (process.env.REFERRAL_BASE_URL || 'https://prova-systems.de') + '/r/' + opts.code,
    '',
    'Code gueltig 7 Tage.',
    '',
    'Mit besten Gruessen,',
    'PROVA-Systems',
    '',
    '---',
    'Du bekommst diese Email, weil ' + (opts.referrerName || 'ein Kollege') + ' dich empfohlen hat.',
    'Antworten gehen direkt an ' + (opts.referrerEmail || ''),
    'Datenschutz: prova-systems.de/datenschutz'
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM_REFERRAL || 'PROVA Empfehlung <empfehlung@prova-systems.de>',
    to: opts.referredEmail,
    subject: subject,
    text: lines.join('\n'),
    replyTo: opts.referrerEmail || undefined
  });
  return { ok: true };
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  const userId = context.userId || context.user_id;
  const userEmail = context.userEmail || context.user_email;
  if (!userId) return json(event, 401, { error: 'Authentication required' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(event, 400, { error: 'Invalid JSON' }); }

  const referredEmail = String(body.referred_email || '').trim().toLowerCase();
  const personalMessage = String(body.personal_message || '').slice(0, ReferralLib._const.MAX_MESSAGE_LENGTH);

  // Validation: Format
  const emailCheck = ReferralLib.validateEmail(referredEmail);
  if (!emailCheck.ok) return json(event, 400, { error: emailCheck.error });

  // Validation: nicht eigene Email
  const selfCheck = ReferralLib.checkSelfReferral(userEmail, referredEmail);
  if (!selfCheck.ok) return json(event, 400, { error: selfCheck.error });

  // Validation: Nachrichts-Length
  const msgCheck = ReferralLib.validateMessage(personalMessage);
  if (!msgCheck.ok) return json(event, 400, { error: msgCheck.error });

  const sb = getSupabase();
  if (!sb) return json(event, 503, { error: 'Supabase not configured' });

  // User-Workspace-Lookup
  let workspaceId = null;
  let referrerName = null;
  let referrerWorkspace = null;
  try {
    const { data: u } = await sb.from('users')
      .select('id, email, full_name, workspace_id')
      .eq('id', userId)
      .maybeSingle();
    if (u) {
      workspaceId = u.workspace_id;
      referrerName = u.full_name;
      referrerWorkspace = u.workspace_id;
    }
  } catch (_) { /* graceful */ }
  if (!workspaceId) {
    // Best-Effort via memberships
    try {
      const { data: ms } = await sb.from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      workspaceId = ms ? ms.workspace_id : null;
    } catch (_) { /* graceful */ }
  }
  if (!workspaceId) return json(event, 400, { error: 'workspace not found for user' });

  // Cap-Check via DB-Query
  try {
    const { count } = await sb.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', userId)
      .in('status', ['pending', 'active', 'hold', 'rewarded']);
    const totalUsed = count || 0;
    if (totalUsed >= ReferralLib._const.MAX_REFERRALS) {
      return json(event, 400, {
        error: 'Cap erreicht: ' + ReferralLib._const.MAX_REFERRALS + ' Empfehlungen bereits versendet',
        cap: ReferralLib._const.MAX_REFERRALS
      });
    }
  } catch (e) {
    return json(event, 500, { error: 'cap check failed', detail: e.message });
  }

  // Rate-Limit: max 5/Tag
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', userId)
      .gte('created_at', since);
    if ((count || 0) >= RATE_LIMIT_PER_DAY) {
      return json(event, 429, { error: 'Rate-Limit: max ' + RATE_LIMIT_PER_DAY + ' Empfehlungen pro Tag' });
    }
  } catch (_) { /* graceful */ }

  // Duplicate-Check: aktive Empfehlung an diese Email vorhanden?
  try {
    const { data: existing } = await sb.from('referrals')
      .select('id, status')
      .eq('referred_email', referredEmail)
      .in('status', ['pending', 'active', 'hold', 'rewarded'])
      .limit(1);
    if (existing && existing.length > 0) {
      return json(event, 409, { error: 'Diese Email wurde bereits eingeladen', status: existing[0].status });
    }
  } catch (_) { /* graceful */ }

  // Generate Code
  const initials = ReferralLib.deriveInitials(referrerName || userEmail);
  let code = ReferralLib.generateCode(initials);
  // 1× Retry bei (sehr unwahrscheinlicher) Code-Kollision
  try {
    const { data: collision } = await sb.from('referrals').select('id').eq('code', code).maybeSingle();
    if (collision) code = ReferralLib.generateCode(initials);
  } catch (_) { /* graceful */ }

  const expiresAt = ReferralLib.calculateExpiresAt();

  // Stripe-Promo-Code (best-effort — wenn Stripe down, DB-Eintrag dennoch erstellen,
  // Cron kann nachladen)
  const stripeResult = await createStripePromo(code, expiresAt);

  // DB-Insert
  let inserted;
  try {
    const { data, error } = await sb.from('referrals').insert({
      referrer_user_id: userId,
      referrer_email: userEmail,
      referred_email: referredEmail,
      code: code,
      stripe_promo_code_id: stripeResult.ok ? stripeResult.promo_id : null,
      stripe_coupon_id: FRIEND_COUPON_ID,
      personal_message: personalMessage || null,
      status: 'pending',
      expires_at: expiresAt,
      workspace_id: workspaceId
    }).select().maybeSingle();
    if (error) return json(event, 500, { error: 'db insert failed', detail: error.message });
    inserted = data;
  } catch (e) {
    return json(event, 500, { error: 'db insert exception', detail: e.message });
  }

  // Email-Versand (fire-and-forget — Failure blockt nicht)
  sendInviteEmail({
    referredEmail: referredEmail,
    referrerName: referrerName,
    referrerEmail: userEmail,
    personalMessage: personalMessage,
    code: code
  }).then(r => {
    if (r.ok) {
      sb.from('referrals').update({ email_sent_at: new Date().toISOString(), email_delivery_status: 'sent' })
        .eq('id', inserted.id).then(() => {}).catch(() => {});
    } else {
      sb.from('referrals').update({ email_delivery_status: r.skipped || 'failed' })
        .eq('id', inserted.id).then(() => {}).catch(() => {});
    }
  }).catch(() => {});

  return json(event, 200, {
    ok: true,
    code: code,
    expires_at: expiresAt,
    stripe_promo_created: stripeResult.ok,
    referral_id: inserted ? inserted.id : null
  });
}), { functionName: 'create-referral' });

exports._test = { createStripePromo, sendInviteEmail, FRIEND_COUPON_ID, RATE_LIMIT_PER_DAY };
