// PROVA Systems — KI-Proxy Netlify Function v3.3
// Aufgaben-Router: messages-Format + aufgabe-Format
// Neu v3.1: user_kontext (aus Einstellungen) wird automatisch in jeden System-Prompt eingewebt.
// Neu v3.2: ki_analyse_modus ('schnell'|'praezise') wählt gpt-4o-mini vs gpt-4o — nur für schwere Aufgaben.
// Neu v3.3: Fachwissen-Provider (prova-fachwissen.js) liefert Live-Normen aus Airtable
//           mit 3-Schicht-Fallback. Bei Provider-Fehler läuft der Original-Prompt unverändert weiter.
// API-Key: Netlify Env Var OPENAI_API_KEY

// ── Fachwissen-Provider: liefert Airtable-Live-Normen mit Fallback-Kaskade
// SAFE BY DESIGN: wirft nie — bei Total-Fehlschlag leerer Kontext, ki-proxy läuft wie heute weiter
const FW = require('./lib/prova-fachwissen');

/**
 * Wählt das Modell basierend auf der User-Präferenz (aus Body) und der Aufgabe.
 * 'praezise' → gpt-4o für schwere Analysen, sonst gpt-4o-mini.
 * Schnelle Aufgaben (qualitaetspruefung, support_chat) bleiben immer mini — Latenz wichtig.
 */
function chooseModel(body, aufgabe, defaultModel) {
  const modus = body.ki_analyse_modus === 'praezise' ? 'praezise' : 'schnell';
  // "Schwere" Aufgaben — User-Wahl respektieren
  const heavy = ['fachurteil_entwurf', 'assist_inline', 'freitext', 'messages'];
  if (modus === 'praezise' && heavy.includes(aufgabe)) {
    return 'gpt-4o';
  }
  return defaultModel;  // Fallback auf handler-seitigen Default
}

/**
 * Hängt den persönlichen KI-Kontext des SV an den System-Prompt an.
 * Wird von allen Handlern genutzt — der Kontext kommt als `user_kontext` im Body.
 */
function appendUserContext(systemPrompt, userKontext) {
  if (!userKontext || typeof userKontext !== 'string') return systemPrompt;
  const clean = userKontext.trim().slice(0, 1000);
  if (!clean) return systemPrompt;
  return systemPrompt + `

══════════════ PERSÖNLICHER KONTEXT DES SACHVERSTÄNDIGEN ══════════════
(vom Nutzer in PROVA → Einstellungen → KI & Diktat hinterlegt)
Berücksichtige diesen Kontext bei Norm-Auswahl, Schwerpunkten und Terminologie:

${clean}
════════════════════════════════════════════════════════════════════════`;
}

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
    if (aufgabe === 'support_chat') return await handleSupportChat(body, apiKey);
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



  // ── FACHWISSEN-INJECTION (v3.3)
  // Zieht typ-abhängige Normen aus Airtable (mit Cache & Fallback).
  // SAFE: bei Fehler läuft der original systemPrompt weiter — 0 Degradation.
  let fachwissenBlock = '';
  let fachwissenSource = 'none';
  try {
    const fw = await FW.buildPromptKontext({
      schadensart: schadenart || '',
      typ: 'fachurteil_entwurf',
      maxNormen: 8
    });
    if (fw && fw.text) {
      fachwissenBlock = '\n\n══════════════ AKTUELLE FACHNORMEN (kuratiert, aus PROVA-Datenbank) ══════════════\n' + fw.text + '\n════════════════════════════════════════════════════════════════════════════════\n';
      fachwissenSource = fw.source;
    }
  } catch (e) {
    console.warn('[ki-proxy:fachurteil] Fachwissen-Provider-Fehler (Original-Prompt bleibt aktiv):', e.message);
  }
  const systemPromptFinal = systemPrompt + fachwissenBlock;

  const gutTypMap = { gericht: 'Gerichtsgutachten', versicherung: 'Versicherungsgutachten', privat: 'Privatgutachten' };
  const userPrompt = `FALLANALYSE:
AZ: ${az || '—'} | Schadensart: ${schadenart || '—'} | Objekt: ${objekt || '—'}${baujahr ? ' | Baujahr: ' + baujahr : ''}${auftraggeber ? ' | Auftraggeber: ' + auftraggeber : ''}
Gutachtentyp: ${gutTypMap[verwendungszweck] || verwendungszweck}

DIKTAT DES SACHVERSTÄNDIGEN:
${diktat || '(kein Diktat vorhanden)'}
${messwerte ? '\nMESSWERTE:\n' + messwerte : ''}${entwurf ? '\n§1–§5 ENTWURF (erste 1200 Zeichen):\n' + entwurf.substring(0, 1200) : ''}

WICHTIG: Analysiere AUSSCHLIESSLICH was im Diktat steht. Leere Arrays wenn zu wenig Info. Gib NUR JSON zurück.`;

  // Telemetrie im Response-Header (optional, hilft beim Monitoring)
  console.log(`[ki-proxy:fachurteil] Fachwissen-Quelle: ${fachwissenSource}`);

  const result = await callOpenAI({ model: chooseModel(body, 'fachurteil_entwurf', 'gpt-4o-mini'), max_tokens: 1200, messages: [{ role: 'system', content: appendUserContext(systemPromptFinal, body.user_kontext) }, { role: 'user', content: userPrompt }] }, apiKey);
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
    { role: 'system', content: appendUserContext('Du bist ein Oberlandesgericht-Sachverständiger. Prüfe §6-Fachurteilstexte auf: 1. Konjunktiv II korrekt? 2. Keine unzulässigen Indikativ-Kausalaussagen? 3. Beweislast korrekt? 4. Normverweise vorhanden? 5. Sanierungsempfehlung konkret? ANTWORT NUR JSON: {"pruefpunkte":[{"typ":"ok|warnung|fehler","text":"Beschreibung"}],"konjunktiv_ok":true,"gesamt_bewertung":"gut|verbesserungswuerdig|ueberarbeiten"}', body.user_kontext) },
    { role: 'user', content: 'Prüfe:\n\n' + gutachten_text.substring(0, 2000) + (beweisfragen ? '\n\nBeweisfragen:\n' + beweisfragen : '') }
  ] }, apiKey);

  const rawText = result.choices?.[0]?.message?.content || '';
  let parsed = {};
  try { const m = rawText.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
  catch (e) { parsed = { pruefpunkte: [{ typ: 'warnung', text: 'Manuelle Prüfung erforderlich.' }], gesamt_bewertung: 'verbesserungswuerdig' }; }
  return jsonResponse(parsed);
}

async function handleFreitext(body, apiKey) {
  const result = await callOpenAI({ model: chooseModel(body, 'freitext', body.model || 'gpt-4o-mini'), max_tokens: body.max_tokens || 500, messages: [
    { role: 'system', content: appendUserContext(body.system || 'Du bist ein Assistent für öffentlich bestellte Sachverständige.', body.user_kontext) },
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

  // User-Kontext in System-Message einweben (oder neue voranstellen)
  if (body.user_kontext && typeof body.user_kontext === 'string' && body.user_kontext.trim()) {
    const sysIdx = messages.findIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
      const m = messages[sysIdx];
      const origText = typeof m.content === 'string' ? m.content
                     : (Array.isArray(m.content) ? m.content.map(p => p.text || '').join('\n') : '');
      messages[sysIdx] = { role: 'system', content: appendUserContext(origText, body.user_kontext) };
    } else {
      messages.unshift({ role: 'system', content: appendUserContext('', body.user_kontext) });
    }
  }

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
      model: chooseModel(body, 'assist_inline', 'gpt-4o'),
      temperature: 0.10,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: appendUserContext(systemMsg, body.user_kontext) },
        { role: 'user', content: userMsg }
      ]
    })
  });

  if (!res.ok) throw new Error('OpenAI ' + res.status);
  const data = await res.json();
  const vorschlag = data.choices?.[0]?.message?.content?.trim() || '';
  return jsonResponse({ vorschlag });
}

async function handleSupportChat(body, apiKey) {
  const {
    nachricht    = '',
    verlauf      = [],   // Array von { rolle: 'user'|'assistant', text: '...' }
    kontext      = {},   // { seite, paket, fehler, az, browser }
    sprache      = 'de'
  } = body;

  // Eingabe-Validierung
  if (!nachricht || nachricht.length < 2) {
    return jsonResponse({ antwort: 'Bitte geben Sie Ihre Frage ein.' });
  }

  if (nachricht.length > 1000) {
    return jsonResponse({ antwort: 'Ihre Nachricht ist zu lang. Bitte kürzen Sie sie auf das Wesentliche.' });
  }

  // Kontext-Informationen aufbereiten
  const kontextInfo = [
    kontext.seite   ? `Seite: ${kontext.seite}`   : '',
    kontext.paket   ? `Paket: ${kontext.paket}`   : '',
    kontext.fehler  ? `Fehlermeldung: ${kontext.fehler}` : '',
    kontext.az      ? `Aktenzeichen: ${kontext.az}` : '',
  ].filter(Boolean).join(' | ');

  const systemPrompt = `Du bist der PROVA-Support-Assistent — hilfsbereit, präzise, auf Deutsch.

PROVA Systems ist ein KI-gestütztes Gutachten-System für öffentlich bestellte Bausachverständige (ö.b.u.v. SV) mit:
• KI-Diktat: Spracheingabe → automatisch §1–§5 Gutachten-Entwurf
• §407a ZPO-Integration (Sachverständigen-Erklärung)
• JVEG §7–§9 Rechner (Stundensatz, Fahrkosten, Schreibgebühren)
• E-Rechnung: XRechnung 3.0 + ZUGFeRD 2.4 (nur Team-Paket)
• Baubegleitung: Mängel-Tracking über Projektphasen (nur Team-Paket)
• Offline-Modus: PWA, funktioniert auch ohne Internet am Ortstermin
• Pakete: Solo (149€/Mo, 1 SV) | Team (279€/Mo, bis 5 SVs)

VERHALTENSREGELN:
• Antworten maximal 3–4 Sätze (Gutachter sind beschäftigt)
• Bei technischen Fehlern: konkrete Schritt-für-Schritt-Anleitung
• Bei Abrechnungsfragen: immer auf JVEG-Rechner (jveg.html) verweisen  
• Bei Feature-Fragen zu gesperrten Features: sachlich auf Paket-Upgrade hinweisen
• Wenn unklar: "Bitte schreiben Sie uns: kontakt@prova-systems.de"
• Keine Spekulationen über zukünftige Features
• Niemals: "Ich weiß es nicht" — lieber konkret weiterleiten${kontextInfo ? `\n\nAKTUELLER KONTEXT: ${kontextInfo}` : ''}`;

  // Verlauf aufbereiten (max. 6 letzte Nachrichten für Kontext)
  const verlaufMessages = (verlauf || [])
    .slice(-6)
    .filter(m => m && m.rolle && m.text)
    .map(function(m) {
      return {
        role:    m.rolle === 'assistant' ? 'assistant' : 'user',
        content: String(m.text).slice(0, 500)  // Länge begrenzen
      };
    });

  const messages = [
    { role: 'system',  content: appendUserContext(systemPrompt, body.user_kontext) },
    ...verlaufMessages,
    { role: 'user',    content: nachricht }
  ];

  try {
    const result = await callOpenAI({
      model:       'gpt-4o-mini',
      max_tokens:  350,
      temperature: 0.25,  // Niedrig für konsistente, faktische Antworten
      messages
    }, apiKey);

    const antwort = result.choices?.[0]?.message?.content?.trim();

    if (!antwort) {
      return jsonResponse({
        antwort: 'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es erneut oder schreiben Sie uns: kontakt@prova-systems.de'
      });
    }

    return jsonResponse({
      antwort,
      model:  result.model,
      tokens: result.usage?.total_tokens || 0
    });

  } catch (e) {
    console.error('[Support Chat] Fehler:', e.message);
    return jsonResponse({
      antwort: 'Der Support-Assistent ist momentan nicht erreichbar. Bitte schreiben Sie uns direkt: kontakt@prova-systems.de'
    });
  }
}
