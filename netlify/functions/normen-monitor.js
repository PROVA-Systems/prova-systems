// PROVA N1 — Normen-Monitor Proxy
// Empfängt Rohdaten von Make.com, bereinigt sie und ruft OpenAI korrekt auf

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { quelle1 = '', quelle2 = '', quelle3 = '', quelle4 = '' } = body;

    // Text bereinigen: HTML-Tags entfernen, Sonderzeichen für JSON escapen
    function bereinigen(text, maxLen = 3000) {
      return text
        .replace(/<[^>]*>/g, ' ')      // HTML-Tags entfernen
        .replace(/&nbsp;/g, ' ')        // HTML-Entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')           // Mehrfach-Whitespace
        .trim()
        .substring(0, maxLen);          // Auf maxLen begrenzen
    }

    const q1 = bereinigen(quelle1);
    const q2 = bereinigen(quelle2);
    const q3 = bereinigen(quelle3);
    const q4 = bereinigen(quelle4);

    const userContent = `Analysiere folgende Webseiteninhalte auf Norm-Aenderungen fuer o.b.u.v. Sachverstaendige fuer Gebaeudeochaeden.

QUELLE 1 - Beuth/DIN (offizieller DIN-Vertrieb):
${q1}

QUELLE 2 - WTA (Wissenschaftlich-Technische Arbeitsgemeinschaft):
${q2}

QUELLE 3 - VDI (Verein Deutscher Ingenieure):
${q3}

QUELLE 4 - ZVDH (Zentralverband des Deutschen Dachdeckerhandwerks):
${q4}

Gib das Ergebnis als JSON zurueck. Wenn keine relevanten Aenderungen gefunden: leere aenderungen-Liste und handlungsbedarf=false.`;

    const openaiPayload = {
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein hochspezialisierter Normen-Analyst fuer oeffentlich bestellte und vereidigte Sachverstaendige fuer Gebaeudeochaeden in Deutschland.

Analysiere die uebermittelten Webseiteninhalte auf Norm-Aenderungen. Relevante Normen:
DIN 4108-2 | DIN 4108-3 | DIN 4108-7 | DIN EN ISO 13788 | DIN EN 13187 | DIN 18533 | DIN 18534 | DIN 18531 | DIN 18550 | DIN 18353 | DIN 18202 | DIN 68800-1 | DIN 68800-2 | DIN 68800-4 | DIN 18338 | DIN 18460 | DIN 1946-6 | DIN 4109 | DIN VDE 0100 | DIN EN 14604 | DIN 4102-4 | DIN EN 13501-1 | DIN 14675 | WTA 2-9-04/D | WTA 6-3-05/D | VDI 6022 | GEG 2024 | DIN 18157 | DIN EN 13813 | DIN 18180 | DIN 18195 | DIN 55699 | DIN 18560 | TRGS 519 | TRGS 521

HALLUZINATIONSVERBOT: Nenne AUSSCHLIESSLICH Normen die im Text tatsaechlich erwaehnt werden. Erfinde KEINE Aenderungen.

Antworte AUSSCHLIESSLICH mit diesem JSON-Format:
{
  "scan_datum": "YYYY-MM-DD",
  "aenderungen_gefunden": true,
  "aenderungen": [
    {
      "norm_nummer": "DIN 4108-2",
      "aenderungstyp": "REVISION",
      "neue_ausgabe": "DIN 4108-2:2025-01",
      "kurzbeschreibung": "Beschreibung der Aenderung",
      "relevanz_fuer_sv": "hoch",
      "empfohlene_aktion": "AKTUALISIEREN",
      "quelle_beleg": "Exakter Textabschnitt aus dem Quelltext"
    }
  ],
  "zusammenfassung": "Kurze Zusammenfassung aller Aenderungen",
  "handlungsbedarf": true
}`
        },
        {
          role: 'user',
          content: userContent
        }
      ]
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiPayload)
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'OpenAI Fehler', details: err })
      };
    }

    const openaiData = await openaiRes.json();
    const result = openaiData.choices?.[0]?.message?.content || '{}';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
