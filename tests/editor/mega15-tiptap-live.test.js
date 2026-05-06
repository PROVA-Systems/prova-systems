/**
 * PROVA — MEGA¹⁵ TipTap-Editor LIVE Tests
 * 2026-05-06/07
 *
 * Tests fuer W31-W35: Schema-Migration + ProvaEditor + Backend + Settings-UI + Mode-B-Demo
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) { return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8'); }

describe('W31 Schema-Migration versioniert', () => {
  test('07_user_workflow_settings.sql existiert in /supabase-migrations/', () => {
    assert.doesNotThrow(() => fs.statSync(path.join(__dirname, '..', '..', 'supabase-migrations', '07_user_workflow_settings.sql')));
  });

  test('Migration-File hat versioned Header (Migration 07, MEGA¹⁵)', () => {
    const sql = read('supabase-migrations/07_user_workflow_settings.sql');
    assert.match(sql, /Migration 07/);
    assert.match(sql, /MEGA¹⁵ W31/);
  });

  test('Migration-File hat Marcel-Apply-Anweisung', () => {
    const sql = read('supabase-migrations/07_user_workflow_settings.sql');
    assert.match(sql, /Marcel.*approved/i);
    assert.match(sql, /Apply via Supabase/i);
  });

  test('Migration enthaelt Tabelle, RLS, ALTER auftraege, VIEW', () => {
    const sql = read('supabase-migrations/07_user_workflow_settings.sql');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS user_workflow_settings/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /ALTER TABLE auftraege/);
    assert.match(sql, /CREATE OR REPLACE VIEW v_user_workflow_resolved/);
  });

  test('Numbering-Sequenz: 07 nach 06', () => {
    const files = fs.readdirSync(path.join(__dirname, '..', '..', 'supabase-migrations'))
      .filter(f => /^\d{2}_/.test(f))
      .sort();
    assert.ok(files.includes('06_v3_patch_final_lueckenschluss.sql'));
    assert.ok(files.includes('07_user_workflow_settings.sql'));
  });
});

describe('W32 ProvaEditor Library', () => {
  const src = read('lib/prova-editor.js');

  test('window.ProvaEditor exposed', () => {
    assert.match(src, /window\.ProvaEditor\s*=/);
  });

  test('Public API: create + isAvailable', () => {
    assert.ok(src.includes('create: create'));
    assert.ok(src.includes('isAvailable: isAvailable'));
  });

  test('CDN-Approach via esm.sh', () => {
    assert.match(src, /TIPTAP_CDN_BASE\s*=\s*['"]https:\/\/esm\.sh\/['"]/);
  });

  test('Dynamic-Import (NICHT eager-Load)', () => {
    assert.match(src, /await Promise\.all\(\[/);
    assert.match(src, /import\(TIPTAP_CDN_BASE\s*\+\s*['"]@tiptap\/core@2['"]\)/);
  });

  test('TipTap-Extensions: StarterKit + Placeholder + Table + Link', () => {
    assert.match(src, /@tiptap\/starter-kit/);
    assert.match(src, /@tiptap\/extension-placeholder/);
    assert.match(src, /@tiptap\/extension-table/);
    assert.match(src, /@tiptap\/extension-link/);
  });

  test('Graceful Degradation: Textarea-Fallback bei TipTap-Fail', () => {
    assert.match(src, /_fallbackToTextarea/);
    assert.match(src, /_isFallback:\s*true/);
  });

  test('Auto-Save in localStorage (Page-Refresh-Defense)', () => {
    assert.match(src, /_autoSave/);
    assert.match(src, /_loadAutoSave/);
    assert.match(src, /localStorage\.setItem\(key, html\)/);
  });

  test('Toolbar mit ARIA-Labels', () => {
    assert.match(src, /setAttribute\(['"]role['"], ['"]toolbar['"]\)/);
    assert.match(src, /setAttribute\(['"]aria-label['"], ['"]Editor-Werkzeuge['"]\)/);
  });

  test('Custom KI-Button optional (wenn onKIRequest)', () => {
    assert.match(src, /typeof opts\.onKIRequest === ['"]function['"]/);
    assert.match(src, /'🤖 KI'/);
  });

  test('Page-Unload-Defense: editor.destroy() on beforeunload', () => {
    assert.match(src, /addEventListener\(['"]beforeunload['"]/);
    assert.match(src, /editor\.destroy\(\)/);
  });

  test('Cached Module-Loading (Promise-deduplication)', () => {
    assert.match(src, /_loadPromise/);
    assert.match(src, /if \(_tiptapModules\) return _tiptapModules/);
  });
});

describe('W32 ProvaEditor CSS', () => {
  const css = read('lib/prova-editor.css');

  test('PROVA-Design-System Variables', () => {
    assert.match(css, /var\(--primary,/);
    assert.match(css, /var\(--accent,/);
  });

  test('Toolbar mit Touch-Target ≥ 32px (Desktop)', () => {
    assert.match(css, /min-width:\s*32px/);
    assert.match(css, /min-height:\s*32px/);
  });

  test('Mobile: Touch-Target ≥ 40px + iOS-Zoom-Defense (font-size 16px)', () => {
    assert.match(css, /min-width:\s*40px/);
    assert.match(css, /font-size:\s*16px/);
  });

  test('Placeholder-Style fuer leeren Editor', () => {
    assert.match(css, /is-editor-empty/);
    assert.match(css, /data-placeholder/);
  });

  test('Reduced-Motion respektiert', () => {
    assert.match(css, /prefers-reduced-motion/);
  });
});

describe('W33 Backend workflow-settings.js', () => {
  const src = read('netlify/functions/workflow-settings.js');

  test('GET + PATCH Methods', () => {
    assert.match(src, /event\.httpMethod === ['"]GET['"]/);
    assert.match(src, /event\.httpMethod === ['"]PATCH['"]/);
  });

  test('requireAuth Middleware', () => {
    assert.match(src, /requireAuth\(async function/);
  });

  test('VALID_MODES Constraint A/B/C', () => {
    assert.match(src, /VALID_MODES\s*=\s*\[['"]A['"], ['"]B['"], ['"]C['"]\]/);
  });

  test('Validation: default_mode CHECK', () => {
    assert.match(src, /default_mode must be A\|B\|C/);
  });

  test('Validation: mode_c_vorlagen_ids UUIDs', () => {
    assert.match(src, /\^\[0-9a-f-\]\{36\}\$/);
  });

  test('Defensive: 503 wenn Tabelle nicht migriert', () => {
    assert.match(src, /503/);
    assert.match(src, /not yet migrated/);
  });

  test('Audit-Log fuer onboarding_completed', () => {
    assert.match(src, /action: ['"]onboarding\.completed['"]/);
  });

  test('Defaults bei fehlender Tabelle / fehlenden Settings', () => {
    assert.match(src, /_defaultSettings\(\)/);
    assert.match(src, /_fallback:\s*true/);
  });

  test('Upsert-Pattern (insert if not exists)', () => {
    assert.match(src, /\.upsert\(/);
    assert.match(src, /onConflict:\s*['"]user_id['"]/);
  });
});

describe('W33 Backend Validation Logic (reproduktion)', () => {
  function validateBody(body) {
    if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
    const updates = {};
    const errors = [];
    if (body.default_mode !== undefined) {
      if (['A','B','C'].indexOf(body.default_mode) === -1) errors.push('default_mode must be A|B|C');
      else updates.default_mode = body.default_mode;
    }
    if (body.onboarding_completed !== undefined) {
      if (typeof body.onboarding_completed !== 'boolean') errors.push('onboarding_completed must be boolean');
      else updates.onboarding_completed = body.onboarding_completed;
    }
    if (body.mode_c_vorlagen_ids !== undefined) {
      if (!Array.isArray(body.mode_c_vorlagen_ids)) errors.push('not array');
      else if (!body.mode_c_vorlagen_ids.every(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) {
        errors.push('invalid UUIDs');
      } else updates.mode_c_vorlagen_ids = body.mode_c_vorlagen_ids;
    }
    if (errors.length > 0) return { ok: false, error: errors.join('; ') };
    if (Object.keys(updates).length === 0) return { ok: false, error: 'no fields' };
    return { ok: true, updates };
  }

  test('Valider default_mode = ok', () => {
    assert.equal(validateBody({ default_mode: 'B' }).ok, true);
  });

  test('Invalider default_mode = error', () => {
    const r = validateBody({ default_mode: 'X' });
    assert.equal(r.ok, false);
    assert.match(r.error, /default_mode must be A\|B\|C/);
  });

  test('UUID-Validation: gueltige UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    assert.equal(validateBody({ mode_c_vorlagen_ids: [uuid] }).ok, true);
  });

  test('UUID-Validation: invalide UUIDs', () => {
    assert.equal(validateBody({ mode_c_vorlagen_ids: ['not-a-uuid'] }).ok, false);
  });

  test('onboarding_completed muss boolean sein', () => {
    assert.equal(validateBody({ onboarding_completed: 'yes' }).ok, false);
    assert.equal(validateBody({ onboarding_completed: true }).ok, true);
  });

  test('Empty body = error', () => {
    assert.equal(validateBody({}).ok, false);
    assert.equal(validateBody(null).ok, false);
  });
});

describe('W34 einstellungen.html — Workflow-Mode-Settings UI', () => {
  const html = read('einstellungen.html');

  test('Section "es-sec-workflow" vorhanden', () => {
    assert.match(html, /id="es-sec-workflow"/);
    assert.match(html, /Workflow-Modus/);
  });

  test('3 Mode-Cards (A/B/C)', () => {
    assert.match(html, /value="A".*?id="wfm-A"|id="wfm-A".*?value="A"/s);
    assert.match(html, /value="B".*?id="wfm-B"|id="wfm-B".*?value="B"/s);
    assert.match(html, /value="C".*?id="wfm-C"|id="wfm-C".*?value="C"/s);
  });

  test('Mode-C Card disabled (MEGA¹⁶-Pflicht)', () => {
    assert.match(html, /id="wfm-C"[^>]*disabled/);
    assert.match(html, /Bald|Mai 2026/);
  });

  test('Save-Button + Status-Span', () => {
    assert.match(html, /id="workflow-save-btn"/);
    assert.match(html, /id="workflow-save-status"/);
    assert.match(html, /role="status"[\s\S]*aria-live="polite"/);
  });

  test('speichereWorkflowMode Function definiert', () => {
    assert.match(html, /window\.speichereWorkflowMode\s*=\s*async function/);
  });

  test('Backend-Endpoint /netlify/functions/workflow-settings aufgerufen', () => {
    assert.match(html, /\/\.netlify\/functions\/workflow-settings/);
  });

  test('PATCH-Method mit JSON-Body', () => {
    assert.match(html, /method:\s*['"]PATCH['"]/);
    assert.match(html, /JSON\.stringify\(\{ default_mode/);
  });

  test('503-Handling: Migration-not-yet-applied Hinweis', () => {
    assert.match(html, /Migration nicht angewendet/);
  });

  test('workflow-mode-router.js geladen', () => {
    assert.match(html, /\/lib\/workflow-mode-router\.js/);
  });
});

describe('W35 briefvorlagen.html — Mode-B-Demo-Integration', () => {
  const html = read('briefvorlagen.html');

  test('ki-editor-mode-b Container vorhanden', () => {
    assert.match(html, /id="ki-editor-mode-b"/);
  });

  test('ki-mode-badge fuer Mode-B-Indikator', () => {
    assert.match(html, /id="ki-mode-badge"/);
    assert.match(html, /Editor-Modus/);
  });

  test('prova-editor.js + workflow-mode-router.js geladen', () => {
    assert.match(html, /\/lib\/prova-editor\.js/);
    assert.match(html, /\/lib\/workflow-mode-router\.js/);
  });

  test('aktiviereKIEdit() override fuer Mode B', () => {
    assert.match(html, /window\.aktiviereKIEdit\s*=\s*async function/);
  });

  test('Mode-Resolver-Logic: fetchSettings + check default_mode', () => {
    assert.match(html, /ProvaWorkflowMode\.fetchSettings/);
    assert.match(html, /default_mode/);
    assert.match(html, /_modeBActive/);
  });

  test('ProvaEditor.create-Aufruf bei Mode B', () => {
    assert.match(html, /ProvaEditor\.create/);
  });

  test('autoSaveKey fuer briefvorlagen_draft', () => {
    assert.match(html, /autoSaveKey:\s*['"]briefvorlagen_draft['"]/);
  });

  test('Mode-A-Fallback bleibt erhalten (existing aktivierKIEdit)', () => {
    assert.match(html, /_origAktivierKIEdit/);
    assert.match(html, /existing behaviour/);
  });

  test('Editor-destroy wenn neue Editor-Instance', () => {
    assert.match(html, /_activeEditor\.destroy/);
  });
});
