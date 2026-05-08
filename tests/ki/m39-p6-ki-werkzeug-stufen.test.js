'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Werkzeug = require(path.join(ROOT, 'lib', 'ki-werkzeug-stufen.js'));
const src = fs.readFileSync(path.join(ROOT, 'lib', 'ki-werkzeug-stufen.js'), 'utf8');

test('P6: Public API exposed (S2/S3 + bindEditor + showDiff/Begruendung)', () => {
  ['bindEditor', 's2_struktur_vorschlag',
   's3_konjunktiv_ii', 's3_halluzinations_check', 's3_407a_konsistenz', 's3_fachsprache',
   'showBegruendung', 'showDiff']
    .forEach(fn => assert.strictEqual(typeof Werkzeug[fn], 'function', fn + ' fehlt'));
});

test('P6: PURPOSE_TO_S Mapping mit S-Level + Modell', () => {
  const m = Werkzeug._PURPOSE_TO_S;
  assert.strictEqual(m.s2_struktur.stufe, 'S2');
  assert.strictEqual(m.s3_konjunktiv_ii.stufe, 'S3');
  // Frontier-Modell für S3-Aufgaben (gpt-5.5 via "praezise")
  assert.strictEqual(m.s3_konjunktiv_ii.model, 'praezise');
  assert.strictEqual(m.s3_halluzinations_check.model, 'praezise');
  assert.strictEqual(m.s3_407a_konsistenz.model, 'praezise');
});

test('P6: DEFAULT_MIN_CHARS = 500 (§407a Eigenleistung-Pflicht)', () => {
  assert.strictEqual(Werkzeug._DEFAULT_MIN_CHARS, 500);
});

test('P6: S3-Aufgaben rufen ki-proxy mit purpose-Parameter', async () => {
  let posted = null;
  Werkzeug._setFetcherForTests(async (url, opts) => {
    posted = { url, body: JSON.parse(opts.body) };
    return { ok: true, json: async () => ({ result: 'ok' }) };
  });
  await Werkzeug.s3_konjunktiv_ii('Es ist eindeutig Schimmel.');
  assert.match(posted.url, /ki-proxy/);
  assert.strictEqual(posted.body.purpose, 's3_konjunktiv_ii');
  assert.strictEqual(posted.body.model, 'praezise');
});

test('P6: s3_407a_konsistenz übergibt s4_text + s6_text', async () => {
  let posted = null;
  Werkzeug._setFetcherForTests(async (url, opts) => {
    posted = JSON.parse(opts.body);
    return { ok: true, json: async () => ({}) };
  });
  await Werkzeug.s3_407a_konsistenz('§4 Text', '§6 Eigentext');
  assert.strictEqual(posted.s4_text, '§4 Text');
  assert.strictEqual(posted.s6_text, '§6 Eigentext');
});

test('P6: s3_halluzinations_check übergibt diktat_original', async () => {
  let posted = null;
  Werkzeug._setFetcherForTests(async (url, opts) => {
    posted = JSON.parse(opts.body);
    return { ok: true, json: async () => ({}) };
  });
  await Werkzeug.s3_halluzinations_check('§6 Aussage', 'Diktat-Original');
  assert.strictEqual(posted.diktat_original, 'Diktat-Original');
});

test('P6: bindEditor — Submit-Button wird disabled bei <500 Chars', () => {
  // Mock-DOM
  let inputHandler = null;
  const ta = {
    value: 'kurz',
    addEventListener: (ev, fn) => { if (ev === 'input') inputHandler = fn; },
    removeEventListener: () => {}
  };
  const submitBtn = { disabled: false, title: '' };
  const charCounter = { textContent: '' };
  const ctrl = Werkzeug.bindEditor({ textarea: ta, submitBtn, charCounter });
  assert.strictEqual(submitBtn.disabled, true);  // 4 Chars < 500
  assert.strictEqual(charCounter.textContent, '4');
  assert.match(submitBtn.title, /496 Zeichen Eigenleistung/);
  // Nach 500+ Chars
  ta.value = 'x'.repeat(500);
  ctrl.update();
  assert.strictEqual(submitBtn.disabled, false);
  assert.strictEqual(submitBtn.title, '');
});

test('P6: bindEditor — minChars konfigurierbar', () => {
  let inputHandler = null;
  const ta = {
    value: 'x'.repeat(100),
    addEventListener: (ev, fn) => { if (ev === 'input') inputHandler = fn; },
    removeEventListener: () => {}
  };
  const submitBtn = { disabled: false, title: '' };
  Werkzeug.bindEditor({ textarea: ta, submitBtn, minChars: 50 });
  assert.strictEqual(submitBtn.disabled, false);  // 100 >= 50
});

test('P6: bindEditor wirft bei fehlender textarea', () => {
  assert.throws(() => Werkzeug.bindEditor({}));
});

test('P6: _wordDiff erkennt Insert + Delete + Equal', () => {
  const diff = Werkzeug._wordDiff('Hallo Welt heute', 'Hallo schöne Welt heute');
  assert.ok(diff.some(d => d.op === 'add' && d.text.includes('schöne')));
  assert.ok(diff.some(d => d.op === 'eq' && d.text === 'Hallo'));
});

test('P6: Begründungs-Box CSS user-select:none + contextmenu-Block (Source-Verify)', () => {
  assert.match(src, /user-select:none/);
  assert.match(src, /contextmenu['"]?,\s*e\s*=>\s*e\.preventDefault\(\)/);
  assert.match(src, /'copy'/);
  assert.match(src, /'cut'/);
});

test('P6: showDiff Diff-Modal hat Übernehmen + Ablehnen Buttons', () => {
  assert.match(src, /Übernehmen/);
  assert.match(src, /Ablehnen/);
  assert.match(src, /onAccept/);
  assert.match(src, /onReject/);
});

test('P6: showBegruendung Header markiert "S3 KI-Hinweis (nicht zum Kopieren)"', () => {
  assert.match(src, /S3 KI-Hinweis \(nicht zum Kopieren\)/);
});

test('P6: §407a-Doktrin im Datei-Header dokumentiert', () => {
  assert.match(src, /§407a-Doktrin/);
  assert.match(src, /500 Char Min Eigenleistung/);
});

test('P6: 5 KI-Funktionen für KI-Funktions-Garantie ausgesetzt', () => {
  // S2 + S3 × 4 = 5 distinct purposes
  const purposes = Object.keys(Werkzeug._PURPOSE_TO_S);
  assert.strictEqual(purposes.length, 5);
});
