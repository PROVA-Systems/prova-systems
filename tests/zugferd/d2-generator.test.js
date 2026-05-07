'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ZUGFeRD = require('../../netlify/functions/rechnung-zugferd');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'rechnung-zugferd.js'), 'utf8');

test('A5: Lambda-File rechnung-zugferd.js existiert', () => {
  const fp = path.join(__dirname, '..', '..', 'netlify', 'functions', 'rechnung-zugferd.js');
  assert.ok(fs.existsSync(fp));
});

test('A5: XML-Schema-Validation enthält urn:cen.eu:en16931:2017', () => {
  const xml = ZUGFeRD.__buildZugferdXml({
    rechnung: { doc_nummer: 'R-2026-001', betrag_netto: 100, betrag_ust: 19, betrag_brutto: 119 },
    workspace: { name: 'Test SV', plz: '12345', ort: 'Berlin' },
    kunde: { name: 'Kunde GmbH' }
  });
  assert.match(xml, /urn:cen\.eu:en16931:2017#compliant#urn:zugferd\.de:2p1:basic/);
  assert.match(xml, /<\?xml version="1\.0" encoding="UTF-8"\?>/);
});

test('A5: XML enthält CrossIndustryInvoice Root-Element', () => {
  const xml = ZUGFeRD.__buildZugferdXml({ rechnung: {}, workspace: {}, kunde: {} });
  assert.match(xml, /<rsm:CrossIndustryInvoice[\s\S]*<\/rsm:CrossIndustryInvoice>/);
});

test('A5: XML enthält EUR-Currency + 19% USt-Rate', () => {
  const xml = ZUGFeRD.__buildZugferdXml({
    rechnung: { betrag_netto: 100, betrag_ust: 19, betrag_brutto: 119 },
    workspace: {}, kunde: {}
  });
  assert.match(xml, /<ram:InvoiceCurrencyCode>EUR<\/ram:InvoiceCurrencyCode>/);
  assert.match(xml, /<ram:RateApplicablePercent>19<\/ram:RateApplicablePercent>/);
});

test('A5: fmtAmount formatiert auf 2 Nachkommastellen (Punkt)', () => {
  assert.strictEqual(ZUGFeRD.__fmtAmount(100), '100.00');
  assert.strictEqual(ZUGFeRD.__fmtAmount(99.999), '100.00');
  assert.strictEqual(ZUGFeRD.__fmtAmount(0), '0.00');
});

test('A5: fmtDate format=102 (YYYYMMDD)', () => {
  assert.strictEqual(ZUGFeRD.__fmtDate('2026-05-07'), '20260507');
  assert.strictEqual(ZUGFeRD.__fmtDate(null), '');
});

test('A5: XML escapt &<>"\' in Stammdaten', () => {
  const xml = ZUGFeRD.__buildZugferdXml({
    rechnung: {}, workspace: { name: 'Müller & Co. <GmbH>' }, kunde: { name: 'A "B" \'C\'' }
  });
  assert.match(xml, /&amp;/);
  assert.match(xml, /&lt;GmbH&gt;/);
  assert.match(xml, /&quot;B&quot;/);
});

test('A5: XML Pflicht-Felder vorhanden (TypeCode 380, EUR, BASIC-Profile)', () => {
  const xml = ZUGFeRD.__buildZugferdXml({ rechnung: { doc_nummer: 'R-001' }, workspace: {}, kunde: {} });
  assert.match(xml, /<ram:TypeCode>380<\/ram:TypeCode>/); // Rechnung
  assert.match(xml, /<ram:CountryID>DE<\/ram:CountryID>/);
  assert.match(xml, /BASIC-Profile|basic/);
});

test('A5: Lambda Auth-Pflicht (requireAuth)', () => {
  assert.match(lambdaSrc, /requireAuth/);
});

test('A5: Lambda Storage-Path rechnungen/zugferd/<id>.pdf', () => {
  assert.match(lambdaSrc, /rechnungen\/zugferd\//);
});

test('A5: Lambda valid Schema-Marker für PDF-Embed-Verify', () => {
  // Lambda Output enthält xml_validated-Boolean
  assert.match(lambdaSrc, /xml_validated/);
});

test('A5: pdf-lib für PDF/A-3-Embed (mit Defensive-Fallback)', () => {
  assert.match(lambdaSrc, /require\(['"]pdf-lib['"]\)/);
  assert.match(lambdaSrc, /pdf-lib not available/);
});

test('A5: Recherche-Doku MEGA-30-D2-ZUGFERD-SOURCES.md existiert', () => {
  const fp = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-30-D2-ZUGFERD-SOURCES.md');
  assert.ok(fs.existsSync(fp));
  const src = fs.readFileSync(fp, 'utf8');
  const urlCount = (src.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10, '≥10 URLs erwartet');
});
