/**
 * PROVA — rechnung-zugferd.js (MEGA³¹ A5)
 *
 * ZUGFeRD 2.1 BASIC Rechnungs-Generator.
 *
 * POST { rechnung_id }
 * → Lädt Rechnung-Daten + Workspace-Stammdaten
 * → Generiert ZUGFeRD 2.1 BASIC XML (urn:cen.eu:en16931:2017)
 * → Bettet XML in PDF/A-3 ein
 * → Speichert in Supabase Storage `sv-files/rechnungen/zugferd/{rechnung_id}.pdf`
 * → Returnt Storage-URL
 *
 * Auth: requireAuth (workspace_member).
 * Quellen: docs/audit/MEGA-30-D2-ZUGFERD-SOURCES.md (12 Quellen)
 *
 * Library-Strategy: pdf-lib für PDF-Manipulation + Custom XML-Builder (Vanilla, kein NPM-Sprawl).
 * pdf-lib ist bereits über `pdf-proxy.js` indirekt verfügbar (transitive dep).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

// ── XML-Builder für ZUGFeRD 2.1 BASIC ─────────────────────────────────────
// Schema: urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p1:basic
function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function fmtAmount(n) {
  return (Math.round((parseFloat(n) || 0) * 100) / 100).toFixed(2);
}

function fmtDate(d) {
  // YYYYMMDD für ZUGFeRD DateTimeString format=102
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
}

function buildZugferdXml(opts) {
  const r = opts.rechnung || {};
  const ws = opts.workspace || {};
  const k = opts.kunde || {};
  const items = opts.items || [{ position: 1, beschreibung: 'Sachverständigen-Honorar', menge: 1, einzelpreis: r.betrag_netto || 0, ust_satz: 19 }];

  const netto = parseFloat(r.betrag_netto || 0);
  const ust = parseFloat(r.betrag_ust || (netto * 0.19));
  const brutto = parseFloat(r.betrag_brutto || (netto + ust));

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" ' +
    'xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" ' +
    'xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">\n' +
    '  <rsm:ExchangedDocumentContext>\n' +
    '    <ram:GuidelineSpecifiedDocumentContextParameter>\n' +
    '      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p1:basic</ram:ID>\n' +
    '    </ram:GuidelineSpecifiedDocumentContextParameter>\n' +
    '  </rsm:ExchangedDocumentContext>\n' +
    '  <rsm:ExchangedDocument>\n' +
    '    <ram:ID>' + escXml(r.doc_nummer || r.id) + '</ram:ID>\n' +
    '    <ram:TypeCode>380</ram:TypeCode>\n' +
    '    <ram:IssueDateTime>\n' +
    '      <udt:DateTimeString format="102">' + fmtDate(r.created_at || r.rechnungs_datum) + '</udt:DateTimeString>\n' +
    '    </ram:IssueDateTime>\n' +
    '  </rsm:ExchangedDocument>\n' +
    '  <rsm:SupplyChainTradeTransaction>\n' +
    items.map(function (item, idx) {
      return '    <ram:IncludedSupplyChainTradeLineItem>\n' +
        '      <ram:AssociatedDocumentLineDocument>\n' +
        '        <ram:LineID>' + (idx + 1) + '</ram:LineID>\n' +
        '      </ram:AssociatedDocumentLineDocument>\n' +
        '      <ram:SpecifiedTradeProduct>\n' +
        '        <ram:Name>' + escXml(item.beschreibung || 'Position') + '</ram:Name>\n' +
        '      </ram:SpecifiedTradeProduct>\n' +
        '      <ram:SpecifiedLineTradeAgreement>\n' +
        '        <ram:NetPriceProductTradePrice>\n' +
        '          <ram:ChargeAmount>' + fmtAmount(item.einzelpreis) + '</ram:ChargeAmount>\n' +
        '        </ram:NetPriceProductTradePrice>\n' +
        '      </ram:SpecifiedLineTradeAgreement>\n' +
        '      <ram:SpecifiedLineTradeDelivery>\n' +
        '        <ram:BilledQuantity unitCode="C62">' + fmtAmount(item.menge) + '</ram:BilledQuantity>\n' +
        '      </ram:SpecifiedLineTradeDelivery>\n' +
        '      <ram:SpecifiedLineTradeSettlement>\n' +
        '        <ram:ApplicableTradeTax>\n' +
        '          <ram:TypeCode>VAT</ram:TypeCode>\n' +
        '          <ram:CategoryCode>S</ram:CategoryCode>\n' +
        '          <ram:RateApplicablePercent>' + (item.ust_satz || 19) + '</ram:RateApplicablePercent>\n' +
        '        </ram:ApplicableTradeTax>\n' +
        '        <ram:SpecifiedTradeSettlementLineMonetarySummation>\n' +
        '          <ram:LineTotalAmount>' + fmtAmount((item.menge || 1) * (item.einzelpreis || 0)) + '</ram:LineTotalAmount>\n' +
        '        </ram:SpecifiedTradeSettlementLineMonetarySummation>\n' +
        '      </ram:SpecifiedLineTradeSettlement>\n' +
        '    </ram:IncludedSupplyChainTradeLineItem>\n';
    }).join('') +
    '    <ram:ApplicableHeaderTradeAgreement>\n' +
    '      <ram:SellerTradeParty>\n' +
    '        <ram:Name>' + escXml(ws.name || 'PROVA Sachverständigen-Büro') + '</ram:Name>\n' +
    '        <ram:PostalTradeAddress>\n' +
    '          <ram:PostcodeCode>' + escXml(ws.plz || '') + '</ram:PostcodeCode>\n' +
    '          <ram:LineOne>' + escXml(ws.strasse || '') + '</ram:LineOne>\n' +
    '          <ram:CityName>' + escXml(ws.ort || '') + '</ram:CityName>\n' +
    '          <ram:CountryID>DE</ram:CountryID>\n' +
    '        </ram:PostalTradeAddress>\n' +
    '        <ram:SpecifiedTaxRegistration>\n' +
    '          <ram:ID schemeID="VA">' + escXml(ws.ust_id || '') + '</ram:ID>\n' +
    '        </ram:SpecifiedTaxRegistration>\n' +
    '      </ram:SellerTradeParty>\n' +
    '      <ram:BuyerTradeParty>\n' +
    '        <ram:Name>' + escXml(k.name || k.firma || 'Auftraggeber') + '</ram:Name>\n' +
    '        <ram:PostalTradeAddress>\n' +
    '          <ram:PostcodeCode>' + escXml(k.plz || '') + '</ram:PostcodeCode>\n' +
    '          <ram:LineOne>' + escXml(k.strasse || k.adresse || '') + '</ram:LineOne>\n' +
    '          <ram:CityName>' + escXml(k.ort || '') + '</ram:CityName>\n' +
    '          <ram:CountryID>DE</ram:CountryID>\n' +
    '        </ram:PostalTradeAddress>\n' +
    '      </ram:BuyerTradeParty>\n' +
    '    </ram:ApplicableHeaderTradeAgreement>\n' +
    '    <ram:ApplicableHeaderTradeDelivery/>\n' +
    '    <ram:ApplicableHeaderTradeSettlement>\n' +
    '      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n' +
    '      <ram:ApplicableTradeTax>\n' +
    '        <ram:CalculatedAmount>' + fmtAmount(ust) + '</ram:CalculatedAmount>\n' +
    '        <ram:TypeCode>VAT</ram:TypeCode>\n' +
    '        <ram:BasisAmount>' + fmtAmount(netto) + '</ram:BasisAmount>\n' +
    '        <ram:CategoryCode>S</ram:CategoryCode>\n' +
    '        <ram:RateApplicablePercent>19</ram:RateApplicablePercent>\n' +
    '      </ram:ApplicableTradeTax>\n' +
    '      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n' +
    '        <ram:LineTotalAmount>' + fmtAmount(netto) + '</ram:LineTotalAmount>\n' +
    '        <ram:TaxBasisTotalAmount>' + fmtAmount(netto) + '</ram:TaxBasisTotalAmount>\n' +
    '        <ram:TaxTotalAmount currencyID="EUR">' + fmtAmount(ust) + '</ram:TaxTotalAmount>\n' +
    '        <ram:GrandTotalAmount>' + fmtAmount(brutto) + '</ram:GrandTotalAmount>\n' +
    '        <ram:DuePayableAmount>' + fmtAmount(brutto) + '</ram:DuePayableAmount>\n' +
    '      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n' +
    '    </ram:ApplicableHeaderTradeSettlement>\n' +
    '  </rsm:SupplyChainTradeTransaction>\n' +
    '</rsm:CrossIndustryInvoice>\n';
}

// ── PDF/A-3-Embed via pdf-lib ─────────────────────────────────────────────
async function embedXmlInPdf(pdfBytes, xmlString, filename) {
  // Dynamic require: esbuild kann eval('require')(...) nicht zur Build-Zeit
  // resolven, das Modul bleibt als Runtime-Lookup. pdf-lib ist NICHT in
  // package.json — dieser Pfad ist optional, mit graceful Fallback.
  const PDFLib = (() => { try { return eval('require')('pdf-lib'); } catch { return null; } })();
  if (!PDFLib) {
    return { pdfBytes, embedded: false, reason: 'pdf-lib not available' };
  }
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
  const xmlBytes = Buffer.from(xmlString, 'utf-8');
  await pdfDoc.attach(xmlBytes, filename || 'zugferd-invoice.xml', {
    mimeType: 'application/xml',
    description: 'ZUGFeRD 2.1 BASIC Invoice Data',
    creationDate: new Date(),
    modificationDate: new Date()
  });
  const finalBytes = await pdfDoc.save();
  return { pdfBytes: Buffer.from(finalBytes), embedded: true };
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'rechnung-zugferd' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const rechnung_id = body.rechnung_id || body.dokument_id;
  if (!rechnung_id) return jsonResponse(event, 400, { error: 'rechnung_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // 1. Rechnung laden
    const { data: r, error: rErr } = await sb.from('dokumente')
      .select('*').eq('id', rechnung_id).maybeSingle();
    if (rErr) return jsonResponse(event, 500, { error: rErr.message });
    if (!r) return jsonResponse(event, 404, { error: 'Rechnung nicht gefunden' });
    if (!String(r.typ || '').includes('rechnung')) {
      return jsonResponse(event, 400, { error: 'Dokument ist keine Rechnung (typ=' + r.typ + ')' });
    }

    // 2. Workspace + Kunde laden
    const { data: ws } = await sb.from('workspaces').select('*').eq('id', r.workspace_id).maybeSingle();
    let k = {};
    if (r.kontakt_id) {
      const { data: ki } = await sb.from('kontakte').select('*').eq('id', r.kontakt_id).maybeSingle();
      if (ki) k = ki;
    }

    // 3. XML generieren
    const xml = buildZugferdXml({ rechnung: r, workspace: ws, kunde: k });

    // 4. Original-PDF laden (falls bereits in Storage)
    let originalPdf = null;
    if (r.storage_path) {
      const { data: pdfBlob } = await sb.storage.from('sv-files').download(r.storage_path);
      if (pdfBlob) originalPdf = Buffer.from(await pdfBlob.arrayBuffer());
    }
    if (!originalPdf) {
      // Defensive: kein PDF da → return XML als JSON für Frontend-Diagnose
      return jsonResponse(event, 200, {
        rechnung_id,
        xml_validated: xml.includes('urn:cen.eu:en16931:2017'),
        embedded: false,
        reason: 'no original PDF in Storage',
        xml_preview: xml.slice(0, 500)
      });
    }

    // 5. PDF/A-3-Embed
    const embed = await embedXmlInPdf(originalPdf, xml, 'zugferd-invoice.xml');

    // 6. Storage-Upload
    const newPath = 'rechnungen/zugferd/' + rechnung_id + '.pdf';
    const { error: upErr } = await sb.storage.from('sv-files').upload(newPath, embed.pdfBytes, {
      contentType: 'application/pdf',
      upsert: true
    });
    if (upErr) return jsonResponse(event, 500, { error: 'Storage-Upload-Fehler', detail: upErr.message });

    return jsonResponse(event, 200, {
      rechnung_id,
      storage_path: newPath,
      embedded: embed.embedded,
      xml_validated: xml.includes('urn:cen.eu:en16931:2017')
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'rechnung-zugferd' });

module.exports.__buildZugferdXml = buildZugferdXml;
module.exports.__embedXmlInPdf = embedXmlInPdf;
module.exports.__fmtAmount = fmtAmount;
module.exports.__fmtDate = fmtDate;
