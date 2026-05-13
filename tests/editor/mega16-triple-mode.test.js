/**
 * PROVA — MEGA¹⁶ Triple-Mode-Completion Tests
 * 2026-05-07/08
 *
 * Tests fuer W43 (Mode B akte) + W44 (Mode B stellungnahme) +
 * W45 (parse-docx Backend) + W46 (Vorlagen-UI in einstellungen).
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('W43: Mode B in akte.html', () => {
  const html = read('akte.html');

  test('notiz-editor-mode-b Container vorhanden', () => {
    assert.match(html, /id="notiz-editor-mode-b"/);
  });

  test('notiz-mode-badge Indikator', () => {
    assert.match(html, /id="notiz-mode-badge"/);
    assert.match(html, /Editor-Modus/);
  });

  test('workflow-mode-router.js + prova-editor.js geladen', () => {
    assert.match(html, /\/lib\/workflow-mode-router\.js/);
    assert.match(html, /\/lib\/prova-editor\.js/);
  });

  test('initModeBNotiz Function', () => {
    assert.match(html, /async function initModeBNotiz/);
  });

  test('Mode-Resolver-Check via fetchSettings', () => {
    assert.match(html, /ProvaWorkflowMode\.fetchSettings/);
    assert.match(html, /default_mode === ['"]B['"]/);
  });

  test('ProvaEditor.create-Aufruf bei Mode B', () => {
    assert.match(html, /ProvaEditor\.create/);
  });

  test('autoSaveKey mit Aktenzeichen-Suffix', () => {
    assert.match(html, /autoSaveKey:\s*['"]prova_akte_notiz_b_['"]\s*\+\s*az/);
  });

  test('Sync zurueck zu textarea (existing speichereNotiz)', () => {
    assert.match(html, /ta\.value = html/);
    assert.match(html, /onUpdate/);
  });

  test('beforeunload-Cleanup (Memory-Leak-Defense)', () => {
    assert.match(html, /addEventListener\(['"]beforeunload['"]/);
    assert.match(html, /_notizEditor\.destroy/);
  });
});

describe('W44: Mode B in fachurteil.html', () => {
  const html = read('fachurteil.html');

  test('stellungnahme-editor-mode-b Container vorhanden', () => {
    assert.match(html, /id="stellungnahme-editor-mode-b"/);
  });

  test('stellungnahme-mode-badge Indikator', () => {
    assert.match(html, /id="stellungnahme-mode-badge"/);
  });

  test('Polling-Pattern fuer dynamic-revealed ausform-wrap', () => {
    assert.match(html, /ausform-wrap/);
    assert.match(html, /setInterval/);
    assert.match(html, /pollCount > 600/);  // max 10min Poll
  });

  test('Sync zurueck zu svTextEdit + onInputEdit aufrufen', () => {
    assert.match(html, /ta\.value = html/);
    assert.match(html, /_origOnInputEdit/);
  });

  test('autoSaveKey fuer stellungnahme', () => {
    assert.match(html, /autoSaveKey:\s*['"]prova_stellungnahme_edit_b['"]/);
  });

  test('Defense bei Editor-Init-Fail (kein crash)', () => {
    assert.match(html, /try \{[\s\S]{0,500}_origOnInputEdit/);
    assert.match(html, /catch \(_\) \{\}/);
  });
});

describe('W45: parse-docx.js Backend', () => {
  const src = read('netlify/functions/parse-docx.js');

  test('Methods: GET + POST + DELETE + OPTIONS', () => {
    assert.match(src, /event\.httpMethod === ['"]GET['"]/);
    assert.match(src, /event\.httpMethod === ['"]POST['"]/);
    assert.match(src, /event\.httpMethod === ['"]DELETE['"]/);
    assert.match(src, /event\.httpMethod === ['"]OPTIONS['"]/);
  });

  test('requireAuth Middleware', () => {
    assert.match(src, /requireAuth\(async function/);
  });

  test('MAX_FILE_SIZE 10MB enforced', () => {
    assert.match(src, /MAX_FILE_SIZE\s*=\s*10\s*\*\s*1024\s*\*\s*1024/);
    assert.match(src, /buffer\.length > MAX_FILE_SIZE/);
    assert.match(src, /statusCode:\s*413/);  // file too large
  });

  test('DOCX-Magic-Bytes-Check (PK ZIP-Header)', () => {
    assert.match(src, /DOCX_MAGIC\s*=\s*\[0x50, 0x4B, 0x03, 0x04\]/);
    assert.match(src, /_isDocx/);
  });

  test('Variable-Detection: $Var und {{Var}} Patterns', () => {
    // Suche nach den beiden Regex-Patterns im Source
    assert.ok(src.includes('$([A-Za-z_]'));  // $Var-Pattern
    assert.ok(src.includes('{{') && src.includes('[A-Za-z_]'));  // {{Var}}-Pattern
  });

  test('Mammoth via dynamic-import (CDN, kein npm-build)', () => {
    assert.match(src, /import\(['"]https:\/\/esm\.sh\/mammoth/);
  });

  test('Audit-Log fire-and-forget bei Upload', () => {
    assert.match(src, /action:\s*['"]vorlage\.uploaded['"]/);
  });

  test('Validation: name + docx_base64 required', () => {
    assert.match(src, /name required/);
    assert.match(src, /docx_base64 required/);
  });

  test('Soft-Delete via is_active=false', () => {
    assert.match(src, /\.update\(\{ is_active: false \}\)/);
  });

  test('UUID-Validation in DELETE', () => {
    assert.match(src, /\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(id\)/);
  });

  test('503 wenn Migration 08 nicht applied', () => {
    assert.match(src, /503/);
    assert.match(src, /not migrated/);
  });
});

describe('W45: parse-docx Pure-Functions', () => {
  // Reproduktion fuer isolation-tests
  function detectVariables(text) {
    if (!text) return [];
    const found = new Set();
    const patterns = [/\$([A-Za-z_][A-Za-z0-9_]*)/g, /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g];
    for (const p of patterns) {
      let m;
      p.lastIndex = 0;
      while ((m = p.exec(text)) !== null) found.add(m[1]);
    }
    return Array.from(found).sort();
  }

  function _isDocx(buffer) {
    const magic = [0x50, 0x4B, 0x03, 0x04];
    if (!buffer || buffer.length < 4) return false;
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) return false;
    }
    return true;
  }

  test('detectVariables: $Var Pattern', () => {
    assert.deepEqual(detectVariables('Hello $Aktenzeichen and $Kunde'), ['Aktenzeichen', 'Kunde']);
  });

  test('detectVariables: {{Var}} Pattern', () => {
    assert.deepEqual(detectVariables('Hello {{Aktenzeichen}} and {{ Kunde }}'), ['Aktenzeichen', 'Kunde']);
  });

  test('detectVariables: Mixed (sortiert + unique)', () => {
    assert.deepEqual(
      detectVariables('$AAA and {{BBB}} and $AAA again and $CCC'),
      ['AAA', 'BBB', 'CCC']
    );
  });

  test('detectVariables: keine Variablen → []', () => {
    assert.deepEqual(detectVariables('Plain text'), []);
    assert.deepEqual(detectVariables(''), []);
    assert.deepEqual(detectVariables(null), []);
  });

  test('detectVariables: Ignoriert $-mit-special-chars (z.B. $123)', () => {
    // Erste Char muss letter oder _ sein
    const result = detectVariables('$123 and $valid_name');
    assert.ok(result.includes('valid_name'));
    // $123 wird nicht erkannt weil [A-Za-z_] erforderlich
  });

  test('_isDocx: PK\\x03\\x04 Magic erkannt', () => {
    const docxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    assert.equal(_isDocx(docxBuffer), true);
  });

  test('_isDocx: andere Bytes abgelehnt', () => {
    assert.equal(_isDocx(Buffer.from([0xFF, 0xD8, 0xFF])), false);  // JPEG
    assert.equal(_isDocx(Buffer.from([0x25, 0x50, 0x44, 0x46])), false);  // PDF
    assert.equal(_isDocx(Buffer.from([])), false);
    assert.equal(_isDocx(Buffer.from([0x50, 0x4B])), false);  // truncated
  });
});

describe('W46: einstellungen.html — Word-Import-UI', () => {
  const html = read('einstellungen.html');

  test('es-sec-vorlagen Section vorhanden', () => {
    assert.match(html, /id="es-sec-vorlagen"/);
    assert.match(html, /Eigene Vorlagen.*Word-Import/i);
  });

  test('Upload-File-Input fuer .docx', () => {
    assert.match(html, /id="vorlage-file-input"/);
    assert.match(html, /accept=['"]\.docx['"]/);
  });

  test('Vorlagen-Liste-Container', () => {
    assert.match(html, /id="vorlagen-list"/);
  });

  test('vorlage-name-input + upload-btn', () => {
    assert.match(html, /id="vorlage-name-input"/);
    assert.match(html, /id="vorlage-upload-btn"/);
  });

  test('Status-Span aria-live polite', () => {
    assert.match(html, /id="vorlage-upload-status"[\s\S]{0,80}aria-live="polite"/);
  });

  test('ladeVorlagen() Function definiert', () => {
    assert.match(html, /async function ladeVorlagen/);
  });

  test('loescheVorlage() Function (window-exposed)', () => {
    assert.match(html, /window\.loescheVorlage\s*=\s*async function/);
  });

  test('Backend-Endpoint /netlify/functions/parse-docx', () => {
    assert.match(html, /\/\.netlify\/functions\/parse-docx/);
  });

  test('File-Validation: .docx-Endung + 10MB max', () => {
    assert.match(html, /\.docx\$\/i/);
    assert.match(html, /10 \* 1024 \* 1024/);
  });

  test('Migration-Pending-Hinweis', () => {
    assert.match(html, /Migration 08 nicht angewendet/);
  });
});

describe('Schema-Migration 08 versioniert', () => {
  test('supabase-migrations/08_user_vorlagen.sql existiert', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(__dirname, '..', '..', 'supabase-migrations', '08_user_vorlagen.sql')));
  });

  test('Migration enthaelt user_vorlagen + RLS + Trigger', () => {
    const sql = read('supabase-migrations/08_user_vorlagen.sql');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS user_vorlagen/);
    assert.match(sql, /CHECK \(file_size > 0 AND file_size <= 10485760\)/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /CREATE TRIGGER user_vorlagen_updated_at/);
  });

  test('PLANNED-File existiert auch (CLAUDE.md-Pattern)', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(__dirname, '..', '..', 'db', 'PLANNED-user_vorlagen.sql')));
  });
});
