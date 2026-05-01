/**
 * PROVA — CORS Helper
 * Zentrale CORS-Konfiguration fuer alle Netlify Functions.
 * NIEMALS 'Access-Control-Allow-Origin': '*' verwenden bei Auth-Endpoints!
 *
 * Sprint S6 Phase 1.9 (02.05.2026):
 *  - Origin-Match auf URL-Parsing umgestellt (vorher startsWith → Subdomain-
 *    Confusion-Bug). Behebt Audit-8 H-01.
 *  - ALLOWED_ORIGINS um app.prova-systems.de + admin.prova-systems.de
 *    erweitert (vorher fehlte App-Subdomain). Behebt Audit-8 M-02.
 *
 * Usage:
 *   const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');
 *   if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
 *   const corsH = getCorsHeaders(event);
 */

const ALLOWED_ORIGINS = [
  // Production-Hosts (alle drei Subdomains explizit)
  'https://prova-systems.de',
  'https://www.prova-systems.de',
  'https://app.prova-systems.de',
  'https://admin.prova-systems.de',
  // Netlify-Default-Host (Deploy-Previews + Default-URL)
  'https://prova-systems.netlify.app',
  // Netlify-ENV-basiert (Branch-Deploys + Deploy-Previews)
  process.env.URL              || '',
  process.env.DEPLOY_PRIME_URL || '',
  process.env.DEPLOY_URL       || '',
  // Lokale Entwicklung
  'http://localhost:8888',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

/**
 * Strikter Origin-Match: Browser-Origin (scheme://host:port) muss EXAKT
 * einer der ALLOWED_ORIGINS-Origins entsprechen. Verhindert Subdomain-
 * Confusion-Angriffe wie 'https://prova-systems.de.attacker.com'.
 */
function isOriginAllowed(origin) {
  if (!origin) return false;
  let originUrl;
  try { originUrl = new URL(origin); } catch { return false; }
  for (const allowed of ALLOWED_ORIGINS) {
    try {
      const allowedUrl = new URL(allowed);
      if (allowedUrl.origin === originUrl.origin) return true;
    } catch { /* skip invalid entries */ }
  }
  return false;
}

/**
 * @param {Object} event - Netlify Function event
 * @param {string[]} [methods] - HTTP-Methoden-Override (default: POST, GET, OPTIONS)
 * @returns {Object} CORS-Headers
 */
function getCorsHeaders(event, methods) {
  const reqOrigin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const allowedOrigin = isOriginAllowed(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':      allowedOrigin,
    'Access-Control-Allow-Headers':     'Authorization, Content-Type, x-prova-internal, X-Prova-Internal',
    'Access-Control-Allow-Methods':     (methods || ['POST', 'GET', 'OPTIONS']).join(', '),
    'Access-Control-Allow-Credentials': 'true',
    'Vary':                             'Origin'
  };
}

function corsOptionsResponse(event) {
  return {
    statusCode: 204,
    headers: getCorsHeaders(event),
    body: ''
  };
}

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

module.exports = { getCorsHeaders, corsOptionsResponse, jsonResponse, isOriginAllowed };
