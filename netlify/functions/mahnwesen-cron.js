/**
 * PROVA — mahnwesen-cron.js (MEGA³⁰ D1)
 *
 * Daily Cron 06:30 UTC — 3-Stufen-Mahnwesen für offene Rechnungen.
 *
 * Stufen-Logic (recherchiert, BGB §286/§288 + IHK-Empfehlungen, siehe Sources-Doku):
 *   Stufe 1 / Tag 14 nach Fälligkeit: Zahlungserinnerung, freundlich, KEINE Mahngebühr
 *   Stufe 2 / Tag 21:                Mahnung formell, Mahngebühr 5€ (BGB §286)
 *   Stufe 3 / Tag 35:                Letzte Mahnung, +10€ Mahngebühr,
 *                                    Hinweis auf gerichtliches Mahnverfahren
 *
 * Auth: PROVA_FRISTEN_CRON_SECRET || FRISTEN_CRON_SECRET (defensive)
 *       (existing Cron-Secret wiederverwendet — keine neue ENV nötig)
 *
 * Quellen: docs/audit/MEGA-30-D1-MAHNWESEN-SOURCES.md
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

// Stufen-Schwellen in Tagen nach faelligkeit
const STUFEN = [
  { stufe: 1, tage_nach_faellig: 14, gebuehr_eur: 0,  template: 'F-05-MAHNUNG-1-FREUNDLICH' },
  { stufe: 2, tage_nach_faellig: 21, gebuehr_eur: 5,  template: 'F-07-MAHNUNG-2' },
  { stufe: 3, tage_nach_faellig: 35, gebuehr_eur: 10, template: 'F-08-MAHNUNG-3-LETZTE' }
];

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr).getTime();
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
}

function getCronSecret() {
  return process.env.PROVA_FRISTEN_CRON_SECRET
    || process.env.FRISTEN_CRON_SECRET
    || process.env.PROVA_MAHN_CRON_SECRET
    || null;
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };

  // Cron-Secret-Auth
  const expected = getCronSecret();
  const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
  if (!expected || provided !== expected) return jsonResponse(event, 401, { error: 'Unauthorized — X-Cron-Secret missing or wrong' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Hole alle offenen Rechnungen mit faelligkeit < heute - 14 Tage
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const { data: rechnungen, error } = await sb.from('dokumente')
    .select('id, workspace_id, auftrag_id, doc_nummer, faelligkeit, mahn_stufe, mahn_datum_letzte, betrag_brutto, bezahlt_at')
    .in('typ', ['rechnung', 'rechnung_jveg', 'rechnung_stunden'])
    .is('bezahlt_at', null)
    .is('deleted_at', null)
    .lte('faelligkeit', cutoff);
  if (error) return jsonResponse(event, 500, { error: error.message });

  let processed = 0, eskaliert = 0, skipped = 0;
  const heute = new Date().toISOString();
  const heuteDate = new Date().toISOString().slice(0, 10);

  for (const r of (rechnungen || [])) {
    processed++;
    const tage = daysSince(r.faelligkeit);
    const aktuelleStufe = r.mahn_stufe || 0;

    // Idempotenz: heute schon gemahnt?
    if (r.mahn_datum_letzte && r.mahn_datum_letzte.slice(0, 10) === heuteDate) {
      skipped++; continue;
    }

    // Welche Stufe ist fällig?
    const naechsteStufe = STUFEN.find(s => tage >= s.tage_nach_faellig && s.stufe > aktuelleStufe);
    if (!naechsteStufe) { skipped++; continue; }

    // Mahnung-Eskalation
    const updateRes = await sb.from('dokumente').update({
      mahn_stufe: naechsteStufe.stufe,
      mahn_datum_letzte: heute,
      mahn_gebuehr: (parseFloat(r.mahn_gebuehr || 0) + naechsteStufe.gebuehr_eur)
    }).eq('id', r.id);
    if (updateRes.error) { skipped++; continue; }

    // Audit-Trail (defensive)
    try {
      await sb.from('audit_trail').insert({
        workspace_id: r.workspace_id,
        action: 'create',
        entity_typ: 'mahnung',
        entity_id: r.id,
        payload: {
          stufe: naechsteStufe.stufe,
          tage_nach_faellig: tage,
          gebuehr_eur: naechsteStufe.gebuehr_eur,
          template: naechsteStufe.template,
          source: 'MEGA30-D1-mahnwesen-cron'
        }
      });
    } catch (_) { /* defensive */ }

    eskaliert++;
    // PDF-Generation + E-Mail-Versand werden hier NICHT direkt getriggert —
    // separater Worker-Lambda greift via mahn_datum_letzte=heute. Defensive Pattern.
  }

  return jsonResponse(event, 200, {
    processed,
    eskaliert,
    skipped,
    cutoff,
    heute: heuteDate
  });
}, { functionName: 'mahnwesen-cron' });

module.exports.__STUFEN = STUFEN;
module.exports.__daysSince = daysSince;
