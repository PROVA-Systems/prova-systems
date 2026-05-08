/**
 * PROVA — ki-diktat-strukturierung.js (MEGA³¹ D1)
 *
 * Strukturiert pseudonymisiertes Diktat-Transkript in §1-§5-Schema.
 *
 * POST { transkript, auftrag_id?, audio_id? }
 * → JSON { paragraf_1, paragraf_2, paragraf_3, paragraf_4, paragraf_5, modell, kosten_eur }
 *
 * Auth: requireAuth (workspace_member).
 * Modell: gpt-5.4-mini via lib/ai-router.js (purpose='diktat_strukturierung').
 * Logging: lib/ki-cost-tracker.start/finish (Regel 16).
 * Pseudonymisierung: vor Call (Regel 17).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');
const Router = require('./lib/ai-router');
const Tracker = require('./lib/ki-cost-tracker');

const ACTION = 'diktat_strukturierung';

const SYSTEM_PROMPT = `Du bist ein Strukturierungs-Assistent für Bausachverständigen-Gutachten.
Du erhältst ein PSEUDONYMISIERTES Diktat-Transkript und strukturierst es in 5 Paragraphen
nach IHK-Sachverständigen-Norm:

§1 Anlass — Was war der Auftrag? Wer hat beauftragt? Worum geht es?
§2 Sachverhalt — Was wurde vor Ort vorgefunden? (rein faktisch)
§3 Anknüpfungstatsachen — Welche Daten/Messwerte/Unterlagen liegen vor?
§4 Befunde — Welche Beobachtungen wurden gemacht? (rein faktisch, keine Wertung)
§5 Beweisfragen — Welche Fragen stellten sich für die Begutachtung?

WICHTIG:
- KEINE Kausalaussagen oder Wertungen (das ist §6 Fachurteil-Sache des SV)
- Konjunktiv II nicht erforderlich (§1-§5 sind faktisch)
- KEINE PII rekonstruieren (Pseudonymisierungs-Platzhalter beibehalten)
- Output als striktes JSON: { "paragraf_1": "...", "paragraf_2": "...", ... }`;

function pseudonymisierungOk(text) {
  // defensive Heuristik: erkennt offensichtliche PII-Reste (Email, IBAN, Telefon)
  if (!text) return false;
  const piiPatterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,         // Email
    /\b[A-Z]{2}\d{2}[A-Z0-9]{15,30}\b/,                    // IBAN
    /\b\+?\d[\d\s\-\/\(\)]{6,}\d\b/                        // Telefon
  ];
  return !piiPatterns.some(p => p.test(text));
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'ki-diktat-strukturierung' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const transkript = body.transkript || body.text;
  if (!transkript || transkript.length < 30) {
    return jsonResponse(event, 400, { error: 'transkript pflicht (min 30 Zeichen)' });
  }

  // Pseudonymisierungs-Check (Regel 17)
  const pseudoOk = pseudonymisierungOk(transkript);
  if (!pseudoOk) {
    return jsonResponse(event, 400, {
      error: 'Pseudonymisierungs-Verstoß: PII im Input erkannt. Erst pseudonymisieren via /lib/prova-pseudo.js'
    });
  }

  const sb = getSupabase();
  const modell = Router.chooseModel(ACTION, body.user_mode || 'schnell');

  // ki_protokoll-Logging Start
  const track = Tracker.start({
    workspace_id: body.workspace_id || null,
    user_id: context.userId,
    auftrag_id: body.auftrag_id || null,
    audio_id: body.audio_id || null,
    purpose: ACTION,
    feature_kontext: 'diktat-pipeline',
    page_url: event.headers && event.headers.referer || null,
    modell: modell,
    provider: 'openai',
    input_pseudonymisiert: true,
    pseudonymisierung_token_count: 0
  });

  try {
    const fetch = global.fetch;
    const apiKey = process.env.OPENAI_API_KEY || process.env.PROVA_OPENAI_API_KEY;
    if (!apiKey) {
      // Defensive: kein API-Key → Schema-Stub für Entwicklungs-Tests
      return jsonResponse(event, 503, { error: 'OPENAI_API_KEY nicht konfiguriert' });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modell,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transkript }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const err = await res.text();
      if (sb) await Tracker.finish(sb, track, { token_input: 0, token_output: 0, status: 'fehler', fehler_message: err });
      return jsonResponse(event, res.status, { error: 'KI-Call fehlgeschlagen', detail: err.slice(0, 200) });
    }

    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '{}';
    let parsed;
    try { parsed = JSON.parse(content); }
    catch (e) { parsed = { raw: content }; }

    // ki_protokoll-Logging Finish
    let kosten_eur = 0;
    if (sb) {
      const r = await Tracker.finish(sb, track, {
        token_input: data.usage && data.usage.prompt_tokens || 0,
        token_output: data.usage && data.usage.completion_tokens || 0,
        status: 'erfolg',
        output: content
      });
      kosten_eur = r.kosten_eur || 0;
    }

    return jsonResponse(event, 200, {
      paragraf_1: parsed.paragraf_1 || '',
      paragraf_2: parsed.paragraf_2 || '',
      paragraf_3: parsed.paragraf_3 || '',
      paragraf_4: parsed.paragraf_4 || '',
      paragraf_5: parsed.paragraf_5 || '',
      modell: modell,
      kosten_eur: kosten_eur,
      tokens: data.usage || {}
    });
  } catch (e) {
    if (sb) await Tracker.finish(sb, track, { token_input: 0, token_output: 0, status: 'fehler', fehler_message: e.message });
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'ki-diktat-strukturierung' });

module.exports.__ACTION = ACTION;
module.exports.__SYSTEM_PROMPT = SYSTEM_PROMPT;
module.exports.__pseudonymisierungOk = pseudonymisierungOk;
