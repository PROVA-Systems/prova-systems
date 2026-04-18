// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Whisper Diktat Transkription
// Netlify Function: whisper-diktat
//
// Empfängt Audio-Blob (WebM/MP3/WAV) als Base64
// → OpenAI Whisper API → Transkript zurück
//
// Env: OPENAI_API_KEY
// Max Upload: 25MB (Netlify Function Limit)
// ══════════════════════════════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'OPENAI_API_KEY nicht konfiguriert' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Ungültiger JSON-Body' }) };
  }

  const {
    audioBase64,          // Base64-kodiertes Audio
    mediaType  = 'audio/webm',  // MIME-Type
    sprache    = 'de',    // ISO 639-1 Sprachcode
    schadenart = '',      // Kontext für bessere Transkription
    prompt     = '',      // Optionaler Prompt für Fachbegriffe
  } = body;

  if (!audioBase64) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'audioBase64 fehlt' }) };
  }

  // Dateigröße prüfen (Max 25MB = ~33MB Base64)
  if (audioBase64.length > 33 * 1024 * 1024) {
    return { statusCode: 413, headers: corsHeaders(), body: JSON.stringify({ error: 'Audio zu groß (max 25MB)' }) };
  }

  try {
    // Base64 → Buffer → Blob für FormData
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Dateiendung aus MIME-Type ableiten
    const extMap = {
      'audio/webm': 'webm',
      'audio/mp4':  'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav':  'wav',
      'audio/ogg':  'ogg',
      'audio/mp3':  'mp3',
    };
    const ext = extMap[mediaType] || 'webm';

    // FormData aufbauen (Whisper erwartet multipart/form-data)
    const FormData = require('form-data');
    const formData = new FormData();

    // Session 19: Regionale Varianten (de-DE/de-AT/de-CH) → Whisper-Base + Prompt-Kontext
    // Whisper akzeptiert nur ISO 639-1 Basis-Codes (keine Sub-Dialekte).
    // Region wird aber in den Fachbegriffe-Prompt eingespielt → bessere Erkennung.
    const spracheBase = (sprache || 'de-DE').split('-')[0].toLowerCase();  // 'de', 'en', ...
    const region       = (sprache || 'de-DE').includes('-') ? sprache.split('-')[1].toUpperCase() : '';  // 'DE'|'AT'|'CH'|''
    const regionKontext = region === 'AT'
      ? 'Österreichischer Sachverständiger. Fachbegriffe: ÖNORM (statt DIN), Konsumentenschutzgesetz, ZGB. '
      : region === 'CH'
      ? 'Schweizer Bauexperte. Fachbegriffe: SIA-Normen (statt DIN), SIA 180 (Wärmeschutz), SIA 271 (Abdichtung), VKG, Fachexperte. Schweizer Hochdeutsch. '
      : '';

    formData.append('file', audioBuffer, {
      filename:    `diktat.${ext}`,
      contentType: mediaType,
    });
    formData.append('model',    'whisper-1');
    formData.append('language', spracheBase);
    formData.append('response_format', 'verbose_json');  // mit Timestamps

    // Fachvokabular-Prompt für bessere Erkennung von Gutachter-Begriffen
    const fachPrompt = [
      prompt,
      schadenart,
      regionKontext,
      // Häufige Fachbegriffe die Whisper oft falsch erkennt:
      'Sachverständiger, Ortstermin, Aktenzeichen, Auftraggeber, Wasserschaden, Feuchteschaden, ' +
      'Schimmelbefall, Rissbreite, Putzabplatzung, Tauwasserausfall, Wärmebrücke, Dämmung, ' +
      'DIN-Norm, WTA-Merkblatt, VOB, JVEG, ZPO, §407a, Konjunktiv, Kausalzusammenhang, ' +
      'Estrich, Bauteilanschluss, Abdichtung, Fachurteil, Beweisfrage, Feststellungen'
    ].filter(Boolean).join('. ');

    if (fachPrompt) formData.append('prompt', fachPrompt.slice(0, 224)); // Whisper max 224 Tokens

    // Whisper API aufrufen
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg  = errData?.error?.message || `Whisper API Fehler ${response.status}`;
      console.error('[Whisper] API Fehler:', errMsg);
      return {
        statusCode: 502,
        headers: corsHeaders(),
        body: JSON.stringify({ error: errMsg })
      };
    }

    const result = await response.json();

    // Transkript aufbereiten
    const transkript = result.text?.trim() || '';
    const dauer      = result.duration   || 0;
    const segmente   = result.segments   || [];

    // Qualitäts-Score berechnen (Durchschnitt der no_speech_prob der Segmente)
    const noSpeechAvg = segmente.length
      ? segmente.reduce((s, seg) => s + (seg.no_speech_prob || 0), 0) / segmente.length
      : 0;
    const qualitaet = noSpeechAvg < 0.1 ? 'gut' : noSpeechAvg < 0.4 ? 'ok' : 'schlecht';

    console.log(`[Whisper] Transkript: ${transkript.length} Zeichen, ${dauer.toFixed(1)}s, Qualität: ${qualitaet}`);

    return {
      statusCode: 200,
      headers:    corsHeaders(),
      body: JSON.stringify({
        transkript,
        dauer:     Math.round(dauer),
        qualitaet,
        worte:     transkript.split(/\s+/).filter(Boolean).length,
        // Segmente mit Zeitstempeln (für spätere Bearbeitung)
        segmente: segmente.map(s => ({
          start: s.start,
          ende:  s.end,
          text:  s.text?.trim(),
        })),
      }),
    };

  } catch (e) {
    console.error('[Whisper] Exception:', e.message);
    return {
      statusCode: 502,
      headers:    corsHeaders(),
      body: JSON.stringify({ error: 'Transkription fehlgeschlagen: ' + e.message }),
    };
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}