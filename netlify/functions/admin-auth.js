// ══════════════════════════════════════════════════
// PROVA Systems — Admin Auth (bcrypt)
// Netlify Function: admin-auth
// Env: ADMIN_PASSWORD_BCRYPT
//
// Professionelle Passwort-Prüfung mit bcrypt.
// bcrypt ist absichtlich langsam → Brute-Force unmöglich.
// Gleicher Standard wie Stripe, Notion, Linear etc.
// ══════════════════════════════════════════════════

const bcrypt = require('bcryptjs');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

exports.handler = async (event) => {
  // S6 Phase 1.9: zentralen cors-helper nutzen statt lokal hardcoded.
  // ALLOWED_ORIGINS in cors-helper enthaelt admin.prova-systems.de.
  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(event)
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{"error":"Method Not Allowed"}' };

  try {
    // Nur mit verifiziertem Netlify-Identity User (JWT)
    const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
      ? String(event.clientContext.user.email).toLowerCase()
      : '';
    const isAdmin = jwtEmail.endsWith('@prova-systems.de') || jwtEmail === 'admin@prova-systems.de';
    if (!isAdmin) {
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }) };
    }

    const { password } = JSON.parse(event.body || '{}');

    if (!password) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Passwort fehlt' }) };
    }

    // bcrypt Hash aus Env-Var laden
    const storedHash = process.env.ADMIN_PASSWORD_BCRYPT;

    if (!storedHash) {
      // Fallback auf alten SHA-256 Hash (Übergangsphase)
      const oldHash = process.env.ADMIN_PASSWORD_HASH;
      if (oldHash) {
        const crypto = require('crypto');
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        if (sha256 === oldHash) {
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, method: 'sha256-fallback' }) };
        }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false }) };
    }

    // bcrypt Vergleich (absichtlich langsam — ~100ms pro Versuch)
    const match = await bcrypt.compare(password, storedHash);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: match })
    };

  } catch (err) {
    console.error('admin-auth error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server-Fehler' }) };
  }
};
