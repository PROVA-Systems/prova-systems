/**
 * PROVA Systems — Whisper Diktat v2.0 (Verbessert)
 * ═══════════════════════════════════════════════════════════════════════
 * VERBESSERUNGEN gegenüber v1:
 *
 *  ✅ CAT-1C: Audio-Chunking für Dateien >25MB
 *             → 30-Minuten-Diktate werden in Segmente aufgeteilt
 *             → Jedes Segment wird separat an Whisper gesendet
 *             → Ergebnisse werden nahtlos zusammengeführt
 *  ✅ CAT-1A: Retry mit Exponential Backoff (3 Versuche)
 *  ✅ CAT-1D: Strukturierte Fehler-Codes für prova-error-handler.js
 *  ✅ CAT-2D: JWT-Auth bleibt erzwungen
 *
 * CHUNKING-STRATEGIE:
 *  - Whisper-Limit: 25MB pro Request (OpenAI)
 *  - Netlify Function: 6MB Body-Limit für synchrone Requests
 *  - Lösung: Client sendet Audio in Chunks, Server sendet sie nacheinander
 *  - Alternativ: Server-seitige Splits wenn Base64 >10MB
 *
 * AUDIO-CHUNKING FLOW:
 *  1. Client erkennt ob Audio >10MB (vor Upload)
 *  2. Client teilt Audio in Zeitabschnitte (5-Minuten-Segmente)
 *  3. Client sendet jeden Chunk separat mit { chunk_index, total_chunks, session_id }
 *  4. Server verarbeitet jeden Chunk + sammelt Transkripte
 *  5. Nach letztem Chunk: Server kombiniert alle Transkripte
 */

'use strict';

const FormData = require('form-data');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

// ── Konfiguration ────────────────────────────────────────────────────
const WHISPER_MAX_BYTES       = 24 * 1024 * 1024;   // 24MB Sicherheitspuffer
const NETLIFY_BODY_LIMIT_B64  = 20 * 1024 * 1024;   // 20MB Base64 → ~15MB Audio
const CHUNK_TIMEOUT_MS        = 55000;               // 55s (Netlify Limit: 60s)
const MAX_RETRIES             = 3;
const RETRY_DELAYS_MS         = [1000, 2000, 4000];
const CHUNK_SESSION_TTL_MS    = 10 * 60 * 1000;     // 10 Minuten Session-TTL

// In-Memory Chunk-Session Store (wird bei Cold-Start geleert — ok für Netlify)
const _chunkSessions = new Map();

// ── Cleanup alter Sessions ────────────────────────────────────────────
function cleanupChunkSessions() {
  const now = Date.now();
  for (const [id, session] of _chunkSessions.entries()) {
    if (now - session.createdAt > CHUNK_SESSION_TTL_MS) {
      _chunkSessions.delete(id);
    }
  }
}

// ── Sleep Helper ─────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── CORS Headers ─────────────────────────────────────────────────────
function corsHeaders(event) {
  const allowedOrigins = [process.env.URL, 'https://prova-systems.de', 'http://localhost:8888'];
  const origin = event?.headers?.origin || '';
  const allow  = allowedOrigins.includes(origin) ? origin : (process.env.URL || 'https://prova-systems.de');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function errResponse(event, status, code, message) {
  return {
    statusCode: status,
    headers:    corsHeaders(event),
    body:       JSON.stringify({ error: message, errorCode: code, retryable: [408, 429, 500, 502, 503].includes(status) }),
  };
}

function okResponse(event, data) {
  return { statusCode: 200, headers: corsHeaders(event), body: JSON.stringify(data) };
}

// ══════════════════════════════════════════════════════════════════════
// WHISPER API CALL mit Exponential Backoff Retry
// ══════════════════════════════════════════════════════════════════════
async function callWhisperAPI(audioBuffer, { mediaType, sprache, prompt, apiKey }) {
  const extMap = {
    'audio/webm': 'webm', 'audio/mp3': 'mp3', 'audio/mpeg': 'mp3',
    'audio/wav': 'wav',   'audio/mp4': 'm4a', 'audio/m4a': 'm4a',
    'audio/ogg': 'ogg',   'video/mp4': 'mp4', 'video/webm': 'webm',
  };
  const ext = extMap[mediaType] || 'webm';

  let lastError = null;
  let lastStatus = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename:    `diktat_chunk.${ext}`,
        contentType: mediaType,
      });
      formData.append('model',           'whisper-1');
      formData.append('language',        sprache || 'de');
      formData.append('response_format', 'verbose_json');

      // Fachvokabular-Prompt (max 224 Whisper-Tokens)
      const fachPrompt = [
        prompt || '',
        'Sachverständiger, Ortstermin, Aktenzeichen, Auftraggeber, Wasserschaden, Feuchteschaden, ' +
        'Schimmelbefall, Rissbreite, Putzabplatzung, Tauwasserausfall, Wärmebrücke, Dämmung, ' +
        'DIN-Norm, WTA-Merkblatt, VOB, JVEG, ZPO, §407a, Konjunktiv, Kausalzusammenhang, ' +
        'Estrich, Bauteilanschluss, Abdichtung, Fachurteil, Beweisfrage, Feststellungen',
      ].filter(Boolean).join('. ').slice(0, 850); // ~224 Tokens

      if (fachPrompt) formData.append('prompt', fachPrompt);

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        body:   formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      if (response.ok) {
        const result = await response.json();
        return { ok: true, result };
      }

      // Fehlerbehandlung
      const errData  = await response.json().catch(() => ({}));
      const errMsg   = errData?.error?.message || `Whisper HTTP ${response.status}`;
      lastError      = errMsg;

      // 429 oder 5xx → Retry
      if ([429, 500, 502, 503].includes(response.status) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt] || 4000;
        console.warn(`[Whisper] HTTP ${response.status}. Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      return { ok: false, status: response.status, error: errMsg };

    } catch (err) {
      lastError = err.message;
      if (err.name === 'AbortError') {
        lastError  = 'Whisper Timeout (>55s)';
        lastStatus = 408;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt] || 4000;
        console.warn(`[Whisper] Exception: ${lastError}. Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      return { ok: false, status: lastStatus || 502, error: lastError };
    }
  }

  return { ok: false, status: lastStatus || 502, error: lastError || 'Max Retries erreicht' };
}

// ══════════════════════════════════════════════════════════════════════
// TRANSKRIPT-KOMBINATION (Chunks zusammenführen)
// ══════════════════════════════════════════════════════════════════════
function combineTranscripts(chunks) {
  // Chunks nach Index sortieren
  chunks.sort((a, b) => a.index - b.index);

  const transkriptParts = chunks.map(c => c.transkript).filter(Boolean);
  const transkript      = transkriptParts.join(' ').replace(/\s+/g, ' ').trim();

  const gesamtDauer   = chunks.reduce((s, c) => s + (c.dauer || 0), 0);
  const gesamtWorte   = transkript.split(/\s+/).filter(Boolean).length;

  // Qualität: Durchschnitt aller Chunks
  const qualitaeten   = chunks.map(c => c.qualitaet).filter(Boolean);
  const schlechtCheck = qualitaeten.some(q => q === 'schlecht');
  const okCheck       = qualitaeten.some(q => q === 'ok');
  const qualitaet     = schlechtCheck ? 'schlecht' : okCheck ? 'ok' : 'gut';

  // Alle Segmente zusammenführen (mit Zeit-Offset)
  let timeOffset = 0;
  const alleSegmente = [];
  chunks.forEach(c => {
    if (c.segmente && c.segmente.length) {
      c.segmente.forEach(seg => {
        alleSegmente.push({
          start: (seg.start || 0) + timeOffset,
          ende:  (seg.ende  || 0) + timeOffset,
          text:  seg.text || '',
        });
      });
    }
    timeOffset += (c.dauer || 0);
  });

  return {
    transkript,
    dauer:      Math.round(gesamtDauer),
    qualitaet,
    worte:      gesamtWorte,
    segmente:   alleSegmente,
    chunks:     chunks.length,
  };
}

// ══════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return errResponse(event, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
  }

  // ── JWT Auth ──────────────────────────────────────────────────
  const jwtEmail = event.clientContext?.user?.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) {
    return errResponse(event, 401, 'UNAUTHORIZED', 'Anmeldung erforderlich');
  }

  // ── Rate Limit (Token Bucket, In-Memory) ──────────────────────
  const CAPACITY       = parseInt(process.env.WHISPER_RATE_LIMIT_PER_MIN || '12', 10);
  const REFILL_PER_SEC = CAPACITY / 60;
  global.__provaWhisperBucket = global.__provaWhisperBucket || new Map();
  const now = Date.now();
  const b = global.__provaWhisperBucket.get(jwtEmail) || { tokens: CAPACITY, last: now };
  const elapsed = Math.max(0, (now - b.last) / 1000);
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);
  b.last   = now;
  if (b.tokens < 1) {
    global.__provaWhisperBucket.set(jwtEmail, b);
    return errResponse(event, 429, 'RATE_LIMIT', 'Zu viele Anfragen — bitte kurz warten');
  }
  b.tokens -= 1;
  global.__provaWhisperBucket.set(jwtEmail, b);

  // ── API Key ────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errResponse(event, 500, 'API_KEY_MISSING', 'OPENAI_API_KEY nicht konfiguriert');
  }

  // ── Body parsen ────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return errResponse(event, 400, 'INVALID_JSON', 'Ungültiger JSON-Body');
  }

  const {
    audioBase64,
    mediaType   = 'audio/webm',
    sprache     = 'de',
    schadenart  = '',
    prompt      = '',
    // Chunking-Support
    chunk_index   = null,   // null = kein Chunking
    total_chunks  = 1,
    session_id    = null,
  } = body;

  if (!audioBase64) {
    return errResponse(event, 400, 'AUDIO_MISSING', 'audioBase64 fehlt');
  }

  // MIME-Type Whitelist
  const mt = String(mediaType || '').toLowerCase();
  if (!mt.startsWith('audio/') && !mt.startsWith('video/')) {
    return errResponse(event, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Nicht unterstützter Medientyp');
  }

  // ── Größencheck ────────────────────────────────────────────────
  const base64Bytes = audioBase64.length;

  // Zu groß OHNE Chunking → Fehler mit Hinweis
  if (base64Bytes > NETLIFY_BODY_LIMIT_B64 * 1.5 && chunk_index === null) {
    return errResponse(
      event, 413, 'AUDIO_TOO_LARGE',
      `Audio zu groß (${Math.round(base64Bytes / 1024 / 1024)}MB). ` +
      'Bitte Audio-Chunking aktivieren (maxChunkSizeMB: 10 im Client).'
    );
  }

  // ── Audio-Buffer erstellen ─────────────────────────────────────
  let audioBuffer;
  try {
    const b64clean = audioBase64.replace(/^data:[^;]+;base64,/, '');
    audioBuffer    = Buffer.from(b64clean, 'base64');
  } catch (e) {
    return errResponse(event, 400, 'AUDIO_DECODE_ERROR', 'Base64-Dekodierung fehlgeschlagen');
  }

  // Finale Größe prüfen
  if (audioBuffer.length > WHISPER_MAX_BYTES) {
    return errResponse(
      event, 413, 'AUDIO_TOO_LARGE',
      `Audio-Chunk zu groß (${Math.round(audioBuffer.length / 1024 / 1024)}MB, max 24MB). ` +
      'Bitte kleinere Chunks verwenden.'
    );
  }

  // ══════════════════════════════════════════════════════════════
  // WHISPER API AUFRUFEN
  // ══════════════════════════════════════════════════════════════
  const whisperResult = await callWhisperAPI(audioBuffer, {
    mediaType, sprache,
    prompt: [prompt, schadenart].filter(Boolean).join(' '),
    apiKey,
  });

  if (!whisperResult.ok) {
    console.error(`[Whisper] API Fehler: ${whisperResult.error}`);
    return errResponse(
      event,
      whisperResult.status || 502,
      whisperResult.status === 429 ? 'RATE_LIMIT' : whisperResult.status === 408 ? 'TIMEOUT' : 'WHISPER_ERROR',
      `Transkription fehlgeschlagen: ${whisperResult.error}`
    );
  }

  const result     = whisperResult.result;
  const transkript = result.text?.trim() || '';
  const dauer      = result.duration   || 0;
  const segmente   = result.segments   || [];

  // Qualitäts-Score
  const noSpeechAvg = segmente.length
    ? segmente.reduce((s, seg) => s + (seg.no_speech_prob || 0), 0) / segmente.length
    : 0;
  const qualitaet = noSpeechAvg < 0.1 ? 'gut' : noSpeechAvg < 0.4 ? 'ok' : 'schlecht';

  const chunkData = {
    index:      chunk_index !== null ? chunk_index : 0,
    transkript,
    dauer,
    qualitaet,
    segmente:   segmente.map(s => ({ start: s.start, ende: s.end, text: s.text?.trim() })),
  };

  // ══════════════════════════════════════════════════════════════
  // CHUNKING: Session-Management
  // ══════════════════════════════════════════════════════════════
  if (chunk_index !== null && session_id && total_chunks > 1) {
    cleanupChunkSessions();

    // Session erstellen oder aktualisieren
    if (!_chunkSessions.has(session_id)) {
      _chunkSessions.set(session_id, {
        chunks:    [],
        expected:  total_chunks,
        email:     jwtEmail,
        createdAt: Date.now(),
      });
    }

    const session = _chunkSessions.get(session_id);

    // Sicherheitscheck: gleicher User
    if (session.email !== jwtEmail) {
      return errResponse(event, 403, 'FORBIDDEN', 'Session gehört einem anderen Nutzer');
    }

    // Chunk hinzufügen
    session.chunks.push(chunkData);

    console.log(`[Whisper] Chunk ${chunk_index + 1}/${total_chunks} für Session ${session_id} erhalten`);

    // Alle Chunks angekommen?
    if (session.chunks.length >= total_chunks) {
      // Session abschließen
      const combined = combineTranscripts(session.chunks);
      _chunkSessions.delete(session_id);

      console.log(`[Whisper] ✅ Alle ${total_chunks} Chunks kombiniert: ${combined.transkript.length} Zeichen`);

      return okResponse(event, {
        ...combined,
        status:   'complete',
        session_id,
      });
    }

    // Noch nicht alle Chunks da
    return okResponse(event, {
      status:          'chunk_received',
      session_id,
      chunks_received: session.chunks.length,
      chunks_expected: total_chunks,
      chunk_index,
      // Partial-Transkript für Fortschrittsanzeige
      partial_transkript: transkript,
    });
  }

  // ══════════════════════════════════════════════════════════════
  // NORMALER MODUS (kein Chunking)
  // ══════════════════════════════════════════════════════════════
  console.log(`[Whisper] ✅ Transkript: ${transkript.length} Zeichen, ${dauer.toFixed(1)}s, Qualität: ${qualitaet}`);

  return okResponse(event, {
    transkript,
    dauer:    Math.round(dauer),
    qualitaet,
    worte:    transkript.split(/\s+/).filter(Boolean).length,
    segmente: chunkData.segmente,
    status:   'complete',
  });
};