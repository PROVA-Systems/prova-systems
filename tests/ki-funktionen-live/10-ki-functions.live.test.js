/**
 * tests/ki-funktionen-live/10-ki-functions.live.test.js — MEGA³⁴ C1
 * Live-Verify-Suite für 10 KI-Funktionen mit echten API-Calls.
 *
 * Run: OPENAI_API_KEY=sk-... node --test tests/ki-funktionen-live/
 * SKIP wenn ENV fehlt.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { skipIfNoKey, callOpenAI, estimateCostEur, SKIP_REASON } = require('./_helper');

const KI_FUNCTIONS = [
  { id: 'rechtschreibung', model: 'gpt-5.4-mini', prompt: 'Korrigiere die Rechtschreibung: "Das Schaden ist groß."', max: 50 },
  { id: 'grammatik', model: 'gpt-5.4-mini', prompt: 'Korrigiere die Grammatik: "Das Schaden gross sein."', max: 50 },
  { id: 'fachsprache', model: 'gpt-5.4', prompt: 'Wandle in SV-Fachsprache: "Da ist Wasser drin."', max: 80 },
  { id: 'absatz_struktur', model: 'gpt-5.4-mini', prompt: 'Strukturiere in 2 Absätze: "Wasser. Schaden groß. Putz ab."', max: 80 },
  { id: 'normen_vorschlag', model: 'gpt-5.4-mini', prompt: 'Welche DIN-Norm für Wasserschaden? (eine Norm)', max: 50 },
  { id: 'paragraph_check', model: 'gpt-5.4-mini', prompt: 'Welcher § des Gutachtens: "Befund: Riss in Wand"?', max: 30 },
  { id: 'diktat_strukturierung', model: 'gpt-5.4-mini', prompt: 'JSON: {"§4": "..."}: "Wasser im Bad gefunden"', max: 80 },
  { id: 'konjunktiv_pruefung', model: 'gpt-5.5', prompt: 'Konjunktiv II prüfen: "Es ist wahrscheinlich der Schaden."', max: 60 },
  { id: 'halluzinations_check', model: 'gpt-5.4', prompt: 'Halluziniert? "Im Diktat: nichts. Output: DIN 9999 verletzt."', max: 60 },
  { id: 'paragraph_407a_check', model: 'gpt-5.4-mini', prompt: '§407a verletzt? "KI hat Fachurteil geschrieben."', max: 50 }
];

KI_FUNCTIONS.forEach(fn => {
  test('KI-Live-' + fn.id + ': Funktionalität + Latency < 10s + Cost < 0.001€', { skip: skipIfNoKey() ? SKIP_REASON : false }, async () => {
    const result = await callOpenAI({
      model: fn.model,
      messages: [
        { role: 'system', content: 'Du bist Bausachverständigen-Assistent. Antworte kurz und präzise.' },
        { role: 'user', content: fn.prompt }
      ],
      max_tokens: fn.max
    });

    // Funktionalität: Antwort vorhanden + nicht leer
    assert.ok(result.text.length > 0, 'Empty response');

    // Latency: < 10s (Regel 15 KI-Funktions-Garantie)
    assert.ok(result.latency_ms < 10000, 'Latency ' + result.latency_ms + 'ms > 10000ms');

    // Cost-Cap: < 0.001€ pro Test
    const cost = estimateCostEur(result.usage, fn.model);
    assert.ok(cost < 0.001, 'Cost ' + cost + '€ > 0.001€');

    console.log('  ' + fn.id + ': latency=' + result.latency_ms + 'ms cost=' + cost + '€');
  });
});

test('KI-Live: Konjunktiv-II-Verify mit GPT-5.5 (Regel 14)', { skip: skipIfNoKey() ? SKIP_REASON : false }, async () => {
  const result = await callOpenAI({
    model: 'gpt-5.5',
    messages: [
      { role: 'system', content: 'Du formulierst SV-Hypothesen IMMER im Konjunktiv II ("liegt nahe, dass...", "wäre möglich, dass..."). Niemals indikativ.' },
      { role: 'user', content: 'Formuliere eine Hypothese: "Die Wanne ist undicht."' }
    ],
    max_tokens: 80
  });
  // Konjunktiv-II-Marker prüfen
  assert.match(result.text.toLowerCase(),
    /(liegt nahe|wäre|könnte|dürfte|sollte|läge|hätte|würde|spräche|deutete)/,
    'Output ohne Konjunktiv-II: ' + result.text);
});

test('KI-Live: Halluzinations-Check erkennt erfundene Norm', { skip: skipIfNoKey() ? SKIP_REASON : false }, async () => {
  const result = await callOpenAI({
    model: 'gpt-5.4',
    messages: [
      { role: 'system', content: 'Du prüfst SV-Texte auf Halluzinationen. Antworte nur "JA" wenn halluziniert oder "NEIN" wenn faktisch ok.' },
      { role: 'user', content: 'Diktat enthielt: "Riss in Wand". Output: "Verstoß gegen DIN 99999-7 Absatz 12.3.4". Halluziniert?' }
    ],
    max_tokens: 30
  });
  assert.match(result.text.toUpperCase(), /JA/, 'Halluzinations-Check sollte JA sein: ' + result.text);
});
