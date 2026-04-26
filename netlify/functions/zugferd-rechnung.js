const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');
// ══════════════════════════════════════════════════
// PROVA Systems — ZUGFeRD/XRechnung Generator
// Netlify Function: zugferd-rechnung
// Env: PDFMONKEY_API_KEY, PDFMONKEY_RECHNUNG_TEMPLATE_ID
//
// Erzeugt eine ZUGFeRD-konforme Rechnung (PDF mit eingebettetem XML)
// oder alternativ eine XRechnung (reines XML).
//
// Input: Rechnungsdaten als JSON
// Output: PDF-Download-URL oder XML-String
// ══════════════════════════════════════════════════

exports.handler = requireAuth(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{"error":"Method Not Allowed"}' };

  try {
    // P4B.7b: HMAC-Token-Email aus context.userEmail
    const jwtEmail = context.userEmail;

    const input = JSON.parse(event.body || '{}');
    const format = input.format || 'zugferd'; // 'zugferd' oder 'xrechnung'

    // Validierung
    const required = ['rechnungsnr', 'datum', 'empfaenger_name', 'positionen'];
    for (const f of required) {
      if (!input[f]) return { statusCode: 400, headers, body: JSON.stringify({ error: `Feld "${f}" fehlt` }) };
    }

    // ZUGFeRD XML generieren (Factur-X / EN 16931)
    const xml = generateZugferdXml(input);

    if (format === 'xrechnung') {
      // Nur XML zurückgeben (für Behörden die reines XML wollen)
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/xml' },
        body: xml
      };
    }

    // ZUGFeRD: PDF mit eingebettetem XML via PdfMonkey
    const PDFMONKEY_KEY = process.env.PDFMONKEY_API_KEY;
    const TEMPLATE_ID = process.env.PDFMONKEY_RECHNUNG_TEMPLATE_ID;

    if (!PDFMONKEY_KEY || !TEMPLATE_ID) {
      // Fallback: XML + Hinweis dass PDF manuell erstellt werden muss
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          fallback: true,
          xml: xml,
          reason: 'PdfMonkey nicht konfiguriert — XML wurde generiert, PDF-Einbettung nicht möglich.'
        })
      };
    }

    // PdfMonkey Document erstellen
    const pdfRes = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PDFMONKEY_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document: {
          document_template_id: TEMPLATE_ID,
          status: 'pending',
          payload: {
            ...input,
            zugferd_xml: xml,
            netto: input.positionen.reduce((s, p) => s + (p.menge * p.einzelpreis), 0),
            mwst_satz: input.mwst_satz || 19,
          }
        }
      })
    });

    if (!pdfRes.ok) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ fallback: true, xml, reason: 'PdfMonkey-Fehler' })
      };
    }

    const doc = await pdfRes.json();
    const docId = doc?.document?.id;

    // Polling auf PDF
    let pdfUrl = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${PDFMONKEY_KEY}` }
      });
      const status = await check.json();
      if (status?.document?.status === 'success') {
        pdfUrl = status.document.download_url;
        break;
      }
      if (status?.document?.status === 'failure') break;
    }

    if (pdfUrl) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, url: pdfUrl, xml }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ fallback: true, xml, reason: 'PDF-Timeout' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
});


// ════════════════════════════════════════
// ZUGFeRD XML Generator (Factur-X BASIC)
// EN 16931 / Factur-X 1.0 BASIC Profile
// ════════════════════════════════════════
function generateZugferdXml(input) {
  const {
    rechnungsnr, datum, leistungsdatum,
    absender_name, absender_strasse, absender_plz, absender_ort,
    absender_steuernr, absender_iban, absender_bic, absender_bank,
    empfaenger_name, empfaenger_strasse, empfaenger_plz, empfaenger_ort,
    positionen, mwst_satz = 19, waehrung = 'EUR',
    zahlungsziel_tage = 30, aktenzeichen
  } = input;

  const netto = positionen.reduce((s, p) => s + (p.menge * p.einzelpreis), 0);
  const mwst = Math.round(netto * mwst_satz) / 100;
  const brutto = netto + mwst;

  const faellig = new Date();
  faellig.setDate(faellig.getDate() + zahlungsziel_tage);
  const faelligStr = faellig.toISOString().slice(0, 10).replace(/-/g, '');
  const datumStr = (datum || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const leistungStr = (leistungsdatum || datum || new Date().toISOString().slice(0, 10)).replace(/-/g, '');

  let posXml = '';
  positionen.forEach((p, i) => {
    const lineTotal = p.menge * p.einzelpreis;
    posXml += `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escXml(p.beschreibung || p.bezeichnung || 'Position ' + (i + 1))}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${p.einzelpreis.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${escXml(p.einheit || 'HUR')}">${p.menge}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${mwst_satz}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escXml(rechnungsnr)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${datumStr}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${aktenzeichen ? `<ram:IncludedNote><ram:Content>Aktenzeichen: ${escXml(aktenzeichen)}</ram:Content></ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escXml(absender_name || 'PROVA Sachverständiger')}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escXml(absender_strasse || '')}</ram:LineOne>
          <ram:PostcodeCode>${escXml(absender_plz || '')}</ram:PostcodeCode>
          <ram:CityName>${escXml(absender_ort || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${absender_steuernr ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${escXml(absender_steuernr)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escXml(empfaenger_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escXml(empfaenger_strasse || '')}</ram:LineOne>
          <ram:PostcodeCode>${escXml(empfaenger_plz || '')}</ram:PostcodeCode>
          <ram:CityName>${escXml(empfaenger_ort || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${leistungStr}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${waehrung}</ram:InvoiceCurrencyCode>
      ${absender_iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escXml(absender_iban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${absender_bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${escXml(absender_bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${faelligStr}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${mwst.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${netto.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${mwst_satz}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${netto.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${netto.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${waehrung}">${mwst.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${brutto.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${brutto.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${posXml}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function escXml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
