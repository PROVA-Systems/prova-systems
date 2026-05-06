/**
 * PROVA — uptime-webhook.js
 * MEGA¹¹ W6 (Tier 9, 2026-05-04)
 *
 * UptimeRobot-Webhook-Empfaenger fuer Outage/Recovery-Notifications.
 *
 * Konfiguration in UptimeRobot:
 *   POST URL: https://prova-systems.de/.netlify/functions/uptime-webhook?secret=<UPTIME_WEBHOOK_SECRET>
 *   Body-Format: JSON (UptimeRobot v3-Standard)
 *
 * Body-Schema (UptimeRobot v3 POST-Webhook):
 *   {
 *     "monitorID": "12345",
 *     "monitorFriendlyName": "PROVA App",
 *     "monitorURL": "https://prova-systems.de",
 *     "alertType": "1" (down) | "2" (up) | "3" (paused),
 *     "alertDetails": "Connection Timeout",
 *     "alertDuration": "300",  // seconds
 *     "monitorAlertContacts": "..."
 *   }
 *
 * Verhalten:
 *   - Constant-Time-Secret-Vergleich (anti-Timing-Attack)
 *   - Idempotenz: alert_id-Hash dedupe via In-Memory-Cache (TTL 1h)
 *     -> bei UptimeRobot-Retry-Storm: Duplicate werden geslickt
 *   - Audit-Log via storage-router (audit_trail Tabelle)
 *   - Response 200 IMMER bei valider Signature (verhindert UptimeRobot-Retry-Storm)
 *
 * Anti-Pattern vermieden:
 *   - Kein 502 bei Storage-Fail (sonst UptimeRobot retry-storm)
 *   - Kein DB-Schema-Lock (Audit-Logging asynchron, fire-and-forget)
 *   - Keine personenbezogene Daten im Audit (UptimeRobot enthaelt nur Monitor-Info)
 */
'use strict';

const crypto = require('node:crypto');
const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

// In-Memory Idempotenz-Cache (Lambda warm-period — typisch 5-15min)
// Format: Map<alertHash, expiresAtMs>
const _idempotencyCache = new Map();
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000;  // 1h

function _cleanIdempotencyCache() {
  const now = Date.now();
  for (const [key, expiresAt] of _idempotencyCache.entries()) {
    if (expiresAt < now) _idempotencyCache.delete(key);
  }
}

function _hashAlert(payload) {
  // Hash aus monitorID + alertType + Stunden-Bucket (gleicher Alert in 1h ist Duplicate)
  const hourBucket = Math.floor(Date.now() / IDEMPOTENCY_TTL_MS);
  const key = `${payload.monitorID || 'unknown'}:${payload.alertType || '0'}:${hourBucket}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

function _constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch (_) {
    return false;
  }
}

function _alertTypeLabel(t) {
  const code = String(t || '');
  if (code === '1') return 'outage_start';
  if (code === '2') return 'outage_recovery';
  if (code === '3') return 'monitor_paused';
  return 'unknown_alert_type';
}

async function _logAudit(payload, alertHash) {
  const sb = getSupabase();
  if (!sb) return { logged: false, reason: 'no_supabase' };

  // Fire-and-forget: bei Audit-Fail trotzdem 200 zurueck
  try {
    await sb.from('audit_trail').insert({
      function_name: 'uptime-webhook',
      action: _alertTypeLabel(payload.alertType),
      payload: {
        monitor_id: String(payload.monitorID || ''),
        monitor_name: String(payload.monitorFriendlyName || '').slice(0, 200),
        monitor_url: String(payload.monitorURL || '').slice(0, 500),
        alert_details: String(payload.alertDetails || '').slice(0, 500),
        duration_seconds: parseInt(payload.alertDuration || '0', 10) || 0,
        alert_hash: alertHash
      },
      result: 'received'
    });
    return { logged: true };
  } catch (e) {
    console.error('[uptime-webhook] audit log failed:', e.message);
    return { logged: false, reason: 'audit_insert_failed', error: e.message };
  }
}

exports.handler = withSentry(async function (event) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Secret-Validation (constant-time)
  // MEGA²⁸ W7-I1: defensive PROVA-Prefix-Migration
  const expectedSecret = process.env.PROVA_UPTIME_WEBHOOK_SECRET || process.env.UPTIME_WEBHOOK_SECRET || '';
  const providedSecret = (event.queryStringParameters && event.queryStringParameters.secret) || '';

  if (!expectedSecret) {
    console.warn('[uptime-webhook] UPTIME_WEBHOOK_SECRET not configured');
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'webhook not configured' }) };
  }
  if (!_constantTimeEqual(providedSecret, expectedSecret)) {
    return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: 'invalid secret' }) };
  }

  // Body parsen (defensiv — UptimeRobot kann form-encoded ODER json schicken je nach Setup)
  let payload = {};
  try {
    if (event.body) {
      const ct = (event.headers && (event.headers['content-type'] || event.headers['Content-Type'])) || '';
      if (ct.includes('application/json')) {
        payload = JSON.parse(event.body);
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(event.body);
        for (const [k, v] of params.entries()) payload[k] = v;
      } else {
        // Try JSON first (UptimeRobot v3 default)
        try { payload = JSON.parse(event.body); }
        catch (_) {
          const params = new URLSearchParams(event.body);
          for (const [k, v] of params.entries()) payload[k] = v;
        }
      }
    }
  } catch (e) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid body', detail: e.message }) };
  }

  // Idempotenz-Check (cleanup expired entries first)
  _cleanIdempotencyCache();
  const alertHash = _hashAlert(payload);
  if (_idempotencyCache.has(alertHash)) {
    return {
      statusCode: 200, headers: baseHeaders,
      body: JSON.stringify({ ok: true, deduplicated: true, alert_hash: alertHash })
    };
  }
  _idempotencyCache.set(alertHash, Date.now() + IDEMPOTENCY_TTL_MS);

  // Audit-Logging (fire-and-forget — Failure darf 200 nicht verhindern)
  const auditResult = await _logAudit(payload, alertHash);

  return {
    statusCode: 200, headers: baseHeaders,
    body: JSON.stringify({
      ok: true,
      received_at: new Date().toISOString(),
      action: _alertTypeLabel(payload.alertType),
      monitor: {
        id: String(payload.monitorID || ''),
        name: String(payload.monitorFriendlyName || '').slice(0, 100)
      },
      alert_hash: alertHash,
      audit_logged: auditResult.logged
    })
  };
}, { functionName: 'uptime-webhook' });

// Internal exports fuer Tests
exports._test = {
  hashAlert: _hashAlert,
  constantTimeEqual: _constantTimeEqual,
  alertTypeLabel: _alertTypeLabel,
  resetIdempotencyCache: () => _idempotencyCache.clear()
};
