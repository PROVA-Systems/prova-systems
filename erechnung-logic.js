/* ============================================================
   PROVA Systems — E-Rechnung Logic v2.0
   XRechnung 3.0.2 (EN 16931 konform) + ZUGFeRD 2.4.0
   Validator: https://erechnungs-validator.de
============================================================ */
(function() {

/* ── Tabs ── */
window.setFormat = function(btn, fmt) {
  document.querySelectorAll('.fmt-tab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.querySelectorAll('.format-section').forEach(function(s) { s.style.display = 'none'; });
  var sec = document.getElementById('er-' + fmt);
  if (sec) sec.style.display = 'block';
  window._currentFormat = fmt;
};

/* ── Hilfsfunktionen ── */
function escXML(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  var parts = d.split('.');
  if (parts.length === 3) return parts[2] + '-' + parts[1].padStart(2,'0') + '-' + parts[0].padStart(2,'0');
  return d;
}

function gv(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function parsePositionen() {
  var rows = document.querySelectorAll('.er-position-row');
  var items = [];
  rows.forEach(function(row, idx) {
    var leistung = row.querySelector('.er-leistung')?.value?.trim() || '';
    var menge    = parseFloat(row.querySelector('.er-menge')?.value) || 0;
    var einheit  = row.querySelector('.er-einheit')?.value || 'HUR';
    var ep       = parseFloat(row.querySelector('.er-ep')?.value) || 0;
    if (leistung && menge) {
      items.push({ id: idx + 1, leistung, menge, einheit, ep, gp: Math.round(menge * ep * 100) / 100 });
    }
  });
  return items;
}

function berechneNetto() {
  return parsePositionen().reduce(function(s, p) { return s + p.gp; }, 0);
}

/* ── Live-Summen berechnen ── */
function updateSummen() {
  var netto  = berechneNetto();
  var mwst   = Math.round(netto * 0.19 * 100) / 100;
  var brutto = Math.round((netto + mwst) * 100) / 100;
  var nettoEl = document.getElementById('er-netto');
  var mwstEl  = document.getElementById('er-mwst');
  var bruttoEl= document.getElementById('er-brutto');
  if (nettoEl)  nettoEl.textContent  = netto.toFixed(2).replace('.', ',') + ' €';
  if (mwstEl)   mwstEl.textContent   = mwst.toFixed(2).replace('.', ',') + ' €';
  if (bruttoEl) bruttoEl.textContent = brutto.toFixed(2).replace('.', ',') + ' €';
}

/* ── GP berechnen ── */
window.erCalcGP = function(row) {
  var menge = parseFloat(row.querySelector('.er-menge')?.value) || 0;
  var ep    = parseFloat(row.querySelector('.er-ep')?.value) || 0;
  var gpEl  = row.querySelector('.er-gp');
  if (gpEl) gpEl.textContent = (menge * ep).toFixed(2);
  updateSummen();
};

/* ── Position hinzufügen ── */
window.erAddPosition = function() {
  var container = document.getElementById('er-positionen');
  var idx = container.querySelectorAll('.er-position-row').length + 1;
  var row = document.createElement('tr');
  row.className = 'er-position-row';
  row.innerHTML =
    '<td><input class="form-input er-leistung" placeholder="Leistungsbeschreibung" oninput="updateSummen()"></td>' +
    '<td><input class="form-input er-menge" type="number" value="1" min="0" step="0.5" style="width:70px" onchange="erCalcGP(this.closest('tr'))"></td>' +
    '<td><select class="form-input er-einheit" style="width:80px">' +
    '<option value="HUR">h</option><option value="KMT">km</option>' +
    '<option value="EA">Stk</option><option value="DAY">Tag</option>' +
    '</select></td>' +
    '<td><input class="form-input er-ep" type="number" placeholder="0,00" step="0.01" style="width:90px" onchange="erCalcGP(this.closest('tr'))"></td>' +
    '<td class="er-gp">0.00</td>' +
    '<td><button class="btn-icon" onclick="this.closest('tr').remove();updateSummen();" title="Entfernen">×</button></td>';
  container.appendChild(row);
};

/* ── SV-Daten aus Einstellungen laden ── */
function loadSVDaten() {
  var user = JSON.parse(localStorage.getItem('prova_user') || '{}');
  var sv   = JSON.parse(localStorage.getItem('prova_sv_profil') || '{}');
  if (user.user_metadata) {
    var m = user.user_metadata;
    ['sv-name','sv-strasse','sv-plz','sv-ort','sv-email','sv-iban','sv-steuernr'].forEach(function(id) {
      var key = id.replace('sv-', '');
      var el  = document.getElementById(id);
      if (el && !el.value && (m[key] || sv[key])) el.value = m[key] || sv[key] || '';
    });
  }
}

/* ══════════════════════════════════════════════════
   XRECHNUNG 3.0.2 — EN 16931 KONFORM
   Pflichtfelder: BT-1,2,3,5,10,23,24,25,26,27,28,
   29,30,31/32,34,35,36,37,38,40,44,45,46,47,48,49,
   50,51,52,53,55,92,93,94,95,98,106,110,111,112,
   118,131,132,133,134,135,136,138,139
══════════════════════════════════════════════════ */
function generateXRechnungXML() {
  var rnr    = gv('er-rnr')    || 'PROVA-2026-001';
  var datum  = fmtDate(gv('er-datum'));
  var lstZR  = gv('er-lstzr') || datum.slice(0, 7);

  /* Seller (SV) */
  var svName   = gv('sv-name')    || '';
  var svEmail  = gv('sv-email')   || '';
  var svStr    = gv('sv-strasse') || '';
  var svPlz    = gv('sv-plz')     || '';
  var svOrt    = gv('sv-ort')     || '';
  var svStNr   = gv('sv-steuernr') || '';  // DE123456789 oder 123/456/789
  var svIBAN   = gv('sv-iban')    || '';

  /* Buyer */
  var bName    = gv('er-empf-name')   || '';
  var bEmail   = gv('er-empf-email')  || '';
  var bStr     = gv('er-empf-str')    || '';
  var bPlz     = gv('er-empf-plz')   || '';
  var bOrt     = gv('er-empf-ort')   || '';
  var leitwegId = gv('er-leitweg')  || '';  // z.B. 991-12345-06

  var az       = gv('er-az') || '';
  var positionen = parsePositionen();
  var netto    = berechneNetto();
  var mwst     = Math.round(netto * 0.19 * 100) / 100;
  var brutto   = Math.round((netto + mwst) * 100) / 100;

  /* Steuernummer-Format: USt-IdNr (DE...) oder Steuernummer */
  var isUstId = svStNr.toUpperCase().startsWith('DE');
  var taxBlock = isUstId
    ? '<cac:PartyTaxScheme><cbc:CompanyID>' + escXML(svStNr) + '</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>'
    : '<cac:PartyTaxScheme><cbc:CompanyID>' + escXML(svStNr) + '</cbc:CompanyID><cac:TaxScheme><cbc:ID>FC</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>';

  /* Positionen XML */
  var linienXML = positionen.map(function(p) {
    var unitCode = p.einheit || 'HUR';
    return [
      '<cac:InvoiceLine>',
      '<cbc:ID>' + p.id + '</cbc:ID>',
      '<cbc:InvoicedQuantity unitCode="' + unitCode + '">' + p.menge + '</cbc:InvoicedQuantity>',
      '<cbc:LineExtensionAmount currencyID="EUR">' + p.gp.toFixed(2) + '</cbc:LineExtensionAmount>',
      '<cac:Item>',
      '<cbc:Description>' + escXML(p.leistung) + '</cbc:Description>',
      '<cbc:Name>' + escXML(p.leistung) + '</cbc:Name>',
      '<cac:ClassifiedTaxCategory>',
      '<cbc:ID>S</cbc:ID>',
      '<cbc:Percent>19</cbc:Percent>',
      '<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>',
      '</cac:ClassifiedTaxCategory>',
      '</cac:Item>',
      '<cac:Price>',
      '<cbc:PriceAmount currencyID="EUR">' + p.ep.toFixed(2) + '</cbc:PriceAmount>',
      '</cac:Price>',
      '</cac:InvoiceLine>'
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
    '  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    '  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',

    '  <!-- BT-24: Specification ID -->',
    '  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>',

    '  <!-- BT-23: Profile ID (Pflicht seit 3.0.1) -->',
    '  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>',

    '  <!-- BT-1: Rechnungsnummer -->',
    '  <cbc:ID>' + escXML(rnr) + '</cbc:ID>',

    '  <!-- BT-2: Rechnungsdatum -->',
    '  <cbc:IssueDate>' + datum + '</cbc:IssueDate>',

    '  <!-- BT-3: Rechnungstyp 380 = Rechnung -->',
    '  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>',

    '  <!-- BT-5: Währung -->',
    '  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>',

    '  <!-- BT-7: Steuerdatum (optional, wenn gleich Rechnungsdatum) -->',
    '  <!-- BT-9: Fälligkeitsdatum -->',
    '  <cbc:DueDate>' + datum + '</cbc:DueDate>',

    '  <!-- BT-10: Käufer-Referenz (Leitweg-ID für Behörden) -->',
    (leitwegId ? '  <cbc:BuyerReference>' + escXML(leitwegId) + '</cbc:BuyerReference>' : ''),
    (az && !leitwegId ? '  <!-- Hinweis: Für Behörden ist eine Leitweg-ID erforderlich, nicht das Aktenzeichen -->' : ''),

    '  <!-- BT-22: Note (Aktenzeichen) -->',
    (az ? '  <cbc:Note>Aktenzeichen: ' + escXML(az) + '</cbc:Note>' : ''),

    '  <!-- BT-73/74: Leistungszeitraum -->',
    '  <cac:InvoicePeriod>',
    '    <cbc:DescriptionCode>35</cbc:DescriptionCode>',
    (lstZR ? '    <!-- Leistungszeitraum: ' + escXML(lstZR) + ' -->' : ''),
    '  </cac:InvoicePeriod>',

    '  <!-- BG-4: Verkäufer (Sachverständiger) -->',
    '  <cac:AccountingSupplierParty><cac:Party>',
    '    <!-- BT-34: Elektronische Adresse Verkäufer (Pflicht seit 3.0.1) -->',
    '    <cbc:EndpointID schemeID="EM">' + escXML(svEmail) + '</cbc:EndpointID>',
    '    <cac:PartyName><cbc:Name>' + escXML(svName) + '</cbc:Name></cac:PartyName>',
    '    <!-- BT-35..40: Postanschrift Verkäufer -->',
    '    <cac:PostalAddress>',
    '      <cbc:StreetName>' + escXML(svStr) + '</cbc:StreetName>',
    '      <cbc:PostalZone>' + escXML(svPlz) + '</cbc:PostalZone>',
    '      <cbc:CityName>' + escXML(svOrt) + '</cbc:CityName>',
    '      <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>',
    '    </cac:PostalAddress>',
    '    <!-- BT-31/32: Steuernummer oder USt-IdNr. -->',
    (svStNr ? '    ' + taxBlock : '    <!-- ACHTUNG: Steuernummer fehlt — bitte ergänzen -->'),
    '    <cac:PartyLegalEntity>',
    '      <cbc:RegistrationName>' + escXML(svName) + '</cbc:RegistrationName>',
    '    </cac:PartyLegalEntity>',
    '  </cac:Party></cac:AccountingSupplierParty>',

    '  <!-- BG-7: Käufer (Auftraggeber/Gericht) -->',
    '  <cac:AccountingCustomerParty><cac:Party>',
    '    <!-- BT-49: Elektronische Adresse Käufer (Pflicht seit 3.0.1) -->',
    '    <cbc:EndpointID schemeID="EM">' + escXML(bEmail) + '</cbc:EndpointID>',
    '    <cac:PartyName><cbc:Name>' + escXML(bName) + '</cbc:Name></cac:PartyName>',
    '    <cac:PostalAddress>',
    '      <cbc:StreetName>' + escXML(bStr) + '</cbc:StreetName>',
    '      <cbc:PostalZone>' + escXML(bPlz) + '</cbc:PostalZone>',
    '      <cbc:CityName>' + escXML(bOrt) + '</cbc:CityName>',
    '      <cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>',
    '    </cac:PostalAddress>',
    '  </cac:Party></cac:AccountingCustomerParty>',

    '  <!-- BG-16: Zahlungsanweisung (IBAN) -->',
    (svIBAN ? [
      '  <cac:PaymentMeans>',
      '    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>',
      '    <cac:PayeeFinancialAccount>',
      '      <cbc:ID>' + escXML(svIBAN.replace(/\s/g, '')) + '</cbc:ID>',
      '    </cac:PayeeFinancialAccount>',
      '  </cac:PaymentMeans>'
    ].join('\n') : '  <!-- ACHTUNG: IBAN fehlt — bitte in Einstellungen hinterlegen -->'),

    '  <!-- BG-23: Steueraufschlüsselung -->',
    '  <cac:TaxTotal>',
    '    <cbc:TaxAmount currencyID="EUR">' + mwst.toFixed(2) + '</cbc:TaxAmount>',
    '    <cac:TaxSubtotal>',
    '      <cbc:TaxableAmount currencyID="EUR">' + netto.toFixed(2) + '</cbc:TaxableAmount>',
    '      <cbc:TaxAmount currencyID="EUR">' + mwst.toFixed(2) + '</cbc:TaxAmount>',
    '      <cac:TaxCategory>',
    '        <cbc:ID>S</cbc:ID>',
    '        <cbc:Percent>19</cbc:Percent>',
    '        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>',
    '      </cac:TaxCategory>',
    '    </cac:TaxSubtotal>',
    '  </cac:TaxTotal>',

    '  <!-- BG-22: Belegsummen -->',
    '  <cac:LegalMonetaryTotal>',
    '    <cbc:LineExtensionAmount currencyID="EUR">' + netto.toFixed(2) + '</cbc:LineExtensionAmount>',
    '    <cbc:TaxExclusiveAmount currencyID="EUR">' + netto.toFixed(2) + '</cbc:TaxExclusiveAmount>',
    '    <cbc:TaxInclusiveAmount currencyID="EUR">' + brutto.toFixed(2) + '</cbc:TaxInclusiveAmount>',
    '    <cbc:PayableAmount currencyID="EUR">' + brutto.toFixed(2) + '</cbc:PayableAmount>',
    '  </cac:LegalMonetaryTotal>',

    '  <!-- BG-25: Rechnungspositionen -->',
    linienXML,

    '</ubl:Invoice>'
  ].filter(function(l) { return l !== ''; }).join('\n');
}

/* ── Pflichtfeld-Prüfung vor Download ── */
function validateXRechnung() {
  var errors = [];
  if (!gv('er-rnr'))          errors.push('Rechnungsnummer fehlt');
  if (!gv('sv-name'))         errors.push('Ihr Name/Firma fehlt');
  if (!gv('sv-email'))        errors.push('Ihre E-Mail-Adresse fehlt (BT-34 Pflicht)');
  if (!gv('sv-strasse'))      errors.push('Ihre Straße fehlt');
  if (!gv('sv-plz'))          errors.push('Ihre PLZ fehlt');
  if (!gv('sv-ort'))          errors.push('Ihr Ort fehlt');
  if (!gv('sv-steuernr'))     errors.push('Ihre Steuernummer / USt-IdNr. fehlt');
  if (!gv('sv-iban'))         errors.push('Ihre IBAN fehlt (Zahlungsempfang)');
  if (!gv('er-empf-name'))    errors.push('Empfänger Name/Behörde fehlt');
  if (!gv('er-empf-email'))   errors.push('Empfänger E-Mail fehlt (BT-49 Pflicht)');
  if (!gv('er-empf-str'))     errors.push('Empfänger Straße fehlt');
  if (!gv('er-empf-plz'))     errors.push('Empfänger PLZ fehlt');
  if (!gv('er-empf-ort'))     errors.push('Empfänger Ort fehlt');
  if (!gv('er-leitweg'))      errors.push('Leitweg-ID fehlt (Pflicht für Behörden, z.B. 991-12345-06)');
  if (parsePositionen().length === 0) errors.push('Mindestens eine Position erforderlich');
  return errors;
}

/* ── XML generieren und Download ── */
window.generateAndDownload = function() {
  var errors = validateXRechnung();
  if (errors.length > 0) {
    var msg = 'Folgende Pflichtfelder fehlen:\n\n' + errors.map(function(e) { return '• ' + e; }).join('\n');
    msg += '\n\nBitte ergänzen und erneut versuchen.';
    alert(msg);
    return;
  }

  var xml  = generateXRechnungXML();
  var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  var rnr  = gv('er-rnr') || 'XRechnung';
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url;
  a.download = rnr.replace(/[^a-zA-Z0-9-_]/g, '_') + '.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  /* Hinweis auf Validator */
  setTimeout(function() {
    if (typeof showToast === 'function') {
      showToast('XML heruntergeladen — bitte unter erechnungs-validator.de prüfen!', 'info', 8000);
    }
  }, 500);
};

/* ── XML in Zwischenablage kopieren ── */
window.copyXML = function() {
  var errors = validateXRechnung();
  if (errors.length > 0) {
    alert('Bitte zuerst alle Pflichtfelder ausfüllen:\n' + errors.slice(0,3).join('\n') + (errors.length > 3 ? '\n...' : ''));
    return;
  }
  var xml = generateXRechnungXML();
  navigator.clipboard.writeText(xml).then(function() {
    if (typeof showToast === 'function') showToast('XML kopiert!', 'success');
  });
};

/* ── ZUGFeRD: Hinweis (echte PDF-Einbettung erfordert Server) ── */
window.generateZUGFeRD = function() {
  if (typeof showToast === 'function') {
    showToast('ZUGFeRD: XML zuerst generieren, dann mit PDF-Tool einbetten (z.B. Mustang-Lib)', 'info', 6000);
  }
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  loadSVDaten();
  updateSummen();

  /* Event Listener für Summen */
  document.addEventListener('input', function(e) {
    if (e.target.closest('.er-position-row') || e.target.closest('#er-positionen')) {
      updateSummen();
    }
  });

  /* Datum vorbelegen */
  var datumEl = document.getElementById('er-datum');
  if (datumEl && !datumEl.value) {
    datumEl.value = new Date().toLocaleDateString('de-DE');
  }

  /* Rechnungsnummer vorbelegen */
  var rnrEl = document.getElementById('er-rnr');
  if (rnrEl && !rnrEl.value) {
    var year = new Date().getFullYear();
    var lfd  = localStorage.getItem('prova_rnr_counter') || '001';
    rnrEl.value = 'PROVA-' + year + '-' + lfd;
  }
});

})();
