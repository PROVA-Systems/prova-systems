'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Save = require(path.join(ROOT, 'netlify', 'functions', 'document-save.js'));
const saveSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'document-save.js'), 'utf8');
const loadSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'document-load.js'), 'utf8');
const migSrc = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '33_documents_editor.sql'), 'utf8');

test('P1: VALID_WEGE = ["weg_a", "weg_b", "weg_c"]', () => {
  assert.deepStrictEqual(Save.__VALID_WEGE, ['weg_a', 'weg_b', 'weg_c']);
});

test('P1: document-save Lambda hat requireAuth + Rate-Limit 60/60', () => {
  assert.match(saveSrc, /requireAuth/);
  assert.match(saveSrc, /RateLimit\.check\(context\.userEmail,\s*60,\s*60/);
});

test('P1: document-save lehnt Methoden außer POST/OPTIONS ab', () => {
  assert.match(saveSrc, /event\.httpMethod !== ['"]POST['"]/);
});

test('P1: document-save validiert weg-Wert + content_json', () => {
  assert.match(saveSrc, /weg ungültig/);
  assert.match(saveSrc, /content_json \(object\) pflicht/);
});

test('P1: document-save Workspace-Resolution profiles → workspace_memberships', () => {
  assert.match(saveSrc, /\.from\(['"]profiles['"]\)/);
  assert.match(saveSrc, /\.from\(['"]workspace_memberships['"]\)/);
});

test('P1: document-save bei fremdem Workspace → 403', () => {
  assert.match(saveSrc, /Workspace-Zugriff verweigert/);
  assert.match(saveSrc, /403/);
});

test('P1: document-save versions_nr wird inkrementiert (current_version+1)', () => {
  assert.match(saveSrc, /versionNr = \(existing\.current_version \|\| 0\) \+ 1/);
});

test('P1: document-save NEUE Zeile in documents_versions pro Save (kein Diff)', () => {
  assert.match(saveSrc, /\.from\(['"]documents_versions['"]\)\.insert/);
  assert.match(saveSrc, /content_json: body\.content_json/);
});

test('P1: document-save berechnet byte_size für Versions-Tracking', () => {
  assert.match(saveSrc, /new TextEncoder\(\)\.encode\(contentJsonStr\)\.length/);
});

test('P1: document-load GET-only + id-Param-Required', () => {
  assert.match(loadSrc, /event\.httpMethod !== ['"]GET['"]/);
  assert.match(loadSrc, /id pflicht/);
});

test('P1: document-load liefert Versions-Liste + optional version-Override', () => {
  assert.match(loadSrc, /\.from\(['"]documents_versions['"]\)/);
  assert.match(loadSrc, /q\.version/);
  assert.match(loadSrc, /version_nr/);
});

test('P1: Migration 33 hat documents + documents_versions Tabellen', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.documents \(/);
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.documents_versions \(/);
});

test('P1: Migration 33 RLS workspace-isoliert', () => {
  assert.match(migSrc, /ALTER TABLE public\.documents ENABLE ROW LEVEL SECURITY/);
  assert.match(migSrc, /ALTER TABLE public\.documents_versions ENABLE ROW LEVEL SECURITY/);
  assert.match(migSrc, /workspace_id IN \(SELECT workspace_id FROM public\.workspace_memberships/);
});

test('P1: Migration 33 — Spalten für 3-Wege-System (weg, locked_sections)', () => {
  assert.match(migSrc, /weg TEXT NOT NULL DEFAULT 'weg_a'/);
  assert.match(migSrc, /locked_sections JSONB/);
});

test('P1: Migration 33 — DOCX-Import-Felder (weg_b)', () => {
  assert.match(migSrc, /imported_from_docx BOOLEAN/);
  assert.match(migSrc, /imported_filename TEXT/);
  assert.match(migSrc, /imported_warnings JSONB/);
});

test('P1: Migration 33 — Soft-Delete via deleted_at', () => {
  assert.match(migSrc, /deleted_at TIMESTAMPTZ/);
  assert.match(migSrc, /WHERE deleted_at IS NULL/);  // Partial-Index
});

test('P1: documents_versions UNIQUE (document_id, version_nr) für Race-Condition-Safety', () => {
  assert.match(migSrc, /CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_versions ON public\.documents_versions\(document_id, version_nr\)/);
});

test('P1: documents_versions ON DELETE CASCADE — Cleanup wenn Doc gelöscht', () => {
  assert.match(migSrc, /REFERENCES public\.documents\(id\) ON DELETE CASCADE/);
});
