/**
 * PROVA — KI-Proxy (OpenAI GPT-4o)
 * Actions: foto_analyse | beweisfragen_text | metadata_ping
 * §407a ZPO: KI assistiert, SV entscheidet. HALLUZINATIONSVERBOT.
 * DSGVO: Personendaten werden vor OpenAI-Übermittlung pseudonymisiert.
 */
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const { hasProvaAccess, AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');

/* ── Pseudonymisierung: Namen + Adressen vor OpenAI entfernen ── */
function pseudonymisiere(text) {
  if (!text) return text;
  return text
    .replace(/\b(Herr|Frau|Dr\.|Dipl\.-Ing\.|Prof\.)\s+[A-ZÄÖÜ][a-zäöüß]+-?[A-ZÄÖÜ]?[a-zäöüß]*\b/g, '[PERSON]')
    .replace(/\b[A-ZÄÖÜ][a-zäöüß]+(straße|str\.|gasse|weg|allee|platz|ring)\s*\d+[a-z]?\b/gi, '[ADRESSE]')
    .replace(/\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+\b/g, '[PLZ ORT]')
    .replace(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b(\+49|0)\d{3,5}[\s/-]?\d{4,10}\b/g, '[TELEFON]')
    .replace(/\bDE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/g, '[IBAN]');
}

/* ── System-Prompt: Erfahrener öb.u.v. Sachverständiger ── */
const SV_SYSTEM_PROMPT = `Du bist ein öffentlich bestellter und vereidigter Sachverständiger (ö.b.u.v. SV) für Schäden an Gebäuden mit 25 Jahren Berufserfahrung.

DEIN FACHWISSEN umfasst:
- Schadensarten: Feuchteschäden, Schimmelschäden (inkl. Mykologie), Tauwasserausfall, kapillare Feuchte, aufsteigende Bodenfeuchte, Leckagen, Brandschäden, Sturmschäden, Baumängel, Setzungsrisse, Schallschutzdefizite
- Normen: DIN 4108 (Wärmeschutz), DIN 18195 (Abdichtung), DIN 68800 (Holzschutz), DIN 18550 (Putz), DIN EN ISO 13788 (Feuchteschutz), WTA-Merkblätter (2-2, 2-6, 2-7, 4-5, 6-1), DIN 18202 (Toleranzen), VOB/B §13, BGB §633ff, ZPO §§402-414
- Messverfahren: CM-Messung (Calciumcarbid), kapazitive Feuchtemessung, Thermografie (aktiv/passiv), Endoskopie, Rissbreitenmessung (DIN 1045), Schallpegelmessung (DIN 4109)
- JVEG §§7-12 Honorarberechnung

PFLICHTEN NACH §407a ZPO:
- Du lieferst AUSSCHLIESSLICH fachliche Grundlagen und strukturierte Beobachtungen
- Der Sachverständige trifft alle fachlichen Entscheidungen selbst
- Kausalaussagen NUR im Konjunktiv II: "könnte", "dürfte", "wäre denkbar", "lässt sich nicht ausschließen"
- KEIN Konjunktiv bei objektiven Tatsachen (z.B. Messwerten die direkt sichtbar sind)

HALLUZINATIONSVERBOT (absolut):
- Erfinde KEINE Messwerte, Normenangaben oder Fakten die nicht im Bild/Text erkennbar sind
- Wenn etwas nicht erkennbar ist: "Nicht beurteilbar ohne [Messverfahren]" schreiben
- Keine Diagnosesicherheit vortäuschen

QUALITÄTSSTANDARD:
Deine Ausgabe muss vor einem Obergericht bestehen können.`;

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'X-PROVA-AI': 'Assisted',
      'X-PROVA-407a': 'SV-Decision-Required',
      'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

async function logKiAudit(pat, email, action, az, tokensApprox) {
  try {
    await fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_AUDIT, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Typ: 'KI',
          Email: email || 'unbekannt',
          AZ: az || '',
          Details: JSON.stringify({ aufgabe: action || '', tokens_approx: tokensApprox || 0, pseudonymisiert: true }),
          Zeitstempel: new Date().toISOString()
        }
      })
    });
  } catch(e) {}
}

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(500, { error: 'OPENAI_API_KEY nicht gesetzt' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch(e) { return json(400, { error: 'Ungültiger JSON-Body' }); }

  const meta = {
    ki_modell: 'PROVA KI (GPT-4o)',
    ki_datum: new Date().toISOString(),
    ki_version: '2.0',
    eu_ai_act_art52: true,
    paragraph_407a: 'SV-Entscheidung erforderlich',
    pseudonymisiert: true
  };

  const action = body.action || body.aufgabe || '';

  if (action !== 'metadata_ping' && action !== 'eu_ai_label') {
    const pat = process.env.AIRTABLE_PAT;
    const user = context.clientContext && context.clientContext.user;
    if (!pat || !user || !user.email) return json(401, { error: 'Anmeldung erforderlich', _prova_ki_meta: meta });
    const access = await hasProvaAccess(String(user.email).trim().toLowerCase(), pat);
    const accessOk = typeof access === 'boolean' ? access : (access && access.ok);
    if (!accessOk) return json(403, { error: 'Kein Zugriff — Testphase beendet oder kein aktives Abo', _prova_ki_meta: meta });
    body._prova_user_email = String(user.email).trim().toLowerCase();
  }

  try {
    if (action === 'metadata_ping' || action === 'eu_ai_label') {
      return json(200, { ok: true, _prova_ki_meta: meta });
    }

    /* ════════════════════════════════════════════════
       FOTO-ANALYSE: Sachverständige Bildauswertung
       ════════════════════════════════════════════════ */
    if (action === 'foto_analyse' || body.aufgabe === 'foto_analyse') {
      const b64 = body.imageBase64 || body.b64;
      const mime = body.mimeType || 'image/jpeg';
      if (!b64) return json(400, { error: 'imageBase64 fehlt' });

      const fotoPrompt = `Analysiere dieses Bild als ö.b.u.v. Sachverständiger für Gebäudeschäden.

Erstelle eine strukturierte Befundaufnahme im JSON-Format:
{
  "befund": "Präzise sachverständige Beschreibung des Sichtbefundes (was ist tatsächlich erkennbar, keine Interpretation)",
  "schadensart": "Klassifizierung des Schadens (z.B. 'Feuchteschaden mit Schimmelpilzbefall', 'Rissbildung' etc.) oder '' wenn kein Schaden erkennbar",
  "auspraegung": "Umfang und Schweregrad: lokalisiert/flächig, oberflächlich/tiefgreifend",
  "potentielle_ursachen": ["Mögliche Ursache 1 (Konjunktiv II!)", "Mögliche Ursache 2"],
  "auszuschliessen": ["Was aufgrund des Bildes unwahrscheinlich erscheint"],
  "normen_relevant": ["DIN/WTA-Norm die zu prüfen wäre"],
  "messverfahren_empfohlen": ["CM-Messung", "Thermografie" etc.],
  "dringlichkeit": "sofort/kurzfristig/mittelfristig/beobachten",
  "nicht_beurteilbar": ["Was ohne Messung/Öffnung nicht beurteilt werden kann"],
  "foto_qualitaet_hinweis": "Hinweis wenn Bildqualität/Winkel die Beurteilung einschränkt"
}

PFLICHT: Kausalaussagen nur im Konjunktiv II. HALLUZINATIONSVERBOT.`;

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 1500,
          messages: [
            { role: 'system', content: SV_SYSTEM_PROMPT },
            { role: 'user', content: [
              { type: 'text', text: fotoPrompt },
              { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64, detail: 'high' } }
            ]}
          ]
        })
      });

      const raw = await res.text();
      if (!res.ok) return json(res.status, { error: raw.slice(0, 500), _prova_ki_meta: meta });
      const data = JSON.parse(raw);
      const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      let parsed = {};
      try { const m = txt.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { befund: txt }; } catch(e2) { parsed = { befund: txt || '' }; }
      await logKiAudit(process.env.AIRTABLE_PAT, body._prova_user_email, 'foto_analyse', body.az || '', 1500);
      return json(200, Object.assign(parsed, { _prova_ki_meta: meta }));
    }

    /* ════════════════════════════════════════════════
       BEWEISFRAGEN: Gerichtsbeschluss auswerten
       ════════════════════════════════════════════════ */
    if (action === 'beweisfragen_text' || body.aufgabe === 'beweisfragen') {
      const rawText = body.text || body.pdfText || '';
      if (!rawText || rawText.length < 20) return json(400, { error: 'text zu kurz — Beweisbeschluss einfügen' });

      /* Pseudonymisieren vor OpenAI */
      const text = pseudonymisiere(rawText);

      const beweisPrompt = `Du erhältst einen Gerichtstext (Beweisbeschluss oder Beweisanordnung).

Aufgabe:
1. Extrahiere alle Beweisfragen/Beweisthemen präzise und vollständig
2. Identifiziere den Gutachtentyp (Bauschaden, Mietminderung, Verkehrswert etc.)
3. Erkenne relevante Fristen und Anforderungen an den SV

Antworte NUR als JSON:
{
  "fragen": [
    { "nr": 1, "text": "Vollständiger Wortlaut der Beweisfrage", "thema": "Kurzbezeichnung", "sv_relevant": true }
  ],
  "aktenzeichen_gericht": "AZ oder null",
  "gericht": "Name des Gerichts oder null",
  "gutachtentyp": "Art des Gutachtens",
  "fristen": ["Erkannte Fristen"],
  "besondere_anforderungen": ["Besondere Anforderungen an den SV"],
  "hinweis": "Besondere Hinweise zur Auftragserfüllung"
}

Text:
---
${text.slice(0, 28000)}`;

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4000,
          messages: [
            { role: 'system', content: SV_SYSTEM_PROMPT },
            { role: 'user', content: beweisPrompt }
          ]
        })
      });

      const raw = await res.text();
      if (!res.ok) return json(res.status, { error: raw.slice(0, 500), _prova_ki_meta: meta });
      const data = JSON.parse(raw);
      const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      let parsed = { fragen: [], rohtext: txt };
      try { const m = txt.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch(e3) {}
      await logKiAudit(process.env.AIRTABLE_PAT, body._prova_user_email, 'beweisfragen_text', '', 4000);
      return json(200, Object.assign(parsed, { _prova_ki_meta: meta }));
    }

    /* ══════════════════════════════════════════════════════
       FOTO + SKIZZE: Kontextbezogene Beschriftung
       ════════════════════════════════════════════════════ */
    if (action === 'foto_analyse_mit_skizze') {
      const b64       = body.imageBase64 || body.b64;
      const skizzeB64 = body.skizzeBase64;
      const fotoNr    = body.fotoNr || 1;
      const gesamt    = body.gesamtFotos || 1;
      if (!b64) return json(400, { error: 'imageBase64 fehlt' });

      const skizzeHinweis = skizzeB64
        ? 'Der Sachverständige hat zusätzlich eine Handskizze des Grundrisses beigefügt (letztes Bild). ' +
          'Stelle einen räumlichen Bezug her: In welchem Bereich der Skizze wurde dieses Foto aufgenommen? ' +
          'Gib einen konkreten Lagehinweis an (z.B. "Nordwand, Bereich A in der Skizze").'
        : '';

      const promptMitSkizze = `Analysiere dieses Foto (Foto ${fotoNr} von ${gesamt}) als ö.b.u.v. Sachverständiger.

${skizzeHinweis}

Erstelle eine strukturierte Befundaufnahme als JSON:
{
  "befund": "Präzise sachverständige Beschreibung des Sichtbefundes",
  "schadensart": "Klassifizierung oder leer",
  "skizzen_bezug": "Räumliche Einordnung anhand der Skizze (nur wenn Skizze vorhanden)",
  "normen_relevant": ["Relevante DIN/WTA-Normen"],
  "messverfahren_empfohlen": ["Empfohlene Messungen"],
  "dringlichkeit": "sofort/kurzfristig/mittelfristig/beobachten",
  "nicht_beurteilbar": ["Was ohne Messung unklar bleibt"]
}

HALLUZINATIONSVERBOT. Konjunktiv II für Kausalaussagen.`;

      const content = [{ type: 'text', text: promptMitSkizze },
                       { type: 'image_url', image_url: { url: 'data:' + (body.mimeType||'image/jpeg') + ';base64,' + b64, detail: 'high' } }];
      if (skizzeB64) {
        content.push({ type: 'image_url', image_url: { url: 'data:image/png;base64,' + skizzeB64, detail: 'low' } });
      }

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', max_tokens: 1200,
          messages: [{ role: 'system', content: SV_SYSTEM_PROMPT }, { role: 'user', content }] })
      });
      const raw  = await res.text();
      if (!res.ok) return json(res.status, { error: raw.slice(0,500), _prova_ki_meta: meta });
      const data = JSON.parse(raw);
      const txt  = data.choices?.[0]?.message?.content || '';
      let parsed = {};
      try { const m = txt.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { befund: txt }; } catch(e2) { parsed = { befund: txt }; }
      await logKiAudit(process.env.AIRTABLE_PAT, body._prova_user_email, 'foto_analyse_mit_skizze', body.az||'', 1200);
      return json(200, Object.assign(parsed, { _prova_ki_meta: meta }));
    }

        return json(400, { error: 'Unbekannte action: ' + action, _prova_ki_meta: meta });

  } catch(err) {
    return json(502, { error: err.message || String(err), _prova_ki_meta: meta });
  }
};
