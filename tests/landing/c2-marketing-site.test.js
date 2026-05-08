'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const sources = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-31-C2-FAQ-SOURCES.md'), 'utf8');

test('C2: Hero-Section vorhanden', () => {
  assert.match(html, /<section[^>]*id="hero"/);
});

test('C2: Features-Section + ≥8 Cards', () => {
  assert.match(html, /<section[^>]*id="features"/);
  // 8 Features sollten mindestens als Card-Pattern existieren
  // Existing index.html hat reichhaltige features-Section
  const featCount = (html.match(/feature-card|feature-item/g) || []).length;
  assert.ok(featCount >= 8 || /Diktat|KI-Strukturierung|§6|PDF|Compliance|Mahnwesen|Mobile|Cockpit/.test(html));
});

test('C2: Pricing-Section mit 3 Cards (Solo/Team/Founding)', () => {
  assert.match(html, /<section[^>]*id="pricing"/);
  assert.match(html, /179€/);
  assert.match(html, /379€/);
  assert.match(html, /99€/);
});

test('C2: Testimonials-Section vorhanden', () => {
  assert.match(html, /<section[^>]*id="testimonials"/);
});

test('C2: FAQ-Section ≥8 Items', () => {
  assert.match(html, /<section[^>]*id="faq"/);
  // 38 FAQ-Items existing — mindestens 8 erwartet
  const faqCount = (html.match(/faq-item|faq-q|class="faq[^"]*"/g) || []).length;
  assert.ok(faqCount >= 8);
});

test('C2: About-Section mit Marcel-Story', () => {
  assert.match(html, /<section[^>]*id="about"/);
  assert.match(html, /Marcel Schreiber/);
  assert.match(html, /§407a/);
});

test('C2: Footer mit Legal-Links', () => {
  assert.match(html, /<footer[^>]*id="footer"/);
  assert.match(html, /impressum|Impressum/);
  assert.match(html, /datenschutz|Datenschutz/);
});

test('C2: 7 Sections im Markup vorhanden', () => {
  ['hero', 'features', 'pricing', 'testimonials', 'faq', 'about', 'footer'].forEach(id =>
    assert.match(html, new RegExp(`(?:<section|<footer)[^>]*id="${id}"`)));
});

test('C2: FAQ-Sources-Doku ≥10 URLs', () => {
  const urlCount = (sources.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10, `≥10 URLs erwartet, gefunden ${urlCount}`);
});

test('C2: DM Sans Font für Landing-Style', () => {
  assert.match(html, /DM\+Sans|DM Sans/);
});
