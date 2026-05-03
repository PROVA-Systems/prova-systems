/**
 * PROVA — Sentry Wrap Helper fuer Netlify Functions
 * MEGA-SKALIERUNG M3 (03.05.2026, Sentry-Integration)
 *
 * Wrappt jeden Function-Handler. Bei unbehandelten Errors:
 *  - Sentry.captureException mit Function-Name + HTTP-Method als Tags
 *  - PII-Filter via beforeSend (DSGVO Art. 25 Privacy by Design)
 *  - Re-throw damit Netlify normale 5xx-Antwort sendet
 *
 * Aktivierung: Setze SENTRY_DSN_FUNCTIONS in Netlify-ENV.
 * Ohne ENV: Wrap ist no-op (nur try/catch ohne Sentry-Send).
 *
 * Usage:
 *   const { withSentry } = require('./lib/sentry-wrap');
 *   exports.handler = withSentry(async function(event, context) { ... },
 *                                { functionName: 'stripe-checkout' });
 */
'use strict';

let Sentry = null;
let initialized = false;

function getSentry() {
  if (Sentry) return Sentry;
  try {
    Sentry = require('@sentry/node');
    return Sentry;
  } catch (e) {
    return null;
  }
}

function initSentry() {
  if (initialized) return getSentry();
  initialized = true;
  const dsn = process.env.SENTRY_DSN_FUNCTIONS;
  if (!dsn) return null;
  const S = getSentry();
  if (!S) return null;
  try {
    S.init({
      dsn: dsn,
      release: process.env.COMMIT_REF || 'unknown',
      environment: process.env.CONTEXT || 'production',
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      // M3: PII-Filter (DSGVO). Header + Body koennen Email/Token/PII enthalten.
      beforeSend: function (event) {
        try {
          if (event.request) {
            if (event.request.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.Authorization;
              delete event.request.headers.cookie;
              delete event.request.headers.Cookie;
              delete event.request.headers['x-prova-token'];
              delete event.request.headers['X-PROVA-Token'];
            }
            // Body komplett unterdruecken (kann Passwort/Email/Personendaten enthalten)
            if (event.request.data) event.request.data = '[redacted by PROVA-PII-Filter]';
          }
          if (event.user) {
            if (event.user.email) event.user.email = '[redacted]';
            if (event.user.ip_address) event.user.ip_address = null;
          }
          // Breadcrumbs URLs koennen Query-Strings mit PII enthalten
          if (event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
            event.breadcrumbs = event.breadcrumbs.map(function (bc) {
              if (bc && bc.data && bc.data.url) {
                bc.data.url = String(bc.data.url).split('?')[0];
              }
              return bc;
            });
          }
        } catch (e) { /* never block error reporting on filter-bug */ }
        return event;
      }
    });
  } catch (e) {
    // Init darf Functions niemals brechen
    console.warn('[sentry-wrap] init failed:', e && e.message);
    return null;
  }
  return S;
}

function withSentry(handler, opts) {
  const fnName = (opts && opts.functionName) || 'unknown';
  return async function (event, context) {
    const S = initSentry();
    try {
      return await handler(event, context);
    } catch (err) {
      if (S) {
        try {
          S.withScope(function (scope) {
            scope.setTag('function', fnName);
            scope.setTag('http.method', (event && event.httpMethod) || 'unknown');
            scope.setContext('netlify', {
              path: (event && event.path) || null,
              method: (event && event.httpMethod) || null,
              referer: (event && event.headers && event.headers.referer) || null
            });
            S.captureException(err);
          });
          // Best-effort flush vor Re-throw (Lambda wird gefroren)
          await S.flush(2000).catch(function () {});
        } catch (e) {
          console.warn('[sentry-wrap] captureException failed:', e && e.message);
        }
      }
      throw err;
    }
  };
}

module.exports = { withSentry, initSentry };
