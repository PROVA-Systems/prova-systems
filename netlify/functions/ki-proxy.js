// ══════════════════════════════════════════════════
// PROVA Systems — KI-Proxy Netlify Function
// Netlify Function: ki-proxy
// Env: OPENAI_API_KEY
//
// Aufgaben:
//   - pdf_extraktion: PDF → KI → Aktenzeichen, Parteien, Beweisfragen, Fristen
//   - qualitaetspruefung: Gutachten-Entwurf → KI → Checkliste
//   - kostenkalkulation: Befund → KI → Sanierungskosten
// ══════════════════════════════════════════════════

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'OPENAI_API_KEY nicht konfiguriert' }) };

  try {
    const input = JSON.parse(event.body || '{}');
    const aufgabe = input.aufgabe;
    if (!aufgabe) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Feld "aufgabe" fehlt' }) };

    let result;
    switch (aufgabe) {
      case 'pdf_extraktion': result = await pdfExtraktion(API_KEY, input); break;
      case 'qualitaetspruefung': result = await qualitaetspruefung(API_KEY, input); break;
      case 'kostenkalkulation': result = await kostenkalkulation(API_KEY, input); break;
      case 'freitext': result = await freitext(API_KEY, input); break;
      default: return { statusCode: 400, headers, body: JSON.stringify({ error: `Unbekannte Aufgabe: ${aufgabe}` }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error('ki-proxy error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// ════════════════════════════════════════
// OpenAI Chat-Completion Helper
// ════════════════════════════════════════
async function openaiChat(apiKey, systemPrompt, userContent, maxTokens = 2000) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages,
  };

  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API Error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try { return JSON.parse(cleaned); }
  catch (e) { return { raw_response: text, parse_error: e.message }; }
}

// ════════════════════════════════════════
// AUFGABE 1: PDF-Extraktion (GPT-4o Vision)
// ════════════════════════════════════════
async function pdfExtraktion(apiKey, input) {
  const { pdf_base64, auftragstyp } = input;
  if (!pdf_base64) throw new Error('pdf_base64 fehlt');

  const auftragsContext = {
    gerichtsgutachten: 'Dies ist wahrscheinlich ein Beweisbeschluss eines Gerichts.',
    versicherungsgutachten: 'Dies ist wahrscheinlich ein Auftrag einer Versicherungsgesellschaft.',
    schiedsgutachten: 'Dies ist wahrscheinlich eine Schiedsvereinbarung.',
    privatgutachten: 'Dies ist wahrscheinlich eine Anfrage einer Privatperson.',
  };
  const contextHint = auftragsContext[auftragstyp] || 'Bitte analysiere dieses Dokument.';

  const systemPrompt = 'Du bist ein KI-Assistent für Bausachverständige. Du analysierst Dokumente und extrahierst strukturierte Daten. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt.';

  // GPT-4o Vision: PDF als Data-URL
  const userContent = [
    { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdf_base64}`, detail: 'high' } },
    { type: 'text', text: `${contextHint}

Extrahiere folgende Informationen und antworte mit JSON:

{
  "aktenzeichen": "Aktenzeichen oder null",
  "gericht": "Gericht oder null",
  "auftraggeber": "Auftraggeber falls kein Gericht, oder null",
  "klaeger": "Kläger/Antragsteller oder null",
  "beklagter": "Beklagter/Antragsgegner oder null",
  "geschaedigter": "Geschädigter oder null",
  "beweisfragen": ["Beweisfragen als Array, oder []"],
  "frist": "Frist als TT.MM.JJJJ oder null",
  "adresse": "Schadensort-Adresse oder null",
  "schadenart": "Schadensart oder null",
  "versicherungsnr": "Versicherungsnummer oder null"
}

Wenn ein Feld nicht erkennbar ist, setze es auf null.` }
  ];

  return await openaiChat(apiKey, systemPrompt, userContent, 2000);
}

// ════════════════════════════════════════
// AUFGABE 2: Qualitätsprüfung
// ════════════════════════════════════════
async function qualitaetspruefung(apiKey, input) {
  const { gutachten_text, beweisfragen } = input;
  if (!gutachten_text) throw new Error('gutachten_text fehlt');

  const bwfText = (beweisfragen && beweisfragen.length)
    ? `\n\nBeweisfragen die beantwortet sein müssen:\n${beweisfragen.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
    : '';

  const systemPrompt = 'Du bist ein Qualitätsprüfer für Baugutachten. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt.';

  const userPrompt = `Prüfe dieses Gutachten. Antworte mit JSON:

{
  "gesamtergebnis": "gruen" oder "gelb" oder "rot",
  "pruefpunkte": [{"kategorie":"...","status":"ok|warnung|fehler","hinweis":"..."}],
  "zusammenfassung": "1-2 Sätze"
}

Prüfe: 1) §1-§5 vollständig? 2) Beweisfragen beantwortet?${bwfText} 3) Normen korrekt? 4) Konsistenz §3↔§4? 5) Konjunktiv II? 6) §6 vom SV verfasst?

Gutachten:
${gutachten_text}`;

  return await openaiChat(apiKey, systemPrompt, userPrompt, 2000);
}

// ════════════════════════════════════════
// AUFGABE 3: Kostenkalkulation
// ════════════════════════════════════════
async function kostenkalkulation(apiKey, input) {
  const { befund_text, schadenart, region } = input;
  if (!befund_text) throw new Error('befund_text fehlt');

  const regionHint = region ? `Region: ${region}.` : '';

  const systemPrompt = 'Du bist ein Baukostenkalkulator. Erstelle realistische Sanierungskosten für Deutschland (2025/2026). Antworte AUSSCHLIESSLICH mit einem JSON-Objekt.';

  const userPrompt = `Kostenkalkulation erstellen. Antworte mit JSON:

{
  "positionen": [{"nr":1,"gewerk":"...","beschreibung":"...","einheit":"m²","menge":0.0,"einheitspreis_euro":0.00,"gesamtpreis_euro":0.00}],
  "netto_gesamt": 0.00,
  "mwst_19": 0.00,
  "brutto_gesamt": 0.00,
  "hinweise": "...",
  "genauigkeit": "Schätzung"
}

Schadensart: ${schadenart || 'nicht angegeben'} ${regionHint}

Befund:
${befund_text}`;

  return await openaiChat(apiKey, systemPrompt, userPrompt, 2000);
}

// ════════════════════════════════════════
// AUFGABE 4: Freitext (für Stellungnahme-Hilfe etc.)
// ════════════════════════════════════════
async function freitext(apiKey, input) {
  const { system, prompt } = input;
  if (!prompt) throw new Error('prompt fehlt');

  const messages = [
    { role: 'system', content: system || 'Du bist ein hilfreicher Assistent für Bausachverständige. Antworte auf Deutsch.' },
    { role: 'user', content: prompt }
  ];

  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 800, temperature: 0.4, messages })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API Error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || '' };
}
