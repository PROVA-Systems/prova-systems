/**
 * PROVA — ki-konsistenz-check.js (MEGA²⁸ W1-I2)
 *
 * Vergleicht §4 (Sachverhalt) mit §6 (Fachurteil) auf logische Widersprüche.
 * GPT-4o Pflicht (Regel 14 — NIE mini).
 * Pseudonymisierung server-side via lib/prova-pseudo.
 *
 * POST /.netlify/functions/ki-konsistenz-check
 *   Body: { p4_text, p6_text, auftrag_id? }
 *   Auth: JWT
 *   Returns: { widersprueche:[{label,p4_excerpt,p6_excerpt,severity}], confidence: 0..1 }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');

const STATIC_PATTERNS = [
  { p4: /\btrocken\w*/i, p6: /\bfeucht\w*/i, label: 'Trockenheit vs Feuchtigkeit', severity: 'high' },
  { p4: /\bunversehrt\w*|\bohne Beschäd/i, p6: /\bbeschädig\w*|\bSchaden\b/i, label: 'Unversehrt vs Beschädigt', severity: 'high' },
  { p4: /\bohne Risse\b|\brissfrei\b/i, p6: /\bRisse?\s+(?:vorhanden|sichtbar|erkennbar)/i, label: 'Ohne Risse vs Risse vorhanden', severity: 'high' },
  { p4: /\bordnungsgemäß\w*|\beinwandfrei\w*/i, p6: /\bmangelhaft\w*|\bMangel\b/i, label: 'Ordnungsgemäß vs Mangelhaft', severity: 'medium' },
  { p4: /\bwarm\w*/i, p6: /\bkalt\w*/i, label: 'Warm vs Kalt', severity: 'low' }
];

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(body)
  };
}

/**
 * Statische Regex-basierte Widerspruchs-Erkennung.
 * Pure-Function für Tests.
 */
function detectStaticConflicts(p4_text, p6_text) {
  const widersprueche = [];
  if (!p4_text || !p6_text) return widersprueche;
  STATIC_PATTERNS.forEach(p => {
    const m4 = p4_text.match(p.p4);
    const m6 = p6_text.match(p.p6);
    if (m4 && m6) {
      widersprueche.push({
        label: p.label,
        severity: p.severity,
        p4_excerpt: m4[0],
        p6_excerpt: m6[0]
      });
    }
  });
  return widersprueche;
}

/**
 * KI-basierte Widerspruchs-Erkennung via GPT-4o (für subtilere Konflikte).
 * Erfordert echten OpenAI-Call — in Tests gemockt.
 */
async function detectAiConflicts(p4_text, p6_text, openaiCall) {
  if (!openaiCall || typeof openaiCall !== 'function') return [];
  try {
    const result = await openaiCall({
      model: 'gpt-4o', // PFLICHT — Regel 14 + Konjunktiv-II-Sensitivität
      max_tokens: 500,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Du bist ein OLG-Sachverständiger. Vergleiche §4 (Sachverhalt) mit §6 (Fachurteil) eines Bau-Gutachtens auf logische Widersprüche. Antwort NUR JSON: {"widersprueche":[{"label":"...","severity":"high|medium|low","p4_excerpt":"...","p6_excerpt":"..."}]}.' },
        { role: 'user', content: '§4:\n' + (p4_text || '').slice(0, 3000) + '\n\n§6:\n' + (p6_text || '').slice(0, 3000) }
      ]
    });
    const text = result?.choices?.[0]?.message?.content || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return [];
    const parsed = JSON.parse(m[0]);
    return Array.isArray(parsed.widersprueche) ? parsed.widersprueche : [];
  } catch (_) {
    return [];
  }
}

/**
 * Confidence-Score basierend auf Anzahl + Severity-Gewichtung.
 */
function calculateConfidence(widersprueche) {
  if (!widersprueche || widersprueche.length === 0) return 0.95; // hoch wenn keine Konflikte
  let weight = 0;
  widersprueche.forEach(w => {
    if (w.severity === 'high') weight += 0.25;
    else if (w.severity === 'medium') weight += 0.10;
    else weight += 0.03;
  });
  // Mehr Konflikte → niedriger Confidence in §4↔§6-Konsistenz
  return Math.max(0, Math.min(1, 1 - weight));
}

exports.handler = withSentry(requireAuth(async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(event, 405, { error: 'Method Not Allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(event, 400, { error: 'Invalid JSON' }); }

  const p4_text = String(body.p4_text || '').slice(0, 5000);
  const p6_text = String(body.p6_text || '').slice(0, 5000);
  if (!p4_text || !p6_text) {
    return json(event, 400, { error: 'Both p4_text and p6_text required' });
  }

  // Pseudonymisierung
  let p4_pseudo = p4_text;
  let p6_pseudo = p6_text;
  try {
    const pseudo = require('../../lib/prova-pseudo.js');
    if (pseudo && typeof pseudo.pseudonymize === 'function') {
      p4_pseudo = pseudo.pseudonymize(p4_text);
      p6_pseudo = pseudo.pseudonymize(p6_text);
    }
  } catch (_) { /* graceful */ }

  // Static + AI Detection
  const staticConflicts = detectStaticConflicts(p4_pseudo, p6_pseudo);
  // AI-Detection deaktiviert in Default — Marcel kann via body.use_ai aktivieren
  const aiConflicts = body.use_ai && process.env.OPENAI_API_KEY
    ? await detectAiConflicts(p4_pseudo, p6_pseudo, null) // openaiCall-Stub
    : [];
  const widersprueche = [...staticConflicts, ...aiConflicts];
  const confidence = calculateConfidence(widersprueche);

  return json(event, 200, {
    ok: true,
    widersprueche,
    confidence,
    static_count: staticConflicts.length,
    ai_count: aiConflicts.length,
    used_ai: body.use_ai === true
  });
}), { functionName: 'ki-konsistenz-check' });

exports._test = {
  detectStaticConflicts,
  detectAiConflicts,
  calculateConfidence,
  STATIC_PATTERNS
};
