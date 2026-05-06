/**
 * PROVA — eintraege-jveg-export.js (MEGA³² W12b-I1 Schema-Reconciled)
 * GET ?auftrag_id=&from=&to=&stundensatz=
 * Output: HTML-Stundenzettel (PDF-tauglich) JVEG § 8/12 — abrechenbare Einträge × Dauer × Stundensatz.
 *
 * Schema (W12-I0 Audit): public.eintraege mit auftrag_id (NICHT schadensfall_id),
 * titel + content (NICHT beschreibung_text), typ ENUM (diktat|text|foto|mix).
 * Auftraege.az (NICHT aktenzeichen).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function eurFmt(n) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function deNum(n) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildHtml(opts) {
  const eintraege = opts.eintraege || [];
  const stundensatz = opts.stundensatz || 100; // JVEG § 9 default
  const az = opts.az || '—';
  const sv = opts.sv_name || '—';
  const fromTxt = opts.from || '—';
  const toTxt = opts.to || '—';

  const rows = eintraege.map(function (e) {
    const dauerMin = parseInt(e.dauer_min || 0, 10);
    const stunden = dauerMin / 60;
    const betrag = stunden * stundensatz;
    // Schema (W12-I0): titel + content statt beschreibung_text, typ ENUM statt eintrag_typ
    const beschreibung = (e.titel || '') + (e.content && e.content !== e.titel ? ' — ' + e.content : '');
    return {
      datum: e.datum || '',
      typ: e.typ || e.eintrag_typ || '',
      beschreibung: beschreibung,
      dauer_min: dauerMin,
      stunden: stunden,
      betrag: betrag
    };
  });

  const totalMin = rows.reduce(function (a, b) { return a + b.dauer_min; }, 0);
  const totalH = totalMin / 60;
  const totalBetrag = totalH * stundensatz;

  const rowsHtml = rows.map(function (r) {
    return '<tr><td>' + escHtml(r.datum) + '</td><td>' + escHtml(r.typ) +
      '</td><td>' + escHtml(r.beschreibung).substring(0, 200) +
      '</td><td style="text-align:right;font-family:monospace;">' + r.dauer_min +
      '</td><td style="text-align:right;font-family:monospace;">' + deNum(r.stunden) +
      '</td><td style="text-align:right;font-family:monospace;">' + eurFmt(r.betrag) + '</td></tr>';
  }).join('');

  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Stundenzettel ' + escHtml(az) + '</title>' +
    '<style>body{font-family:system-ui,sans-serif;color:#1f2937;font-size:11pt;padding:20mm;}h1{font-size:16pt;color:#1e3a8a;}' +
    'table{width:100%;border-collapse:collapse;margin-top:6mm;}th,td{padding:3mm 4mm;border-bottom:1px solid #e5e7eb;text-align:left;}' +
    'th{background:#f3f4f6;font-size:9pt;text-transform:uppercase;letter-spacing:.05em;}tfoot td{font-weight:700;background:#fff7ed;}' +
    '.meta{font-size:9pt;color:#6b7280;margin-bottom:4mm;}.law{font-family:monospace;color:#4f8ef7;}</style></head><body>' +
    '<h1>Stundenzettel — JVEG <span class="law">§ 8/12</span></h1>' +
    '<div class="meta"><strong>Sachverständiger:</strong> ' + escHtml(sv) + ' &nbsp;·&nbsp; <strong>Aktenzeichen:</strong> ' + escHtml(az) +
    ' &nbsp;·&nbsp; <strong>Zeitraum:</strong> ' + escHtml(fromTxt) + ' bis ' + escHtml(toTxt) +
    ' &nbsp;·&nbsp; <strong>Stundensatz (JVEG § 9):</strong> ' + eurFmt(stundensatz) + '/h</div>' +
    '<table><thead><tr><th>Datum</th><th>Typ</th><th>Beschreibung</th><th>Min</th><th>Std</th><th>Betrag</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '<tfoot><tr><td colspan="3">Summe</td><td style="text-align:right;font-family:monospace;">' + totalMin +
    '</td><td style="text-align:right;font-family:monospace;">' + deNum(totalH) +
    '</td><td style="text-align:right;font-family:monospace;">' + eurFmt(totalBetrag) + '</td></tr></tfoot></table>' +
    '<p style="margin-top:8mm;font-size:9pt;color:#6b7280;"><span class="law">JVEG § 12 Abs. 1 Nr. 1</span>: Die Vergütung des Sachverständigen für seine Leistung wird nach Stundensätzen gewährt.</p>' +
    '</body></html>';
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'eintraege-jveg-export' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const q = event.queryStringParameters || {};
  // Backwards-Compat: alte Frontends senden noch schadensfall_id
  const auftragId = q.auftrag_id || q.schadensfall_id;
  if (!auftragId) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    let query = sb.from('eintraege')
      .select('id, datum, typ, titel, content, dauer_min, abrechenbar')
      .eq('auftrag_id', auftragId)
      .eq('abrechenbar', true)
      .is('deleted_at', null)
      .order('datum', { ascending: true });
    if (q.from) query = query.gte('datum', q.from);
    if (q.to) query = query.lte('datum', q.to);
    const { data: eintraege, error } = await query;
    if (error) return jsonResponse(event, 500, { error: error.message });

    const { data: fall } = await sb.from('auftraege').select('az').eq('id', auftragId).maybeSingle();

    const stundensatz = parseFloat(q.stundensatz || 100);
    const html = buildHtml({
      eintraege: eintraege || [],
      stundensatz: stundensatz,
      az: (fall && fall.az) || auftragId,
      sv_name: context.userEmail || '—',
      from: q.from || (eintraege && eintraege[0] ? eintraege[0].datum : '—'),
      to: q.to || (eintraege && eintraege.length ? eintraege[eintraege.length - 1].datum : '—')
    });

    return {
      statusCode: 200,
      headers: Object.assign({}, getCorsHeaders(event), {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="stundenzettel-' + auftragId + '.html"'
      }),
      body: html
    };
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-jveg-export' });

module.exports.__buildHtml = buildHtml;
