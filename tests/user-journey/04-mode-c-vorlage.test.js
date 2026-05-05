/**
 * PROVA — User-Journey 04: Mode C Vorlagen-Workflow (MEGA²⁴ Block 6)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Journey 04 — Mode-C Docx-Upload-Validation', () => {
  const MAX = 5 * 1024 * 1024;

  function validateDocx(file) {
    if (!file) return { ok: false, error: 'no file' };
    const ext = String(file.name || '').toLowerCase();
    if (!ext.endsWith('.docx')) return { ok: false, error: 'not docx' };
    if (file.size <= 0) return { ok: false, error: 'empty' };
    if (file.size > MAX) return { ok: false, error: 'too large' };
    return { ok: true };
  }

  test('akzeptiert .docx', () => {
    assert.equal(validateDocx({ name: 'vorlage.docx', size: 50000 }).ok, true);
  });

  test('lehnt .doc ab', () => {
    assert.equal(validateDocx({ name: 'old.doc', size: 50000 }).ok, false);
  });

  test('lehnt > 5MB ab', () => {
    assert.equal(validateDocx({ name: 'big.docx', size: 6 * 1024 * 1024 }).ok, false);
  });
});

describe('Journey 04 — Variable-Extraction aus Word-Template', () => {
  // Pattern {{aktenzeichen}} oder {aktenzeichen}
  function extractVariables(text) {
    if (!text) return [];
    const found = new Set();
    const dual = /\{\{([a-z_][a-z_0-9]*)\}\}/gi;
    const single = /(?<!\{)\{([a-z_][a-z_0-9]*)\}(?!\})/gi;
    let m;
    while ((m = dual.exec(text)) !== null) found.add(m[1].toLowerCase());
    while ((m = single.exec(text)) !== null) found.add(m[1].toLowerCase());
    return Array.from(found).sort();
  }

  test('extrahiert {{aktenzeichen}} und {datum}', () => {
    const r = extractVariables('Sehr geehrter {{name}}, AZ {aktenzeichen}, {datum}.');
    assert.deepEqual(r, ['aktenzeichen', 'datum', 'name']);
  });

  test('returnt empty array fuer leeren Text', () => {
    assert.deepEqual(extractVariables(''), []);
  });

  test('vermeidet Duplikate', () => {
    const r = extractVariables('{{az}} und nochmal {{az}}');
    assert.equal(r.length, 1);
  });
});

describe('Journey 04 — Confidence-Mapping', () => {
  // Auto-Match-Confidence: hoch (exakt), mittel (Suffix-Match), niedrig (Fuzzy)
  function classifyConfidence(varName, candidate) {
    if (!varName || !candidate) return 'niedrig';
    const v = varName.toLowerCase();
    const c = candidate.toLowerCase();
    if (v === c) return 'hoch';
    if (c.endsWith('_' + v) || c.endsWith(v)) return 'mittel';
    if (c.indexOf(v) >= 0 || v.indexOf(c) >= 0) return 'niedrig';
    return 'keine';
  }

  test('hoch bei exaktem Match', () => {
    assert.equal(classifyConfidence('aktenzeichen', 'aktenzeichen'), 'hoch');
  });

  test('mittel bei Suffix-Match', () => {
    assert.equal(classifyConfidence('name', 'kunde_name'), 'mittel');
  });

  test('niedrig bei partial-Match', () => {
    assert.equal(classifyConfidence('akte', 'aktenzeichen'), 'niedrig');
  });

  test('keine bei keiner Beziehung', () => {
    assert.equal(classifyConfidence('xyz', 'datum'), 'keine');
  });
});

describe('Journey 04 — Mobile-Fallback Mode-C → Mode-A', () => {
  function effectiveMode(params) {
    const VALID = ['A', 'B', 'C'];
    let mode = 'A';
    let source = 'fallback';
    if (params.userDefault && VALID.includes(params.userDefault)) { mode = params.userDefault; source = 'default'; }
    if (params.auftragOverride && VALID.includes(params.auftragOverride)) { mode = params.auftragOverride; source = 'override'; }
    if (params.isMobile && mode === 'C') {
      return { mode: 'A', source: 'mobile-fallback', original: 'C' };
    }
    return { mode, source };
  }

  test('Mode-C auf Mobile faellt zurueck auf A', () => {
    const r = effectiveMode({ userDefault: 'C', isMobile: true });
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'mobile-fallback');
    assert.equal(r.original, 'C');
  });

  test('Mode-C auf Desktop bleibt C', () => {
    const r = effectiveMode({ userDefault: 'C', isMobile: false });
    assert.equal(r.mode, 'C');
    assert.equal(r.source, 'default');
  });

  test('Mode-B auf Mobile bleibt B (TipTap funktioniert auf Touch)', () => {
    const r = effectiveMode({ userDefault: 'B', isMobile: true });
    assert.equal(r.mode, 'B');
  });
});
