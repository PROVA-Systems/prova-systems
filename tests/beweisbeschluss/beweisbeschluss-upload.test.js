/**
 * PROVA — beweisbeschluss-upload.js Tests (MEGA²³ Block 1)
 *
 * Coverage:
 *   - validatePdf (pure)
 *   - isValidAuftragId
 *   - deDateToIso / isoDateToDe (Date conversions)
 *   - renderPreview (HTML structure + escaping)
 *   - collectEdits (DOM read-back via JSDOM-shim)
 *   - attach() flow (fetchImpl-mock)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'lib', 'beweisbeschluss-upload.js'));

describe('beweisbeschluss-upload — validatePdf (pure)', () => {
  test('akzeptiert valides PDF mit application/pdf MIME', () => {
    const r = Lib.validatePdf({ name: 'test.pdf', type: 'application/pdf', size: 1024 });
    assert.equal(r.ok, true);
  });

  test('akzeptiert PDF nur per Extension (kein MIME-Type)', () => {
    const r = Lib.validatePdf({ name: 'test.pdf', type: '', size: 100 });
    assert.equal(r.ok, true);
  });

  test('lehnt non-PDF (Word) ab', () => {
    const r = Lib.validatePdf({ name: 'test.docx', type: 'application/msword', size: 1024 });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'WRONG_TYPE');
  });

  test('lehnt leere Datei ab', () => {
    const r = Lib.validatePdf({ name: 'test.pdf', type: 'application/pdf', size: 0 });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'EMPTY');
  });

  test('lehnt Datei > 10 MB ab', () => {
    const r = Lib.validatePdf({ name: 'big.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'TOO_LARGE');
    assert.match(r.error, /11\.0 MB/);
  });

  test('lehnt fehlende Datei ab', () => {
    const r = Lib.validatePdf(null);
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'NO_FILE');
  });

  test('akzeptiert Datei genau bei 10 MB Grenze', () => {
    const r = Lib.validatePdf({ name: 'edge.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 });
    assert.equal(r.ok, true);
  });

  test('lehnt Datei 1 Byte ueber 10 MB ab', () => {
    const r = Lib.validatePdf({ name: 'edge.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 });
    assert.equal(r.ok, false);
  });
});

describe('beweisbeschluss-upload — isValidAuftragId', () => {
  test('akzeptiert valides UUID v4', () => {
    assert.equal(Lib.isValidAuftragId('550e8400-e29b-41d4-a716-446655440000'), true);
  });

  test('lehnt zu kurz', () => {
    assert.equal(Lib.isValidAuftragId('550e8400-e29b-41d4'), false);
  });

  test('lehnt leeren String', () => {
    assert.equal(Lib.isValidAuftragId(''), false);
  });

  test('lehnt nicht-string', () => {
    assert.equal(Lib.isValidAuftragId(null), false);
    assert.equal(Lib.isValidAuftragId(123), false);
  });
});

describe('beweisbeschluss-upload — Date Conversions', () => {
  test('deDateToIso: 15.06.2026 → 2026-06-15', () => {
    assert.equal(Lib.deDateToIso('15.06.2026'), '2026-06-15');
  });

  test('deDateToIso: 1-stellig wird gepadded', () => {
    assert.equal(Lib.deDateToIso('1.7.2026'), '2026-07-01');
  });

  test('deDateToIso: invalid → empty', () => {
    assert.equal(Lib.deDateToIso('foo'), '');
    assert.equal(Lib.deDateToIso(''), '');
    assert.equal(Lib.deDateToIso(null), '');
  });

  test('isoDateToDe: 2026-06-15 → 15.06.2026', () => {
    assert.equal(Lib.isoDateToDe('2026-06-15'), '15.06.2026');
  });

  test('isoDateToDe mit Zeit: 2026-06-15T10:00 → 15.06.2026', () => {
    assert.equal(Lib.isoDateToDe('2026-06-15T10:00:00Z'), '15.06.2026');
  });

  test('isoDateToDe: invalid → empty', () => {
    assert.equal(Lib.isoDateToDe('foo'), '');
  });
});

describe('beweisbeschluss-upload — escapeHtml', () => {
  test('escaped < > & " \'', () => {
    const r = Lib.escapeHtml('<script>alert("x&y")</script>');
    assert.equal(r, '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;');
  });

  test('escapeHtml(null) returns empty string', () => {
    assert.equal(Lib.escapeHtml(null), '');
  });
});

describe('beweisbeschluss-upload — renderPreview', () => {
  test('rendert Disclaimer mit §407a + STRUKTURIERUNGS-HILFE', () => {
    const html = Lib.renderPreview({});
    assert.match(html, /§407a/);
    assert.match(html, /STRUKTURIERUNGS-HILFE/);
  });

  test('rendert Aktenzeichen-Input mit Wert', () => {
    const html = Lib.renderPreview({ aktenzeichen: '1 O 234/25' });
    assert.match(html, /class="bb-aktenzeichen"/);
    assert.match(html, /value="1 O 234\/25"/);
  });

  test('escaped Aktenzeichen gegen XSS', () => {
    const html = Lib.renderPreview({ aktenzeichen: '<script>x</script>' });
    assert.doesNotMatch(html, /<script>x<\/script>/);
    assert.match(html, /&lt;script&gt;/);
  });

  test('rendert Frist als ISO-Date', () => {
    const html = Lib.renderPreview({ frist_datum: '15.06.2026' });
    assert.match(html, /value="2026-06-15"/);
    assert.match(html, /type="date"/);
  });

  test('rendert Hauptfragen als textarea-Liste', () => {
    const html = Lib.renderPreview({
      hauptfragen: [
        { nr: 1, text: 'Frage A' },
        { nr: 2, text: 'Frage B' }
      ]
    });
    assert.match(html, /class="bb-frage-text"/);
    assert.ok(html.indexOf('Frage A') >= 0);
    assert.ok(html.indexOf('Frage B') >= 0);
  });

  test('rendert leere Hauptfragen-Liste mit Hint', () => {
    const html = Lib.renderPreview({ hauptfragen: [] });
    assert.match(html, /Keine Hauptfragen erkannt/);
  });

  test('rendert Parteien mit Rolle + Name', () => {
    const html = Lib.renderPreview({
      parteien: [
        { rolle: 'Klaeger', name: 'Mueller GmbH' },
        { rolle: 'Beklagter', name: 'Schmidt AG' }
      ]
    });
    assert.match(html, /class="bb-partei-rolle"/);
    assert.ok(html.indexOf('Mueller GmbH') >= 0);
    assert.ok(html.indexOf('Schmidt AG') >= 0);
  });

  test('rendert Save + Discard Buttons', () => {
    const html = Lib.renderPreview({});
    assert.match(html, /class="bb-save"/);
    assert.match(html, /class="bb-discard"/);
  });
});

describe('beweisbeschluss-upload — collectEdits (DOM-shim)', () => {
  // Minimal DOM-shim fuer node-only-Test
  function makeRootEl(state) {
    const fragenItems = state.hauptfragen.map((t, i) => ({
      _idx: i,
      querySelector: () => null
    }));
    const parteienItems = state.parteien.map((p) => ({
      querySelector: (sel) => {
        if (sel === '.bb-partei-rolle') return { value: p.rolle };
        if (sel === '.bb-partei-name') return { value: p.name };
        return null;
      }
    }));
    const fragenEls = state.hauptfragen.map((t) => ({ value: t }));
    return {
      querySelector: (sel) => {
        if (sel === '.bb-aktenzeichen') return { value: state.aktenzeichen };
        if (sel === '.bb-frist') return { value: state.fristIso };
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === '.bb-frage-text') return fragenEls;
        if (sel === '.bb-partei-item') return parteienItems;
        return [];
      }
    };
  }

  test('liest Aktenzeichen + Frist + Fragen + Parteien', () => {
    const rootEl = makeRootEl({
      aktenzeichen: '5 C 678/26',
      fristIso: '2026-09-30',
      hauptfragen: ['Frage 1', 'Frage 2'],
      parteien: [{ rolle: 'Klaeger', name: 'Mueller' }]
    });
    const r = Lib.collectEdits(rootEl);
    assert.equal(r.aktenzeichen, '5 C 678/26');
    assert.equal(r.frist_datum, '30.09.2026');
    assert.equal(r.hauptfragen.length, 2);
    assert.equal(r.hauptfragen[0].text, 'Frage 1');
    assert.equal(r.hauptfragen[0].nr, 1);
    assert.equal(r.parteien.length, 1);
    assert.equal(r.parteien[0].name, 'Mueller');
  });

  test('skipped leere Fragen', () => {
    const rootEl = makeRootEl({
      aktenzeichen: 'AZ',
      fristIso: '',
      hauptfragen: ['', '   ', 'Echte Frage'],
      parteien: []
    });
    const r = Lib.collectEdits(rootEl);
    assert.equal(r.hauptfragen.length, 1);
    assert.equal(r.hauptfragen[0].text, 'Echte Frage');
    assert.equal(r.frist_datum, '');
  });

  test('returnt empty-defaults bei null rootEl', () => {
    const r = Lib.collectEdits(null);
    assert.deepEqual(r, { aktenzeichen: '', frist_datum: '', hauptfragen: [], parteien: [] });
  });
});

describe('beweisbeschluss-upload — attach() flow (fetchImpl-mock)', () => {
  // DOM-Shim: stub Element with addEventListener / querySelector / innerHTML
  function makeMockEl() {
    const handlers = {};
    const children = {};
    const el = {
      _innerHtml: '',
      get innerHTML() { return this._innerHtml; },
      set innerHTML(v) {
        this._innerHtml = v;
        // Reset children-cache when innerHTML changes
        children['.bb-zone-inner'] = makeMockChild('.bb-zone-inner');
        children['.bb-file'] = makeMockChild('.bb-file');
        children['.bb-result'] = makeMockChild('.bb-result');
        children['.bb-status'] = makeMockChild('.bb-status');
      },
      querySelector: (sel) => children[sel] || null,
      querySelectorAll: () => [],
      addEventListener: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); },
      _trigger: (ev, e) => (handlers[ev] || []).forEach(fn => fn(e || {})),
      style: {},
      _handlers: handlers
    };
    function makeMockChild(name) {
      const h = {};
      return {
        addEventListener: (ev, fn) => { (h[ev] = h[ev] || []).push(fn); },
        click: () => (h['click'] || []).forEach(fn => fn({})),
        _trigger: (ev, e) => (h[ev] || []).forEach(fn => fn(e || {})),
        style: {},
        textContent: '',
        files: [],
        innerHTML: '',
        _name: name
      };
    }
    children['.bb-zone-inner'] = makeMockChild('.bb-zone-inner');
    children['.bb-file'] = makeMockChild('.bb-file');
    children['.bb-result'] = makeMockChild('.bb-result');
    children['.bb-status'] = makeMockChild('.bb-status');
    return el;
  }

  test('attach() ohne auftrag_id zeigt Warn-Status', () => {
    const rootEl = makeMockEl();
    const fakeFetch = () => Promise.reject(new Error('should-not-fetch'));
    Lib.attach(rootEl, { fetchImpl: fakeFetch });
    assert.match(rootEl.querySelector('.bb-status').textContent, /Auftrag-ID fehlt/);
  });

  test('attach() mit valider auftrag_id zeigt KEINEN Warn-Status', () => {
    const rootEl = makeMockEl();
    const fakeFetch = () => Promise.reject(new Error('should-not-fetch'));
    Lib.attach(rootEl, {
      auftrag_id: '550e8400-e29b-41d4-a716-446655440000',
      fetchImpl: fakeFetch
    });
    assert.notEqual(rootEl.querySelector('.bb-status').textContent, /Auftrag-ID fehlt/);
  });

  test('attach() throws bei null rootEl', () => {
    assert.throws(() => Lib.attach(null, {}), /rootEl muss DOM-Element sein/);
  });

  test('controller hat reset() + getExtrakt()', () => {
    const rootEl = makeMockEl();
    const fakeFetch = () => Promise.reject(new Error('not-called'));
    const ctrl = Lib.attach(rootEl, { fetchImpl: fakeFetch });
    assert.equal(typeof ctrl.reset, 'function');
    assert.equal(typeof ctrl.getExtrakt, 'function');
    assert.equal(ctrl.getExtrakt(), null);
  });
});

describe('beweisbeschluss-upload — Disclaimer-Mandate', () => {
  test('renderPreview enthaelt §407a-Disclaimer', () => {
    const html = Lib.renderPreview({});
    assert.match(html, /§407a/);
  });

  test('renderPreview enthaelt 📌-Hinweis-Icon', () => {
    const html = Lib.renderPreview({});
    assert.match(html, /📌/);
  });

  test('renderPreview enthaelt "letztverantwortlich"', () => {
    const html = Lib.renderPreview({});
    assert.match(html, /letztverantwortlich/);
  });
});

describe('beweisbeschluss-upload — Constants', () => {
  test('MAX_FILE_SIZE === 10MB', () => {
    assert.equal(Lib._const.MAX_FILE_SIZE, 10 * 1024 * 1024);
  });

  test('PDF_MIME_TYPES enthaelt application/pdf', () => {
    assert.ok(Lib._const.PDF_MIME_TYPES.indexOf('application/pdf') >= 0);
  });

  test('PDF_EXTENSIONS enthaelt .pdf', () => {
    assert.ok(Lib._const.PDF_EXTENSIONS.indexOf('.pdf') >= 0);
  });
});
