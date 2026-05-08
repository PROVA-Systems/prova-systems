#!/usr/bin/env node
/**
 * PROVA — pdfmonkey-audit-runner.js (MEGA⁴² P6)
 *
 * Live-Audit der PDFMonkey-Templates:
 *   1. Inventarisiert alle PDFMonkey-Templates
 *   2. Vergleicht mit dokument_templates-Tabelle in Supabase
 *   3. Checkt §407a + EU AI Act + gpt-4o-Compliance
 *   4. Listet Drift (missing_in_supabase / missing_in_pdfmonkey)
 *   5. Optional: führt Test-Render gegen alle Templates durch
 *
 * Run lokal:
 *   PDFMONKEY_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *     node scripts/pdfmonkey-audit-runner.js
 *
 * Run via Lambda (Production):
 *   curl -H "Authorization: Bearer ${ADMIN_TOKEN}" \
 *        https://prova-systems.de/.netlify/functions/admin-pdfmonkey-inventory
 */
'use strict';

const PDFMONKEY_API_BASE = 'https://api.pdfmonkey.io/api/v1';

async function fetchTemplates(apiKey) {
  if (!apiKey) {
    console.error('❌ PDFMONKEY_API_KEY ENV-Var nicht gesetzt');
    return { ok: false, error: 'no api-key', templates: [] };
  }
  try {
    const r = await fetch(PDFMONKEY_API_BASE + '/document_templates?per_page=100', {
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
    });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, templates: [] };
    const data = await r.json();
    return { ok: true, templates: data.document_templates || data.templates || [] };
  } catch (e) {
    return { ok: false, error: e.message, templates: [] };
  }
}

async function fetchSupabaseTemplates(url, key) {
  if (!url || !key) return { ok: false, error: 'no supabase config', templates: [] };
  try {
    const r = await fetch(url + '/rest/v1/dokument_templates?select=*', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, templates: [] };
    return { ok: true, templates: await r.json() };
  } catch (e) {
    return { ok: false, error: e.message, templates: [] };
  }
}

function computeDrift(pdfmonkey, supabase) {
  const pdfIds = new Set(pdfmonkey.map(t => t.id));
  const sbRefs = new Set(supabase.filter(t => t.pdfmonkey_template_id).map(t => t.pdfmonkey_template_id));

  return {
    missing_in_supabase: pdfmonkey.filter(t => !sbRefs.has(t.id)).map(t => ({ id: t.id, name: t.identifier || t.name })),
    missing_in_pdfmonkey: supabase.filter(t => t.pdfmonkey_template_id && !pdfIds.has(t.pdfmonkey_template_id))
      .map(t => ({ id: t.pdfmonkey_template_id, code: t.code, name: t.name })),
    matched: pdfmonkey.filter(t => sbRefs.has(t.id)).length
  };
}

function checkCompliance(pdfmonkeyTemplates) {
  const COMPLIANCE = {
    '407a': /§\s*407a|407a\s*ZPO/i,
    'ai_act': /EU\s*AI\s*Act|VO\s*2024\/1689/i,
    'gpt4o_smell': /gpt-4o\b/i
  };
  const results = { '407a_count': 0, 'ai_act_count': 0, 'gpt4o_count': 0, 'gpt4o_offenders': [] };
  for (const t of pdfmonkeyTemplates) {
    const body = (t.body || '') + ' ' + (t.identifier || '') + ' ' + (t.name || '');
    if (COMPLIANCE['407a'].test(body)) results['407a_count']++;
    if (COMPLIANCE['ai_act'].test(body)) results['ai_act_count']++;
    if (COMPLIANCE['gpt4o_smell'].test(body)) {
      results['gpt4o_count']++;
      results['gpt4o_offenders'].push(t.identifier || t.name || t.id);
    }
  }
  return results;
}

async function main() {
  const t0 = Date.now();
  const apiKey = process.env.PDFMONKEY_API_KEY;
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('PROVA PDFMonkey-Audit-Runner (M⁴² P6)');
  console.log('Datum:', new Date().toISOString());
  console.log('');

  // 1. Fetch PDFMonkey Templates
  console.log('⏳ Lade PDFMonkey-Templates …');
  const pdf = await fetchTemplates(apiKey);
  if (!pdf.ok) {
    console.log('❌ PDFMonkey-API: ' + pdf.error);
    process.exit(1);
  }
  console.log(`✅ ${pdf.templates.length} PDFMonkey-Templates geladen`);

  // 2. Fetch Supabase Templates
  console.log('⏳ Lade Supabase dokument_templates …');
  const sb = await fetchSupabaseTemplates(sbUrl, sbKey);
  if (!sb.ok) {
    console.log('⚠ Supabase: ' + sb.error + ' — Drift-Check skipped');
  } else {
    console.log(`✅ ${sb.templates.length} Supabase-Templates geladen`);
  }

  // 3. Drift
  if (sb.ok) {
    const drift = computeDrift(pdf.templates, sb.templates);
    console.log('');
    console.log('=== DRIFT ===');
    console.log(`  Matched:               ${drift.matched}`);
    console.log(`  Missing in Supabase:   ${drift.missing_in_supabase.length}`);
    console.log(`  Missing in PDFMonkey:  ${drift.missing_in_pdfmonkey.length}`);
    if (drift.missing_in_supabase.length) {
      console.log('  Details (PDFMonkey hat, Supabase nicht):');
      drift.missing_in_supabase.slice(0, 10).forEach(t => console.log('    - ' + t.name + ' (' + t.id + ')'));
    }
    if (drift.missing_in_pdfmonkey.length) {
      console.log('  Details (Supabase referenziert, PDFMonkey nicht):');
      drift.missing_in_pdfmonkey.slice(0, 10).forEach(t => console.log('    - ' + t.code + ' → ' + t.id));
    }
  }

  // 4. Compliance
  console.log('');
  console.log('=== COMPLIANCE ===');
  const cmp = checkCompliance(pdf.templates);
  console.log(`  §407a-Blocks:          ${cmp['407a_count']}/${pdf.templates.length}`);
  console.log(`  EU-AI-Act-Disclosures: ${cmp['ai_act_count']}/${pdf.templates.length}`);
  console.log(`  gpt-4o References (Code-Smell): ${cmp['gpt4o_count']}`);
  if (cmp['gpt4o_offenders'].length) {
    console.log('  Offenders:');
    cmp['gpt4o_offenders'].forEach(t => console.log('    ❌ ' + t));
  }

  console.log('');
  console.log(`Audit fertig in ${Date.now() - t0}ms`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { fetchTemplates, fetchSupabaseTemplates, computeDrift, checkCompliance };
