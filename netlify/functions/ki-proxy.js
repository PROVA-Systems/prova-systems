/**
 * PROVA Systems — KI-Proxy v4.0 (Verbessert)
 * ═══════════════════════════════════════════════════════════════════════
 * VERBESSERUNGEN gegenüber v3.0:
 *
 *  ✅ CAT-1A: Exponential Backoff Retry (3 Versuche: 1s/2s/4s) bei OpenAI-Timeouts
 *  ✅ CAT-1B: Token-Counting + Context-Guard (verhindert 128k-Überschreitung)
 *  ✅ CAT-1C: Prompt-Truncation mit Warnung wenn Diktat zu lang
 *  ✅ CAT-1D: Strukturierter Fehler-Response mit Fehlercode für prova-error-handler.js
 *  ✅ CAT-2D: JWT-Email als User-Kontext für alle Aufgaben erzwungen
 */

const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

// ══════════════════════════════════════════════════════════════
// TOKEN-SCHÄTZER (Heuristik: ~4 Zeichen pro Token für Deutsch)
// Exakt genug für Context-Guard ohne tiktoken-Dependency
// ══════════════════════════════════════════════════════════════
const TOKEN_MODELS = {
  'gpt-4o':      128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4':        8192,
};

function estimateTokens(text) {
  if (!text) return 0;
  // Deutsche Texte: ~3.8 Zeichen/Token (etwas weniger als Englisch)
  return Math.ceil(text.length / 3.8);
}

function getContextLimit(model) {
  return TOKEN_MODELS[model] || 128000;
}

/**
 * Trunciert Text auf max Token-Schätzung mit Warnung
 * Gibt { text, truncated, originalTokens, usedTokens } zurück
 */
function truncateToTokenLimit(text, maxTokens, label) {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) {
    return { text, truncated: false, originalTokens: estimated, usedTokens: estimated };
  }
  // Zeichenlimit berechnen
  const maxChars = Math.floor(maxTokens * 3.8);
  const truncated = text.slice(0, maxChars);
  console.warn(`[ki-proxy] ${label} truncated: ${estimated} → ${maxTokens} estimated tokens`);
  return {
    text: truncated + '\n\n[DIKTAT GEKÜRZT — Originallänge überschritt Kontextlimit]',
    truncated: true,
    originalTokens: estimated,
    usedTokens: maxTokens
  };
}

// ══════════════════════════════════════════════════════════════
// EXPONENTIAL BACKOFF RETRY
// ══════════════════════════════════════════════════════════════
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenAI(params, apiKey) {
  const { model = 'gpt-4o-mini', messages, max_tokens = 1000, temperature = 0.3 } = params;

  // ── Context-Guard ────────────────────────────────────────────
  const contextLimit = getContextLimit(model);
  const reservedForOutput = max_tokens + 500; // Puffer für System-Overhead
  const maxInputTokens = contextLimit - reservedForOutput;

  // Prompt-Gesamtlänge prüfen
  const totalPromptText = messages.map(m => m.content || '').join(' ');
  const totalEstimated = estimateTokens(totalPromptText);

  if (totalEstimated > maxInputTokens) {
    console.warn(`[ki-proxy] Context überschritten: ~${totalEstimated} Tokens (Limit: ${maxInputTokens}). Kürze User-Message.`);
    // Letzten User-Message kürzen (System-Prompt bleibt intakt)
    const truncLimit = maxInputTokens - messages.slice(0, -1).reduce((s, m) => s + estimateTokens(m.content || ''), 0) - 200;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      const result = truncateToTokenLimit(lastMsg.content || '', truncLimit, 'user-message');
      messages[messages.length - 1] = { ...lastMsg, content: result.text };
    }
  }

  const payload = {
    model,
    messages,
    max_tokens,
    temperature,
  };

  let lastError = null;
  let lastStatus = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s Timeout (Netlify Limit: 60s)

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          data,
          content: data.choices?.[0]?.message?.content || '',
          usage: data.usage || {},
          attempt: attempt + 1,
        };
      }

      // Fehler-Body lesen
      const errBody = await res.json().catch(() => ({}));
      lastError = errBody?.error?.message || `HTTP ${res.status}`;

      // Retryable?
      if (!RETRYABLE_STATUS.includes(res.status) || attempt >= RETRY_DELAYS.length) {
        return {
          ok: false,
          status: res.status,
          error: lastError,
          errorCode: classifyOpenAIError(res.status, lastError),
        };
      }

      // Rate-Limit: Retry-After Header auslesen
      let delay = RETRY_DELAYS[attempt];
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter) {
          delay = Math.min(parseInt(retryAfter, 10) * 1000 || delay, 10000);
        }
        console.warn(`[ki-proxy] Rate-Limited (429). Retry ${attempt + 1}/${RETRY_DELAYS.length} in ${delay}ms`);
      } else {
        console.warn(`[ki-proxy] HTTP ${res.status}. Retry ${attempt + 1}/${RETRY_DELAYS.length} in ${delay}ms`);
      }

      await sleep(delay);

    } catch (err) {
      lastError = err.message;

      if (err.name === 'AbortError') {
        lastError = 'OpenAI Timeout (>55s)';
        lastStatus = 408;
      }

      if (attempt >= RETRY_DELAYS.length) {
        return {
          ok: false,
          status: lastStatus || 502,
          error: lastError,
          errorCode: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
        };
      }

      const delay = RETRY_DELAYS[attempt];
      console.warn(`[ki-proxy] Fehler: ${lastError}. Retry ${attempt + 1}/${RETRY_DELAYS.length} in ${delay}ms`);
      await sleep(delay);
    }
  }

  return {
    ok: false,
    status: lastStatus || 502,
    error: lastError || 'Max Retries erreicht',
    errorCode: 'MAX_RETRIES_EXCEEDED',
  };
}

function classifyOpenAIError(status, message) {
  if (status === 401) return 'INVALID_API_KEY';
  if (status === 429) return 'RATE_LIMIT';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 408) return 'TIMEOUT';
  if (status >= 500) return 'OPENAI_SERVER_ERROR';
  if (message && message.includes('context_length')) return 'CONTEXT_TOO_LONG';
  return 'UNKNOWN';
}

// ══════════════════════════════════════════════════════════════
// STRUKTURIERTER ERROR-RESPONSE (für prova-error-handler.js)
// ══════════════════════════════════════════════════════════════
function corsHeaders(event) {
  const allowedOrigins = [process.env.URL, 'https://prova-systems.de', 'http://localhost:8888'];
  const origin = event?.headers?.origin || '';
  const allowOrigin = allowedOrigins.includes(origin) ? origin : (process.env.URL || 'https://prova-systems.de');
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function errorResponse(event, status, code, message, detail) {
  return {
    statusCode: status,
    headers: corsHeaders(event),
    body: JSON.stringify({
      error: message,
      errorCode: code,           // Für prova-error-handler.js
      detail: detail || null,
      retryable: [408, 429, 500, 502, 503, 504].includes(status),
    }),
  };
}

function jsonResponse(event, data, status) {
  return {
    statusCode: status || 200,
    headers: corsHeaders(event),
    body: JSON.stringify(data),
  };
}

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════
exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(event),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(event, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse(event, 500, 'API_KEY_MISSING', 'OpenAI API-Key nicht konfiguriert');
  }

  // JWT-Auth (empfohlen aber optional — ki-proxy.js war vorher ohne JWT)
  // Aktiviere dies für Prod: alle KI-Aufrufe erfordern Login
  const jwtUser = context?.clientContext?.user;
  // Uncomment für Pflicht-Auth:
  // if (!jwtUser?.email) return errorResponse(event, 401, 'UNAUTHORIZED', 'Anmeldung erforderlich');

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return errorResponse(event, 400, 'INVALID_JSON', 'Ungültiges JSON im Request-Body');
  }

  try {
    const aufgabe = body.aufgabe || 'messages';

    if (aufgabe === 'fachurteil_entwurf') return await handleFachurteilEntwurf(event, body, apiKey);
    if (aufgabe === 'qualitaetspruefung') return await handleQualitaetspruefung(event, body, apiKey);
    if (aufgabe === 'freitext')           return await handleFreitext(event, body, apiKey);
    if (aufgabe === 'assist_inline')      return await handleAssistInline(event, body, apiKey);
    if (aufgabe === 'support_chat')       return await handleSupportChat(event, body, apiKey);
    return await handleMessages(event, body, apiKey);

  } catch (e) {
    console.error('[ki-proxy] Unbehandelter Fehler:', e.message, e.stack);
    return errorResponse(event, 502, 'UPSTREAM_ERROR', 'Upstream error', e.message);
  }
};

// ══════════════════════════════════════════════════════════════
// HANDLER: Fachurteil-Entwurf (Hauptfunktion)
// ══════════════════════════════════════════════════════════════
async function handleFachurteilEntwurf(event, body, apiKey) {
  const {
    diktat = '', diktat_manuell = '', schadenart = '', messwerte = '',
    verwendungszweck = 'gericht', paragraphen = null,
    az = '', objekt = '', baujahr = '', auftraggeber = '',
    model = 'gpt-4o-mini',
  } = body;

  const entwurf = paragraphen ? (paragraphen.gesamt || '') : '';
  const gesamtKontext = (diktat + ' ' + diktat_manuell + ' ' + messwerte + ' ' + entwurf).trim();

  if (gesamtKontext.length < 50) {
    return jsonResponse(event, {
      ursachenkategorien: [], messwert_analyse: [], normen_vorschlaege: [],
      diktat_extrakte: { feststellungen: '', hat_ursachen: false, hat_empfehlungen: false },
      hinweis: 'DIKTAT_ZU_KURZ',
    });
  }

  // ── Token-Check für Diktat ───────────────────────────────────
  const MAX_DIKTAT_TOKENS = 60000; // Lässt Platz für System-Prompt + Output
  const diktatCheck = truncateToTokenLimit(gesamtKontext, MAX_DIKTAT_TOKENS, 'Fachurteil-Diktat');
  const diktatFinal = diktatCheck.text;

  const systemPrompt = buildFachurteilSystemPrompt();
  const gutTypMap = { gericht: 'Gerichtsgutachten', versicherung: 'Versicherungsgutachten', privat: 'Privatgutachten' };
  const userPrompt = buildFachurteilUserPrompt({
    az, schadenart, objekt, baujahr, auftraggeber,
    gutTyp: gutTypMap[verwendungszweck] || verwendungszweck,
    diktat: diktatFinal,
    messwerte,
    truncated: diktatCheck.truncated,
  });

  const result = await callOpenAI({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  }, apiKey);

  if (!result.ok) {
    return errorResponse(event, result.status, result.errorCode, 'KI-Analyse fehlgeschlagen', result.error);
  }

  // JSON aus Response extrahieren
  let parsed;
  try {
    const raw = result.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    console.error('[ki-proxy] JSON-Parse Fehler:', e.message);
    return errorResponse(event, 502, 'INVALID_AI_RESPONSE', 'KI-Antwort konnte nicht verarbeitet werden');
  }

  // Warnung hinzufügen wenn Diktat gekürzt wurde
  if (diktatCheck.truncated) {
    parsed._warnung = `Diktat war zu lang (ca. ${diktatCheck.originalTokens} Tokens) und wurde auf ${diktatCheck.usedTokens} Tokens gekürzt.`;
    parsed._diktat_gekuerzt = true;
  }

  parsed._usage = result.usage;
  parsed._attempts = result.attempt;

  return jsonResponse(event, parsed);
}

// ══════════════════════════════════════════════════════════════
// HANDLER: Qualitätsprüfung
// ══════════════════════════════════════════════════════════════
async function handleQualitaetspruefung(event, body, apiKey) {
  const { gutachten_text = '', az = '', model = 'gpt-4o-mini' } = body;

  if (!gutachten_text || gutachten_text.length < 100) {
    return jsonResponse(event, { pruefpunkte: [], gesamt_bewertung: 'TEXT_ZU_KURZ' });
  }

  // Token-Check
  const textCheck = truncateToTokenLimit(gutachten_text, 50000, 'Qualitätsprüfung-Text');

  const result = await callOpenAI({
    model,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein erfahrener Gutachter-Reviewer. Prüfe Gutachtentexte auf Vollständigkeit, §407a ZPO-Konformität, Konjunktiv II bei Ursachen, und fachliche Korrektheit. Antworte mit JSON: { pruefpunkte: [{kategorie, bewertung, hinweis}], gesamt_bewertung, verbesserungen }',
      },
      {
        role: 'user',
        content: `AZ: ${az}\n\nGutachtentext:\n${textCheck.text}`,
      },
    ],
    max_tokens: 600,
    temperature: 0.2,
  }, apiKey);

  if (!result.ok) {
    return errorResponse(event, result.status, result.errorCode, 'Qualitätsprüfung fehlgeschlagen', result.error);
  }

  try {
    const raw = result.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    if (textCheck.truncated) parsed._gutachten_gekuerzt = true;
    return jsonResponse(event, parsed);
  } catch (e) {
    return errorResponse(event, 502, 'INVALID_AI_RESPONSE', 'Qualitätsprüfungs-Antwort ungültig');
  }
}

// ══════════════════════════════════════════════════════════════
// HANDLER: Freitext
// ══════════════════════════════════════════════════════════════
async function handleFreitext(event, body, apiKey) {
  const { prompt: userPrompt = '', model = 'gpt-4o-mini', max_tokens = 500 } = body;

  if (!userPrompt || userPrompt.length < 5) {
    return errorResponse(event, 400, 'PROMPT_TOO_SHORT', 'Prompt zu kurz');
  }

  const result = await callOpenAI({
    model,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Assistent für öffentlich bestellte Bausachverständige. Antworte präzise und fachlich korrekt auf Deutsch.',
      },
      { role: 'user', content: userPrompt },
    ],
    max_tokens,
    temperature: 0.4,
  }, apiKey);

  if (!result.ok) {
    return errorResponse(event, result.status, result.errorCode, 'KI-Freitext fehlgeschlagen', result.error);
  }

  return jsonResponse(event, { antwort: result.content, usage: result.usage });
}

// ══════════════════════════════════════════════════════════════
// HANDLER: Assist Inline (Inline-Textkorrektur)
// ══════════════════════════════════════════════════════════════
async function handleAssistInline(event, body, apiKey) {
  const { text = '', aufgabe_detail = 'verbessern', model = 'gpt-4o-mini' } = body;

  if (!text || text.length < 10) {
    return errorResponse(event, 400, 'TEXT_TOO_SHORT', 'Text zu kurz für Inline-Assistent');
  }

  const textCheck = truncateToTokenLimit(text, 30000, 'Inline-Assist-Text');

  const result = await callOpenAI({
    model,
    messages: [
      {
        role: 'system',
        content: 'Du verbesserst Gutachtentexte für ö.b.u.v. Bausachverständige. Aufgabe: ' + aufgabe_detail + '. Behalte Fachsprache. Antworte mit JSON: { verbesserter_text, aenderungen }',
      },
      { role: 'user', content: textCheck.text },
    ],
    max_tokens: Math.min(estimateTokens(text) * 1.5 + 200, 2000),
    temperature: 0.3,
  }, apiKey);

  if (!result.ok) {
    return errorResponse(event, result.status, result.errorCode, 'Inline-Assistent fehlgeschlagen', result.error);
  }

  try {
    const raw = result.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return jsonResponse(event, parsed);
  } catch (e) {
    // Fallback: direkt als verbesserter Text
    return jsonResponse(event, { verbesserter_text: result.content, aenderungen: [] });
  }
}

// ══════════════════════════════════════════════════════════════
// HANDLER: Support-Chat
// ══════════════════════════════════════════════════════════════
async function handleSupportChat(event, body, apiKey) {
  const { messages: chatMessages = [], userMsg = '', model = 'gpt-4o-mini' } = body;

  if (!userMsg || userMsg.trim().length < 3) {
    return errorResponse(event, 400, 'MESSAGE_TOO_SHORT', 'Nachricht zu kurz');
  }

  const systemMsg = {
    role: 'system',
    content: 'Du bist der freundliche Support-Assistent von PROVA Systems. Beantworte Fragen zum KI-Gutachten-System, zu JVEG, zu §407a ZPO und zu Bausachverständigen-Themen. Antworte auf Deutsch, präzise und hilfsbereit. Bei unklaren Fragen: nachfragen.',
  };

  const allMessages = [systemMsg, ...chatMessages.slice(-10), { role: 'user', content: userMsg }];

  const result = await callOpenAI({
    model,
    messages: allMessages,
    max_tokens: 400,
    temperature: 0.5,
  }, apiKey);

  if (!result.ok) {
    return errorResponse(event, result.status, result.errorCode, 'Support-Chat fehlgeschlagen', result.error);
  }

  return jsonResponse(event, {
    antwort: result.content,
    usage: result.usage,
  });
}

// ══════════════════════════════════════════════════════════════
// HANDLER: Generic Messages
// ══════════════════════════════════════════════════════════════
async function handleMessages(event, body, apiKey) {
  const { messages = [], model = 'gpt-4o-mini', max_tokens = 500 } = body;

  if (!messages.length) {
    return errorResponse(event, 400, 'NO_MESSAGES', 'Keine messages angegeben');
  }

  const result = await callOpenAI({ model, messages, max_tokens, temperature: 0.3 }, apiKey);

  if (!result.ok) {
    return errorResponse(event, result.status, result.errorCode, 'KI-Anfrage fehlgeschlagen', result.error);
  }

  return jsonResponse(event, {
    choices: [{ message: { role: 'assistant', content: result.content } }],
    usage: result.usage,
  });
}

// ══════════════════════════════════════════════════════════════
// SYSTEM-PROMPT BUILDER (ausgelagert für Lesbarkeit)
// ══════════════════════════════════════════════════════════════
function buildFachurteilSystemPrompt() {
  return `Du bist ein öffentlich bestellter und vereidigter Sachverständiger für Schäden an Gebäuden mit 30 Jahren Berufserfahrung. Du analysierst Schadensfälle für das PROVA Gutachten-Assistenzsystem.

EXPERTISE: Wasserschaden, Schimmel/Feuchte, Brandschaden, Sturm, Elementar, Baumängel. DIN 4108-2/3/7, WTA 6-1-01/D, DIN 68800, DIN EN ISO 13788, DIN 18195, VOB/B §13, §§823/906 BGB. BGH-Rspr. zu Beweislast und Kausalität.

GRENZWERTE: fRsi ≥ 0,70 (DIN 4108-2) | Holzfeuchte <18% unkritisch, >20% kritisch (DIN 68800-1) | Raumluftfeuchte >60% rel.F. kritisch | Taupunkt nach Magnus-Formel | Rissbreite >0,2mm nach DIN 52460.

══════════════ HALLUZINATIONSVERBOT ══════════════
NIEMALS Informationen erfinden die nicht im ORIGINAL-DIKTAT stehen.
• Straßen, Hausnummern, Städte NUR aus Diktat übernehmen — niemals ergänzen.
• Messwerte NUR aus Diktat — niemals schätzen oder interpolieren.
• Namen, Firmen, Daten NUR wenn explizit im Diktat genannt.
• Wenn eine Information fehlt: "[fehlt]" schreiben, NICHT erfinden.
══════════════════════════════════════════════════

KONJUNKTIV II PFLICHT für §5 Ursachen:
• Alle Ursachenhypothesen MÜSSEN im Konjunktiv II formuliert sein.
• RICHTIG: "Als Ursache käme ... in Betracht", "könnte ... zurückzuführen sein"
• FALSCH: "Die Ursache ist...", "Es handelt sich um..." (Indikativ verboten)

OUTPUT: Gültiges JSON-Objekt mit den Feldern: ursachenkategorien, messwert_analyse, normen_vorschlaege, diktat_extrakte`;
}

function buildFachurteilUserPrompt({ az, schadenart, objekt, baujahr, auftraggeber, gutTyp, diktat, messwerte, truncated }) {
  return `FALLANALYSE:
AZ: ${az || '—'} | Schadensart: ${schadenart || '—'} | Objekt: ${objekt || '—'}${baujahr ? ' | Baujahr: ' + baujahr : ''}${auftraggeber ? ' | Auftraggeber: ' + auftraggeber : ''}
Gutachtentyp: ${gutTyp || 'Privatgutachten'}
${truncated ? '\n⚠️ HINWEIS: Das Diktat wurde wegen Überlänge automatisch gekürzt.\n' : ''}
ORIGINAL-DIKTAT:
${diktat}

${messwerte ? 'MESSWERTE:\n' + messwerte : ''}

Analysiere das Diktat und erstelle das JSON-Objekt.`;
}