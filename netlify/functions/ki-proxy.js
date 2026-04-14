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
    if (aufgabe === 'support_chat') return await handleSupportChat(body, apiKey);
    return await handleMessages(body, apiKey);
  } catch (e) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Upstream error', detail: e.message }) };
  }
};

async function handleFachurteilEntwurf(body, apiKey) {
  const { diktat = '', diktat_manuell = '', schadenart = '', messwerte = '', verwendungszweck = 'gericht', paragraphen = null, az = '', objekt = '', baujahr = '', auftraggeber = '' } = body;
  const entwurf = paragraphen ? (paragraphen.gesamt || '') : '';
  const gesamtKontext = (diktat + ' ' + diktat_manuell + ' ' + messwerte + ' ' + entwurf).trim();

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

DIKTAT DES SACHVERSTÄNDIGEN (Sprachaufnahme):
${diktat || '(kein Sprachdiktat)'}
${diktat_manuell ? '\nMANUELLE ERGÄNZUNG DES SV (Freitext):\n' + diktat_manuell : ''}
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


async function handleSupportChat(body, apiKey) {
  const { frage = '', seite = '', paket = 'Solo', kontext = '' } = body;

  if (!frage || frage.trim().length < 3) {
    return jsonResponse({ antwort: 'Bitte stellen Sie Ihre Frage etwas ausführlicher.' });
  }

  const seitenKontext = seite ? `Der SV befindet sich gerade auf: ${seite}` : '';

  const systemPrompt = `Du bist der freundliche KI-Support-Assistent von PROVA Systems — einer SaaS-Plattform für öffentlich bestellte und vereidigte Sachverständige (SV) im Bauwesen.

Deine Aufgabe: Beantworte Fragen von Sachverständigen präzise, freundlich und auf Deutsch. Antworte AUSSCHLIESSLICH auf Basis dieses Handbuchs. Wenn du eine Frage nicht beantworten kannst, sage es klar und empfehle die direkte Kontaktaufnahme. ERFINDE NIEMALS Features oder Aussagen die hier nicht stehen.

═══════════════════════════════════════════════
PROVA WISSENSHANDBUCH — VOLLSTÄNDIG
═══════════════════════════════════════════════

## GUTACHTEN ERSTELLEN (app.html)

**Neues Gutachten starten:** Sidebar → "+ Neuer Fall" → 5-Schritte-Workflow: Stammdaten → Diktat & Fotos → Analyse → Freigabe → Export.

**Schritt 1 — Stammdaten:** Auftragsart (Gerichts-/Versicherungs-/Privatgutachten), Schadenart, Auftraggeber-Daten, Objektadresse, Ortstermin-Datum. Alle Pflichtfelder müssen ausgefüllt sein bevor Schritt 2 zugänglich wird.

**Schritt 2 — Diktat & Fotos:** Mikrofon-Button antippen → Browser fragt nach Mikrofonerlaubnis → sprechen → Aufnahme stoppt automatisch. Alternativ: Textfeld "Eingabe" für manuelles Tippen. Betroffenen Bereich eintragen (z.B. "Schlafzimmer"). Fotos hochladen per Drag & Drop, Kamera oder Galerie. Max. 20 Fotos, JPG/PNG.

**Diktat-Tipps:** Lage des Schadens, gemessene Feuchte/Temperaturen, Bauphase, Baujahr, sichtbare Befunde. Fachurteil §6 NICHT ins Diktat — das schreibt der SV persönlich in Schritt 4.

**Schritt 3 — KI-Analyse:** Startet nach Klick auf "Analyse starten". Dauer: ohne Fotos 20-40 Sekunden, mit Fotos 60-120 Sekunden (GPT-4o Vision). Seite NICHT neu laden — der Webhook läuft im Hintergrund. Bei Timeout nach 3 Minuten: Archiv → Korrektur-Modus nutzen.

**Schritt 4 — §6 Fachurteil schreiben:** Die KI zeigt eine Analyse-Box (nicht kopierbar, nur zur Orientierung). Der SV schreibt sein §6 Fachurteil persönlich — Mindestlänge 500 Zeichen. Konjunktiv II ist Pflicht für Kausalaussagen (§407a ZPO). PROVA prüft automatisch auf Konjunktiv-Fehler.

**Schritt 5 — Freigabe & Export:** Gutachten freigeben → PDF wird automatisch erstellt. Bei §407a ZPO muss der SV bestätigen dass er das Gutachten persönlich verantwortet.

## DIKTAT-PROBLEME

**Mikrofon funktioniert nicht:** Browser-Einstellungen → Kamera/Mikrofon → PROVA erlauben. Chrome/Safari empfohlen. HTTPS erforderlich (prova-systems.de ist HTTPS).

**Transkription ist leer:** Aufnahme prüfen (Zeichen-Zähler in der Statusbox). Mindestens 10 Sekunden sprechen. Alternativ: Tab "Eingabe" → Text manuell eintippen.

**Live-Transkription erscheint nicht:** Die Transkription läuft im Hintergrund. Ergebnis erst nach Analyse sichtbar.

**Wiederaufnahme-Banner erscheint bei neuem Fall:** Bekanntes Problem, behoben in sw v46. Hard-Refresh (Strg+Shift+R) erzwingen.

## KI UND HALLUZINATIONEN

**Was macht die KI?** GPT-4o analysiert das Diktat und erstellt §1-§5 des Gutachtens. §6 schreibt der SV persönlich.

**Halluzinationsverbot:** Die KI darf nur Informationen aus dem Diktat verwenden. Straßen, Namen, Messwerte die nicht im Diktat stehen werden mit [fehlt] markiert.

**Konjunktiv II Pflicht:** Alle Ursachenhypothesen (§5) müssen im Konjunktiv II stehen: "könnte zurückzuführen sein", "käme in Betracht". PROVA prüft dies automatisch.

**KI-Analyse dauert zu lange:** Normal bei Fotos (bis 120s). Seite nicht neu laden. Nach 3 Minuten: Archiv → Korrektur.

## §407a ZPO — RECHTLICHE GRUNDLAGE

§407a ZPO regelt die persönliche Verantwortung des Sachverständigen. Der SV muss das Gutachten persönlich verfassen und verantworten — KI-Assistenz ist erlaubt, aber der SV trägt die fachliche Verantwortung. PROVA erzwingt dies durch die Eigenleistungs-Pflicht im §6-Fachurteil (min. 500 Zeichen eigener Text).

## JVEG-ABRECHNUNG (jveg.html)

Öffnen: Sidebar → ABRECHNUNG → JVEG-Rechner. Sachgebiet/Honorargruppe wählen (M1-M9 nach §9 JVEG). Stunden eintragen, Fahrtkilometer (0,42 €/km nach §8 JVEG), Wartezeit, Schreibauslagen (0,90 €/Seite nach §12 Nr.1). Ergebnis mit "Als Rechnung übernehmen" in die E-Rechnung übertragen.

Aktuelle JVEG-Sätze (Stand 1.1.2024): M1: 85 €/h, M2: 95 €/h, M3: 100 €/h, M4: 110 €/h, M5: 115 €/h, M6: 120 €/h, M7: 125 €/h, M8: 130 €/h, M9: 140 €/h.

## E-RECHNUNG / XRECHNUNG (erechnung.html)

XRechnung 3.0.2 ist Pflicht für Rechnungen an Gerichte und Behörden (§4 E-RechV) seit 2020 (Bund) / 2023 (Länder). Formular ausfüllen: Eigene Daten (Name, E-Mail, IBAN, Steuernummer), Empfänger-Daten (E-Mail des Gerichts Pflicht!), Leitweg-ID des Empfängers (Format: 993-99999-99, vom Gericht zu erfragen). Nach Download: unter erechnungs-validator.de prüfen.

ZUGFeRD 2.1: Hybrid-PDF für private Auftraggeber (Versicherungen). Aktuell in Entwicklung.

## NORMEN UND TEXTBAUSTEINE

Normen (normen.html): 163+ Normen, DIN, WTA, ZPO, BGB. Filterfunktion nach Schadensart. Normen können per Klick in Stellungnahmen eingefügt werden.

Textbausteine (textbausteine.html): Vorgefertigte Texte für wiederkehrende Formulierungen. Eigene Bausteine anlegen und speichern.

## ARCHIV UND FÄLLE (archiv.html)

Alle erstellten Gutachten mit Status: In Bearbeitung, Analyse, Freigabe, Exportiert. Korrektur-Modus: Bearbeitetes Gutachten öffnen und Text direkt bearbeiten. Suche und Filter nach Aktenzeichen, Datum, Schadensart.

## RECHNUNGEN (rechnungen.html)

Rechnungsverwaltung: Liste aller Rechnungen mit Status (offen, bezahlt, überfällig). Neue Rechnung erstellen: Pauschalrechnung oder aus JVEG-Rechner übernehmen. Export als PDF.

## STATISTIKEN (statistiken.html)

KPIs: Gutachten gesamt, Abschlussquote, Bearbeitungszeit, Fotos analysiert. Diagramme: Gutachten pro Monat, Schadensarten-Verteilung, Status-Verteilung, Auftraggeber-Typen.

## PAKETE UND TRIAL

Trial: 14 Tage kostenlos, kein Kreditkarte, voller Solo-Funktionsumfang bis 25 Gutachten.

Solo-Paket: 149 €/Monat. 1 Nutzer, unbegrenzte Gutachten, alle KI-Funktionen, PDF-Generierung.

Team-Paket: 279 €/Monat. Mehrere Nutzer, Chef-Freigabe-Workflow, Team-Dashboard, geteilte Textbausteine.

Paket ändern: Einstellungen → Paket & Features. Jederzeit kündbar, keine Mindestlaufzeit.

## TECHNISCHE PROBLEME

**Seite lädt nicht:** Strg+Shift+R (Hard-Refresh) — löscht Service-Worker-Cache.

**"Wiederaufnahme"-Banner bei neuem Fall:** Hard-Refresh erzwingen (Strg+Shift+R).

**PDF wird nicht erstellt:** Alle Pflichtfelder prüfen (Schritt 1). PDFMonkey benötigt 30-120 Sekunden. Freigabe-Seite neu laden und erneut freigeben. Falls weiterhin Fehler: Aktenzeichen notieren und Marcel kontaktieren.

**Mikrofon nicht verfügbar:** Browser-Berechtigungen → PROVA erlauben. HTTPS erforderlich.

**KI antwortet mit 502:** Kurzzeitiger Server-Fehler. 30 Sekunden warten und erneut versuchen.

**Analyse startet nicht:** Diktat-Text muss vorhanden sein (mindestens 10 Zeichen). Mikrofon-Status prüfen.

## DATENSCHUTZ

Alle Daten werden auf Netlify (EU-Server) und Airtable (EU-Region) gespeichert. DSGVO-konform. Keine Weitergabe an Dritte. Diktat-Audio wird nur für Transkription verwendet und nicht dauerhaft gespeichert.

## KONTAKT / SUPPORT

Bei Fragen die dieser Assistent nicht beantworten kann: support@prova-systems.de oder über diesen Chat ein Ticket erstellen. Marcel antwortet in der Regel innerhalb von 24 Stunden.


AKTUELLE SITUATION:
- SV-Paket: ${paket}
- ${seitenKontext}

ANTWORT-REGELN:
1. Antworte auf Deutsch, freundlich und präzise
2. Maximal 3-4 Sätze, außer bei komplexen Themen
3. Verwende HTML-Links wenn du auf PROVA-Seiten verlinkst: <a href="seite.html" style="color:#4f8ef7">Text</a>
4. Wenn du die Antwort nicht kennst: Sage "Ich leite Ihre Frage an Marcel weiter." — NIEMALS erfinden
5. Bei technischen Problemen: Immer Hard-Refresh (Strg+Shift+R) als ersten Schritt nennen`;

  const result = await callOpenAI({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: frage }
    ]
  }, apiKey);

  const antwort = result.choices?.[0]?.message?.content?.trim() || '';

  if (!antwort || antwort.length < 10) {
    return jsonResponse({ antwort: '' }); // Trigger Ticket-Eskalation
  }

  return jsonResponse({ antwort });
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
      max_tokens: 2000,
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
