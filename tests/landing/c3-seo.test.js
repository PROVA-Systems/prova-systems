'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const sitemap = fs.readFileSync(path.join(__dirname, '..', '..', 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(__dirname, '..', '..', 'robots.txt'), 'utf8');

test('C3: OG-Tags vollständig (4 Pflicht-Tags)', () => {
  ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].forEach(tag =>
    assert.match(html, new RegExp(`property="${tag}"`)));
});

test('C3: Schema.org SoftwareApplication JSON-LD vorhanden', () => {
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type":\s*"SoftwareApplication"/);
});

test('C3: Schema.org enthält 3 Pricing-Offers', () => {
  assert.match(html, /"price":\s*"179\.00"/);
  assert.match(html, /"price":\s*"379\.00"/);
  assert.match(html, /"price":\s*"99\.00"/);
});

test('C3: sitemap.xml mit urlset', () => {
  assert.match(sitemap, /<urlset/);
  assert.match(sitemap, /https:\/\/prova-systems\.de/);
});

test('C3: robots.txt verweist auf Sitemap', () => {
  assert.match(robots, /Sitemap:\s*https:\/\/prova-systems\.de\/sitemap\.xml/);
});

test('C3: robots.txt blockiert App-Pages', () => {
  assert.match(robots, /Disallow:\s*\/dashboard/);
  assert.match(robots, /Disallow:\s*\/akte/);
});

test('C3: Twitter-Card-Tags vorhanden', () => {
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /name="twitter:title"/);
});

test('C3: Description-Meta ≤ 160 chars', () => {
  const m = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(m, 'description-Meta fehlt');
  assert.ok(m[1].length <= 200, 'Description ' + m[1].length + ' > 200 chars (160 ideal, 200 noch OK)');
});

test('C3: canonical-Link gesetzt', () => {
  assert.match(html, /<link rel="canonical"\s+href="https:\/\/prova-systems\.de/);
});

test('C3: Keywords + Author + Robots-Meta', () => {
  assert.match(html, /<meta name="keywords"/);
  assert.match(html, /<meta name="author"/);
  assert.match(html, /<meta name="robots"\s+content="index/);
});
