# Perfektion Tier 7 — Upload-System komplett (MEGA⁹ W1)

**Sprint:** MEGA⁹ W1 (04.05.2026 nacht)
**Status:** ✅ Done
**Quality-Score:** 8/10 (siehe Self-Critique unten)

---

## Was geliefert

### 1. lib/foto-upload-v2.js Master (~530 LOC) ✅

**Public API:**
```js
const uploader = new ProvaUpload({
  endpoint: '/.netlify/functions/foto-upload',
  stripExif: true,
  optimize: { maxWidth: 2048, maxHeight: 2048, quality: 0.85, prefer: 'webp' },
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  maxFileSize: 25 * 1024 * 1024,
  chunkSize: 0,
  concurrency: 2
});

uploader.on('progress', (item, percent) => {});
uploader.on('success', (item, response) => {});
uploader.on('error', (item, error) => {});

uploader.bindDropZone(el);
uploader.bindFileInput(input);
uploader.bindPaste(document);

await uploader.upload(file);   // Promise-API
uploader.cancel(item);
uploader.cancelAll();
uploader.pause(); uploader.resume();
uploader.destroy();
```

**Plus globale Helpers:**
```js
window.ProvaUploadHelpers = {
  validateFileType, stripExif, optimizeImage, supportsWebPEncode, MAGIC_BYTES
};
```

### 2. Magic-Bytes File-Type-Validation ✅

`MAGIC_BYTES`-Tabelle mit 7 Type-Signaturen (jpg/png/webp/gif/heic/heif/pdf).
Liest die ersten 16 Bytes via FileReader und prueft Primary-Sig + Optional-Offset-Check
(WebP=RIFF+WEBP, HEIC=ftyp+heic).

**Anti-MIME-Spoofing:** EXE-Header (MZ) wird trotz `image/jpeg`-Claim abgelehnt.

### 3. EXIF-Strip Browser-Side (zero-deps) ✅

JPEG-Marker-Parser:
- SOI-Check (0xFFD8)
- Loop ueber Segmente (Marker + Length)
- Skip APP1 (EXIF), APP2 (FlashPix), APP13 (IPTC)
- Bei EOI (0xFFD9) oder SOS (0xFFDA): Rest direkt anhaengen
- Rebuild als Blob

**DSGVO-Konformitaet:** GPS, Geraete-Info, IPTC-Tags raus VOR KI-Send (CLAUDE.md Regel 17).

### 4. Image-Optimization Canvas-based ✅

- Resize auf maxWidth/maxHeight (proportional)
- WebP-Conversion bei Browser-Support (`canvas.toDataURL('image/webp')` test)
- Quality 0.85 default
- Fallback auf JPEG/PNG wenn WebP nicht unterstuetzt

### 5. Multi-File-Progress + Cancel/Retry ✅

`UploadItem`-Class mit State-Machine (queued|validating|processing|uploading|paused|done|error|cancelled).
XHR-basierter Upload (fuer `progress`-Events — `fetch` hat keine native Upload-Progress).
AbortController fuer Cancel.

### 6. Chunk-Upload mit Resume-Token ✅

- Chunks à 1MB (config: `chunkSize`)
- Resume-Token in `localStorage` (key: `prova-upload-resume-<id>`)
- Auto-Resume bei `online`-Event (Connection-Loss → Reconnect)
- Server-API: `/upload/chunk` POST mit `X-Upload-Id` + `X-Chunk-Index` + `X-Total-Chunks`

### 7. UI-Helper-Class (lib/foto-upload-v2-ui.js, ~140 LOC) ✅

`ProvaUploadUI`:
- Auto-builds Drop-Zone mit Icon/Title/Hint
- Renders Item-Cards mit Thumbnails (URL.createObjectURL)
- Updates Progress-Bars on Event
- Cancel/Retry-Buttons
- Total-Progress-Aggregation

### 8. CSS (lib/foto-upload-v2.css, ~110 LOC) ✅

- Drop-Zone Hover/Active-States
- Item-Cards mit Thumb/Info/Progress/Actions
- Mobile-Responsive (max-width: 640px)
- `prefers-reduced-motion` support

### 9. Tests (37 Tests gruen) ✅

| Test-File | Tests | Coverage |
|---|---:|---|
| `tests/upload/magic-bytes.test.js` | 12 | File-Type-Detection alle 7 Types + Anti-MIME-Spoofing + Edge-Cases |
| `tests/upload/exif-strip-jpeg.test.js` | 8 | EXIF-Strip-Logic + Multi-Segment + Non-JPEG-Reject |
| `tests/upload/event-emitter.test.js` | 17 | EventEmitter-Logic + ProvaUpload-Config-Defaults |

**Run:** `node --test tests/upload/magic-bytes.test.js tests/upload/exif-strip-jpeg.test.js tests/upload/event-emitter.test.js`

### 10. Echte Integration in akte.html ✅

`akte-logic.js handleDokUpload()` nutzt `window.ProvaUploadHelpers`:
- Magic-Bytes-Validation vor KI-Send (Security)
- EXIF-Strip fuer JPEGs (DSGVO)
- Image-Optimize (Resize 2048max + WebP wo moeglich)
- Fallback auf Original bei Pre-Processing-Failure

`akte.html` laedt `/lib/foto-upload-v2.js` vor `akte-logic.js`.

`sw.js` CACHE_VERSION v264 → v265 + 3 neue Lib-Files in APP_SHELL.

---

## Bewusst NICHT geliefert (NACHT-PAUSE / Marcel-Decision)

| Item | Grund |
|---|---|
| **netlify/functions/foto-upload.js Backend** | Aktueller Flow nutzt `ki-proxy` + `foto-captioning` direkt mit base64-Body. Separater Storage-Endpoint waere Refactor-Risiko ohne Live-Test. Backlog falls Storage-Pflicht entsteht. |
| **Inline-Image-Editor (Crop/Rotate/Brightness)** | Browser-Visual-Test-Pflicht — nicht headless testbar. |
| **Drag-Reorder-UX fuer Item-Cards** | Visual-Polish-Pflicht. |
| **HEIC → JPEG Conversion** | Browser-Native nicht moeglich (kein Canvas-Decoder). Backlog: heic2any-Lib. |

---

## Marcel-Pflicht-Aktionen

### Sofort (Browser-Test in akte.html)
1. Foto in akte.html hochladen (irgendein JPEG mit GPS-EXIF aus iPhone)
2. Browser-Console pruefen: `[upload] magic-bytes-check ok` + `[upload] image-preprocessing` Logs
3. KI-Captioning sollte normal funktionieren (Foto-Beschriftung erscheint)
4. Pruefen dass die im Backend ankommende Datei KEINE EXIF-GPS-Daten mehr hat (z.B. PDFMonkey-PDF runterladen + EXIF-Tools-Check)

### Optional (Sprint K-2)
5. ProvaUpload-Class als Drop-Zone in akte.html-Foto-Upload-Sektion verwenden (statt traditionellem File-Input). UI-Polish.
6. Backend `netlify/functions/foto-upload.js` recreaten (war in M1c geloescht) wenn Storage-Pflicht entsteht.
7. KI-Captioning-Endpoint auf gleiches Pre-Processing umstellen (Code-Pattern bereits da).

---

## Self-Critique (brutal-ehrlich)

### 8/10 — was gut war
- ✅ Echte Library, NICHT Pattern-Copy. Zero-deps-Implementation (kein piexifjs, kein heic2any).
- ✅ 37 Tests gruen, davon 8 fuer EXIF-Strip-Marker-Parsing (subtile Logic).
- ✅ Anti-MIME-Spoofing per Magic-Bytes (echter Security-Layer, nicht nur MIME-Check).
- ✅ Echte Page-Integration (akte-logic.js handleDokUpload nutzt Helpers).
- ✅ DSGVO-Pflicht erfuellt (EXIF-Strip vor KI-Send).
- ✅ Code dokumentiert (JSDoc + USAGE-Block).

### Was nicht 10/10 war
- ⚠️ ProvaUpload-Class (Drop-Zone-Bind/UI) NICHT in akte.html visuell integriert — nur Helpers genutzt. Vollintegration waere Browser-Test-Pflicht (Marcel-Sache).
- ⚠️ Chunk-Upload-Logic geschrieben aber nicht End-to-End getestet (kein Backend `/upload/chunk` existiert). Code ist sauber aber bisher Theorie.
- ⚠️ Kein Test fuer Image-Optimization (Canvas-only, nicht Node-testbar).
- ⚠️ HEIC-Convert nicht implementiert — iOS-User uploaden HEIC, Browser-Vorschau geht nicht. Trotzdem akzeptiert (FileReader liest als Blob), aber Server-Side muss decodieren koennen.

### Was Pattern-Copy-frei blieb (Marcel-Direktive)
- 0 Files via cp+sed
- Jeder Sub-Punkt eigenes File mit eigenem Test
- Edge-Cases dokumentiert (RIFF-without-WEBP, EXE-Header, empty bytes, truncated JPEG)

---

## Quality-Bar

- 0 Production-Breaking-Changes (Lib-Add + akte-logic-Augmentation, kein Refactor von KI-Endpoints)
- node --check OK fuer alle 4 Files (foto-upload-v2.js + foto-upload-v2-ui.js + akte-logic.js + sw.js)
- 37/37 Tests gruen
- CLAUDE.md-Konformitaet:
  - Regel 6 (sw.js CACHE_VERSION bumped: v264 → v265)
  - Regel 17 (DSGVO Pseudonymisierung VOR KI-Send: EXIF-Strip eingebaut)
  - Regel 24 (`node --check` vor Auslieferung)
  - Regel 25 (neue JS-Files in HTML eingebunden: `/lib/foto-upload-v2.js` in akte.html)
  - Regel 30 (CACHE_VERSION-Bump im selben Commit)

---

## File-Inventory MEGA⁹ W1

**Neu:**
- `lib/foto-upload-v2.js` (~530 LOC)
- `lib/foto-upload-v2.css` (~110 LOC)
- `lib/foto-upload-v2-ui.js` (~140 LOC)
- `tests/upload/magic-bytes.test.js` (12 tests)
- `tests/upload/exif-strip-jpeg.test.js` (8 tests)
- `tests/upload/event-emitter.test.js` (17 tests)
- `docs/diagnose/MEGA9-DEEP-WORK-PLAN.md`
- `docs/sprint-status/PERFEKTION-TIER-7-DONE-MEGA9.md` (diese Datei)

**Modifiziert:**
- `akte.html` — `<script src="/lib/foto-upload-v2.js">` eingebunden
- `akte-logic.js` — handleDokUpload Pre-Processing-Pipeline
- `sw.js` — CACHE_VERSION v264 → v265 + 3 neue Lib-Files in APP_SHELL

**Test-Suite:** 262 → 299 (+37, alle gruen)

---

*Tier 7 done — Deep-Work erfuellt. W2 (Tier 12 Migration) folgt.*
