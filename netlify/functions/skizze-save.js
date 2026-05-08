/**
 * PROVA — skizze-save.js (MEGA³⁹ P3)
 *
 * POST { auftrag_id, skizze_nr, data, png? }
 *   → speichert Skizze als eintrag (typ='skizze') in der eintraege-Tabelle.
 *
 * data = exportJSON() aus lib/skizzen-canvas.js:
 *   { tier, canvas_width, canvas_height, background, strokes, markers, scale }
 *
 * png = optional dataURL (für PDF-Einbettung). Wird in Supabase Storage
 *       Bucket sv-files unter skizzen/{workspace_id}/{auftrag_id}/{nr}.png abgelegt.
 *
 * Auth: requireAuth, RLS via workspace_memberships.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });
  const skizze_nr = parseInt(body.skizze_nr || 1, 10);
  if (isNaN(skizze_nr) || skizze_nr < 1) {
    return jsonResponse(event, 400, { error: 'skizze_nr muss positive Zahl sein' });
  }
  if (!body.data || typeof body.data !== 'object') {
    return jsonResponse(event, 400, { error: 'data (Skizze-JSON) pflicht' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // Workspace via profiles → workspace_memberships
    const { data: profile } = await sb.from('profiles')
      .select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships')
      .select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    // PNG optional in Storage
    let imageUrl = null;
    if (body.png && typeof body.png === 'string' && body.png.startsWith('data:image/')) {
      try {
        const base64 = body.png.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const key = `skizzen/${ms.workspace_id}/${body.auftrag_id}/${skizze_nr}.png`;
        const { error: upErr } = await sb.storage.from('sv-files')
          .upload(key, buffer, { contentType: 'image/png', upsert: true });
        if (!upErr) {
          const { data: pubUrl } = sb.storage.from('sv-files').getPublicUrl(key);
          imageUrl = pubUrl && pubUrl.publicUrl;
        }
      } catch (e) { /* image upload failure ist nicht-blockierend */ }
    }

    // Upsert eintrag (typ=skizze)
    const eintragRow = {
      workspace_id: ms.workspace_id,
      auftrag_id: body.auftrag_id,
      typ: 'skizze',
      skizze_nr: skizze_nr,
      titel: body.data.titel || ('Skizze ' + skizze_nr),
      content: 'Skizze ' + skizze_nr,
      skizze_data: body.data,
      skizze_image_url: imageUrl,
      created_by_user_id: profile.id,
      updated_at: new Date().toISOString()
    };

    // Existierenden Eintrag updaten? Sonst neu insert
    const { data: existing } = await sb.from('eintraege')
      .select('id')
      .eq('auftrag_id', body.auftrag_id)
      .eq('typ', 'skizze')
      .eq('skizze_nr', skizze_nr)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await sb.from('eintraege')
        .update(eintragRow).eq('id', existing.id).select().maybeSingle();
      if (error) return jsonResponse(event, 500, { error: error.message });
      result = data;
    } else {
      const { data, error } = await sb.from('eintraege').insert(eintragRow).select().maybeSingle();
      if (error) return jsonResponse(event, 500, { error: error.message });
      result = data;
    }

    return jsonResponse(event, 200, {
      eintrag_id: result.id,
      auftrag_id: body.auftrag_id,
      skizze_nr: skizze_nr,
      image_url: imageUrl,
      marker_count: (body.data.markers || []).length
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'skizze-save' });
