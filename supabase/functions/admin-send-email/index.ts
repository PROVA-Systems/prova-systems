/* PROVA Edge — admin-send-email (Welle 7)
   POST { to, template, vars?, dry_run? } — Sendet vordefinierte Pilot-Email via Resend.
   Templates inline (kein Filesystem in Edge).
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_NAME = Deno.env.get('PROVA_SMTP_FROM_NAME') ?? 'Marcel von PROVA';
const FROM_EMAIL = Deno.env.get('PROVA_FROM_EMAIL') ?? 'marcel@prova-systems.de';

// Inline-Templates — minimal, vom legacy email-templates/onboarding portiert
const TEMPLATES: Record<string, { subject: string; html: string }> = {
  'trial-day-2-no-login': { subject: 'Brauchen Sie Hilfe beim ersten Login?', html: '<p>Hallo {{vorname}},</p><p>Ihre 90-Tage-Trial läuft. Brauchen Sie Hilfe beim ersten Login? <a href="{{login_link}}">Jetzt einloggen</a></p><p>Marcel</p>' },
  'trial-day-3-no-akte': { subject: 'Lassen Sie mich Ihnen die erste Akte zeigen', html: '<p>Hallo {{vorname}},</p><p>Sie haben sich noch keine Akte angesehen. <a href="{{DASHBOARD_LINK}}">Demo-Fall öffnen</a></p>' },
  'trial-day-7-checkin': { subject: 'Erste Woche bei PROVA — wie war\'s?', html: '<p>Hallo {{vorname}},</p><p>Erste Woche um. Schnelles Feedback an mich? Antwort auf diese Mail genügt.</p>' },
  'trial-day-14-twoweek': { subject: 'PROVA nach 2 Wochen — Ihre Erfahrung?', html: '<p>Hallo {{vorname}},</p><p>2 Wochen rum. Haben Sie schon eine Akte angelegt?</p>' },
  'trial-day-30-onemonth': { subject: '1 Monat PROVA — lass uns reflektieren', html: '<p>Hallo {{vorname}},</p><p>1 Monat. Was läuft? Was bremst?</p>' },
  'trial-day-60-midtrial': { subject: 'Halbzeit Ihrer 90-Tage-Trial', html: '<p>Hallo {{vorname}},</p><p>Halbzeit. Bisher: {{anzahl_akten}} Akten.</p>' },
  'trial-day-88-final': { subject: 'PROVA-Trial endet in 2 Tagen — noch alles klar?', html: '<p>Hallo {{vorname}},</p><p>2 Tage bis Trial-Ende. <a href="{{stripe_link}}">Jetzt aktivieren</a></p>' },
  'founding-welcome': { subject: 'Willkommen bei PROVA — Sie sind Founding-Member', html: '<p>Hallo {{vorname}},</p><p>Willkommen als Founding-Member!</p>' },
  'pilot-einladung': { subject: 'PROVA Pilot-Programm — eine persönliche Einladung', html: '<p>Hallo {{vorname}},</p><p>Sie sind eingeladen ins Pilot-Programm. <a href="{{PILOT_LINK}}">Mehr erfahren</a></p>' },
  'trial-welcome': { subject: 'Ihre 90-Tage-Trial bei PROVA hat begonnen', html: '<p>Hallo {{vorname}},</p><p>Trial gestartet. <a href="{{login_link}}">Jetzt loslegen</a></p>' },
  'trial-ending-email': { subject: 'Ihre PROVA-Trial endet bald', html: '<p>Hallo {{vorname}},</p><p>Trial endet bald. <a href="{{stripe_link}}">Plan auswählen</a></p>' }
};

function render(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
}

Deno.serve(adminHandler({ functionName: 'admin-send-email' }, async (req, { adminEmail, sb }) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const to = String(body?.to ?? '').trim().toLowerCase();
  const tplKey = String(body?.template ?? '').trim();
  const vars = (body?.vars && typeof body.vars === 'object') ? body.vars : {};
  const dryRun = body?.dry_run === true;

  if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(to)) return jsonResponse({ error: 'to (Email) erforderlich' }, 400);
  const tpl = TEMPLATES[tplKey];
  if (!tpl) return jsonResponse({ error: 'Unbekanntes Template', allowed: Object.keys(TEMPLATES) }, 400);

  const defaults = {
    vorname: vars.vorname ?? 'Pilot-SV',
    SV_VORNAME: vars.SV_VORNAME ?? vars.vorname ?? 'Pilot-SV',
    SV_NACHNAME: vars.SV_NACHNAME ?? '',
    anzahl_akten: vars.anzahl_akten ?? '0',
    stripe_link: vars.stripe_link ?? 'https://app.prova-systems.de/einstellungen.html',
    login_link: vars.login_link ?? 'https://app.prova-systems.de/login.html',
    DASHBOARD_LINK: vars.DASHBOARD_LINK ?? 'https://app.prova-systems.de/dashboard.html',
    PILOT_LINK: vars.PILOT_LINK ?? 'https://prova-systems.de/pilot.html',
    MARCEL_KONTAKT: vars.MARCEL_KONTAKT ?? 'kontakt@prova-systems.de'
  };
  const html = render(tpl.html, { ...defaults, ...vars });

  if (dryRun) return jsonResponse({ ok: true, dry_run: true, to, subject: tpl.subject, html_preview: html, full_length: html.length });

  if (!RESEND_API_KEY) return jsonResponse({ error: 'RESEND_API_KEY in Edge-Env setzen' }, 500);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND_API_KEY },
    body: JSON.stringify({ from: FROM_NAME + ' <' + FROM_EMAIL + '>', to: [to], subject: tpl.subject, html })
  });
  if (!res.ok) {
    const txt = await res.text();
    return jsonResponse({ error: 'Resend fehlgeschlagen: HTTP ' + res.status, detail: txt.slice(0, 500) }, 502);
  }

  await sb.from('audit_trail').insert({
    workspace_id: null, user_id: null, action: 'create', entity_typ: 'admin_email_sent',
    payload: { admin_email: adminEmail, to_pseudo: to.replace(/@.*/, '@***'), template: tplKey, ts: new Date().toISOString() }
  });

  return jsonResponse({ ok: true, to, subject: tpl.subject, template: tplKey });
}));
