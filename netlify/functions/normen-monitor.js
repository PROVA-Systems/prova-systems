// PROVA N1 — Normen-Monitor
// Scrapt 4 Quellen selbst, bereinigt Text, ruft OpenAI auf
// Kompatibel mit Node.js 16+ auf Netlify

const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PROVA-Monitor/1.0)' },
      timeout: 15000,
      rejectUnauthorized: false
    };
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function httpsPost(hostname, path, data, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function bereinigen(html, maxLen = 3000) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim()
    .substring(0, maxLen);
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const quellen = [
    { name: 'Beuth/DIN', url: 'https://www.beuth.de/de/neuerscheinungen' },
    { name: 'WTA', url: 'https://wta.de' },
    { name: 'VDI News', url: 'https://www.vdi.de/news' },
    { name: 'ZVDH', url: 'https://www.zvdh.de' }
  ];

  try {
    // Parallel scrapen
    const texte = await Promise.all(
      quellen.map(q => httpsGet(q.url).then(bereinigen).catch(e => `[Fehler: ${e.message}]`))
    );

    let userContent = 'Analysiere folgende Webseiteninhalte auf Norm-Aenderungen fuer o.b.u.v. Sachverstaendige:\n\n';
    quellen.forEach((q, i) => {
      userContent += `=== QUELLE ${i + 1}: ${q.name} ===\n${texte[i]}\n\n`;
    });
    userContent += 'Gib Ergebnis als JSON zurueck. Wenn keine Aenderungen: leere aenderungen-Liste, handlungsbedarf=false.';

    const openaiPayload = {
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist Normen-Analyst fuer o.b.u.v. Sachverstaendige fuer Gebaeudeochaeden. Ueberwachte Normen: DIN 4108-2, DIN 4108-3, DIN 4108-7, DIN EN ISO 13788, DIN 18533, DIN 18534, DIN 18531, DIN 68800-1, DIN 68800-2, DIN 1946-6, DIN 4109, DIN EN 13501-1, WTA 2-9-04/D, WTA 6-3-05/D, GEG 2024, TRGS 519, TRGS 521. HALLUZINATIONSVERBOT: Nur Normen nennen die tatsaechlich im Text erwaehnt werden. Antworte NUR als JSON: {"scan_datum":"YYYY-MM-DD","aenderungen_gefunden":true,"aenderungen":[{"norm_nummer":"DIN 4108-2","aenderungstyp":"REVISION","neue_ausgabe":"DIN 4108-2:2025-01","kurzbeschreibung":"Text","relevanz_fuer_sv":"hoch","empfohlene_aktion":"AKTUALISIEREN","quelle_name":"Beuth/DIN","quelle_beleg":"Textabschnitt"}],"zusammenfassung":"Text","handlungsbedarf":true}`
        },
        { role: 'user', content: userContent }
      ]
    };

    const result = await httpsPost(
      'api.openai.com',
      '/v1/chat/completions',
      openaiPayload,
      process.env.OPENAI_API_KEY
    );

    if (result.status !== 200) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'OpenAI Fehler', status: result.status, details: result.body }) };
    }

    const data = JSON.parse(result.body);
    const content = data.choices?.[0]?.message?.content || '{"handlungsbedarf":false,"aenderungen":[],"zusammenfassung":"Kein Ergebnis"}';

    return { statusCode: 200, headers, body: content };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  }
};
