// PROVA Systems — Foto-Captioning Netlify Function
// POST { imageBase64: "...", mediaType: "image/jpeg", aktenzeichen: "WS-2024-001", schadensart: "Wasserschaden" }
// → GPT-4o Vision analysiert das Bild und gibt strukturierte Metadaten zurück

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const RateLimit = require('./lib/rate-limit-user');

// S-SICHER P4B.4: requireAuth + Rate-Limit 30/60s pro Token-sub
exports.handler = requireAuth(async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'foto-captioning' });
  if (!rl.allowed) {
    return jsonResponse(event, 429,
      { error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' },
      { 'Retry-After': String(rl.retryAfter) }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { imageBase64, mediaType, aktenzeichen, schadensart } = body;
  if (!imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'imageBase64 fehlt' }) };
  }

  const systemPrompt = `Du bist ein Experte für Baugutachten und analysierst Schadensfotos.
Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen.

JSON-Format:
{
  "beschriftung": "Kurze, präzise Bildbeschreibung auf Deutsch (1-2 Sätze, fachlich)",
  "schadensart": "Schimmel|Wasserschaden|Riss|Feuchte|Brandschaden|Baumangel|Sonstige",
  "bauteil": "z.B. Wand, Decke, Boden, Fenster, Dach, Fassade, Estrich, Putz",
  "raum": "z.B. Badezimmer, Wohnzimmer, Keller, Dachgeschoss, Außenbereich",
  "schweregrad": "gering|mittel|schwer|kritisch",
  "sichtbare_merkmale": ["Merkmal1", "Merkmal2"],
  "empfohlene_norm": "z.B. DIN 4108-3 oder leer wenn nicht eindeutig"
}`;

  const userPrompt = `Analysiere dieses Schadensfoto.
${aktenzeichen ? 'Aktenzeichen: ' + aktenzeichen : ''}
${schadensart ? 'Erwartete Schadensart: ' + schadensart : ''}
Gib das JSON-Objekt zurück.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: 'data:' + (mediaType || 'image/jpeg') + ';base64,' + imageBase64,
                  detail: 'low'  // 'low' reicht für Schadensbeschriftung, günstiger
                }
              },
              { type: 'text', text: userPrompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      // S-SICHER P2.2 (Finding 8.1): OpenAI-Fehlermeldung nur server-seitig.
      console.error('[foto-captioning] OpenAI-Fehler:', (data.error && data.error.message) || 'Unbekannt');
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bild-Analyse fehlgeschlagen' })
      };
    }

    const rawText = (data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content) || '';
    let metadata = {};
    try {
      // JSON aus Antwort extrahieren (robuster Parser)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      // Fallback: leere Struktur mit Rohtext als Beschriftung
      metadata = { beschriftung: rawText.slice(0, 200), schadensart: '', bauteil: '', raum: '', schweregrad: 'mittel', sichtbare_merkmale: [] };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        metadata: metadata,
        tokens_used: (data.usage&&data.usage.total_tokens) || 0
      })
    };

  } catch (e) {
    // S-SICHER P2.2 (Finding 8.1): e.message nur server-seitig loggen.
    console.error('[foto-captioning] Upstream-Fehler:', e && e.message);
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upstream error' })
    };
  }
});
