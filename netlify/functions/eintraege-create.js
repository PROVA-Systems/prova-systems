/**
 * PROVA — eintraege-create.js (MEGA³² W12-I1 Schema-Reconciled)
 *
 * POST { auftrag_id, typ ('diktat'|'text'|'foto'|'mix'), titel, content, datum?, dauer_min?, abrechenbar?, ortstermin_id?, audio_dateien_ids?, foto_ids? }
 *
 * Schema: existing public.eintraege (W12-I0 Schema-Audit verifiziert).
 * Pseudonymisierung-Flag wird gesetzt — KI-Calls erfolgen via separate Pipeline.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const EINTRAG_TYP = ['diktat', 'text', 'foto', 'mix'];

// Defensive Inline-Pseudonymisierung-Detection (regex-basiert).
// Echte Pipeline läuft separat via prova-pseudo.js Frontend-Helper.
function detectPiiCandidates(text) {
  if (!text) return false;
  // Detect: Email, IBAN-ähnlich, Telefon-Pattern, "Herr/Frau <Name>"
  const patterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,        // Email
    /\b[A-Z]{2}\d{2}[A-Z0-9]{15,30}\b/,                   // IBAN-Like
    /\b\+?\d[\d\s\-\/\(\)]{6,}\d\b/,                      // Phone
    /\b(?:Herr|Frau|Hr\.|Fr\.)\s+[A-ZÄÖÜ][a-zäöüß]+/      // "Herr Müller"
  ];
  return patterns.some(p => p.test(text));
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'eintraege-create' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  // Backwards-Compat: alte Frontends senden schadensfall_id + beschreibung_text + eintrag_typ
  const auftrag_id = body.auftrag_id || body.schadensfall_id;
  const titel = body.titel || (body.beschreibung_text ? body.beschreibung_text.slice(0, 80) : null);
  const content = body.content || body.beschreibung_text || null;
  const typ = body.typ || body.eintrag_typ;

  if (!auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });
  if (!typ || EINTRAG_TYP.indexOf(typ) < 0) return jsonResponse(event, 400, { error: 'typ ungültig (' + EINTRAG_TYP.join('|') + ')' });
  if (!titel || titel.length < 2) return jsonResponse(event, 400, { error: 'titel pflicht (min 2 Zeichen)' });
  if (!content || content.length < 5) return jsonResponse(event, 400, { error: 'content pflicht (min 5 Zeichen)' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Workspace-Resolve via auftraege-Table
  const { data: fall, error: fErr } = await sb.from('auftraege')
    .select('workspace_id').eq('id', auftrag_id).maybeSingle();
  if (fErr) return jsonResponse(event, 500, { error: fErr.message });
  if (!fall) return jsonResponse(event, 404, { error: 'Auftrag nicht gefunden' });

  // PII-Heuristik (DSGVO Art. 5 Lit. c — Datenminimierung)
  const piiDetected = detectPiiCandidates(content);

  const insert = {
    auftrag_id: auftrag_id,
    workspace_id: fall.workspace_id,
    typ: typ,
    datum: body.datum || new Date().toISOString().slice(0, 10),
    titel: titel,
    content: content,
    ortstermin_id: body.ortstermin_id || null,
    audio_dateien_ids: body.audio_dateien_ids || [],
    foto_ids: body.foto_ids || [],
    pseudonymisiert: !piiDetected, // wenn keine PII detected, gilt als pseudonymisiert; sonst false als Hinweis
    konjunktiv_check_passed: false, // wird vor KI-Call gesetzt
    dauer_min: parseInt(body.dauer_min || 0, 10) || null,
    abrechenbar: body.abrechenbar !== false,
    created_by_user_id: context.userId
  };

  try {
    const { data, error } = await sb.from('eintraege').insert(insert).select().single();
    if (error) return jsonResponse(event, 500, { error: error.message });
    return jsonResponse(event, 201, {
      eintrag: data,
      created: true,
      warnings: piiDetected ? ['Mögliche PII im content erkannt — bitte vor KI-Verarbeitung prüfen (DSGVO Art. 5)'] : []
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-create' });

module.exports.__EINTRAG_TYP = EINTRAG_TYP;
module.exports.__detectPiiCandidates = detectPiiCandidates;
