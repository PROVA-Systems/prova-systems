// PROVA Systems — KI-Proxy Netlify Function v3.0
// Aufgaben-Router: messages-Format + aufgabe-Format
// API-Key: Netlify Env Var OPENAI_API_KEY

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY nicht konfiguriert' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  try {
    const aufgabe = body.aufgabe || 'messages';
    if (aufgabe === 'fachurteil_entwurf') return await handleFachurteilEntwurf(body, apiKey);
    if (aufgabe === 'qualitaetspruefung') return await handleQualitaetspruefung(body, apiKey);
    if (aufgabe === 'freitext') return await handleFreitext(body, apiKey);
    if (aufgabe === 'assist_inline') return await handleAssistInline(body, apiKey);
    return await handleMessages(body, apiKey);
  } catch (e) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Upstream error', detail: e.message }) };
  }
};

async function handleFachurteilEntwurf(body, apiKey) {
  const { diktat = '', schadenart = '', messwerte = '', verwendungszweck = 'gericht', paragraphen = null, az = '', objekt = '', baujahr = '', auftraggeber = '' } = body;
  const entwurf = paragraphen ? (paragraphen.gesamt || '') : '';
  const gesamtKontext = (diktat + messwerte + entwurf).trim();

  if (gesamtKontext.length < 50) {
    return jsonResponse({ ursachenkategorien: [], messwert_analyse: [], normen_vorschlaege: [], diktat_extrakte: { feststellungen: '', hat_ursachen: false, hat_empfehlungen: false }, hinweis: 'DIKTAT_ZU_KURZ' });
  }

  const systemPrompt = `Du bist ein öffentlich bestellter und vereidigter Sachverständiger für Schäden an Gebäuden mit 30 Jahren Berufserfahrung. Du analysierst Schadensfälle für das PROVA Gutachten-Assistenzsystem.

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
• Ausnahme: Sichtbefunde aus §4 dürfen im Indikativ stehen.

QUELLE-TRENNUNG (kritisch):
• §4 Befund: NUR was der SV sagt (ORIGINAL-DIKTAT)
• §5 Ursache: KI-Analyse mit KONJUNKTIV II + Normen
• §6 Stellungnahme: Wird vom SV selbst geschrieben — NICHT von KI

STRUKTUR (§1–§5):
• §1 Vorbemerkungen: Auftrag, Beteiligte, Termine
• §2 Unterlagen: Vom SV erhaltene Dokumente
• §3 Örtlichkeit: Objekt, Baujahr, Gebäudetyp
• §4 Befund: Sichtbefunde in Fachsprache (aus Diktat)
• §5 Ursache: Fachliche Hypothesen im KONJUNKTIV II + Normen

OUTPUT: Gülitges JSON-Objekt.`;



  const gutTypMap = { gericht: 'Gerichtsgutachten', versicherung: 'Versicherungsgutachten', privat: 'Privatgutachten' };
  const userPrompt = `FALLANALYSE:
AZ: ${az || '—'} | Schadensart: ${schadenart || '—'} | Objekt: ${objekt || '—'}${baujahr ? ' | Baujahr: ' + baujahr : ''}${auftraggeber ? ' | Auftraggeber: ' + auftraggeber : ''}
Gutachtentyp: ${gutTypMap[verwendungszweck] || verwendungszweck}

DIKTAT DES SACHVERSTÄNDIGEN:
${diktat || '(kein Diktat vorhanden)'}
${messwerte ? '\nMESSWERTE:\n' + messwerte : ''}${entwurf ? '\n§1–§5 ENTWURF (erste 1200 Zeichen):\n' + entwurf.substring(0, 1200) : ''}

WICHTIG: Analysiere AUSSCHLIESSLICH was im Diktat steht. Leere Arrays wenn zu wenig Info. Gib NUR JSON zurück.`;

  const result = await callOpenAI({ model: 'gpt-4o-mini', max_tokens: 1200, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }, apiKey);
  const rawText = result.choices?.[0]?.message?.content || '';
  let parsed = {};
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch (e) {
    parsed = { ursachenkategorien: [], messwert_analyse: [], normen_vorschlaege: [], diktat_extrakte: { feststellungen: rawText.substring(0, 200), hat_ursachen: false, hat_empfehlungen: false } };
  }
  return jsonResponse(parsed);
}

async function handleQualitaetspruefung(body, apiKey) {
  const { gutachten_text = '', beweisfragen = '' } = body;
  if (!gutachten_text || gutachten_text.length < 100) return jsonResponse({ pruefpunkte: [], gesamt_bewertung: 'TEXT_ZU_KURZ' });

  const result = await callOpenAI({ model: 'gpt-4o-mini', max_tokens: 600, messages: [
    { role: 'system', content: 'Du bist ein Oberlandesgericht-Sachverständiger. Prüfe §6-Fachurteilstexte auf: 1. Konjunktiv II korrekt? 2. Keine unzulässigen Indikativ-Kausalaussagen? 3. Beweislast korrekt? 4. Normverweise vorhanden? 5. Sanierungsempfehlung konkret? ANTWORT NUR JSON: {"pruefpunkte":[{"typ":"ok|warnung|fehler","text":"Beschreibung"}],"konjunktiv_ok":true,"gesamt_bewertung":"gut|verbesserungswuerdig|ueberarbeiten"}' },
    { role: 'user', content: 'Prüfe:\n\n' + gutachten_text.substring(0, 2000) + (beweisfragen ? '\n\nBeweisfragen:\n' + beweisfragen : '') }
  ] }, apiKey);

  const rawText = result.choices?.[0]?.message?.content || '';
  let parsed = {};
  try { const m = rawText.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
  catch (e) { parsed = { pruefpunkte: [{ typ: 'warnung', text: 'Manuelle Prüfung erforderlich.' }], gesamt_bewertung: 'verbesserungswuerdig' }; }
  return jsonResponse(parsed);
}

async function handleFreitext(body, apiKey) {
  const result = await callOpenAI({ model: body.model || 'gpt-4o-mini', max_tokens: body.max_tokens || 500, messages: [
    { role: 'system', content: body.system || 'Du bist ein Assistent für öffentlich bestellte Sachverständige.' },
    { role: 'user', content: body.prompt || '' }
  ] }, apiKey);
  const text = result.choices?.[0]?.message?.content || '';
  return jsonResponse({ text, content: [{ type: 'text', text }] });
}

async function handleMessages(body, apiKey) {
  const messages = (body.messages || []).map(msg => {
    if (!Array.isArray(msg.content)) return msg;
    const content = msg.content.map(part => {
      if (part.type === 'text') return { type: 'text', text: part.text };
      if (part.type === 'image' && part.source) return { type: 'image_url', image_url: { url: 'data:' + part.source.media_type + ';base64,' + part.source.data, detail: 'low' } };
      return part;
    });
    return { role: msg.role, content };
  });
  if (!messages.length) return jsonResponse({ error: 'Keine messages angegeben' }, 400);

  let model = body.model || 'gpt-4o-mini';
  if (model.includes('haiku') || model.includes('sonnet') || model.includes('opus')) model = 'gpt-4o-mini';

  const result = await callOpenAI({ model, max_tokens: body.max_tokens || 500, messages }, apiKey);
  const text = result.choices?.[0]?.message?.content || '';
  return jsonResponse({ content: [{ type: 'text', text }], model: result.model, usage: result.usage });
}

async function callOpenAI(params, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('OpenAI ' + response.status + ': ' + (err?.error?.message || 'Fehler'));
  }
  return response.json();
}

function jsonResponse(data, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) };
}

/* ── KI-Assist Inline (§6 Fachurteil) ── */
async function handleAssistInline(body, apiKey) {
  const { 
    prompt = '', 
    user_prompt = '',
    system_prompt = '',
    schadenart = '',
    kontext = {}
  } = body;

  const userMsg = user_prompt || prompt;
  if (!userMsg || userMsg.length < 3) {
    return jsonResponse({ vorschlag: '' });
  }

  // Experten-System-Prompt: entweder aus Body (neue stellungnahme.html v6)
  // oder Fallback auf Standard-Prompt
  const systemMsg = system_prompt || `Du bist ein öffentlich bestellter und vereidigter (ö.b.u.v.) Bausachverständiger mit 30 Jahren Gerichtserfahrung (§407a ZPO).

INDIKATIV NUR FÜR: wurde festgestellt, wurde gemessen, wurde vorgefunden, beträgt, ist sichtbar, ist vorhanden
KONJUNKTIV II PFLICHT FÜR ALLE Kausal-, Bewertungs- und Beweislast-Aussagen.

VOLLSTÄNDIGE LISTE DER ZU KORRIGIERENDEN INDIKATIV-VERBEN:
ist (kausal) → dürfte sein | sind → dürften sein | liegt → dürfte liegen | führt → dürfte führen | verursacht → dürfte verursacht haben | bedingt → dürfte bedingt sein | resultiert → dürfte resultieren | beruht → dürfte beruhen | zeigt → dürfte zeigen | belegt → dürfte belegen | beweist → dürfte belegen | muss (kausal) → wäre | wird unterschritten → dürfte unterschritten werden

WORTSTELLUNG: Modalverb (dürfte/könnte/wäre) IMMER an Position 2 im Hauptsatz.
NEBENSÄTZE: Modalverb ans Ende vor dem Infinitiv.
VERBOTEN: "dürfte eindeutig", "dürfte offensichtlich", "dürfte klar" — logische Widersprüche.

Schadensfall: \${schadenart}
Gib NUR den korrigierten deutschen Text zurück. Perfekte Grammatik und Zeichensetzung.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.10,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg }
      ]
    })
  });

  if (!res.ok) throw new Error('OpenAI ' + res.status);
  const data = await res.json();
  const vorschlag = data.choices?.[0]?.message?.content?.trim() || '';
  return jsonResponse({ vorschlag });
}
