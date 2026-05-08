/**
 * PROVA — user-favoriten-toggle.js (MEGA³⁹ P5)
 *
 * POST { kategorie, item_id, item_label? }
 *   → 200 { ok: true, is_favorit: boolean, action: 'added'|'removed' }
 *
 * Toggle-Logik: existiert Eintrag → DELETE; sonst INSERT.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const VALID_KATEGORIEN = ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen'];

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.kategorie || !VALID_KATEGORIEN.includes(body.kategorie)) {
    return jsonResponse(event, 400, { error: 'kategorie ungültig', valid: VALID_KATEGORIEN });
  }
  if (!body.item_id || typeof body.item_id !== 'string') {
    return jsonResponse(event, 400, { error: 'item_id (String) pflicht' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });

    // Existenz prüfen
    const { data: existing } = await sb.from('user_favoriten')
      .select('id')
      .eq('user_id', profile.id)
      .eq('kategorie', body.kategorie)
      .eq('item_id', body.item_id)
      .maybeSingle();

    if (existing) {
      // Remove
      const { error } = await sb.from('user_favoriten').delete().eq('id', existing.id);
      if (error) return jsonResponse(event, 500, { error: error.message });
      return jsonResponse(event, 200, { ok: true, is_favorit: false, action: 'removed' });
    } else {
      // Add
      const { error } = await sb.from('user_favoriten').insert({
        user_id: profile.id,
        kategorie: body.kategorie,
        item_id: body.item_id,
        item_label: body.item_label || null
      });
      if (error) return jsonResponse(event, 500, { error: error.message });
      return jsonResponse(event, 200, { ok: true, is_favorit: true, action: 'added' });
    }
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'user-favoriten-toggle' });

module.exports.__VALID_KATEGORIEN = VALID_KATEGORIEN;
