/**
 * PROVA — admin-send-email.js
 * MEGA-MEGA N3-EXT — Admin-Cockpit Quick-Action
 *
 * Sendet eine vordefinierte Pilot-Email (Template aus email-templates/onboarding/)
 * an einen Pilot-SV. Marcel-only.
 *
 * Templates-Whitelist (Sicherheit: kein beliebiger File-Read!):
 *  - trial-day-2-no-login
 *  - trial-day-3-no-akte
 *  - trial-day-7-checkin
 *  - trial-day-14-twoweek
 *  - trial-day-30-onemonth
 *  - trial-day-60-midtrial
 *  - trial-day-88-final
 *  - founding-welcome
 *  - pilot-einladung
 *  - trial-ending-email
 *  - trial-welcome
 *
 * SUBJECT-MAP: feste Subjects (im Template steht nur Body, Subject hier).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const TEMPLATES = {
  // Onboarding-Drip (N2)
  'trial-day-2-no-login': {
    subject: 'Brauchen Sie Hilfe beim ersten Login?',
    file: 'onboarding/trial-day-2-no-login.html'
  },
  'trial-day-3-no-akte': {
    subject: 'Lassen Sie mich Ihnen die erste Akte zeigen',
    file: 'onboarding/trial-day-3-no-akte.html'
  },
  'trial-day-7-checkin': {
    subject: 'Erste Woche bei PROVA — wie war\'s?',
    file: 'onboarding/trial-day-7-checkin.html'
  },
  'trial-day-14-twoweek': {
    subject: 'PROVA nach 2 Wochen — Ihre Erfahrung?',
    file: 'onboarding/trial-day-14-twoweek.html'
  },
  'trial-day-30-onemonth': {
    subject: '1 Monat PROVA — lass uns reflektieren',
    file: 'onboarding/trial-day-30-onemonth.html'
  },
  'trial-day-60-midtrial': {
    subject: 'Halbzeit Ihrer 90-Tage-Trial',
    file: 'onboarding/trial-day-60-midtrial.html'
  },
  'trial-day-88-final': {
    subject: 'PROVA-Trial endet in 2 Tagen — noch alles klar?',
    file: 'onboarding/trial-day-88-final.html'
  },
  // Founding (existing)
  'founding-welcome':   { subject: 'Willkommen bei PROVA — Sie sind Founding-Member',          file: 'founding/founding-welcome.html' },
  'pilot-einladung':    { subject: 'PROVA Pilot-Programm — eine persoenliche Einladung',        file: 'founding/pilot-einladung.html' },
  'trial-welcome':      { subject: 'Ihre 90-Tage-Trial bei PROVA hat begonnen',                 file: 'founding/trial-welcome.html' },
  'trial-ending-email': { subject: 'Ihre PROVA-Trial endet bald',                                file: 'founding/trial-ending-email.html' }
};

function renderTemplate(html, vars) {
  return String(html).replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const to = String(body.to || '').trim().toLowerCase();
  const templateKey = String(body.template || '').trim();
  const vars = (body.vars && typeof body.vars === 'object') ? body.vars : {};
  const dryRun = body.dry_run === true;

  if (!to || !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(to)) {
    return jsonResponse(event, 400, { error: 'to (Email) erforderlich' });
  }
  const tpl = TEMPLATES[templateKey];
  if (!tpl) {
    return jsonResponse(event, 400, { error: 'Unbekanntes Template', allowed: Object.keys(TEMPLATES) });
  }

  // Template-File laden
  const fullPath = path.join(process.cwd(), 'email-templates', tpl.file);
  let raw;
  try { raw = fs.readFileSync(fullPath, 'utf8'); }
  catch (e) { return jsonResponse(event, 500, { error: 'Template-File nicht lesbar: ' + e.message }); }

  const defaults = {
    vorname: vars.vorname || 'Pilot-SV',
    SV_VORNAME: vars.SV_VORNAME || vars.vorname || 'Pilot-SV',
    SV_NACHNAME: vars.SV_NACHNAME || '',
    anzahl_akten: vars.anzahl_akten || '0',
    stripe_link: vars.stripe_link || 'https://app.prova-systems.de/einstellungen.html',
    login_link: vars.login_link || 'https://app.prova-systems.de/login.html',
    DASHBOARD_LINK: vars.DASHBOARD_LINK || 'https://app.prova-systems.de/dashboard.html',
    PILOT_LINK: vars.PILOT_LINK || 'https://prova-systems.de/pilot.html',
    MARCEL_KONTAKT: vars.MARCEL_KONTAKT || 'kontakt@prova-systems.de'
  };
  const html = renderTemplate(raw, Object.assign(defaults, vars));

  if (dryRun) {
    return jsonResponse(event, 200, { ok: true, dry_run: true, to, subject: tpl.subject, html_preview: html.slice(0, 2000) + (html.length > 2000 ? '…' : ''), full_length: html.length });
  }

  // Send via SMTP (existing PROVA_SMTP_* ENV)
  const host     = process.env.PROVA_SMTP_HOST;
  const port     = parseInt(process.env.PROVA_SMTP_PORT || '587');
  const smtpUser = process.env.PROVA_SMTP_USER;
  const smtpPass = process.env.PROVA_SMTP_PASS;
  const fromName = process.env.PROVA_SMTP_FROM_NAME || 'Marcel von PROVA';

  if (!host || !smtpUser || !smtpPass) {
    return jsonResponse(event, 500, { error: 'SMTP nicht konfiguriert (PROVA_SMTP_HOST/USER/PASS in Netlify ENV)' });
  }

  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user: smtpUser, pass: smtpPass }
  });

  try {
    await transporter.sendMail({
      from: '"' + fromName + '" <' + smtpUser + '>',
      to, subject: tpl.subject, html
    });
  } catch (e) {
    return jsonResponse(event, 502, { error: 'SMTP-Send fehlgeschlagen: ' + e.message });
  }

  // Audit-Trail
  const sb = getSupabaseAdmin();
  if (sb) {
    try {
      await sb.from('audit_trail').insert({
        workspace_id: null,
        user_id: null,
        typ: 'admin.email_sent',
        sv_email: context.adminEmail,
        details: JSON.stringify({ to_pseudo: to.replace(/@.*/, '@***'), template: templateKey, ts: new Date().toISOString() })
      });
    } catch (e) { console.warn('[admin-send-email] audit insert fail:', e.message); }
  }

  return jsonResponse(event, 200, { ok: true, to, subject: tpl.subject, template: templateKey });
}, { functionName: 'admin-send-email', rateLimit: { max: 10, windowSec: 60 } }), { functionName: 'admin-send-email' });
