/**
 * PROVA — Admin Cache Clear
 * Leert den Access-Cache für einen spezifischen SV nach Admin-Aktionen.
 * Nur für PROVA-Admins zugänglich.
 */
'use strict';
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { clearAccessCache } = require('./lib/prova-subscription');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // Admin-Auth: PROVA_INTERNAL_WRITE_SECRET
  const secret = (event.headers['x-prova-internal'] || '').trim();
  if (!secret || secret !== (process.env.PROVA_INTERNAL_WRITE_SECRET || '')) {
    return { statusCode: 403, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Verboten' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}
  const email = (body.email || '').trim().toLowerCase();
  if (!email) return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'email fehlt' }) };

  clearAccessCache(email);
  return {
    statusCode: 200,
    headers: getCorsHeaders(event),
    body: JSON.stringify({ ok: true, cleared: email })
  };
};
