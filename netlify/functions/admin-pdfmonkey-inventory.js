/**
 * PROVA — admin-pdfmonkey-inventory.js (MEGA⁴¹ P9)
 *
 * GET /admin-pdfmonkey-inventory
 * → 200 {
 *     pdfmonkey_templates: [{id, identifier, app_id, name, ...}],
 *     supabase_templates:  [{id, code, name, pdfmonkey_template_id, ...}],
 *     drift: {
 *       missing_in_supabase: [...],   // PDFMonkey hat, Supabase nicht
 *       missing_in_pdfmonkey: [...],  // Supabase referenziert, PDFMonkey hat nicht
 *       matched: [...]                // Beide haben (mit IDs)
 *     },
 *     compliance: {
 *       407a_blocks: <count>,         // Templates mit '407a' im Body
 *       ai_act_disclosure: <count>,   // Templates mit 'EU AI Act' im Body
 *       gpt4o_references: <count>     // Templates mit 'gpt-4o' (deprecated!)
 *     }
 *   }
 *
 * Live-Inventur via PDFMonkey-API + Drift-Check gegen dokument_templates-Tabelle.
 *
 * Auth: requireAdmin + 2FA. PDFMONKEY_API_KEY ENV-Var pflicht.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const PDFMONKEY_API_BASE = 'https://api.pdfmonkey.io/api/v1';
const COMPLIANCE_REGEX = {
  '407a_blocks':       /§\s*407a|407a\s*ZPO/i,
  'ai_act_disclosure': /EU\s*AI\s*Act|VO\s*2024\/1689|Verordnung.*1689/i,
  'gpt4o_references':  /gpt-4o\b/i  // deprecated — Code-Smell
};

async function _fetchPdfMonkeyTemplates(apiKey) {
  if (!apiKey) return { ok: false, error: 'PDFMONKEY_API_KEY fehlt', templates: [] };
  try {
    const res = await fetch(PDFMONKEY_API_BASE + '/document_templates?per_page=100', {
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status, templates: [] };
    const data = await res.json();
    return { ok: true, templates: data.document_templates || data.templates || [] };
  } catch (e) {
    return { ok: false, error: e.message, templates: [] };
  }
}

function computeDrift(pdfmonkeyTemplates, supabaseTemplates) {
  const pdfMap = {};
  pdfmonkeyTemplates.forEach(t => { pdfMap[t.id || t.identifier] = t; });

  const sbMap = {};
  supabaseTemplates.forEach(t => {
    if (t.pdfmonkey_template_id) sbMap[t.pdfmonkey_template_id] = t;
  });

  const missing_in_supabase = [];
  const missing_in_pdfmonkey = [];
  const matched = [];

  // PDFMonkey-IDs die nicht in Supabase referenziert sind
  Object.keys(pdfMap).forEach(pid => {
    if (!sbMap[pid]) missing_in_supabase.push({ pdfmonkey_id: pid, name: pdfMap[pid].identifier || pdfMap[pid].name });
  });

  // Supabase-Refs die in PDFMonkey nicht existieren
  Object.keys(sbMap).forEach(pid => {
    if (!pdfMap[pid]) missing_in_pdfmonkey.push({ supabase_code: sbMap[pid].code, pdfmonkey_id: pid });
    else matched.push({ supabase_code: sbMap[pid].code, pdfmonkey_id: pid, pdfmonkey_name: pdfMap[pid].identifier || pdfMap[pid].name });
  });

  return { missing_in_supabase, missing_in_pdfmonkey, matched };
}

function computeCompliance(pdfmonkeyTemplates) {
  const result = { '407a_blocks': 0, 'ai_act_disclosure': 0, 'gpt4o_references': 0 };
  const failures = { '407a_blocks': [], 'ai_act_disclosure': [], 'gpt4o_references': [] };
  pdfmonkeyTemplates.forEach(t => {
    const body = (t.body || '') + ' ' + (t.identifier || '') + ' ' + (t.name || '');
    Object.keys(COMPLIANCE_REGEX).forEach(key => {
      if (COMPLIANCE_REGEX[key].test(body)) {
        result[key]++;
        if (key === 'gpt4o_references') failures[key].push(t.identifier || t.id);
      }
    });
  });
  return { counts: result, gpt4o_violations: failures.gpt4o_references };
}

exports.handler = withSentry(requireAdmin(async function (event) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const apiKey = process.env.PDFMONKEY_API_KEY;

  try {
    // Parallel: PDFMonkey-Templates + Supabase-Templates
    const [pdfRes, sbRes] = await Promise.all([
      _fetchPdfMonkeyTemplates(apiKey),
      sb.from('dokument_templates').select('id, code, name, typ, pdfmonkey_template_id').order('code', { ascending: true })
    ]);

    const pdfmonkeyTemplates = pdfRes.templates || [];
    const supabaseTemplates = sbRes.data || [];

    const drift = computeDrift(pdfmonkeyTemplates, supabaseTemplates);
    const compliance = computeCompliance(pdfmonkeyTemplates);

    return jsonResponse(event, 200, {
      fetched_at: new Date().toISOString(),
      pdfmonkey: {
        ok: pdfRes.ok,
        error: pdfRes.error || null,
        count: pdfmonkeyTemplates.length,
        templates: pdfmonkeyTemplates.map(t => ({
          id: t.id, identifier: t.identifier, name: t.name, app_id: t.app_id
        }))
      },
      supabase: {
        count: supabaseTemplates.length,
        templates: supabaseTemplates
      },
      drift: drift,
      compliance: {
        counts: compliance.counts,
        gpt4o_violations: compliance.gpt4o_violations,
        all_have_407a: compliance.counts['407a_blocks'] >= supabaseTemplates.filter(t => /gutachten|stellungnahme/i.test(t.typ || '')).length,
        gpt4o_must_be_zero: compliance.gpt4o_violations.length === 0
      }
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}, { functionName: 'admin-pdfmonkey-inventory', rateLimit: { max: 10, windowSec: 60 }, require2FA: true }), { functionName: 'admin-pdfmonkey-inventory' });

module.exports.__internals = {
  computeDrift,
  computeCompliance,
  COMPLIANCE_REGEX,
  PDFMONKEY_API_BASE
};
