'use strict';

/**
 * MEGA⁴¹ P5 — Support-System Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const TicketCreate = require(path.join(ROOT, 'netlify', 'functions', 'support-ticket-create.js'));
const faqSrc = read('netlify/functions/faq-search.js');
const ticketSrc = read('netlify/functions/support-ticket-create.js');
const migSrc = read('supabase-migrations/39_support_tickets_faq.sql');
const supportHtml = read('support.html');
const researchSrc = read('docs/sprint-research/MEGA41-P5-SUPPORT-RECHERCHE.md');

// ─────────────────────────────────────────────────────────────────
//  P5-1 Recherche
// ─────────────────────────────────────────────────────────────────

test('P5-1: Recherche-Doku enthaelt 30+ FAQ-Themen aus 11 Kategorien', () => {
  // Count via numbered list "1. ... 30. ..."
  const matches = researchSrc.match(/^\d+\. \*\*/gm) || [];
  assert.ok(matches.length >= 30, 'expected 30+ FAQ-Themen, got ' + matches.length);
});

test('P5-1: Recherche-Doku decked alle 11 Kategorien', () => {
  ['Gutachten', 'Rechnungen', 'Diktat', 'Skizzen', 'Bescheinigungen',
   'Termine', 'KI-Hilfen', 'Vorlagen', 'Import', 'Account', 'Datenschutz']
    .forEach(k => assert.match(researchSrc, new RegExp(k)));
});

// ─────────────────────────────────────────────────────────────────
//  P5-2 Migration 39
// ─────────────────────────────────────────────────────────────────

test('P5-2: Migration 39 — faq_entries Tabelle mit search_vector tsvector', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.faq_entries/);
  assert.match(migSrc, /search_vector TSVECTOR/);
});

test('P5-2: Migration 39 — Trigger faq_search_vector_trigger mit german tsvector', () => {
  assert.match(migSrc, /faq_search_vector_trigger/);
  assert.match(migSrc, /to_tsvector\('german'/);
});

test('P5-2: Migration 39 — RLS faq global lesbar, INSERT/UPDATE/DELETE blockiert', () => {
  assert.match(migSrc, /faq_global_select.*FOR SELECT USING \(true\)/s);
  assert.match(migSrc, /faq_no_user_insert.*WITH CHECK \(false\)/s);
});

test('P5-2: Migration 39 — support_tickets ALTER ADD 5 Spalten', () => {
  ['ai_response_attempted', 'ai_response_text', 'faq_match_id', 'faq_match_score', 'kategorie']
    .forEach(col => assert.match(migSrc, new RegExp('ADD COLUMN IF NOT EXISTS ' + col)));
});

test('P5-2: Migration 39 — 34 FAQ-Seeds via INSERT INTO public.faq_entries', () => {
  const matches = migSrc.match(/^\('([a-z]+)', '/gm) || [];
  assert.ok(matches.length >= 30, 'expected 30+ INSERT-Rows, got ' + matches.length);
});

// ─────────────────────────────────────────────────────────────────
//  P5-3 faq-search Lambda
// ─────────────────────────────────────────────────────────────────

test('P5-3: faq-search Lambda nutzt textSearch mit german + websearch', () => {
  assert.match(faqSrc, /\.textSearch\(['"]search_vector['"]/);
  assert.match(faqSrc, /config:\s*['"]german['"]/);
  assert.match(faqSrc, /type:\s*['"]websearch['"]/);
});

test('P5-3: faq-search ist Public (keine requireAuth)', () => {
  assert.doesNotMatch(faqSrc, /requireAuth/);
});

test('P5-3: faq-search limit max 50', () => {
  assert.match(faqSrc, /Math\.min\(parseInt\(q\.limit, 10\) \|\| 10, 50\)/);
});

// ─────────────────────────────────────────────────────────────────
//  P5-3b support-ticket-create Lambda
// ─────────────────────────────────────────────────────────────────

test('P5-3b: TicketCreate exports 12 VALID_KATEGORIEN', () => {
  assert.strictEqual(TicketCreate.__VALID_KATEGORIEN.length, 12);
  ['gutachten', 'rechnungen', 'diktat', 'skizzen', 'bescheinigungen',
   'termine', 'ki', 'vorlagen', 'import', 'account', 'datenschutz', 'sonstiges']
    .forEach(k => assert.ok(TicketCreate.__VALID_KATEGORIEN.indexOf(k) >= 0, k));
});

test('P5-3b: support-ticket-create requireAuth + RateLimit 10/3600 (Anti-Spam)', () => {
  assert.match(ticketSrc, /requireAuth/);
  assert.match(ticketSrc, /RateLimit\.check\([^,]+,\s*10,\s*3600/);
});

test('P5-3b: support-ticket-create validiert titel >=3 + beschreibung >=10', () => {
  assert.match(ticketSrc, /titel\.trim\(\)\.length < 3/);
  assert.match(ticketSrc, /beschreibung\.trim\(\)\.length < 10/);
});

test('P5-3b: support-ticket-create speichert in M²⁸-Schema (titel/beschreibung/typ/prioritaet)', () => {
  assert.match(ticketSrc, /titel:\s*body\.titel/);
  assert.match(ticketSrc, /beschreibung:\s*body\.beschreibung/);
  assert.match(ticketSrc, /typ:\s*VALID_TYP/);
  assert.match(ticketSrc, /prioritaet:\s*VALID_PRIO/);
});

// ─────────────────────────────────────────────────────────────────
//  P5-4 support.html
// ─────────────────────────────────────────────────────────────────

test('P5-4: support.html hat Search-Input mit autofocus + 200ms Debounce', () => {
  assert.match(supportHtml, /id=["']sup-search["'][^>]*autofocus/);
  assert.match(supportHtml, /setTimeout\([^,]+,\s*200\)/);
});

test('P5-4: support.html hat 12 Kategorie-Pills (Alle + 11 Themen)', () => {
  // 'Alle' hat data-kat="" (leer) — Regex erfasst alle data-kat-Attribute
  const matches = supportHtml.match(/data-kat=["'][^"']*["']/g) || [];
  assert.ok(matches.length >= 12, 'expected 12+ Pills, got ' + matches.length);
});

test('P5-4: support.html ruft /faq-search + /support-ticket-create', () => {
  assert.match(supportHtml, /\/\.netlify\/functions\/faq-search/);
  assert.match(supportHtml, /\/\.netlify\/functions\/support-ticket-create/);
});

test('P5-4: support.html highlight via <mark>-Tag', () => {
  assert.match(supportHtml, /<mark>/);
  assert.match(supportHtml, /function highlight/);
});

test('P5-4: support.html "Hat NICHT geholfen"-Button → Ticket-Form vorbefüllt', () => {
  assert.match(supportHtml, /not-helpful/);
  assert.match(supportHtml, /scrollIntoView/);
});

test('P5-4: support.html Ticket-Form mit Titel/Kategorie/Body + Submit', () => {
  assert.match(supportHtml, /id=["']sup-ticket-titel["']/);
  assert.match(supportHtml, /id=["']sup-ticket-kat["']/);
  assert.match(supportHtml, /id=["']sup-ticket-body["']/);
  assert.match(supportHtml, /id=["']sup-submit-btn["']/);
});
