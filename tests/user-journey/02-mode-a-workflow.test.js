/**
 * PROVA — User-Journey 02: Mode A Standard-Workflow (MEGA²⁴ Block 6)
 *
 * Story: SV erstellt Akte → Foto-Upload → Diktat → KI-Hilfe → PDF.
 * Pure-functional Validation der Step-Inputs und Routing-Entscheidungen.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Journey 02 — Foto-Upload-Validation', () => {
  const MAX_PHOTO = 10 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

  function validatePhoto(file) {
    if (!file) return { ok: false, error: 'no file' };
    if (!ALLOWED.includes(file.type)) return { ok: false, error: 'wrong type' };
    if (file.size > MAX_PHOTO) return { ok: false, error: 'too large' };
    return { ok: true };
  }

  test('akzeptiert JPEG bis 10MB', () => {
    assert.equal(validatePhoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 }).ok, true);
  });

  test('akzeptiert PNG', () => {
    assert.equal(validatePhoto({ type: 'image/png', size: 1024 }).ok, true);
  });

  test('akzeptiert HEIC (iPhone)', () => {
    assert.equal(validatePhoto({ type: 'image/heic', size: 2 * 1024 * 1024 }).ok, true);
  });

  test('lehnt PDF ab (kein Foto)', () => {
    assert.equal(validatePhoto({ type: 'application/pdf', size: 1024 }).ok, false);
  });

  test('lehnt > 10MB ab', () => {
    assert.equal(validatePhoto({ type: 'image/jpeg', size: 11 * 1024 * 1024 }).ok, false);
  });
});

describe('Journey 02 — Diktat-Config + Whisper-Routing', () => {
  function buildWhisperPayload(audioBlob, lang) {
    if (!audioBlob || !audioBlob.size) return null;
    return {
      file: 'audio.webm',
      model: 'whisper-1',
      language: lang || 'de',
      response_format: 'verbose_json',
      temperature: 0
    };
  }

  test('Whisper-Payload nutzt verbose_json + DE-Default', () => {
    const p = buildWhisperPayload({ size: 1024 });
    assert.equal(p.model, 'whisper-1');
    assert.equal(p.language, 'de');
    assert.equal(p.response_format, 'verbose_json');
    assert.equal(p.temperature, 0);
  });

  test('null bei leerem Blob', () => {
    assert.equal(buildWhisperPayload({ size: 0 }), null);
    assert.equal(buildWhisperPayload(null), null);
  });

  test('Sprache override moeglich', () => {
    const p = buildWhisperPayload({ size: 1024 }, 'en');
    assert.equal(p.language, 'en');
  });
});

describe('Journey 02 — KI-Hilfe Payload-Routing', () => {
  // Triple-Mode: S1 mechanical / S2 structural / S3 inhaltlich
  function buildKiPayload(action, text) {
    const validActions = {
      'rechtschreibung': { stufe: 'S1', model: 'gpt-4o-mini' },
      'grammatik': { stufe: 'S1', model: 'gpt-4o-mini' },
      'absaetze': { stufe: 'S2', model: 'gpt-4o-mini' },
      'konjunktiv': { stufe: 'S3', model: 'gpt-4o' },         // GPT-4o pflicht (Regel 14)
      'halluzination_check': { stufe: 'S3', model: 'gpt-4o' },
      'ausformulieren': { stufe: 'S3', model: 'gpt-4o' }
    };
    const cfg = validActions[action];
    if (!cfg) return { ok: false, error: 'unknown action' };
    if (!text || text.length < 5) return { ok: false, error: 'text too short' };
    return { ok: true, action, ...cfg, text };
  }

  test('Konjunktiv-II nutzt GPT-4o (NICHT mini)', () => {
    const p = buildKiPayload('konjunktiv', 'Das Bauteil ist defekt.');
    assert.equal(p.model, 'gpt-4o');
    assert.equal(p.stufe, 'S3');
  });

  test('Rechtschreibung nutzt mini', () => {
    const p = buildKiPayload('rechtschreibung', 'Das ist Test.');
    assert.equal(p.model, 'gpt-4o-mini');
    assert.equal(p.stufe, 'S1');
  });

  test('Halluzinations-Check ist S3 inhaltlich', () => {
    const p = buildKiPayload('halluzination_check', 'Das Mauerwerk weist...');
    assert.equal(p.stufe, 'S3');
  });

  test('lehnt unknown action ab', () => {
    assert.equal(buildKiPayload('foobar', 'irgendwas').ok, false);
  });

  test('lehnt zu kurzen Text ab', () => {
    assert.equal(buildKiPayload('rechtschreibung', 'a').ok, false);
  });
});

describe('Journey 02 — PDF-Generation-Routing', () => {
  function buildPdfRequest(akte) {
    if (!akte || !akte.id) return { ok: false, error: 'no akte' };
    if (!akte.template_key) return { ok: false, error: 'template required' };
    return {
      ok: true,
      method: 'POST',
      url: '/.netlify/functions/pdf-generate',
      body: {
        template_key: akte.template_key,
        auftrag_id: akte.id,
        payload: akte.payload || {}
      }
    };
  }

  test('baut PDF-Request fuer F-04 Kurzstellungnahme', () => {
    const r = buildPdfRequest({ id: 'a-1', template_key: 'kurzstellungnahme', payload: { az: 'AZ-1' } });
    assert.equal(r.ok, true);
    assert.equal(r.body.template_key, 'kurzstellungnahme');
  });

  test('lehnt fehlende Akte ab', () => {
    assert.equal(buildPdfRequest(null).ok, false);
  });

  test('lehnt fehlendes Template ab', () => {
    assert.equal(buildPdfRequest({ id: 'a-1' }).ok, false);
  });
});
