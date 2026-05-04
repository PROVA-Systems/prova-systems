/**
 * PROVA — generate-pdf-mode-c.js (Mode-C PDF-Generation, MVP)
 * MEGA¹⁷ W52 (2026-05-08)
 *
 * Status: STUB mit echter Interpolation, aber OHNE PDF-Konvertierung.
 *
 * GET /netlify/functions/generate-pdf-mode-c?auftrag_id=<uuid>
 *   → Lade Auftrag + zugehoerige user_vorlage + kontakte (auftraggeber)
 *   → Apply variable_mapping → returnt interpolated_html
 *   → Frontend zeigt Vorschau-Modal mit interpoliertem HTML
 *
 * TODO (Marcel-Decision pflicht):
 *   PDF-Service-Wahl:
 *     A) DocRaptor (~99$/mo, einfach, HTML→PDF API)
 *     B) Gotenberg (self-host, kostenlos, Container-Setup)
 *     C) Cloud-Puppeteer (z.B. Browserless, ~50$/mo)
 *     D) PDFMonkey: passt nicht, Template-driven, nicht fuer User-HTML
 *
 * Anti-Pattern vermieden:
 *   - KEINE PDF-Generation ohne Marcel-OK fuer Service
 *   - RLS via Supabase (auth-gated)
 *   - Variable-Werte werden HTML-escaped (XSS-Defense in interpolateHtml)
 *   - Pure Logic in lib/prova-mode-c.js (testbar)
 */
'use strict';

const path = require('node:path');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

// ProvaModeC-Library laden (UMD-Pattern: module.exports im Browser-File)
let _modeCLib = null;
function _getModeCLib() {
  if (_modeCLib) return _modeCLib;
  // require lib/prova-mode-c.js. Pfad relativ zu netlify/functions
  _modeCLib = require(path.join(__dirname, '..', '..', 'lib', 'prova-mode-c.js'));
  return _modeCLib;
}

/**
 * Baut den dataContext fuer die Mapping-Auflösung.
 * @param {Object} auftrag — Row aus auftraege
 * @param {Object|null} kunde — Row aus kontakte (optional)
 * @param {Object|null} svUser — User-Profile fuer SV-Felder (optional)
 */
function buildDataContext(auftrag, kunde, svUser) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  return {
    akte: {
      az: auftrag.az || '',
      titel: auftrag.titel || '',
      fragestellung: auftrag.fragestellung || '',
      schadensart_label: auftrag.schadensart_label || '',
      auftragsdatum: auftrag.auftragsdatum || '',
      gutachtendatum: auftrag.gutachtendatum || '',
      schadensstichtag: auftrag.schadensstichtag || '',
      kosten_geschaetzt_brutto: auftrag.kosten_geschaetzt_brutto != null
        ? Number(auftrag.kosten_geschaetzt_brutto).toFixed(2) + ' €'
        : '',
      kosten_geschaetzt_netto: auftrag.kosten_geschaetzt_netto != null
        ? Number(auftrag.kosten_geschaetzt_netto).toFixed(2) + ' €'
        : '',
      objekt: auftrag.objekt || {}
    },
    kunde: kunde ? {
      name: kunde.name || '',
      adresse: kunde.strasse || '',
      plz: kunde.plz || '',
      ort: kunde.ort || '',
      email: kunde.email || '',
      telefon: kunde.telefon || ''
    } : { name: '', adresse: '', plz: '', ort: '', email: '', telefon: '' },
    sv: svUser ? {
      name: svUser.name || '',
      titel: svUser.titel || '',
      kanzlei: svUser.kanzlei || '',
      adresse: svUser.adresse || '',
      email: svUser.email || ''
    } : { name: '', titel: '', kanzlei: '', adresse: '', email: '' },
    system: {
      heute: dd + '.' + mm + '.' + yyyy,
      jahr: String(yyyy)
    }
  };
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  const userId = context.userId || context.user_id || null;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (!userId) {
    return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: 'no user_id' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed', allowed: ['GET'] }) };
  }

  const auftragId = event.queryStringParameters && event.queryStringParameters.auftrag_id;
  if (!auftragId || !/^[0-9a-f-]{36}$/i.test(auftragId)) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid auftrag_id' }) };
  }

  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  try {
    // 1) Auftrag laden (RLS schuetzt cross-workspace)
    const { data: auftrag, error: aErr } = await sb.from('auftraege')
      .select('id, az, titel, fragestellung, schadensart_label, auftragsdatum, gutachtendatum, schadensstichtag, kosten_geschaetzt_brutto, kosten_geschaetzt_netto, objekt, vorlage_id, workspace_id')
      .eq('id', auftragId)
      .maybeSingle();
    if (aErr) {
      if (/does not exist|column.*vorlage_id/i.test(aErr.message)) {
        return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'auftraege.vorlage_id-column not migrated', migration: '09_auftraege_vorlage.sql' }) };
      }
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'auftrag load failed', detail: aErr.message }) };
    }
    if (!auftrag) {
      return { statusCode: 404, headers: baseHeaders, body: JSON.stringify({ error: 'Auftrag nicht gefunden' }) };
    }
    if (!auftrag.vorlage_id) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Auftrag hat keine Mode-C-Vorlage' }) };
    }

    // 2) Vorlage laden (RLS via user_id)
    const { data: vorlage, error: vErr } = await sb.from('user_vorlagen')
      .select('id, name, parsed_html, variables, variable_mapping')
      .eq('id', auftrag.vorlage_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (vErr || !vorlage) {
      return { statusCode: 404, headers: baseHeaders, body: JSON.stringify({ error: 'Vorlage nicht gefunden oder geloescht' }) };
    }

    // 3) Optional: Auftraggeber laden
    let kunde = null;
    try {
      const { data: kunden } = await sb.from('kontakte')
        .select('name, strasse, plz, ort, email, telefon')
        .eq('workspace_id', auftrag.workspace_id)
        .limit(1);
      kunde = (kunden && kunden[0]) || null;
    } catch (_) { /* optional */ }

    // 4) Optional: SV-Profil laden (best-effort)
    let svUser = null;
    try {
      const { data: u } = await sb.from('users')
        .select('name, email, sv_titel, sv_kanzlei, sv_adresse')
        .eq('id', userId)
        .maybeSingle();
      if (u) {
        svUser = {
          name: u.name || '',
          email: u.email || '',
          titel: u.sv_titel || '',
          kanzlei: u.sv_kanzlei || '',
          adresse: u.sv_adresse || ''
        };
      }
    } catch (_) { /* optional */ }

    // 5) Interpolation
    const dataContext = buildDataContext(auftrag, kunde, svUser);
    const lib = _getModeCLib();
    const result = lib.interpolateHtml(
      vorlage.parsed_html || '',
      vorlage.variable_mapping || {},
      dataContext
    );

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({
        ok: true,
        auftrag_id: auftrag.id,
        az: auftrag.az,
        vorlage_id: vorlage.id,
        vorlage_name: vorlage.name,
        interpolated_html: result.html,
        applied: result.applied,
        missing: result.missing,
        // PDF-Generation TODO: Marcel-Decision pflicht (DocRaptor / Gotenberg / Cloud-Puppeteer)
        todo: 'pdf-service',
        pdf_service_options: ['docraptor', 'gotenberg', 'puppeteer-cloud']
      })
    };
  } catch (e) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
  }
}), { functionName: 'generate-pdf-mode-c' });

// Test-Exports
exports._test = {
  buildDataContext
};
