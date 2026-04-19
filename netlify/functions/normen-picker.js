// PROVA Systems — normen-picker Netlify Function v1.1 (Sprint 3.6 + 4)
// Progressive-Disclosure-Endpoint für Frontend-Normen-Picker.
//
// Zwei Flows:
//   flow=A (default): Schadensgutachten — Airtable-Normen nach schadensart
//   flow=B:           Wertgutachten — statische Normen nach zweck (ImmoWertV, BelWertV, BauGB)
//
// Zwei Modi (nur für Flow A relevant — Flow B ist immer schnell):
//   ?mode=fast   → Provider-only, 3-5 typ-passende Normen (~150ms)
//   ?mode=smart  → Provider filtert auf 15, KI wählt 3-5 kontext-relevante (~1.1s)
//
// Antwort ist bereits Frontend-kompatibel (Felder n, t, g statt num, titel, gw)
// — ersetzt die lokale NORMEN_DB in stellungnahme-logic.js und wertgutachten-logic.js.
//
// Beide Modi sind SAFE: bei Fehler → leere Liste + HTTP 200, kein Crash.
// Frontend hat zusätzlich eigenen lokalen Fallback (NORMEN_DB bleibt als Notfall).

const FW = require('./lib/prova-fachwissen.js');

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': 'https://prova-systems.de',
  'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Für fast-Mode kurzes Edge-Cache — schlägt bei gleicher schadensart ein
  'Cache-Control': 'public, max-age=60'
};

/**
 * Frontend-Kompatibilitäts-Mapping:
 *   Provider:  { num, titel, sa, gw, anw, hint, hf, bereich }
 *   Frontend:  { n, t, sa, g }  (n=num, t=titel, g=grenzwert/hinweis)
 *
 * g wird möglichst informationsreich zusammengesetzt (Grenzwerte bevorzugt,
 * sonst kurzer Hinweis). Das ist UI-nahes Stylen und bleibt im Endpoint,
 * damit das Frontend dumm bleiben kann.
 */
function toFrontendShape(rec) {
  const num   = rec.num || '';
  const titel = rec.titel || '';
  let g = '';
  if (rec.gw && rec.gw.trim()) {
    g = rec.gw.trim();
  } else if (rec.hint && rec.hint.trim()) {
    // Erste 80 Zeichen des Hinweises als g-Text
    g = rec.hint.trim().substring(0, 80);
    if (rec.hint.length > 80) g += '…';
  }
  return { n: num, t: titel, sa: rec.sa || '', g: g };
}

/* ─────────── fast: Provider-only ─────────── */
async function handleFast(schadensart, max) {
  const { normen, source } = await FW.normenFuerSchadensart(schadensart || '');
  // Top-N: Provider sortiert bereits nach Häufigkeit in Airtable,
  // wir müssen nur schneiden.
  const top = normen.slice(0, max);
  return {
    mode: 'fast',
    normen: top.map(toFrontendShape),
    total: top.length,
    source: source  // 'airtable-live' | 'airtable-cache' | 'fallback'
  };
}

/* ─────────── smart: Provider filtert, KI wählt ─────────── */
async function handleSmart(schadensart, kontext, max, apiKey) {
  // 1. Provider: 15 typ-passende Normen als Kandidaten-Pool
  const { normen: pool, source } = await FW.normenFuerSchadensart(schadensart || '');
  const kandidaten = pool.slice(0, 15);

  if (!kandidaten.length) {
    return { mode: 'smart', normen: [], total: 0, source: source, note: 'keine-kandidaten' };
  }

  // Ohne Kontext (kein Diktat) → fast-Verhalten (keine KI nötig)
  if (!kontext || kontext.length < 30) {
    return {
      mode: 'smart',
      normen: kandidaten.slice(0, max).map(toFrontendShape),
      total: Math.min(kandidaten.length, max),
      source: source,
      note: 'kein-kontext-fallback-auf-fast'
    };
  }

  // Ohne API-Key → Degradation auf fast
  if (!apiKey) {
    return {
      mode: 'smart',
      normen: kandidaten.slice(0, max).map(toFrontendShape),
      total: Math.min(kandidaten.length, max),
      source: source,
      note: 'kein-api-key-fallback-auf-fast'
    };
  }

  // 2. KI wählt aus diesen 15 die N kontext-relevanten
  const normenListe = kandidaten.map(n => `${n.num} — ${n.titel}${n.gw ? ' ('+n.gw.substring(0, 60)+')' : ''}`).join('\n');
  const userMsg = `Wähle aus der folgenden Liste die ${max} relevantesten Normen für diesen Fall aus.\n\nSchadensart: ${schadensart}\nDiktat/Sichtbefunde:\n${String(kontext).substring(0, 600)}\n\nVerfügbare Normen:\n${normenListe}\n\nGib NUR ein JSON-Array der Norm-Nummern zurück, z.B. ["DIN 4108-2","WTA 6-1-01/D"].`;

  try {
    const kiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'Du bist ein erfahrener Bausachverständiger. Antworte NUR mit einem JSON-Array der Norm-Bezeichnungen. Keine Erklärungen, kein Markdown.' },
          { role: 'user',   content: userMsg }
        ]
      })
    });

    if (!kiRes.ok) throw new Error('OpenAI HTTP ' + kiRes.status);
    const kiData = await kiRes.json();
    const raw = kiData.choices?.[0]?.message?.content || '';

    // Robustes JSON-Parsing mit Bracket-Extraktion
    let auswahl = [];
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) {
      try { auswahl = JSON.parse(match[0]); } catch(e) { auswahl = []; }
    }

    // Mapping: KI-Namen → Kandidaten-Objekte. Wenn KI nichts sinnvolles
    // zurückliefert → Top-N aus Kandidaten als Fallback (nicht leer).
    const ausgewaehlt = Array.isArray(auswahl) && auswahl.length
      ? auswahl.map(nr => kandidaten.find(k => k.num === nr)).filter(Boolean).slice(0, max)
      : kandidaten.slice(0, max);

    return {
      mode: 'smart',
      normen: (ausgewaehlt.length ? ausgewaehlt : kandidaten.slice(0, max)).map(toFrontendShape),
      total: ausgewaehlt.length || Math.min(kandidaten.length, max),
      source: source,
      ki_usage: kiData.usage || null
    };
  } catch (e) {
    // KI-Fehler → Degradation auf fast, Frontend bekommt trotzdem Normen
    console.warn('[normen-picker:smart] KI-Fehler, fallback auf fast:', e.message);
    return {
      mode: 'smart',
      normen: kandidaten.slice(0, max).map(toFrontendShape),
      total: Math.min(kandidaten.length, max),
      source: source,
      note: 'ki-fehler-fallback-auf-fast',
      ki_error: e.message
    };
  }
}

/* ─────────── Flow B: Wertgutachten (statische Normen nach Zweck) ─────────── */
async function handleFlowB(zweck, objektart, max) {
  // wertgutachtenNormen ist synchron (keine Airtable-Abfrage)
  const normen = FW.wertgutachtenNormen(zweck || 'alle');

  // Objektart bestimmt die Reihenfolge der Kernverfahren (§ 8 ImmoWertV):
  //   efh/dhh/rh: Sachwert + Vergleichswert führend
  //   mfh/geh:    Ertragswert führend
  //   etw:        Vergleichswert führend
  //   gru:        Vergleichswert (reiner Grundstückswert)
  // Wir sortieren die Verfahrens-Normen entsprechend nach oben.
  const sortByObjektart = (arr) => {
    const o = String(objektart || '').toLowerCase();
    let prioritaet;
    if (['mfh', 'geh'].includes(o))     prioritaet = ['Ertragswert', 'Sachwert', 'Vergleich'];
    else if (o === 'etw')               prioritaet = ['Vergleich', 'Ertragswert', 'Sachwert'];
    else if (o === 'gru')               prioritaet = ['Vergleich', 'Sachwert', 'Ertragswert'];
    else /* efh, dhh, rh, default */    prioritaet = ['Sachwert', 'Vergleich', 'Ertragswert'];

    // Score: niedriger = höher sortiert
    const scoreOf = (n) => {
      const t = n.titel.toLowerCase();
      for (let i = 0; i < prioritaet.length; i++) {
        if (t.includes(prioritaet[i].toLowerCase())) return i;
      }
      // Kern-Verkehrswert/Grundlagen immer ganz oben
      if (n.num.includes('BauGB') || n.num === '§ 1 ImmoWertV' || n.num === '§ 8 ImmoWertV') return -1;
      return 99; // Rest danach
    };
    return [...arr].sort((a, b) => scoreOf(a) - scoreOf(b));
  };

  const sortiert = sortByObjektart(normen);

  // Zweck-Modifier (bank/gericht/steuer) sollen IMMER dabei sein, auch bei knappem max.
  // → Trenne Modifier von Kern, sortiere Kern nach Objektart, Modifier dahinter,
  //   aber beides zusammen ist <= max.
  const z = String(zweck || 'alle').toLowerCase();
  const isSpecialZweck = (z === 'bank' || z === 'gericht' || z === 'steuer');

  let top;
  if (isSpecialZweck) {
    const modifier = sortiert.filter(n => n.zweck === z);
    const kern     = sortiert.filter(n => n.zweck === 'alle');
    // Modifier erhalten Vorrang: komplett mit rein + so viele Kern wie Platz bleibt
    const kernSlots = Math.max(0, max - modifier.length);
    // Wichtige Kern-Normen (Verkehrswert + Verfahrenswahl) priorisieren durch sort-score <0
    top = [...kern.slice(0, kernSlots), ...modifier];
  } else {
    top = sortiert.slice(0, max);
  }

  // In Frontend-Shape bringen ({ n, t, sa, g })
  const shaped = top.map(n => ({
    n: n.num,
    t: n.titel,
    sa: n.zweck || 'alle',
    g: n.gw || ''
  }));

  return {
    mode: 'flow-b',
    flow: 'B',
    zweck: zweck || 'alle',
    objektart: objektart || '',
    normen: shaped,
    total: shaped.length,
    source: 'static'  // Statische Referenz-DB, kein Airtable
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    // Parameter: aus Body (POST) oder Query (GET)
    let schadensart = '', kontext = '', mode = 'fast', max = 5;
    let flow = 'A', zweck = '', objektart = '';
    if (event.httpMethod === 'POST' && event.body) {
      const b = JSON.parse(event.body);
      schadensart = b.schadensart || '';
      kontext     = b.kontext || '';
      mode        = b.mode || 'fast';
      max         = parseInt(b.max, 10) || 5;
      flow        = (b.flow || 'A').toUpperCase();
      zweck       = b.zweck || '';
      objektart   = b.objektart || '';
    } else {
      const q = event.queryStringParameters || {};
      schadensart = q.schadensart || q.sa || '';
      kontext     = q.kontext || '';
      mode        = q.mode || 'fast';
      max         = parseInt(q.max, 10) || 5;
      flow        = (q.flow || 'A').toUpperCase();
      zweck       = q.zweck || '';
      objektart   = q.objektart || '';
    }

    // Harte Bounds für max: 1-15 Normen (Flow B darf mehr, weil Kern+Modifier schon ~15)
    max = Math.max(1, Math.min(15, max));

    // ─── Routing ───
    let result;
    if (flow === 'B') {
      // Flow B: Wertgutachten — statische Normen, kein KI, kein Airtable
      result = await handleFlowB(zweck, objektart, max);
    } else {
      // Flow A: Schadensgutachten — Airtable + optional KI
      const apiKey = process.env.OPENAI_API_KEY;
      result = (mode === 'smart')
        ? await handleSmart(schadensart, kontext, max, apiKey)
        : await handleFast(schadensart, max);
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('[normen-picker] Fehler:', err.message);
    // SAFE: Auch bei Fehler 200 mit leerer Liste — Frontend fällt auf lokale DB zurück
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ mode: 'error', normen: [], total: 0, error: err.message })
    };
  }
};
