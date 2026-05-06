/**
 * PROVA — global-search.js (MEGA²⁹ V3.2-W9N-I4)
 *
 * Globale Suche-Lambda für Cmd-K-Modal.
 * Searches across: auftraege, kontakte, gutachten, bescheinigungen.
 *
 * Auth: requireAuth (workspace_member)
 * GET /.netlify/functions/global-search?q=text&limit=10&type=akten|kontakte|dokumente
 *
 * Rate-Limit: 60/60s (Live-Search mit Debounce, kann häufig kommen)
 * Sentry-Wrap mit functionName.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const LimitClamp = (n, def, max) => Math.min(max, Math.max(1, parseInt(n || def, 10) || def));

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  // Rate-Limit für Live-Search (Debounce-tolerant)
  const rl = RateLimit.check(context.userEmail, 60, 60, { event: event, functionName: 'global-search' });
  if (!rl.allowed) {
    return jsonResponse(event, 429, { error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' },
      { 'Retry-After': String(rl.retryAfter) });
  }

  const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
  const cleanQ = String(q).trim();
  if (cleanQ.length < 2) {
    return jsonResponse(event, 200, { results: [], total: 0, q: cleanQ, hint: 'Mindestens 2 Zeichen' });
  }

  const limit = LimitClamp((event.queryStringParameters && event.queryStringParameters.limit) || 10, 10, 50);
  const typeFilter = (event.queryStringParameters && event.queryStringParameters.type) || 'all';
  const userId = context.userId || context.user_id;

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert', results: [] });

  const queryLower = cleanQ.toLowerCase();
  const allResults = [];

  try {
    // 1. Auftraege durchsuchen
    if (typeFilter === 'all' || typeFilter === 'akten') {
      try {
        const { data: auftraege } = await sb.from('auftraege')
          .select('id, aktenzeichen, schadensart, schaden_strasse, ort, status, created_at')
          .or('aktenzeichen.ilike.%' + queryLower + '%,schaden_strasse.ilike.%' + queryLower + '%,ort.ilike.%' + queryLower + '%')
          .limit(limit);
        (auftraege || []).forEach(a => allResults.push({
          type: 'akte',
          id: a.id,
          title: a.aktenzeichen || '(kein AZ)',
          subtitle: [a.schadensart, a.ort].filter(Boolean).join(' · '),
          status: a.status,
          href: 'akte.html?az=' + encodeURIComponent(a.aktenzeichen || ''),
          score: a.aktenzeichen && a.aktenzeichen.toLowerCase().includes(queryLower) ? 100 : 50
        }));
      } catch (_) { /* table maybe not present */ }
    }

    // 2. Kontakte durchsuchen
    if (typeFilter === 'all' || typeFilter === 'kontakte') {
      try {
        const { data: kontakte } = await sb.from('kontakte')
          .select('id, name, firma, email, typ')
          .or('name.ilike.%' + queryLower + '%,firma.ilike.%' + queryLower + '%')
          .limit(limit);
        (kontakte || []).forEach(k => allResults.push({
          type: 'kontakt',
          id: k.id,
          title: k.name || k.firma || '(kein Name)',
          subtitle: [k.typ, k.firma].filter(Boolean).join(' · '),
          href: 'kontakte.html?id=' + encodeURIComponent(k.id),
          score: 60
        }));
      } catch (_) { /* table maybe not present */ }
    }

    // 3. Bescheinigungen durchsuchen (Korrespondenz-Briefe)
    if (typeFilter === 'all' || typeFilter === 'dokumente') {
      // Static-Liste aus bescheinigungen.html W3-I3 (11 K-Codes)
      const KORRESPONDENZ = [
        { code: 'K-01', name: 'Auftragsbestätigung', vorlage: 'auftragsbestaetigung' },
        { code: 'K-02', name: 'Termin-Mitteilung', vorlage: 'einladung-ortstermin' },
        { code: 'K-03', name: 'Mehrparteien-Termin', vorlage: 'einladung-ortstermin-multi' },
        { code: 'K-04', name: 'Anforderung Unterlagen', vorlage: 'nachforderung-unterlagen' },
        { code: 'K-05', name: 'Übergabe Gutachten', vorlage: 'uebergabe-gutachten' },
        { code: 'K-06A', name: 'Mahnung 1 (Erinnerung)', vorlage: 'mahnung-1' },
        { code: 'K-06B', name: 'Mahnung 2', vorlage: 'mahnung-2' },
        { code: 'K-06C', name: 'Mahnung 3 (letzte Frist)', vorlage: 'mahnung-3' },
        { code: 'K-07', name: 'Akteneinsicht-Antrag', vorlage: 'akteneinsicht' },
        { code: 'K-08', name: 'Befangenheits-Anzeige', vorlage: 'befangenheit' },
        { code: 'K-09', name: 'Auftragsablehnung', vorlage: 'auftragsablehnung' }
      ];
      KORRESPONDENZ.filter(b =>
        b.code.toLowerCase().includes(queryLower) ||
        b.name.toLowerCase().includes(queryLower)
      ).forEach(b => allResults.push({
        type: 'dokument',
        id: b.code,
        title: b.name,
        subtitle: b.code + ' · Korrespondenz',
        href: 'briefvorlagen.html?vorlage=' + encodeURIComponent(b.vorlage),
        score: b.code.toLowerCase().includes(queryLower) ? 90 : 40
      }));
    }

    // Sort by score desc, dann limit
    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    const sliced = allResults.slice(0, limit);

    return jsonResponse(event, 200, {
      q: cleanQ,
      total: allResults.length,
      results: sliced
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message, results: [] });
  }
}), { functionName: 'global-search' });
