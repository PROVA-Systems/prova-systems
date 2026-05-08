'use strict';

/**
 * MEGA⁴⁰ P2 — Erweiterte Editor-Features Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Extensions = require(path.join(ROOT, 'lib', 'editor-extensions.js'));
const provaEditorSrc = read('lib/prova-editor.js');
const editorTipTapSrc = read('lib/editor-tiptap.js');
const editorCssSrc = read('lib/editor-tiptap.css');
const extensionsSrc = read('lib/editor-extensions.js');
const imgUploadSrc = read('netlify/functions/editor-image-upload.js');
const ImgUpload = require(path.join(ROOT, 'netlify', 'functions', 'editor-image-upload.js'));
const migSrc = read('supabase-migrations/34_document_images.sql');

// ─────────────────────────────────────────────────────────────────
//  P2-1 ProvaEditor Extensions: Image/TextStyle/Color/Highlight/FontFamily
// ─────────────────────────────────────────────────────────────────

test('P2-1: ProvaEditor laedt 5 neue CDN-Extensions', () => {
  ['extension-image', 'extension-text-style', 'extension-color', 'extension-highlight', 'extension-font-family']
    .forEach(name => assert.match(provaEditorSrc, new RegExp('@tiptap/' + name + '@2')));
});

test('P2-1: Image-Extension konfiguriert: inline=false, allowBase64=false', () => {
  assert.match(provaEditorSrc, /Image\.configure\(\{[^}]*inline:\s*false[^}]*allowBase64:\s*false/s);
});

test('P2-1: Highlight-Extension konfiguriert: multicolor=true', () => {
  assert.match(provaEditorSrc, /Highlight\.configure\(\{\s*multicolor:\s*true\s*\}\)/);
});

test('P2-1: ProvaEditor exposes _core (fuer Custom-Extensions)', () => {
  assert.match(provaEditorSrc, /_core:\s*coreModule/);
});

test('P2-1: ProvaEditor.create akzeptiert opts.extraExtensions', () => {
  assert.match(provaEditorSrc, /opts\.extraExtensions/);
  assert.match(provaEditorSrc, /baseExtensions\.concat\(extraExtensions\)/);
});

test('P2-1: ProvaEditor.getModules() in public API exposed', () => {
  assert.match(provaEditorSrc, /getModules:\s*_loadTipTap/);
});

// ─────────────────────────────────────────────────────────────────
//  P2-2 editor-extensions.js: Footnote / PageBreak / CrossRef + Helpers
// ─────────────────────────────────────────────────────────────────

test('P2-2: Extensions exports createFromCore + helpers', () => {
  assert.strictEqual(typeof Extensions.createFromCore, 'function');
  assert.strictEqual(typeof Extensions.collectHeadings, 'function');
  assert.strictEqual(typeof Extensions.generateToC, 'function');
  assert.strictEqual(typeof Extensions.autoNumberFootnotes, 'function');
  assert.strictEqual(typeof Extensions.resolveCrossRefs, 'function');
});

test('P2-2: createFromCore handles missing Mark/Node gracefully', () => {
  const r = Extensions.createFromCore({});
  assert.strictEqual(r.Footnote, null);
  assert.strictEqual(r.PageBreak, null);
  assert.strictEqual(r.CrossRef, null);
});

test('P2-2: createFromCore returns 3 Extensions when Mark+Node provided', () => {
  // Mock Mark.create / Node.create
  const fakeCore = {
    Mark: { create: (cfg) => ({ name: cfg.name, _kind: 'mark', _cfg: cfg }) },
    Node: { create: (cfg) => ({ name: cfg.name, _kind: 'node', _cfg: cfg }) }
  };
  const r = Extensions.createFromCore(fakeCore);
  assert.strictEqual(r.Footnote.name, 'footnote');
  assert.strictEqual(r.Footnote._kind, 'mark');
  assert.strictEqual(r.PageBreak.name, 'pageBreak');
  assert.strictEqual(r.PageBreak._kind, 'node');
  assert.strictEqual(r.CrossRef.name, 'crossRef');
  assert.strictEqual(r.CrossRef._kind, 'mark');
});

test('P2-2: collectHeadings sammelt + slugified mit ae/oe/ue/ss', () => {
  const json = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Übersicht' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Maßnahmen für ÄÖÜ' }] }
    ]
  };
  const h = Extensions.collectHeadings(json);
  assert.strictEqual(h.length, 2);
  assert.strictEqual(h[0].text, 'Übersicht');
  assert.match(h[0].id, /uebersicht|^h\d+$/);
  assert.match(h[1].id, /massnahmen-fuer/);
});

test('P2-2: generateToC produces ToC-doc mit heading + bulletList', () => {
  const json = {
    type: 'doc',
    content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Befund' }] }]
  };
  const toc = Extensions.generateToC(json);
  assert.strictEqual(toc.type, 'doc');
  assert.strictEqual(toc.content[0].type, 'heading');
  assert.strictEqual(toc.content[1].type, 'bulletList');
  assert.strictEqual(toc.content[1].content.length, 1);
});

test('P2-2: autoNumberFootnotes setzt sequentielle Nummern [1][2][3]', () => {
  const json = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [
        { type: 'text', text: 'a', marks: [{ type: 'footnote', attrs: { text: 'X' } }] },
        { type: 'text', text: 'b', marks: [{ type: 'footnote', attrs: { text: 'Y' } }] },
        { type: 'text', text: 'c', marks: [{ type: 'footnote', attrs: { text: 'Z' } }] }
      ]}
    ]
  };
  const numbered = Extensions.autoNumberFootnotes(json);
  const marks = numbered.content[0].content.map(t => t.marks[0].attrs.number);
  assert.deepStrictEqual(marks, [1, 2, 3]);
});

test('P2-2: resolveCrossRefs setzt Label aus headingMap', () => {
  const json = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [
      { type: 'text', text: '§1', marks: [{ type: 'crossRef', attrs: { targetId: 'befund', label: null } }] }
    ]}]
  };
  const resolved = Extensions.resolveCrossRefs(json, { befund: 'Befund-Übersicht' });
  assert.strictEqual(resolved.content[0].content[0].marks[0].attrs.label, 'Befund-Übersicht');
});

test('P2-2: _slugify handhabt Sonderzeichen + Längenlimit', () => {
  assert.strictEqual(Extensions._slugify('Maßnahmen für Übergänge'), 'massnahmen-fuer-uebergaenge');
  const long = 'a'.repeat(100);
  assert.ok(Extensions._slugify(long).length <= 60);
});

// ─────────────────────────────────────────────────────────────────
//  P2-3 editor-image-upload Lambda + Migration 34
// ─────────────────────────────────────────────────────────────────

test('P2-3: editor-image-upload exports SUPPORTED_MIME (5 types)', () => {
  const mimes = Object.keys(ImgUpload.__SUPPORTED_MIME);
  assert.ok(mimes.indexOf('image/jpeg') >= 0);
  assert.ok(mimes.indexOf('image/png') >= 0);
  assert.ok(mimes.indexOf('image/svg+xml') >= 0);
  assert.ok(mimes.indexOf('image/webp') >= 0);
});

test('P2-3: editor-image-upload MAX_BYTES = 5 MB', () => {
  assert.strictEqual(ImgUpload.__MAX_BYTES, 5 * 1024 * 1024);
});

test('P2-3: editor-image-upload Lambda hat requireAuth + RateLimit 30/60', () => {
  assert.match(imgUploadSrc, /requireAuth/);
  assert.match(imgUploadSrc, /RateLimit\.check\([^,]+,\s*30,\s*60/);
});

test('P2-3: Lambda Workspace-Resolution profiles → workspace_memberships', () => {
  assert.match(imgUploadSrc, /\.from\(['"]profiles['"]\)/);
  assert.match(imgUploadSrc, /\.from\(['"]workspace_memberships['"]\)/);
});

test('P2-3: Lambda Storage-Path: editor-images/<workspace_id>/<uuid>.<ext>', () => {
  assert.match(imgUploadSrc, /editor-images\/'\s*\+\s*ms\.workspace_id/);
});

test('P2-3: Lambda EXIF-Strip nur fuer JPEG (PNG/SVG passthrough)', () => {
  assert.match(imgUploadSrc, /mime === 'image\/jpeg'/);
  assert.match(imgUploadSrc, /_stripJpegExif/);
});

test('P2-3: Migration 34 — document_images Tabelle mit RLS', () => {
  assert.match(migSrc, /CREATE TABLE IF NOT EXISTS public\.document_images/);
  assert.match(migSrc, /ALTER TABLE public\.document_images ENABLE ROW LEVEL SECURITY/);
  assert.match(migSrc, /workspace_id IN \(SELECT workspace_id FROM public\.workspace_memberships/);
});

test('P2-3: Migration 34 — alle 4 RLS-Policies (SELECT/INSERT/UPDATE/DELETE)', () => {
  ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].forEach(op => {
    assert.match(migSrc, new RegExp('FOR\\s+' + op));
  });
});

test('P2-3: Migration 34 — exif_stripped + alt + caption-Spalten', () => {
  assert.match(migSrc, /exif_stripped BOOLEAN/);
  assert.match(migSrc, /alt TEXT/);
  assert.match(migSrc, /caption TEXT/);
});

// ─────────────────────────────────────────────────────────────────
//  P2-4 Extended-Toolbar + Custom-Extensions wiring
// ─────────────────────────────────────────────────────────────────

test('P2-4: editor-tiptap.js _buildExtendedToolbar definiert', () => {
  assert.match(editorTipTapSrc, /_buildExtendedToolbar\(editor,\s*ext\)/);
});

test('P2-4: Extended-Toolbar hat Image-URL + Image-Upload Buttons', () => {
  assert.match(editorTipTapSrc, /Bild einfuegen \(URL\)/);
  assert.match(editorTipTapSrc, /Bild hochladen/);
  assert.match(editorTipTapSrc, /_triggerImageUpload/);
});

test('P2-4: Extended-Toolbar hat Color/Highlight/FontFamily Buttons', () => {
  assert.match(editorTipTapSrc, /setColor/);
  assert.match(editorTipTapSrc, /toggleHighlight/);
  assert.match(editorTipTapSrc, /setFontFamily/);
});

test('P2-4: Extended-Toolbar hat Footnote/PageBreak/CrossRef/ToC Buttons', () => {
  assert.match(editorTipTapSrc, /setFootnote/);
  assert.match(editorTipTapSrc, /insertPageBreak/);
  assert.match(editorTipTapSrc, /setCrossRef/);
  assert.match(editorTipTapSrc, /generateToC/);
});

test('P2-4: editor-tiptap.js mount() laedt ProvaEditorExtensions.createFromCore best-effort', () => {
  assert.match(editorTipTapSrc, /window\.ProvaEditorExtensions/);
  assert.match(editorTipTapSrc, /createFromCore\(mods\._core\)/);
});

test('P2-4: editor-tiptap.js _triggerImageUpload ruft /editor-image-upload Lambda', () => {
  assert.match(editorTipTapSrc, /\/\.netlify\/functions\/editor-image-upload/);
});

test('P2-4: CSS hat .pet-toolbar-ext + .pet-toolbar-ext-btn Klassen', () => {
  assert.match(editorCssSrc, /\.pet-toolbar-ext\s*\{/);
  assert.match(editorCssSrc, /\.pet-toolbar-ext-btn/);
});

test('P2-4: CSS hat .prova-editor-footnote + Pseudo-Brackets', () => {
  assert.match(editorCssSrc, /\.prova-editor-footnote/);
  assert.match(editorCssSrc, /content:\s*'\['/);
  assert.match(editorCssSrc, /content:\s*'\]'/);
});

test('P2-4: CSS .prova-editor-pagebreak hat @media print page-break-before', () => {
  assert.match(editorCssSrc, /@media print/);
  assert.match(editorCssSrc, /page-break-before:\s*always/);
});

test('P2-4: CSS .prova-editor-image max-width 100%', () => {
  assert.match(editorCssSrc, /\.prova-editor-image[\s\S]*?max-width:\s*100%/);
});

test('P2-4: editor-extensions.js — UMD Pattern (window + module.exports)', () => {
  assert.match(extensionsSrc, /window\.ProvaEditorExtensions/);
  assert.match(extensionsSrc, /module\.exports/);
});
