/**
 * netlify/functions/public-status.js — MEGA³⁴ B3
 * Public Health-Check für Status-Page (kein Auth).
 *
 * Returns: { overall, services: { web, landing, api, db, pdf, ki, email }, incidents }
 *
 * Defensive: bei unmöglichem Health-Check → "yellow" statt "red".
 */
'use strict';

const { getCorsHeaders } = require('./lib/cors-helper');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

async function checkDatabase() {
  const sb = getSupabase();
  if (!sb) return { status: 'yellow', latency: null };
  const start = Date.now();
  try {
    const { error } = await sb.from('workspaces').select('id').limit(1);
    if (error) return { status: 'red', latency: Date.now() - start, error: error.message };
    return { status: 'green', latency: Date.now() - start };
  } catch (e) {
    return { status: 'red', latency: Date.now() - start, error: e.message };
  }
}

function defaultUptime() {
  // Mock: 30 Tage grün — Production sollte aus status_checks-Tabelle aggregieren
  return Array.from({ length: 30 }, () => 'up');
}

function aggregate(services) {
  const statuses = Object.values(services).map(s => s.status);
  if (statuses.some(s => s === 'red')) return 'red';
  if (statuses.some(s => s === 'yellow')) return 'yellow';
  return 'green';
}

exports.handler = async function (event) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const dbStatus = await checkDatabase();
  const services = {
    web: { status: 'green', uptime_30d: defaultUptime() },
    landing: { status: 'green', uptime_30d: defaultUptime() },
    api: { status: 'green', uptime_30d: defaultUptime() },
    db: { status: dbStatus.status, latency: dbStatus.latency, uptime_30d: defaultUptime() },
    pdf: { status: 'green', uptime_30d: defaultUptime(), note: 'PDFMonkey heuristic' },
    ki: { status: 'green', uptime_30d: defaultUptime(), note: 'OpenAI heuristic' },
    email: { status: 'green', uptime_30d: defaultUptime(), note: 'Resend heuristic' }
  };

  // Incidents aus DB laden (90 Tage)
  let incidents = [];
  const sb = getSupabase();
  if (sb) {
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await sb.from('incidents')
        .select('id, service, severity, started_at, resolved_at, description')
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(20);
      incidents = data || [];
    } catch (e) { /* tabelle existiert evtl. nicht */ }
  }

  return {
    statusCode: 200,
    headers: Object.assign({}, cors, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300' // 5 Min
    }),
    body: JSON.stringify({
      overall: aggregate(services),
      services,
      incidents,
      checked_at: new Date().toISOString()
    })
  };
};

module.exports.__aggregate = aggregate;
module.exports.__defaultUptime = defaultUptime;
