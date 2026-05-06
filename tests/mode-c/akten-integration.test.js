/**
 * PROVA — Mode-C Akten-Integration Tests
 * MEGA¹⁷-PERFECTION W62 (2026-05-08)
 *
 * Coverage:
 *   - akte.html Mode-C-Card + Picker
 *   - data-store auftraege.update mit vorlage_id
 *   - Polling-Pattern fuer _currentAuftrag
 *   - Migration 09 versioniert
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const AKTE = fs.readFileSync(path.join(ROOT, 'akte.html'), 'utf8');
const MIG_09 = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '09_auftraege_vorlage.sql'), 'utf8');

describe('Migration 09 — auftraege.vorlage_id', () => {
  test('ALTER TABLE + REFERENCES + ON DELETE SET NULL', () => {
    assert.match(MIG_09, /ALTER TABLE public\.auftraege/);
    assert.match(MIG_09, /vorlage_id UUID/);
    assert.match(MIG_09, /REFERENCES public\.user_vorlagen\(id\) ON DELETE SET NULL/);
  });

  test('Idempotent: ADD COLUMN IF NOT EXISTS', () => {
    assert.match(MIG_09, /ADD COLUMN IF NOT EXISTS vorlage_id/);
    assert.match(MIG_09, /ADD COLUMN IF NOT EXISTS vorlage_variable_values/);
  });

  test('Partial-Index nur fuer aktive Auftraege mit Vorlage', () => {
    assert.match(MIG_09, /CREATE INDEX IF NOT EXISTS idx_auftraege_vorlage/);
    assert.match(MIG_09, /WHERE vorlage_id IS NOT NULL AND deleted_at IS NULL/);
  });

  test('vorlage_variable_values JSONB Cache-Layer', () => {
    assert.match(MIG_09, /vorlage_variable_values JSONB/);
    assert.match(MIG_09, /DEFAULT '\{\}'::jsonb/);
  });
});

describe('akte.html — Mode-C-Card', () => {
  test('Card-Container + Title', () => {
    assert.match(AKTE, /id="mode-c-card"/);
    assert.match(AKTE, /Mode C Vorlage/);
  });

  test('Vorlage-Selector + Empty-State', () => {
    assert.match(AKTE, /id="mode-c-vorlage-select"/);
    assert.match(AKTE, /id="mode-c-empty"/);
  });

  test('Mapping-Status + Vorschau-Button + PDF-Button', () => {
    assert.match(AKTE, /id="mode-c-mapping-status"/);
    assert.match(AKTE, /id="mode-c-preview-btn"/);
    assert.match(AKTE, /id="mode-c-pdf-btn"/);
  });
});

describe('akte.html — Mode-C-Picker JS', () => {
  test('initModeCPicker function', () => {
    assert.match(AKTE, /async function initModeCPicker/);
  });

  test('effectiveMode mit Mobile-Fallback (W58)', () => {
    assert.match(AKTE, /window\.ProvaWorkflowMode\.effectiveMode/);
    assert.match(AKTE, /eff\.source === ['"]mobile-fallback['"]/);
  });

  test('Vorlage-Liste via parse-docx GET', () => {
    assert.match(AKTE, /\/\.netlify\/functions\/parse-docx/);
    assert.match(AKTE, /data\.vorlagen/);
  });

  test('Live-Save via data-store auftraege.update', () => {
    assert.match(AKTE, /import\(['"]\/lib\/data-store\.js['"]\)/);
    assert.match(AKTE, /ds\.auftraege\.update\(_modeCAuftragId,\s*\{\s*vorlage_id/);
  });

  test('Polling-Pattern fuer _currentAuftrag (max 60 ticks)', () => {
    assert.match(AKTE, /const maxAttempts\s*=\s*60/);
    assert.match(AKTE, /window\._currentAuftrag/);
  });

  test('Vorschau-Button window.modeCPreview', () => {
    assert.match(AKTE, /window\.modeCPreview\s*=/);
  });

  test('PDF-Button window.modeCDownloadPdf (W60)', () => {
    assert.match(AKTE, /window\.modeCDownloadPdf\s*=/);
    assert.match(AKTE, /ProvaPdfModeC\.generateAndDownload/);
  });

  test('Mobile-Fallback Toast nur einmal pro Session', () => {
    assert.match(AKTE, /sessionStorage\.getItem\(['"]prova_mobile_fallback_shown['"]\)/);
    assert.match(AKTE, /sessionStorage\.setItem\(['"]prova_mobile_fallback_shown['"]/);
  });
});
