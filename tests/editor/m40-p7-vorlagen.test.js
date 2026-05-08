'use strict';

/**
 * MEGA⁴⁰ P7 — Vorlagen-System Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const ListLambda = require(path.join(ROOT, 'netlify', 'functions', 'document-templates-list.js'));
const CreateLambda = require(path.join(ROOT, 'netlify', 'functions', 'document-template-create.js'));
const listSrc = read('netlify/functions/document-templates-list.js');
const createSrc = read('netlify/functions/document-template-create.js');
const useSrc = read('netlify/functions/document-template-use.js');
const migSrc = read('supabase-migrations/35_document_templates.sql');
const pageHtml = read('dokument-vorlagen.html');
const editorSrc = read('lib/editor-tiptap.js');

// ─────────────────────────────────────────────────────────────────
//  P7-1 Migration 35 + 5 PROVA-Defaults
// ─────────────────────────────────────────────────────────────────

test('P7-1: Migration 35 — document_templates Tabelle mit RLS', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.document_templates/);
  assert.match(migSrc, /ALTER TABLE public\.document_templates ENABLE ROW LEVEL SECURITY/);
});

test('P7-1: Migration 35 — is_global Column + Workspace-NULL für Global', () => {
  assert.match(migSrc, /workspace_id UUID,/);  // nullable für Global
  assert.match(migSrc, /is_global BOOLEAN NOT NULL DEFAULT FALSE/);
});

test('P7-1: Migration 35 — RLS-Policy "is_global = TRUE OR workspace match"', () => {
  assert.match(migSrc, /is_global = TRUE OR/);
});

test('P7-1: Migration 35 — INSERT/UPDATE/DELETE blocken is_global=TRUE (Frontend-Security)', () => {
  assert.match(migSrc, /is_global = FALSE AND/);
});

test('P7-1: Migration 35 — 5 PROVA-Defaults aus F-04/F-09/F-10/F-15/F-19', () => {
  ['F-04', 'F-09', 'F-10', 'F-15', 'F-19'].forEach(kat => {
    assert.match(migSrc, new RegExp("'" + kat + "'"));
  });
});

test('P7-1: Migration 35 — 4 Indizes (workspace, global, kategorie, use_count)', () => {
  assert.match(migSrc, /idx_doc_templates_workspace/);
  assert.match(migSrc, /idx_doc_templates_global/);
  assert.match(migSrc, /idx_doc_templates_kat/);
  assert.match(migSrc, /idx_doc_templates_use_count/);
});

// ─────────────────────────────────────────────────────────────────
//  P7-2 document-templates-list Lambda
// ─────────────────────────────────────────────────────────────────

test('P7-2: List exports VALID_FILTERS = [alle, eigene, prova_default, docx_import]', () => {
  assert.deepStrictEqual(ListLambda.__VALID_FILTERS, ['alle', 'eigene', 'prova_default', 'docx_import']);
});

test('P7-2: List Lambda hat requireAuth + GET-only', () => {
  assert.match(listSrc, /requireAuth/);
  assert.match(listSrc, /event\.httpMethod !== ['"]GET['"]/);
});

test('P7-2: List Lambda sortiert use_count DESC + last_used DESC', () => {
  assert.match(listSrc, /\.order\(['"]use_count['"], \{ ascending: false/);
  assert.match(listSrc, /\.order\(['"]last_used_at['"], \{ ascending: false/);
});

test('P7-2: List Lambda filter prova_default → is_global=TRUE', () => {
  assert.match(listSrc, /filter === ['"]prova_default['"][\s\S]*?is_global['"]?,?\s*true/);
});

// ─────────────────────────────────────────────────────────────────
//  P7-3 document-template-create Lambda
// ─────────────────────────────────────────────────────────────────

test('P7-3: Create exports VALID_WEGE = [weg_a, weg_b, weg_c]', () => {
  assert.deepStrictEqual(CreateLambda.__VALID_WEGE, ['weg_a', 'weg_b', 'weg_c']);
});

test('P7-3: Create exports VALID_SOURCES = [user, docx_import] (KEIN prova_default)', () => {
  assert.deepStrictEqual(CreateLambda.__VALID_SOURCES, ['user', 'docx_import']);
});

test('P7-3: Create Lambda is_global IMMER false (Security)', () => {
  assert.match(createSrc, /is_global:\s*false/);
});

test('P7-3: Create Lambda hat RateLimit 30/60', () => {
  assert.match(createSrc, /RateLimit\.check\([^,]+,\s*30,\s*60/);
});

test('P7-3: Create Lambda Workspace-Resolution profiles → workspace_memberships', () => {
  assert.match(createSrc, /\.from\(['"]profiles['"]\)/);
  assert.match(createSrc, /\.from\(['"]workspace_memberships['"]\)/);
});

test('P7-3: Create Lambda validiert weg + content_json', () => {
  assert.match(createSrc, /weg invalid/);
  assert.match(createSrc, /content_json \(object\) pflicht/);
});

// ─────────────────────────────────────────────────────────────────
//  P7-4 document-template-use Lambda
// ─────────────────────────────────────────────────────────────────

test('P7-4: Use Lambda inkrementiert use_count + last_used_at', () => {
  assert.match(useSrc, /use_count:\s*newCount/);
  assert.match(useSrc, /last_used_at:\s*new Date\(\)\.toISOString\(\)/);
});

test('P7-4: Use Lambda template_id pflicht', () => {
  assert.match(useSrc, /template_id pflicht/);
});

// ─────────────────────────────────────────────────────────────────
//  P7-5 Frontend Page + Editor-Toolbar
// ─────────────────────────────────────────────────────────────────

test('P7-5: dokument-vorlagen.html hat 4 Filter-Tabs', () => {
  ['alle', 'eigene', 'prova_default', 'docx_import'].forEach(f => {
    assert.match(pageHtml, new RegExp('data-filter=["\']' + f + '["\']'));
  });
});

test('P7-5: dokument-vorlagen.html ruft document-templates-list + use', () => {
  assert.match(pageHtml, /\/\.netlify\/functions\/document-templates-list/);
  assert.match(pageHtml, /\/\.netlify\/functions\/document-template-use/);
});

test('P7-5: dokument-vorlagen.html search-Input mit Debounce', () => {
  assert.match(pageHtml, /id=["']tpl-search["']/);
  assert.match(pageHtml, /clearTimeout\(debounceTimer\)/);
});

test('P7-5: dokument-vorlagen.html Source-Badges (PROVA/Eigene/DOCX)', () => {
  assert.match(pageHtml, /tpl-card-source--prova_default/);
  assert.match(pageHtml, /tpl-card-source--user/);
  assert.match(pageHtml, /tpl-card-source--docx_import/);
});

test('P7-5: editor-tiptap.js Toolbar hat "Als Vorlage" Button', () => {
  assert.match(editorSrc, /Als Vorlage speichern/);
  assert.match(editorSrc, /\/\.netlify\/functions\/document-template-create/);
});

test('P7-5: dokument-vorlagen.html Card-Grid responsive (auto-fill 280px+)', () => {
  assert.match(pageHtml, /auto-fill,\s*minmax\(280px/);
});

test('P7-5: dokument-vorlagen.html Click + Keyboard accessible (Enter/Space)', () => {
  assert.match(pageHtml, /tabindex=["']0["']/);
  assert.match(pageHtml, /e\.key === ['"]Enter['"]/);
});
