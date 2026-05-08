/**
 * PROVA — AI-Router (MEGA³⁰ A3)
 *
 * Standalone-Modul für Modell-Routing + Cost-Calc + Health-Check.
 * Extracted aus inline-Logic in ki-proxy.js.
 *
 * Public API:
 *   chooseModel(funktion, userMode)       → string Modell-Name
 *   getModelCost(modell, in, out, cached) → number EUR
 *   checkProviderHealth(provider)         → { ok, latency_ms, cached }
 *   MODEL_MAP                             → object Funktion → OpenAI-Modell
 *   BACKUP_MAP                            → object Funktion → Anthropic-Modell
 *
 * Quellen für Pricing: KI-PROMPTS-MASTER.md (W3-I0 Modell-Update 10.05.2026)
 */
'use strict';

// ── OpenAI Modell-Map (Soll-Stand: KI-PROMPTS-MASTER.md) ──────────────────────
const MODEL_MAP = {
  // Frontier (Konjunktiv-II / Compliance / Schwere Analyse)
  fachurteil_entwurf: 'gpt-5.5',
  pruefe_fachurteil:  'gpt-5.5',
  qualitaetspruefung: 'gpt-5.5',
  konsistenz_check:   'gpt-5.5',
  // Mid-Tier (Inline-Assist)
  assist_inline:      'gpt-5.4',
  // Light (Latency, mechanisch)
  freitext:           'gpt-5.4-mini',
  support_chat:       'gpt-5.4-mini',
  normen_picker:      'gpt-5.4-mini',
  foto_captioning:    'gpt-5.4-mini',
  diktat_strukturierung: 'gpt-5.4-mini', // MEGA³¹ D1: Diktat → §1-§5
  rechtschreibung_s1: 'gpt-5.4-mini',    // MEGA³¹ A3: S1 Sprache
  absatz_s2:          'gpt-5.4',         // MEGA³¹ A3: S2 Struktur
  fachsprache_s3:     'gpt-5.4',         // MEGA³¹ A3: S3 Fachsprache
  // Whisper
  whisper:            'whisper-1'
};

// ── Anthropic Backup-Map ──────────────────────────────────────────────────────
const BACKUP_MAP = {
  fachurteil_entwurf: 'claude-opus-4-7',
  pruefe_fachurteil:  'claude-opus-4-7',
  qualitaetspruefung: 'claude-opus-4-7',
  konsistenz_check:   'claude-opus-4-7',
  assist_inline:      'claude-sonnet-4-6',
  freitext:           'claude-haiku-4-5-20251001',
  support_chat:       'claude-haiku-4-5-20251001',
  normen_picker:      'claude-haiku-4-5-20251001',
  foto_captioning:    'claude-haiku-4-5-20251001'
};

// ── Pricing pro 1M Tokens (USD, KI-PROMPTS-MASTER) ──────────────────────────
// EUR-Konversion: ~0.92 (Stand 2026-Q1, defensive Schätzung)
const USD_TO_EUR = 0.92;
const PRICING = {
  // OpenAI
  'gpt-5.5':                    { in: 5.00,  out: 30.00, cached: 0.50 },
  'gpt-5.5-pro':                { in: 30.00, out: 180.00, cached: 3.00 },
  'gpt-5.4':                    { in: 2.50,  out: 15.00, cached: 0.25 },
  'gpt-5.4-mini':               { in: 0.40,  out: 1.60,  cached: 0.04 },
  'gpt-5.4-nano':               { in: 0.10,  out: 0.40,  cached: 0.01 },
  'whisper-1':                  { in: 0,     out: 0,     cached: 0 }, // pro-Minute
  // Anthropic
  'claude-opus-4-7':            { in: 15.00, out: 75.00, cached: 1.50 },
  'claude-sonnet-4-6':          { in: 3.00,  out: 15.00, cached: 0.30 },
  'claude-haiku-4-5-20251001':  { in: 0.80,  out: 4.00,  cached: 0.08 }
};

/**
 * chooseModel — wählt Modell für Funktion.
 *
 * @param {string} funktion - 'fachurteil_entwurf', 'assist_inline', etc.
 * @param {string} userMode - 'schnell' | 'praezise' (default 'schnell')
 * @returns {string} Modell-Name
 */
function chooseModel(funktion, userMode) {
  const mode = userMode === 'praezise' ? 'praezise' : 'schnell';
  // praezise-Modus eskaliert leichte Funktionen auf Frontier
  const lightFunktionen = ['freitext', 'support_chat', 'normen_picker', 'foto_captioning', 'diktat_strukturierung', 'rechtschreibung_s1'];
  if (mode === 'praezise' && lightFunktionen.includes(funktion)) {
    return MODEL_MAP.fachurteil_entwurf; // gpt-5.5
  }
  return MODEL_MAP[funktion] || MODEL_MAP.freitext;
}

/**
 * getModelCost — berechnet Kosten in EUR.
 *
 * @param {string} modell
 * @param {number} tokens_in
 * @param {number} tokens_out
 * @param {number} cached_tokens_in (für W4-Bonus Prompt-Caching)
 * @returns {number} EUR
 */
function getModelCost(modell, tokens_in, tokens_out, cached_tokens_in) {
  const p = PRICING[modell];
  if (!p) return 0;
  const tIn = parseInt(tokens_in || 0, 10);
  const tOut = parseInt(tokens_out || 0, 10);
  const tCached = parseInt(cached_tokens_in || 0, 10);
  const realTIn = Math.max(0, tIn - tCached);
  const usd = (realTIn * p.in / 1000000) + (tOut * p.out / 1000000) + (tCached * p.cached / 1000000);
  return Math.round(usd * USD_TO_EUR * 10000) / 10000; // 4 Nachkommastellen
}

/**
 * Backup-Modell für Anthropic-Fallback.
 */
function getBackupModel(funktion) {
  return BACKUP_MAP[funktion] || BACKUP_MAP.freitext;
}

// ── Health-Check (5-Min-Cache) ───────────────────────────────────────────────
const HEALTH_CACHE_MS = 5 * 60 * 1000;
const _healthCache = {};

async function checkProviderHealth(provider) {
  const now = Date.now();
  const cached = _healthCache[provider];
  if (cached && (now - cached.at) < HEALTH_CACHE_MS) {
    return Object.assign({ cached: true }, cached.result);
  }

  const fetch = global.fetch;
  const t0 = Date.now();
  let url, opts = {};

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/models';
    opts.headers = { 'Authorization': 'Bearer ' + (process.env.OPENAI_API_KEY || '') };
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    opts.method = 'POST';
    opts.headers = {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    };
    opts.body = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
  } else {
    return { ok: false, latency_ms: 0, error: 'unknown provider', cached: false };
  }

  try {
    const res = await fetch(url, opts);
    const ms = Date.now() - t0;
    const result = { ok: res.status >= 200 && res.status < 500, latency_ms: ms, status: res.status };
    _healthCache[provider] = { at: now, result };
    return Object.assign({ cached: false }, result);
  } catch (e) {
    const result = { ok: false, latency_ms: Date.now() - t0, error: e.message };
    _healthCache[provider] = { at: now, result };
    return Object.assign({ cached: false }, result);
  }
}

function _resetHealthCache() { Object.keys(_healthCache).forEach(k => delete _healthCache[k]); }

module.exports = {
  chooseModel,
  getModelCost,
  getBackupModel,
  checkProviderHealth,
  MODEL_MAP,
  BACKUP_MAP,
  PRICING,
  USD_TO_EUR,
  _resetHealthCache
};
