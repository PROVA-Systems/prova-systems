/* ════════════════════════════════════════════════════════════
   PROVA erechnung-logic.js
   E-Rechnung: XRechnung (EN 16931), ZUGFeRD 2.1, JVEG
════════════════════════════════════════════════════════════ */

var _format = 'xr';
var _posIdCounter = 1;

// ── Format-Wechsel ──────────────────────────────────────────
function setFormat(btn, fmt) {
  _format = fmt;
  document.querySelectorAll('.fmt-tab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');

  var isJVEG = fmt === 'jveg';
  document.getElementById('er-standard').style.display = isJVEG ? 'none' : 'block';
  document.getElementById('er-jveg').classList.toggle('active', isJVEG);

  var badge = document.getElementById('er-badge');
  if (fmt === 'xr')   { badge.className = 'format-badge badge-xr'; badge.textContent = 'XRechnung EN 16931'; }
  if (fmt === 'zf')   { badge.className = 'format-badge badge-zf'; badge.textContent = 'ZUGFeRD 2.1'; }
  if (fmt === 'jveg') { badge.className = 'format-badge badge-jv'; badge.textContent = 'JVEG 2024'; }

  if (isJVEG) calcJVEG(); else calcSums();
}

// ── Positionen ──────────────────────────────────────────────
function addPosition(desc, qty, unit, ep) {
  var tbody = document.getElementById('pos-tbody');
  var id = 'pos-' + (_posIdCounter++);
  var tr = document.createElement('tr');
  tr.id = id;
  tr.innerHTML = '<td><input class="form-input" placeholder="Gutachtenerstellung" value="' + (desc||'') + '" oninput="calcSums()"></td>'
    + '<td><input class="form-input" type="number" min="0" step="0.5" value="' + (qty||1) + '" oninput="calcSums()" style="text-align:right"></td>'
    + '<td><select class="form-select" onchange="calcSums()">'
    + '<option' + (unit==='h'?' selected':'') + '>h</option>'
    + '<option' + (unit==='Stk'?' selected':'') + '>Stk</option>'
    + '<option' + (unit==='Pauschal'?' selected':'') + '>Pauschal</option>'
    + '<option' + (unit==='km'?' selected':'') + '>km</option>'
    + '</select></td>'
    + '<td><input class="form-input" type="number" min="0" step="0.01" value="' + (ep||'0.00') + '" oninput="calcSums()" style="text-align:right"></td>'
    + '<td id="' + id + '-gp" style="font-size:12px;color:var(--text2);text-align:right;padding-right:4px">0,00</td>'
    + '<td><button class="pos-del" onclick="delPosition(\'' + id + '\')">✕</button></td>';
  tbody.appendChild(tr);
  calcSums();
}

function delPosition(id) {
  var tr = document.getElementById(id);
  if (tr) { tr.remove(); calcSums(); }
}

// ── Summen ──────────────────────────────────────────────────
function calcSums() {
  var netto = 0;
  document.querySelectorAll('#pos-tbody tr').forEach(function(tr) {
    var inputs = tr.querySelectorAll('input[type="number"]');
    var qty = parseFloat(inputs[0].value) || 0;
    var ep  = parseFloat(inputs[1].value) || 0;
    var gp  = qty * ep;
    netto += gp;
    var gpEl = tr.querySelector('[id$="-gp"]');
    if (gpEl) gpEl.textContent = fmt2(gp);
  });
  var mwst = netto * 0.19;
  document.getElementById('sum-netto').textContent  = fmt2(netto) + ' €';
  document.getElementById('sum-mwst').textContent   = fmt2(mwst) + ' €';
  document.getElementById('sum-brutto').textContent = fmt2(netto + mwst) + ' €';
}

// ── JVEG-Berechnung ─────────────────────────────────────────
function calcJVEG() {
  var erstellung  = parseFloat(document.getElementById('jv-erstellung').value) || 0;
  var ortstermin  = parseFloat(document.getElementById('jv-ortstermin').value) || 0;
  var fahrt       = parseFloat(document.getElementById('jv-fahrt').value) || 0;
  var km          = parseFloat(document.getElementById('jv-km').value) || 0;
  var seiten      = parseFloat(document.getElementById('jv-seiten').value) || 0;
  var auslagen    = parseFloat(document.getElementById('jv-auslagen').value) || 0;

  var netto = (erstellung + ortstermin) * 95
    + fahrt * 70
    + km * 0.42
    + seiten * 0.90
    + auslagen;

  var mwst = netto * 0.19;
  document.getElementById('sum-netto').textContent  = fmt2(netto) + ' €';
  document.getElementById('sum-mwst').textContent   = fmt2(mwst) + ' €';
  document.getElementById('sum-brutto').textContent = fmt2(netto + mwst) + ' €';
}

function fmt2(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── XML Generierung ─────────────────────────────────────────
function generateRechnung() {
  var xml = '';
  if (_format === 'jveg') {
    xml = generateJVEGXML();
  } else {
    xml = generateXRechnungXML();
  }
  document.getElementById('xml-out').value = xml;
  document.getElementById('xml-preview').style.display = 'block';
  zeigToast('✓ XML generiert — prüfen und herunterladen');
}

function generateXRechnungXML() {
  var rnr     = document.getElementById('er-rnr').value || 'PROVA-2026-001';
  var datum   = document.getElementById('er-datum').value || new Date().toISOString().split('T')[0];
  var az      = document.getElementById('er-az').value || '';
  var name    = document.getElementById('er-name').value || 'Empfänger';
  var strasse = document.getElementById('er-strasse').value || '';
  var plz     = document.getElementById('er-plz').value || '';
  var ort     = document.getElementById('er-ort').value || '';

  var user = JSON.parse(localStorage.getItem('prova_user') || '{}');
  var svName = user.name || user.email || 'Sachverständiger';

  var positionen = '';
  var lineId = 1;
  var netto = 0;
  document.querySelectorAll('#pos-tbody tr').forEach(function(tr) {
    var desc    = tr.querySelector('td:first-child input').value || 'Leistung';
    var inputs  = tr.querySelectorAll('input[type="number"]');
    var qty     = parseFloat(inputs[0].value) || 1;
    var ep      = parseFloat(inputs[1].value) || 0;
    var gp      = qty * ep;
    netto += gp;
    positionen += '  <cac:InvoiceLine>\n'
      + '    <cbc:ID>' + lineId++ + '</cbc:ID>\n'
      + '    <cbc:InvoicedQuantity unitCode="HUR">' + qty + '</cbc:InvoicedQuantity>\n'
      + '    <cbc:LineExtensionAmount currencyID="EUR">' + gp.toFixed(2) + '</cbc:LineExtensionAmount>\n'
      + '    <cac:Item><cbc:Name>' + escXML(desc) + '</cbc:Name>'
      + '<cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent>'
      + '<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>\n'
      + '    <cac:Price><cbc:PriceAmount currencyID="EUR">' + ep.toFixed(2) + '</cbc:PriceAmount></cac:Price>\n'
      + '  </cac:InvoiceLine>\n';
  });

  var mwst   = netto * 0.19;
  var brutto = netto + mwst;

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"\n'
    + '  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"\n'
    + '  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">\n'
    + '  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</cbc:CustomizationID>\n'
    + '  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>\n'
    + '  <cbc:ID>' + escXML(rnr) + '</cbc:ID>\n'
    + '  <cbc:IssueDate>' + datum + '</cbc:IssueDate>\n'
    + '  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n'
    + '  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>\n'
    + (az ? '  <cbc:BuyerReference>' + escXML(az) + '</cbc:BuyerReference>\n' : '')
    + '  <cac:AccountingSupplierParty><cac:Party>\n'
    + '    <cac:PartyName><cbc:Name>' + escXML(svName) + '</cbc:Name></cac:PartyName>\n'
    + '  </cac:Party></cac:AccountingSupplierParty>\n'
    + '  <cac:AccountingCustomerParty><cac:Party>\n'
    + '    <cac:PartyName><cbc:Name>' + escXML(name) + '</cbc:Name></cac:PartyName>\n'
    + '    <cac:PostalAddress><cbc:StreetName>' + escXML(strasse) + '</cbc:StreetName>'
    + '<cbc:PostalZone>' + escXML(plz) + '</cbc:PostalZone>'
    + '<cbc:CityName>' + escXML(ort) + '</cbc:CityName>'
    + '<cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>'
    + '</cac:PostalAddress>\n'
    + '  </cac:Party></cac:AccountingCustomerParty>\n'
    + '  <cac:TaxTotal>\n'
    + '    <cbc:TaxAmount currencyID="EUR">' + mwst.toFixed(2) + '</cbc:TaxAmount>\n'
    + '    <cac:TaxSubtotal>\n'
    + '      <cbc:TaxableAmount currencyID="EUR">' + netto.toFixed(2) + '</cbc:TaxableAmount>\n'
    + '      <cbc:TaxAmount currencyID="EUR">' + mwst.toFixed(2) + '</cbc:TaxAmount>\n'
    + '      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent>'
    + '<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>\n'
    + '    </cac:TaxSubtotal>\n'
    + '  </cac:TaxTotal>\n'
    + '  <cac:LegalMonetaryTotal>\n'
    + '    <cbc:LineExtensionAmount currencyID="EUR">' + netto.toFixed(2) + '</cbc:LineExtensionAmount>\n'
    + '    <cbc:TaxExclusiveAmount currencyID="EUR">' + netto.toFixed(2) + '</cbc:TaxExclusiveAmount>\n'
    + '    <cbc:TaxInclusiveAmount currencyID="EUR">' + brutto.toFixed(2) + '</cbc:TaxInclusiveAmount>\n'
    + '    <cbc:PayableAmount currencyID="EUR">' + brutto.toFixed(2) + '</cbc:PayableAmount>\n'
    + '  </cac:LegalMonetaryTotal>\n'
    + positionen
    + '</ubl:Invoice>';
}

function generateJVEGXML() {
  var az      = document.getElementById('jv-az').value || '';
  var gericht = document.getElementById('jv-gericht').value || '';
  var datum   = document.getElementById('jv-datum').value || '';

  var erstellung = parseFloat(document.getElementById('jv-erstellung').value) || 0;
  var ortstmin   = parseFloat(document.getElementById('jv-ortstermin').value) || 0;
  var fahrt      = parseFloat(document.getElementById('jv-fahrt').value) || 0;
  var km         = parseFloat(document.getElementById('jv-km').value) || 0;
  var seiten     = parseFloat(document.getElementById('jv-seiten').value) || 0;
  var auslagen   = parseFloat(document.getElementById('jv-auslagen').value) || 0;

  var netto  = (erstellung + ortstmin) * 95 + fahrt * 70 + km * 0.42 + seiten * 0.90 + auslagen;
  var mwst   = netto * 0.19;
  var brutto = netto + mwst;

  var user   = JSON.parse(localStorage.getItem('prova_user') || '{}');
  var svName = user.name || user.email || 'Sachverständiger';

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<!-- JVEG-Kostenrechnung gemäß §§ 9, 10, 12 JVEG -->\n'
    + '<JVEG-Abrechnung>\n'
    + '  <Sachverstaendiger>' + escXML(svName) + '</Sachverstaendiger>\n'
    + '  <Gericht>' + escXML(gericht) + '</Gericht>\n'
    + '  <Aktenzeichen>' + escXML(az) + '</Aktenzeichen>\n'
    + '  <Ortstermin>' + datum + '</Ortstermin>\n'
    + '  <Positionen>\n'
    + (erstellung > 0 ? '    <Pos bezeichnung="Gutachtenerstellung §9" stunden="' + erstellung + '" satz="95.00" betrag="' + (erstellung*95).toFixed(2) + '"/>\n' : '')
    + (ortstmin   > 0 ? '    <Pos bezeichnung="Ortstermin §9" stunden="' + ortstmin + '" satz="95.00" betrag="' + (ortstmin*95).toFixed(2) + '"/>\n' : '')
    + (fahrt      > 0 ? '    <Pos bezeichnung="Fahrtzeit §10" stunden="' + fahrt + '" satz="70.00" betrag="' + (fahrt*70).toFixed(2) + '"/>\n' : '')
    + (km         > 0 ? '    <Pos bezeichnung="Fahrtkosten §10" km="' + km + '" satz="0.42" betrag="' + (km*0.42).toFixed(2) + '"/>\n' : '')
    + (seiten     > 0 ? '    <Pos bezeichnung="Schreibauslagen §12" seiten="' + seiten + '" satz="0.90" betrag="' + (seiten*0.90).toFixed(2) + '"/>\n' : '')
    + (auslagen   > 0 ? '    <Pos bezeichnung="Sonstige Auslagen §12" betrag="' + auslagen.toFixed(2) + '"/>\n' : '')
    + '  </Positionen>\n'
    + '  <Netto>' + netto.toFixed(2) + '</Netto>\n'
    + '  <MwSt19Pct>' + mwst.toFixed(2) + '</MwSt19Pct>\n'
    + '  <Brutto>' + brutto.toFixed(2) + '</Brutto>\n'
    + '</JVEG-Abrechnung>';
}

function escXML(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function copyXML() {
  var out = document.getElementById('xml-out');
  if (!out.value) { zeigToast('Zuerst XML generieren'); return; }
  navigator.clipboard.writeText(out.value).then(function() { zeigToast('✓ XML kopiert'); });
}

function zeigToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ── Init ────────────────────────────────────────────────────
(function() {
  // Standarddatum
  var d = document.getElementById('er-datum');
  if (d) d.value = new Date().toISOString().split('T')[0];

  // Aus URL-Params vorbefüllen
  var params = new URLSearchParams(location.search);
  var az = params.get('az');
  if (az) {
    var f = document.getElementById('er-az');
    if (f) f.value = az;
  }

  // Zwei Standard-Positionen einfügen
  addPosition('Gutachtenerstellung §9 JVEG', 4, 'h', 95);
  addPosition('Fahrtkosten §10 JVEG', 80, 'km', 0.42);
  calcSums();
})();
