/**
 * PROVA — MEGA¹⁷ Mode-C Completion Tests
 * 2026-05-08
 *
 * Coverage:
 *   - W49: Migration 09 (auftraege.vorlage_id)
 *   - W50: prova-mode-c.js Library + Mapping-Modal-HTML
 *   - W51: akte.html Mode-C-Picker
 *   - W52: generate-pdf-mode-c.js Backend
 *   - W53: Mobile-Restriction CSS
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

// ─── Source-File-Reads ──────────────────────────────────────
const MIGRATION_09 = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '09_auftraege_vorlage.sql'), 'utf8');
const MODE_C_LIB_SRC = fs.readFileSync(path.join(ROOT, 'lib', 'prova-mode-c.js'), 'utf8');
const PARSE_DOCX_SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'parse-docx.js'), 'utf8');
const GEN_PDF_SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'generate-pdf-mode-c.js'), 'utf8');
const AKTE_SRC = fs.readFileSync(path.join(ROOT, 'akte.html'), 'utf8');
const EINST_SRC = fs.readFileSync(path.join(ROOT, 'einstellungen.html'), 'utf8');

// Library require (UMD-pattern)
const ProvaModeC = require(path.join(ROOT, 'lib', 'prova-mode-c.js'));
const PdfGen = require(path.join(ROOT, 'netlify', 'functions', 'generate-pdf-mode-c.js'));

describe('W49 — Migration 09 versioniert', () => {
  test('ALTER TABLE auftraege ADD vorlage_id', () => {
    assert.match(MIGRATION_09, /ALTER TABLE public\.auftraege/);
    assert.match(MIGRATION_09, /ADD COLUMN IF NOT EXISTS vorlage_id UUID/);
    assert.match(MIGRATION_09, /REFERENCES public\.user_vorlagen\(id\) ON DELETE SET NULL/);
  });

  test('ADD vorlage_variable_values JSONB', () => {
    assert.match(MIGRATION_09, /ADD COLUMN IF NOT EXISTS vorlage_variable_values JSONB/);
    assert.match(MIGRATION_09, /DEFAULT '\{\}'::jsonb/);
  });

  test('Idempotent + Index nur fuer aktive', () => {
    assert.match(MIGRATION_09, /CREATE INDEX IF NOT EXISTS idx_auftraege_vorlage/);
    assert.match(MIGRATION_09, /WHERE vorlage_id IS NOT NULL AND deleted_at IS NULL/);
  });
});

describe('W50 — ProvaModeC Library', () => {
  test('PROVA_FIELDS enthaelt mind. 25 Felder', () => {
    assert.ok(ProvaModeC.PROVA_FIELDS.length >= 25);
  });

  test('Jedes Feld hat key + label + group', () => {
    ProvaModeC.PROVA_FIELDS.forEach(f => {
      assert.ok(f.key && typeof f.key === 'string');
      assert.ok(f.label && typeof f.label === 'string');
      assert.ok(f.group && typeof f.group === 'string');
    });
  });

  test('PROVA_FIELDS deckt Akte + Objekt + Auftraggeber + SV + System', () => {
    const groups = new Set(ProvaModeC.PROVA_FIELDS.map(f => f.group));
    assert.ok(groups.has('Akte'));
    assert.ok(groups.has('Objekt'));
    assert.ok(groups.has('Auftraggeber'));
    assert.ok(groups.has('Sachverstaendiger'));
    assert.ok(groups.has('System'));
  });

  test('smartGuessField: $Aktenzeichen → akte.az', () => {
    assert.equal(ProvaModeC.smartGuessField('Aktenzeichen'), 'akte.az');
    assert.equal(ProvaModeC.smartGuessField('AZ'), 'akte.az');
    assert.equal(ProvaModeC.smartGuessField('Aktenz'), 'akte.az');
  });

  test('smartGuessField: $Auftraggeber → kunde.name', () => {
    assert.equal(ProvaModeC.smartGuessField('Auftraggeber'), 'kunde.name');
    assert.equal(ProvaModeC.smartGuessField('Kunde'), 'kunde.name');
    assert.equal(ProvaModeC.smartGuessField('Kundenname'), 'kunde.name');
  });

  test('smartGuessField: $Adresse → akte.objekt.adresse', () => {
    assert.equal(ProvaModeC.smartGuessField('Adresse'), 'akte.objekt.adresse');
    assert.equal(ProvaModeC.smartGuessField('Strasse'), 'akte.objekt.adresse');
  });

  test('smartGuessField: kein Match → null', () => {
    assert.equal(ProvaModeC.smartGuessField('Foobar'), null);
    assert.equal(ProvaModeC.smartGuessField('XYZ123'), null);
  });

  test('smartGuessField: leerer/null Input → null', () => {
    assert.equal(ProvaModeC.smartGuessField(''), null);
    assert.equal(ProvaModeC.smartGuessField(null), null);
    assert.equal(ProvaModeC.smartGuessField(undefined), null);
  });

  test('smartGuessField: $/{{}} prefixes werden ignoriert', () => {
    assert.equal(ProvaModeC.smartGuessField('$Aktenzeichen'), 'akte.az');
    assert.equal(ProvaModeC.smartGuessField('{{Kunde}}'), 'kunde.name');
  });

  test('escapeHtml: XSS-Defense', () => {
    assert.equal(ProvaModeC.escapeHtml('<script>'), '&lt;script&gt;');
    assert.equal(ProvaModeC.escapeHtml('"quote"'), '&quot;quote&quot;');
    assert.equal(ProvaModeC.escapeHtml(null), '');
  });

  test('interpolateHtml: $Var basic', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>Aktenzeichen: $Akte</p>',
      { Akte: 'akte.az' },
      { akte: { az: 'SCH-2026-001' } }
    );
    assert.equal(r.html, '<p>Aktenzeichen: SCH-2026-001</p>');
    assert.equal(r.applied, 1);
    assert.deepEqual(r.missing, []);
  });

  test('interpolateHtml: {{Var}} basic', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>Kunde: {{ Kunde }}</p>',
      { Kunde: 'kunde.name' },
      { kunde: { name: 'Maier GmbH' } }
    );
    assert.equal(r.html, '<p>Kunde: Maier GmbH</p>');
  });

  test('interpolateHtml: missing key bleibt unverändert + listed', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>$A und $B</p>',
      { A: 'akte.az' },  // B fehlt im Mapping
      { akte: { az: 'SCH-1' } }
    );
    assert.match(r.html, /SCH-1/);
    assert.match(r.html, /\$B/);  // B unaufgeloest
    assert.equal(r.applied, 1);
    assert.deepEqual(r.missing, ['B']);
  });

  test('interpolateHtml: HTML-Escape bei Werten', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>$X</p>',
      { X: 'akte.titel' },
      { akte: { titel: '<script>alert(1)</script>' } }
    );
    assert.match(r.html, /&lt;script&gt;/);
    assert.doesNotMatch(r.html, /<script>/);
  });

  test('interpolateHtml: nested path akte.objekt.adresse', () => {
    const r = ProvaModeC.interpolateHtml(
      '<p>$Adr</p>',
      { Adr: 'akte.objekt.adresse' },
      { akte: { objekt: { adresse: 'Hauptstr. 1' } } }
    );
    assert.equal(r.html, '<p>Hauptstr. 1</p>');
  });

  test('interpolateHtml: undefined dataContext sicher', () => {
    const r = ProvaModeC.interpolateHtml('<p>$X</p>', null, null);
    assert.equal(r.applied, 0);
    assert.deepEqual(r.missing, ['X']);
  });

  test('collectMappingValues: filtert null+undefined Werte', () => {
    const result = ProvaModeC.collectMappingValues(
      { A: 'akte.az', B: 'akte.fehlt', C: null },
      { akte: { az: 'X' } }
    );
    assert.equal(result.A, 'X');
    assert.equal(result.B, undefined);
    assert.equal(result.C, undefined);
  });
});

describe('W50 — einstellungen.html Mapping-Modal-Markup', () => {
  test('Modal-Container vorhanden', () => {
    assert.match(EINST_SRC, /id="vorlage-mapping-modal"/);
    assert.match(EINST_SRC, /role="dialog"/);
    assert.match(EINST_SRC, /aria-modal="true"/);
  });

  test('Modal-Liste-Container + Save-Button', () => {
    assert.match(EINST_SRC, /id="vmm-list"/);
    assert.match(EINST_SRC, /id="vmm-save-btn"/);
  });

  test('JS Functions exposed: openMappingModal, closeMappingModal, saveMappingModal', () => {
    assert.match(EINST_SRC, /window\.openMappingModal\s*=/);
    assert.match(EINST_SRC, /window\.closeMappingModal\s*=/);
    assert.match(EINST_SRC, /window\.saveMappingModal\s*=/);
  });

  test('PUT Request an parse-docx mit variable_mapping', () => {
    assert.match(EINST_SRC, /method:\s*['"]PUT['"]/);
    assert.match(EINST_SRC, /variable_mapping:\s*mapping/);
  });

  test('lib/prova-mode-c.js eingebunden', () => {
    assert.match(EINST_SRC, /<script src="\/lib\/prova-mode-c\.js"><\/script>/);
  });

  test('Auto-Detection nutzt smartGuessField', () => {
    assert.match(EINST_SRC, /ProvaModeC\.smartGuessField/);
  });

  test('Mapping-Status Anzeige in Vorlagen-Liste', () => {
    assert.match(EINST_SRC, /mapCount === varCount/);
    assert.match(EINST_SRC, /gemappt/);
  });
});

describe('W50 — parse-docx.js PUT-Endpoint', () => {
  test('PUT-Method handler vorhanden', () => {
    assert.match(PARSE_DOCX_SRC, /event\.httpMethod === ['"]PUT['"]/);
  });

  test('PUT validiert UUID + variable_mapping als object', () => {
    assert.match(PARSE_DOCX_SRC, /\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(id\)/);
    assert.match(PARSE_DOCX_SRC, /typeof mapping !== ['"]object['"]/);
  });

  test('PUT Sanity-Check fuer field-key Werte', () => {
    assert.match(PARSE_DOCX_SRC, /\[\^a-zA-Z0-9_\\\.\]/);
  });

  test('PUT Update auf user_vorlagen mit variable_mapping', () => {
    assert.match(PARSE_DOCX_SRC, /\.update\(\{\s*variable_mapping:\s*mapping/);
  });

  test('Method-Allowed-Liste aktualisiert', () => {
    assert.match(PARSE_DOCX_SRC, /allowed:\s*\[['"]GET['"],\s*['"]POST['"],\s*['"]PUT['"],\s*['"]DELETE['"]\]/);
  });
});

describe('W51 — akte.html Mode-C-Picker', () => {
  test('Mode-C-Card im rechten Sidebar', () => {
    assert.match(AKTE_SRC, /id="mode-c-card"/);
    assert.match(AKTE_SRC, /Mode C Vorlage/);
  });

  test('Vorlage-Select + Empty-State + Preview-Button', () => {
    assert.match(AKTE_SRC, /id="mode-c-vorlage-select"/);
    assert.match(AKTE_SRC, /id="mode-c-empty"/);
    assert.match(AKTE_SRC, /id="mode-c-preview-btn"/);
  });

  test('initModeCPicker function defined', () => {
    assert.match(AKTE_SRC, /async function initModeCPicker/);
  });

  test('Settings-Resolver checkt default_mode === C', () => {
    assert.match(AKTE_SRC, /settings\.default_mode === ['"]C['"]/);
  });

  test('GET parse-docx fuer Vorlage-Liste', () => {
    assert.match(AKTE_SRC, /\/\.netlify\/functions\/parse-docx/);
  });

  test('Auftrag-Update via data-store auftraege.update', () => {
    assert.match(AKTE_SRC, /ds\.auftraege\.update/);
    assert.match(AKTE_SRC, /vorlage_id:\s*newId/);
  });

  test('Polling-Pattern fuer _currentAuftrag (max 6s)', () => {
    assert.match(AKTE_SRC, /maxAttempts\s*=\s*60/);
    assert.match(AKTE_SRC, /window\._currentAuftrag/);
  });

  test('window.modeCPreview oeffnet Vorschau', () => {
    assert.match(AKTE_SRC, /window\.modeCPreview\s*=/);
    assert.match(AKTE_SRC, /generate-pdf-mode-c/);
  });
});

describe('W52 — generate-pdf-mode-c.js Backend', () => {
  test('GET-only handler', () => {
    assert.match(GEN_PDF_SRC, /event\.httpMethod !== ['"]GET['"]/);
    assert.match(GEN_PDF_SRC, /allowed:\s*\[['"]GET['"]\]/);
  });

  test('UUID-Validation auftrag_id', () => {
    assert.match(GEN_PDF_SRC, /\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(auftragId\)/);
  });

  test('Auftrag-Load mit vorlage_id select', () => {
    assert.match(GEN_PDF_SRC, /\.from\(['"]auftraege['"]\)/);
    assert.match(GEN_PDF_SRC, /vorlage_id/);
  });

  test('Migration-Pending-Erkennung (vorlage_id-column)', () => {
    assert.match(GEN_PDF_SRC, /09_auftraege_vorlage\.sql/);
  });

  test('User_vorlagen-Load mit RLS via user_id', () => {
    assert.match(GEN_PDF_SRC, /\.from\(['"]user_vorlagen['"]\)/);
    assert.match(GEN_PDF_SRC, /\.eq\(['"]user_id['"],\s*userId\)/);
  });

  test('Interpolation via ProvaModeC-Library', () => {
    assert.match(GEN_PDF_SRC, /lib\.interpolateHtml/);
  });

  test('Returnt interpolated_html + applied + missing', () => {
    assert.match(GEN_PDF_SRC, /interpolated_html:\s*result\.html/);
    assert.match(GEN_PDF_SRC, /applied:\s*result\.applied/);
    assert.match(GEN_PDF_SRC, /missing:\s*result\.missing/);
  });

  test('TODO-Marker fuer PDF-Service-Decision', () => {
    assert.match(GEN_PDF_SRC, /todo:\s*['"]pdf-service['"]/);
    assert.match(GEN_PDF_SRC, /pdf_service_options/);
  });

  test('buildDataContext baut akte/kunde/sv/system', () => {
    const ctx = PdfGen._test.buildDataContext(
      { az: 'X', titel: 'T', objekt: { plz: '12345' } },
      { name: 'K', email: 'k@x' },
      { name: 'SV', titel: 'Dipl' }
    );
    assert.equal(ctx.akte.az, 'X');
    assert.equal(ctx.kunde.name, 'K');
    assert.equal(ctx.sv.titel, 'Dipl');
    assert.match(ctx.system.heute, /^\d{2}\.\d{2}\.\d{4}$/);
    assert.equal(ctx.akte.objekt.plz, '12345');
  });

  test('buildDataContext: kunde=null sicher (keine TypeError)', () => {
    const ctx = PdfGen._test.buildDataContext({ az: 'X' }, null, null);
    assert.equal(ctx.kunde.name, '');
    assert.equal(ctx.sv.name, '');
  });

  test('buildDataContext: kosten formatiert mit Eurozeichen', () => {
    const ctx = PdfGen._test.buildDataContext(
      { az: 'X', kosten_geschaetzt_brutto: 1234.5 },
      null, null
    );
    assert.match(ctx.akte.kosten_geschaetzt_brutto, /1234\.50.*€/);
  });
});

describe('W53 — Mobile-Restriction CSS', () => {
  test('CSS @media max-width 768px in einstellungen.html', () => {
    assert.match(EINST_SRC, /@media \(max-width:\s*768px\)/);
    assert.match(EINST_SRC, /\.mode-c-mobile-hint/);
  });

  test('Hint-Text "Word-Vorlagen am Desktop"', () => {
    assert.match(EINST_SRC, /Word-Vorlagen am Desktop/);
  });

  test('File-Upload-Bereich auf Mobile gedimmt', () => {
    assert.match(EINST_SRC, /opacity:\s*0\.5;\s*pointer-events:\s*none/);
  });
});
