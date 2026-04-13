/**
 * PROVA — CORS Helper
 * Zentrale CORS-Konfiguration für alle Netlify Functions.
 * NIEMALS 'Access-Control-Allow-Origin': '*' verwenden!
 *
 * Usage:
 *   const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
 *   const corsH = getCorsHeaders(event);
 *   if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
 */

const ALLOWED_ORIGINS = [
  process.env.URL                            || 'https://prova-systems.de',
  process.env.DEPLOY_PRIME_URL               || '',
  'https://prova-systems.netlify.app',
  // Lokale Entwicklung:
  'http://localhost:8888',
  'http://localhost:3000',
].filter(Boolean);

/**
 * Gibt CORS-Header zurück, die den Origin des Requests einschränken.
 * @param {Object} event - Netlify Function event
 * @param {string[]} methods - Erlaubte HTTP-Methoden (default: POST, OPTIONS)
 * @returns {Object} CORS-Headers
 */
function getCorsHeaders(event, methods) {
  const origin = (event && event.headers && event.headers.origin) || '';
  const allowedOrigin = ALLOWED_ORIGINS.find(o => o && origin.startsWith(o))
    || ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-prova-internal, X-Prova-Internal',
    'Access-Control-Allow-Methods': (methods || ['POST', 'GET', 'OPTIONS']).join(', '),
    'Access-Control-Allow-Credentials': 'true'
  };
}

/**
 * Fertige OPTIONS-Response für CORS Preflight.
 * @param {Object} event
 * @returns {Object} Netlify Response
 */
function corsOptionsResponse(event) {
  return {
    statusCode: 204,
    headers: getCorsHeaders(event),
    body: ''
  };
}

/**
 * JSON-Response Helfer mit korrekten CORS-Headern.
 * @param {Object} event
 * @param {number} statusCode
 * @param {Object} obj
 * @returns {Object} Netlify Response
 */
function jsonResponse(event, statusCode, obj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(event)
    },
    body: JSON.stringify(obj)
  };
}

module.exports = { getCorsHeaders, corsOptionsResponse, jsonResponse };