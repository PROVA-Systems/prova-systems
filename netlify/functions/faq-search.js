/**
 * PROVA — faq-search.js (MEGA⁴¹ P5)
 *
 * GET ?q=<text>&kategorie=<cat>&limit=10
 * → 200 { results: [{id, kategorie, frage, antwort, score, view_count}], total }
 *
 * tsvector-Volltextsuche (deutsch) in faq_entries.
 * Public — keine Auth nötig (FAQ ist global lesbar).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  const query = (q.q || '').trim();
  const kategorie = q.kategorie || null;
  const limit = Math.min(parseInt(q.limit, 10) || 10, 50);

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    let qb = sb.from('faq_entries')
      .select('id, kategorie, frage, antwort, tags, view_count, helpful_count')
      .order('view_count', { ascending: false })
      .limit(limit);

    if (kategorie) qb = qb.eq('kategorie', kategorie);

    if (query.length >= 2) {
      // tsvector @@ websearch_to_tsquery('german', q) via raw filter
      // Supabase-JS .textSearch unterstützt das
      qb = qb.textSearch('search_vector', query, { config: 'german', type: 'websearch' });
    }

    const { data, error } = await qb;
    if (error) return jsonResponse(event, 500, { error: error.message });

    return jsonResponse(event, 200, {
      results: data || [],
      total: (data || []).length,
      query: query,
      kategorie: kategorie
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}, { functionName: 'faq-search' });
