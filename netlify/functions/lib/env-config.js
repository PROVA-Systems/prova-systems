// netlify/functions/lib/env-config.js
//
// JSON-Bundles fuer Lambda-ENV-Konsolidierung (AWS 4 KB Limit).
// Pattern: Primary = ein JSON-ENV mit allen Sub-Werten.
// Fallback = Einzel-ENVs (fuer sanften Cutover, danach loeschbar).
//
// Marcel-Action-Liste: docs/MARCEL-NETLIFY-ENV-CLEANUP.md

'use strict';

function safeJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

// ── 1) MAKE-Webhooks ─────────────────────────────────────────
// MAKE_WEBHOOKS_JSON = {"a5":"...","f1":"...","g1":"...","g3":"...","k2":"...","l8":"..."}
function parseMakeWebhooks() {
  const j = safeJson(process.env.MAKE_WEBHOOKS_JSON)
    || safeJson(process.env.MAKE_WEBHOOKS)
    || {};
  const fallback = (suffix) => process.env['MAKE_WEBHOOK_' + suffix.toUpperCase()] || null;
  const keys = ['a5', 'f1', 'g1', 'g3', 'k2', 'l8'];
  const out = {};
  for (const k of keys) out[k] = j[k] || fallback(k);
  return out;
}

// ── 2) Stripe-Preise ─────────────────────────────────────────
// STRIPE_PRICES_JSON = {"solo":"price_...","team":"...","addon5":"...","addon10":"...","addon20":"..."}
function parseStripePrices() {
  const j = safeJson(process.env.STRIPE_PRICES_JSON) || {};
  return {
    solo:    j.solo    || process.env.STRIPE_PRICE_SOLO    || null,
    team:    j.team    || process.env.STRIPE_PRICE_TEAM    || null,
    addon5:  j.addon5  || process.env.STRIPE_PRICE_ADDON_5  || null,
    addon10: j.addon10 || process.env.STRIPE_PRICE_ADDON_10 || null,
    addon20: j.addon20 || process.env.STRIPE_PRICE_ADDON_20 || null
  };
}

// ── 3) VAPID Push-Keys ───────────────────────────────────────
// VAPID_KEYS_JSON = {"public":"...","private":"...","subject":"mailto:..."}
function parseVapidKeys() {
  const j = safeJson(process.env.VAPID_KEYS_JSON) || {};
  return {
    public:  j.public  || process.env.VAPID_PUBLIC_KEY  || null,
    private: j.private || process.env.VAPID_PRIVATE_KEY || null,
    subject: j.subject || process.env.VAPID_SUBJECT     || 'mailto:hallo@prova-systems.de'
  };
}

// ── 4) SMTP-Referral ─────────────────────────────────────────
// SMTP_REFERRAL_JSON = {"from":"empfehlung@...","user":"...","pass":"..."}
// Aktuell ist nur SMTP_FROM_REFERRAL im Code; user/pass kommen aus geteilten SMTP_USER/PASS.
function parseSmtpReferral() {
  const j = safeJson(process.env.SMTP_REFERRAL_JSON) || {};
  return {
    from: j.from || process.env.SMTP_FROM_REFERRAL || null,
    user: j.user || process.env.SMTP_USER_REFERRAL || null,
    pass: j.pass || process.env.SMTP_PASS_REFERRAL || null
  };
}

// ── 5) PDFMonkey-Templates ───────────────────────────────────
// PDFMONKEY_TEMPLATES_JSON = {"foto":"<uuid>","modeC":"<uuid>","brief":"<uuid>"}
function parsePdfmonkeyTemplates() {
  const j = safeJson(process.env.PDFMONKEY_TEMPLATES_JSON) || {};
  return {
    foto:  j.foto  || process.env.PDFMONKEY_FOTO_TEMPLATE_ID   || null,
    modeC: j.modeC || process.env.PDFMONKEY_MODE_C_TEMPLATE_ID || null,
    brief: j.brief || process.env.PDFMONKEY_BRIEF_TEMPLATE_ID  || null
  };
}

// ── 6) PROVA Secrets ─────────────────────────────────────────
// PROVA_SECRETS_JSON = {"internal":"...","email":"...","sentry":"...","smtp":"..."}
// (auditTable ist Airtable-Legacy → nicht in Secrets-Bundle, separat behandeln)
function parseProvaSecrets() {
  const j = safeJson(process.env.PROVA_SECRETS_JSON) || {};
  return {
    internal: j.internal || process.env.PROVA_INTERNAL_WRITE_SECRET || null,
    email:    j.email    || process.env.PROVA_EMAIL_CRON_SECRET     || null,
    sentry:   j.sentry   || process.env.PROVA_SENTRY_TEST_SECRET    || null,
    smtp:     j.smtp     || process.env.PROVA_SMTP_ENCRYPTION_KEY   || null
  };
}

module.exports = {
  parseMakeWebhooks,
  parseStripePrices,
  parseVapidKeys,
  parseSmtpReferral,
  parsePdfmonkeyTemplates,
  parseProvaSecrets
};
