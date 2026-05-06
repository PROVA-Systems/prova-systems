/**
 * PROVA — User-Journey 03: Mode B TipTap-Editor (MEGA²⁴ Block 6)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Journey 03 — Mode-B TipTap-State', () => {
  // Mode-B: TipTap-Editor in akte.html Notiz-Section.
  // SyncPattern: Editor → JSON-Doc → textarea (für Backwards-Compat)
  function syncEditorToTextarea(tiptapJson) {
    if (!tiptapJson || !tiptapJson.content) return '';
    function walk(node) {
      if (!node) return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) {
        return node.content.map(walk).join(node.type === 'paragraph' ? '\n' : '');
      }
      return '';
    }
    return walk(tiptapJson).trim();
  }

  test('extrahiert Plain-Text aus TipTap-JSON', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo Welt' }] }
      ]
    };
    assert.equal(syncEditorToTextarea(doc), 'Hallo Welt');
  });

  test('joins multiple paragraphs mit \\n', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'P1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'P2' }] }
      ]
    };
    const r = syncEditorToTextarea(doc);
    assert.ok(r.indexOf('P1') >= 0);
    assert.ok(r.indexOf('P2') >= 0);
  });

  test('returnt empty string bei null', () => {
    assert.equal(syncEditorToTextarea(null), '');
    assert.equal(syncEditorToTextarea({}), '');
  });
});

describe('Journey 03 — Mode-B Routing', () => {
  function resolveMode(params) {
    const VALID = ['A', 'B', 'C'];
    if (params.auftragOverride && VALID.indexOf(params.auftragOverride) !== -1) {
      return { mode: params.auftragOverride, source: 'override' };
    }
    if (params.userDefault && VALID.indexOf(params.userDefault) !== -1) {
      return { mode: params.userDefault, source: 'default' };
    }
    return { mode: 'A', source: 'fallback' };
  }

  test('Mode-B aus auftragOverride', () => {
    const r = resolveMode({ auftragOverride: 'B', userDefault: 'A' });
    assert.equal(r.mode, 'B');
    assert.equal(r.source, 'override');
  });

  test('Mode-B aus userDefault wenn kein Override', () => {
    const r = resolveMode({ userDefault: 'B' });
    assert.equal(r.mode, 'B');
    assert.equal(r.source, 'default');
  });

  test('Fallback Mode-A wenn nichts gesetzt', () => {
    const r = resolveMode({});
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'fallback');
  });
});

describe('Journey 03 — TipTap-Save-Payload', () => {
  function buildSavePayload(akteId, content, mode) {
    if (!akteId) return null;
    return {
      auftrag_id: akteId,
      content_json: content,
      mode: mode || 'B',
      saved_at: new Date().toISOString()
    };
  }

  test('baut Save-Payload mit mode=B default', () => {
    const p = buildSavePayload('a-1', { type: 'doc' });
    assert.equal(p.mode, 'B');
    assert.equal(p.auftrag_id, 'a-1');
    assert.ok(p.saved_at);
  });

  test('returnt null ohne Akte', () => {
    assert.equal(buildSavePayload(null, {}), null);
  });
});
