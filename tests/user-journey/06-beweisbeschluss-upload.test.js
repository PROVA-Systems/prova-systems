/**
 * PROVA — User-Journey 06: Beweisbeschluss-Upload End-to-End (MEGA²⁴ Block 6)
 *
 * Story: SV laedt Beweisbeschluss-PDF, Pattern-Matching extrahiert Felder,
 * SV editiert und uebernimmt → Daten ins Stammdaten-Form.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'lib', 'beweisbeschluss-upload.js'));

describe('Journey 06 — Validation-Flow', () => {
  test('Schritt 1: PDF wird akzeptiert', () => {
    const r = Lib.validatePdf({ name: 'beweisbeschluss.pdf', type: 'application/pdf', size: 500000 });
    assert.equal(r.ok, true);
  });

  test('Schritt 2: Word-Datei wird abgelehnt mit klarem Error', () => {
    const r = Lib.validatePdf({ name: 'urteil.docx', type: 'application/msword', size: 50000 });
    assert.equal(r.ok, false);
    assert.match(r.error, /PDF/);
  });

  test('Schritt 3: Auftrag-ID-Validation (UUID)', () => {
    assert.equal(Lib.isValidAuftragId('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(Lib.isValidAuftragId('not-a-uuid'), false);
  });
});

describe('Journey 06 — Pattern-Extraction Result Rendering', () => {
  test('Schritt 4: Aktenzeichen erkannt → editierbar im Preview', () => {
    const html = Lib.renderPreview({ aktenzeichen: '5 C 678/26' });
    assert.match(html, /value="5 C 678\/26"/);
    assert.match(html, /class="bb-aktenzeichen"/);
  });

  test('Schritt 5: Frist DE-Date → ISO-Date-Input', () => {
    const html = Lib.renderPreview({ frist_datum: '15.06.2026' });
    assert.match(html, /value="2026-06-15"/);
    assert.match(html, /type="date"/);
  });

  test('Schritt 6: Hauptfragen werden als textarea-Liste editierbar', () => {
    const html = Lib.renderPreview({
      hauptfragen: [
        { nr: 1, text: 'Liegt ein Mangel vor?' },
        { nr: 2, text: 'Welche Ursachen?' }
      ]
    });
    assert.match(html, /class="bb-frage-text"/);
    assert.ok(html.indexOf('Liegt ein Mangel vor?') >= 0);
  });

  test('Schritt 7: Disclaimer mit §407a + STRUKTURIERUNGS-HILFE prominent', () => {
    const html = Lib.renderPreview({});
    assert.match(html, /§407a/);
    assert.match(html, /STRUKTURIERUNGS-HILFE/);
    assert.match(html, /letztverantwortlich/);
  });
});

describe('Journey 06 — Edit-And-Save-Flow', () => {
  function makeRootEl(state) {
    const fragenEls = state.hauptfragen.map(t => ({ value: t }));
    const parteienItems = state.parteien.map(p => ({
      querySelector: (sel) => {
        if (sel === '.bb-partei-rolle') return { value: p.rolle };
        if (sel === '.bb-partei-name') return { value: p.name };
        return null;
      }
    }));
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

  test('Schritt 8: SV editiert Frist (DE → ISO konversion korrekt)', () => {
    const rootEl = makeRootEl({
      aktenzeichen: '1 O 234/25',
      fristIso: '2026-09-30',
      hauptfragen: ['Edited Frage'],
      parteien: []
    });
    const r = Lib.collectEdits(rootEl);
    assert.equal(r.frist_datum, '30.09.2026');
    assert.equal(r.aktenzeichen, '1 O 234/25');
    assert.equal(r.hauptfragen[0].text, 'Edited Frage');
  });
});

describe('Journey 06 — End-to-End Auto-Uebernahme ins Stammdaten-Form', () => {
  // Simuliert die wiringScript-Logik aus gericht-auftrag.html: nach "Speichern"
  // werden Felder ins ga-az/ga-frist/_fragen-Array uebernommen.
  function applyToForm(edited, formState) {
    const next = Object.assign({}, formState);
    if (edited.aktenzeichen && !next.az) next.az = edited.aktenzeichen;
    if (edited.frist_datum) next.frist = Lib.deDateToIso(edited.frist_datum);
    if (Array.isArray(edited.hauptfragen)) {
      next.fragen = (next.fragen || []).concat(edited.hauptfragen.map(f => f.text));
    }
    if (Array.isArray(edited.parteien)) {
      edited.parteien.forEach(p => {
        if (/kl(ae|ä)ger/i.test(p.rolle) && !next.klaeger) next.klaeger = p.name;
        if (/beklagt/i.test(p.rolle) && !next.beklagter) next.beklagter = p.name;
      });
    }
    return next;
  }

  test('Auto-Uebernahme bei leerem Form', () => {
    const result = applyToForm({
      aktenzeichen: '5 C 678/26',
      frist_datum: '15.06.2026',
      hauptfragen: [{ text: 'F1' }, { text: 'F2' }],
      parteien: [{ rolle: 'Klaeger', name: 'Mueller GmbH' }]
    }, { fragen: [] });
    assert.equal(result.az, '5 C 678/26');
    assert.equal(result.frist, '2026-06-15');
    assert.equal(result.fragen.length, 2);
    assert.equal(result.klaeger, 'Mueller GmbH');
  });

  test('respektiert bereits ausgefuelltes az (kein overwrite)', () => {
    const result = applyToForm(
      { aktenzeichen: 'NEW', frist_datum: '01.01.2026', hauptfragen: [], parteien: [] },
      { az: 'EXISTING', fragen: [] }
    );
    assert.equal(result.az, 'EXISTING');
  });
});
