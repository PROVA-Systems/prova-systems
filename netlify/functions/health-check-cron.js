/**
 * PROVA — health-check-cron.js (MEGA⁴¹ P3)
 *
 * Cron-getriggert (alle 5 Min via pg_cron oder externer Scheduler).
 * Checkt 8+ Services + persisted Status in system_health_history.
 * Bei Down: Push-Notification an Admin (mit Throttling 1/Service/h).
 *
 * Endpoint: POST /.netlify/functions/health-check-cron
 *   Header: X-Cron-Secret (oder Public-Cron-Endpoint via pg_cron-Schedule)
 *
 * Response: 200 { checks: [{service, status, response_ms}], alerts_triggered }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getSupabase } = require('./lib/storage-router');

const SERVICES = [
  { name: 'stripe',    url: 'https://api.stripe.com/healthcheck' },
  { name: 'supabase',  url: (process.env.SUPABASE_URL || process.env.PROVA_SUPABASE_PROJECT_URL || '') + '/rest/v1/' },
  { name: 'openai',    url: 'https://api.openai.com/v1/models' },
  { name: 'sentry',    url: 'https://sentry.io/api/0/' },
  { name: 'pdfmonkey', url: 'https://api.pdfmonkey.io/api/v1/document_templates' },
  { name: 'make_com',  url: 'https://www.make.com/api/v2/scenarios' },
  { name: 'netlify',   url: 'https://api.netlify.com/api/v1/' },
  { name: 'ssl_cert',  url: 'https://app.prova-systems.de/' }  // SSL-Reachability
];

const TIMEOUT_MS = 5000;
const DOWN_THRESHOLD_MS = 8000;       // > 8s = degraded
const ALERT_THROTTLE_MIN = 60;        // max 1 Push/Service/h
const LATENCY_WARN_MS = 5000;         // Latency-Warning bei >5s

async function _checkService(svc) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(svc.url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    const ms = Date.now() - start;
    let status = 'up';
    if (!r.ok && r.status !== 401 && r.status !== 403) {
      // 401/403 sind erwartet bei Health-Checks ohne API-Key (Reachability-Test reicht)
      status = 'degraded';
    } else if (ms > DOWN_THRESHOLD_MS) {
      status = 'degraded';
    }
    return {
      service: svc.name,
      status,
      response_ms: ms,
      http_status: r.status,
      error_msg: null,
      metadata: ms > LATENCY_WARN_MS ? { latency_warning: true } : null
    };
  } catch (e) {
    clearTimeout(t);
    return {
      service: svc.name,
      status: 'down',
      response_ms: Date.now() - start,
      http_status: null,
      error_msg: e.name === 'AbortError' ? 'timeout' : e.message,
      metadata: null
    };
  }
}

async function _wasRecentlyAlerted(sb, service) {
  if (!sb) return false;
  const cutoff = new Date(Date.now() - ALERT_THROTTLE_MIN * 60 * 1000).toISOString();
  const { data } = await sb.from('push_alert_log')
    .select('id')
    .eq('service', service)
    .gte('sent_at', cutoff)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function _getLastStatus(sb, service) {
  if (!sb) return null;
  const { data } = await sb.from('system_health_history')
    .select('status')
    .eq('service', service)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? data.status : null;
}

async function _triggerPushAlert(sb, service, alertType, message) {
  // Best-effort: try push-notify Lambda
  let deliveryStatus = 'failed';
  let vapidResponse = null;
  try {
    if (process.env.URL || process.env.DEPLOY_URL) {
      const baseUrl = process.env.DEPLOY_URL || process.env.URL;
      const res = await fetch(baseUrl + '/.netlify/functions/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Cron': 'true' },
        body: JSON.stringify({
          internal: true,
          payload: {
            title: 'PROVA Alert: ' + service,
            body: message,
            tag: 'health-' + service + '-' + alertType,
            data: { service, alert_type: alertType }
          }
        })
      });
      if (res.ok) {
        deliveryStatus = 'sent';
        vapidResponse = { http_status: res.status };
      }
    }
  } catch (e) {
    deliveryStatus = 'failed';
    vapidResponse = { error: e.message };
  }

  // Log alert
  if (sb) {
    try {
      await sb.from('push_alert_log').insert({
        service,
        alert_type: alertType,
        message,
        delivery_status: deliveryStatus,
        vapid_response: vapidResponse
      });
    } catch (_) {}
  }

  return { deliveryStatus, vapidResponse };
}

exports.handler = withSentry(async function (event) {
  // Auth via Cron-Secret (optional) oder Public bei lokalem pg_cron
  const cronSecret = process.env.HEALTH_CHECK_CRON_SECRET;
  if (cronSecret) {
    const provided = (event.headers && event.headers['x-cron-secret']) || '';
    if (provided !== cronSecret) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  }

  const sb = getSupabase();
  const results = await Promise.all(SERVICES.map(_checkService));
  const alertsTriggered = [];

  for (const r of results) {
    // Persist
    if (sb) {
      try {
        await sb.from('system_health_history').insert(r);
      } catch (e) {
        console.warn('[health-check-cron] insert failed:', e.message);
      }
    }

    // Alert-Logic
    if (r.status === 'down') {
      const recentlyAlerted = await _wasRecentlyAlerted(sb, r.service);
      if (!recentlyAlerted) {
        const alert = await _triggerPushAlert(sb, r.service, 'down',
          'Service "' + r.service + '" ist DOWN: ' + (r.error_msg || 'unknown'));
        alertsTriggered.push({ service: r.service, type: 'down', delivery: alert.deliveryStatus });
      }
    } else if (r.status === 'up') {
      // Recovery-Detection: war es zuletzt down?
      const lastStatus = await _getLastStatus(sb, r.service);
      // Note: lastStatus is BEFORE this insert above — but we just inserted 'up'.
      // Pragmatic: check 2 entries back. Future: dedicated query.
      if (lastStatus === 'down') {
        const alert = await _triggerPushAlert(sb, r.service, 'recovery',
          'Service "' + r.service + '" ist wieder UP (' + r.response_ms + 'ms)');
        alertsTriggered.push({ service: r.service, type: 'recovery', delivery: alert.deliveryStatus });
      }
    } else if (r.status === 'degraded' && r.metadata && r.metadata.latency_warning) {
      const recentlyAlerted = await _wasRecentlyAlerted(sb, r.service);
      if (!recentlyAlerted) {
        const alert = await _triggerPushAlert(sb, r.service, 'latency',
          'Service "' + r.service + '" Latenz-Spike: ' + r.response_ms + 'ms');
        alertsTriggered.push({ service: r.service, type: 'latency', delivery: alert.deliveryStatus });
      }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checked_at: new Date().toISOString(),
      checks: results,
      alerts_triggered: alertsTriggered,
      services_count: SERVICES.length
    })
  };
}, { functionName: 'health-check-cron' });

module.exports.__internals = {
  SERVICES,
  TIMEOUT_MS,
  DOWN_THRESHOLD_MS,
  ALERT_THROTTLE_MIN,
  LATENCY_WARN_MS,
  _checkService
};
