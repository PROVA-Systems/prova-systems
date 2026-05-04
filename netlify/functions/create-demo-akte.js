/**
 * PROVA — create-demo-akte.js (Welcome-Wizard Step 4)
 * MEGA²⁰ W87 (2026-05-08)
 *
 * Marcel-Decision D2: Pseudo-Akte mit is_demo-Flag.
 * Echte Akte in `auftraege` mit `is_template = TRUE` (existing column,
 * wir wiederverwenden statt neue zu erstellen — siehe Audit C1).
 *
 * Anmerkung: Die existing `auftraege.is_template` Spalte (Migration 02)
 * ist semantisch nahe (Vorlagen-Flag). Marcel kann spaeter zu einer
 * dedizierten `is_demo` Spalte migrieren (MEGA²² Final-Audit).
 *
 * POST /netlify/functions/create-demo-akte
 *   Body: {} (leer — Lambda kennt User-Context)
 *   → erstellt 1 Demo-Akte mit Beispiel-Daten
 *   → returnt: { ok, auftrag_id, az }
 *
 * Idempotenz: Wenn User schon eine Demo-Akte hat (is_template=TRUE +
 * tags enthaelt 'demo'), wird KEINE neue erstellt — die existing
 * zurueckgegeben.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const DEMO_AKTE_DEFAULTS = {
  typ: 'schadensgutachten',
  status: 'entwurf',
  zweck: 'privat',
  phase_aktuell: 1,
  phase_max: 9,
  titel: '🎭 Demo-Akte: Feuchteschaden Mietwohnung',
  schadensart_label: 'Feuchteschaden / Schimmel',
  schadensart_kategorie: 'feuchte',
  fragestellung: 'Beispiel-Fragestellung: Liegt ein bauseitiger Feuchteschaden vor und wer ist verantwortlich?',
  schadensstichtag: null,  // wird im Code gesetzt
  auftragsdatum: null,     // wird im Code gesetzt
  objekt: {
    adresse: 'Musterstrasse 12',
    plz: '50667',
    ort: 'Köln',
    objektart: 'Mehrfamilienhaus',
    objektart_label: 'Mietwohnung 3. OG',
    baujahr: 1985,
    wohnflaeche: 78,
    schadensort: 'Aussenwand-Ecke Schlafzimmer'
  },
  details: {
    schadensbild: 'Schwarzer Schimmelbefall auf Aussenwand-Ecke, ca. 0,5 m². Tapete teilweise abgeloest.',
    vorgeschichte: 'Bewohner heizt nach eigener Aussage selten — Beispiel-Hinweis fuer Demo-Workflow.',
    vorgehen: 'Demo-Akte: Ortstermin durchfuehren, Befunde aufnehmen, KI-Strukturhilfe nutzen.'
  },
  tags: ['demo', 'onboarding-wizard'],
  is_template: true,                              // Marcel-D2: vorlaeufiger Demo-Marker
  kosten_geschaetzt_brutto: 850.00,
  kosten_geschaetzt_netto: 714.29,
  kosten_summe_card_label: 'Geschaetzter Sanierungsaufwand'
};

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  const userId = context.userId || context.user_id || null;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (!userId) {
    return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: 'no user_id' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed', allowed: ['POST'] }) };
  }

  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  try {
    // 1) Workspace via existing membership-Lookup
    const { data: ms, error: msErr } = await sb.from('workspace_memberships')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (msErr || !ms) {
      return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'no active workspace' }) };
    }
    const workspaceId = ms.workspace_id;

    // 2) Idempotenz: existing Demo-Akte fuer User?
    const { data: existing } = await sb.from('auftraege')
      .select('id, az')
      .eq('workspace_id', workspaceId)
      .eq('created_by_user_id', userId)
      .eq('is_template', true)
      .contains('tags', ['demo'])
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({
        ok: true,
        auftrag_id: existing.id,
        az: existing.az,
        existing: true,
        message: 'Demo-Akte bereits vorhanden'
      }) };
    }

    // 3) Datums-Fields setzen (heute - 7 Tage als Auftragsdatum, heute als Stichtag)
    const today = new Date();
    const sieben = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10);  // YYYY-MM-DD

    const insertData = Object.assign({}, DEMO_AKTE_DEFAULTS, {
      workspace_id: workspaceId,
      created_by_user_id: userId,
      auftragsdatum: fmt(sieben),
      schadensstichtag: fmt(today)
    });

    // 4) INSERT — generate_az() Trigger setzt az automatisch
    const { data: newAkte, error: insErr } = await sb.from('auftraege')
      .insert(insertData)
      .select('id, az')
      .single();

    if (insErr) {
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({
        error: 'demo-akte insert failed',
        detail: insErr.message
      }) };
    }

    // 5) Audit-Log fire-and-forget
    try {
      sb.from('audit_trail').insert({
        function_name: 'create-demo-akte',
        action: 'demo.akte.created',
        payload: {
          user_id: userId,
          workspace_id: workspaceId,
          auftrag_id: newAkte.id,
          az: newAkte.az
        },
        result: 'ok'
      }).then(() => {}).catch(() => {});
    } catch (_) { /* fire-and-forget */ }

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({
        ok: true,
        auftrag_id: newAkte.id,
        az: newAkte.az,
        existing: false,
        message: 'Demo-Akte erfolgreich erstellt'
      })
    };
  } catch (e) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
  }
}), { functionName: 'create-demo-akte' });

// Test-Exports
exports._test = { DEMO_AKTE_DEFAULTS };
