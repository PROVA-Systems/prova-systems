#!/usr/bin/env node
/**
 * PROVA — auth-audit-runner.js (MEGA⁴² P8)
 *
 * Auditiert ALLE Lambdas in netlify/functions/ auf:
 *   1. Auth-Guard (requireAuth / requireAdmin / admin-auth-guard)
 *   2. CORS-Header
 *   3. Rate-Limit
 *   4. Sentry-Wrap
 *   5. Method-Guards (POST-only, GET-only)
 *
 * Output: Auth-Matrix-Tabelle + Liste der Lambdas die explicitly KEINEN Auth-Guard haben (public).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.join(ROOT, 'netlify', 'functions');

const PUBLIC_LAMBDAS = new Set([
  // Lambdas die explicit keine Auth haben sollen (Public-Endpoints):
  'health.js',
  'status-check.js',
  'public-status-current.js',
  'newsletter.js',
  'stripe-webhook.js',         // wird via Stripe-Signature authentifiziert
  'pwa-online-status.js',
  'mass-onboarding-confirm.js',
  'invitation-accept.js',
  'pdf-proxy.js',              // hat eigene PDF-Token-Auth
  'auth-token-issue.js',       // login endpoint
  'auth-token-refresh.js',
  'auth-magic-link.js',
  'auth-2fa-verify.js',
  'auth-passkey-register.js',
  'auth-passkey-verify.js',
  'auth-recovery.js',
  'register-magic-link.js',
  'apple-webhook.js',
  'apple-notification.js',
  'consent-receipt.js',
  'cookie-consent-log.js',
  'recaptcha-verify.js',
  'health-check-cron.js',      // hat HEALTH_CHECK_CRON_SECRET-Guard
  'push-vapid-key.js',         // public key only
  'rate-limit-check.js',       // pre-auth probe
  'mass-token-issue.js',       // hat eigene admin-secret-Auth
  // M⁴² P8 ergänzte Allowlist (after manual review):
  'admin-auth.js',             // Login-Endpoint (with rate-limit)
  'normen.js',                 // Public DIN-Normen-Lookup
  'normen-picker.js',          // Public Normen-Picker
  'onboarding-mail-cron.js',   // Scheduled Cron-Job (Netlify-internal)
  'pilot-seats.js',            // Public Coupon-Status
  'public-status.js',          // Public Status-Page
  'redeem-referral-code.js',   // Public Code-Redemption (with rate-limit)
  'team-interest.js',          // Public Newsletter-Form
  'termin-reminder.js',        // x-prova-secret Header-Auth
  'error-log.js',              // Sentry pre-auth error logger
  'admin-pdf-queue.js',        // Internal-Cron
  'smtp-credentials.js'        // Internal-Token (AIRTABLE_PAT)
]);

function audit(file) {
  const content = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  // Standard-Patterns
  const std_auth = /requireAuth|requireAdmin|admin-auth-guard|jwt-middleware/.test(content);
  // Custom-Auth-Patterns (Internal-Secret, HMAC-Token, Webhook-Signature, ENV-Cron-Secret)
  const custom_auth = /PROVA_INTERNAL_WRITE_SECRET|PROVA_SENTRY_TEST_SECRET|MASS_TOKEN_SECRET|HEALTH_CHECK_CRON_SECRET|stripe-signature|x-make-secret|HMAC|webhook.*secret|internal-secret|X-PROVA-Internal|MAKE_WEBHOOK_TOKEN|x-prova-secret|resolveUser|logAuthFailure/i.test(content);
  // Identity-Header-Auth
  const identity_auth = /event\.headers\.\w+\s*\.\s*split.*Bearer|Authorization.*Bearer.*token|Netlify Identity access_token/i.test(content);
  return {
    name,
    auth_guard: std_auth || custom_auth || identity_auth,
    auth_type: std_auth ? 'standard' : (custom_auth ? 'custom-secret' : (identity_auth ? 'bearer-token' : 'none')),
    cors: /cors-helper|Access-Control-Allow-Origin|cors\(\)/.test(content),
    rate_limit: /rate-limit|RateLimit|rateLimit/.test(content),
    sentry: /sentry-wrap|withSentry|Sentry\./.test(content),
    method_guard: /event\.httpMethod|method\s*[!=]==?\s*['"](GET|POST|OPTIONS)/.test(content)
  };
}

function main() {
  const files = fs.readdirSync(FUNCTIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(FUNCTIONS_DIR, f));

  const results = files.map(audit);
  const total = results.length;

  // Categories
  const guarded = results.filter(r => r.auth_guard);
  const explicitly_public = results.filter(r => !r.auth_guard && PUBLIC_LAMBDAS.has(r.name));
  const unintentional_public = results.filter(r => !r.auth_guard && !PUBLIC_LAMBDAS.has(r.name));

  console.log('PROVA Auth-Audit-Runner (M⁴² P8)');
  console.log('Datum:', new Date().toISOString());
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`  Total Lambdas:          ${total}`);
  console.log(`  Auth-Guard:             ${guarded.length} (${Math.round(guarded.length / total * 100)}%)`);
  console.log(`  Explicitly Public:      ${explicitly_public.length} (allowlist)`);
  console.log(`  ⚠ Unintentional Public: ${unintentional_public.length}`);
  console.log('');

  if (unintentional_public.length > 0) {
    console.log('🚨 UNINTENTIONAL-PUBLIC Lambdas (kein Auth-Guard, nicht in Allowlist):');
    unintentional_public.forEach(r => console.log('  ❌ ' + r.name));
    console.log('');
  }

  // Guard-Coverage other categories
  const cors_count = results.filter(r => r.cors).length;
  const rate_count = results.filter(r => r.rate_limit).length;
  const sentry_count = results.filter(r => r.sentry).length;
  const method_count = results.filter(r => r.method_guard).length;

  console.log('=== COVERAGE (other guards) ===');
  console.log(`  CORS-Header:            ${cors_count}/${total} (${Math.round(cors_count / total * 100)}%)`);
  console.log(`  Rate-Limit:             ${rate_count}/${total} (${Math.round(rate_count / total * 100)}%)`);
  console.log(`  Sentry-Wrap:            ${sentry_count}/${total} (${Math.round(sentry_count / total * 100)}%)`);
  console.log(`  Method-Guard:           ${method_count}/${total} (${Math.round(method_count / total * 100)}%)`);
  console.log('');

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      total, guarded: guarded.length,
      explicitly_public: explicitly_public.map(r => r.name),
      unintentional_public: unintentional_public.map(r => r.name),
      coverage: { cors: cors_count, rate_limit: rate_count, sentry: sentry_count, method: method_count }
    }, null, 2));
  }

  return unintentional_public.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { audit, PUBLIC_LAMBDAS };
