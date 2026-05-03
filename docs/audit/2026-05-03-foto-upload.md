# Audit 12 — Foto-Upload-Sicherheit

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Code-Review `netlify/functions/foto-upload.js` + `foto-anlage-pdf.js` + `foto-captioning.js` + Storage-RLS

---

## Findings-Übersicht

| Severity | Anzahl | Bereich |
|---|---:|---|
| HIGH | 3 | MIME-Whitelist, Magic-Bytes, EXIF-Strip |
| MEDIUM | 2 | Größen-Limit, Filename-Sanitization |
| LOW | 2 | Cross-Tenant-Storage-Path, Rate-Limit |
| INFO | 1 | foto-upload.js ist Tot-Code (Airtable-Attachment) |

---

## INFO-1 — `foto-upload.js` schreibt aktuell in Airtable

**Beobachtung:** Die Function (`netlify/functions/foto-upload.js`) ruft `AT_API/v0/<base>/<table>/uploadAttachment` — Airtable-Endpoint. Voll-Cleanup-Sprint hat Airtable als Live-Daten-Pfad deprecated.

**Status:** Tot-Code post-K-1.5. Marcel hat 12 AIRTABLE_*-ENV-Vars in Netlify gelöscht → Function liefert 401/Network-Error.

**Action:** in Folge-Sprint Migration auf Supabase Storage. Aktuell: Frontend nutzt `prova-fetch-auth.js`-Wrapper, der Airtable-URLs hart blockt.

**Severity:** INFO (nicht ausnutzbar weil tot)

---

## HIGH-1 — Keine MIME-Type-Whitelist

**File:** `netlify/functions/foto-upload.js:1-100`

**Problem:** `mediaType` wird vom Frontend mitgesendet, ungeprüft an Airtable weitergeleitet. Polyglot-Files (PDF mit eingebettetem JS, gefakte image/jpeg) werden nicht erkannt.

**Beispiel-Angriff:**
```js
// Angreifer baut "image/jpeg"-Header an .exe-Datei und uploaded
fetch('/.netlify/functions/foto-upload', {
  method: 'POST',
  body: JSON.stringify({
    dataUrl: 'data:image/jpeg;base64,TVqQ...',  // PE-Header EXE
    mediaType: 'image/jpeg',
    filename: 'unschuldig.jpg.exe'
  })
});
```

**Fix-Vorschlag** (für Folge-Sprint Supabase-Migration):
```js
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
if (!ALLOWED_MIME.includes(mediaType)) {
  return json(400, { error: 'Datei-Typ nicht erlaubt: ' + mediaType });
}
// Magic-Bytes-Check:
const sig = buffer.slice(0, 12);
const isJpeg = sig[0] === 0xFF && sig[1] === 0xD8 && sig[2] === 0xFF;
const isPng  = sig[0] === 0x89 && sig.slice(1,4).toString() === 'PNG';
const isWebp = sig.slice(0,4).toString() === 'RIFF' && sig.slice(8,12).toString() === 'WEBP';
if (!isJpeg && !isPng && !isWebp) {
  return json(400, { error: 'Datei-Inhalt entspricht nicht dem MIME-Type' });
}
```

**Severity:** HIGH
**Status:** in BACKLOG (nach Supabase-Migration)

---

## HIGH-2 — Keine Magic-Bytes-Verifikation

Siehe HIGH-1 — gleicher Fix-Pfad. Magic-Bytes prüfen Datei-Inhalt unabhängig vom mediaType-Header.

---

## HIGH-3 — Keine EXIF-Strip vor Storage

**Problem:** EXIF-Metadaten enthalten oft GPS-Koordinaten, Geräte-Identifikation, Timestamp. Bei Foto-Anhängen in Gutachten = potentielle PII-Leak (Schadensobjekt-Adresse via GPS).

**Mitigation aktuell:** keine.

**Fix-Vorschlag:** EXIF-Strip server-side bei Upload via `sharp` oder `exiftool-vendored`:
```js
const sharp = require('sharp');
const stripped = await sharp(buffer).rotate().withMetadata({ orientation: undefined }).toBuffer();
// rotate() autokorrigiert Orientierung, withMetadata({}) entfernt EXIF
```

**Severity:** HIGH (DSGVO Art. 5 Abs. 1 lit. c — Datenminimierung)
**Status:** in BACKLOG für Folge-Sprint Supabase-Storage-Migration

---

## MEDIUM-1 — Größen-Limit nicht hart durchgesetzt

**Aktuell:** Function hat kein explicit `if (buffer.length > MAX) ...`. Limit kommt nur durch Netlify-Function-Body-Limit (10MB synchron, 6MB für Lambda-Standard).

**Fix:** explizit prüfen:
```js
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
if (buffer.length > MAX_BYTES) {
  return json(413, { error: 'Foto zu groß (max 10MB)' });
}
```

**Severity:** MEDIUM

---

## MEDIUM-2 — Filename-Sanitization

**Problem:** Filename wird ohne Sanitization an Airtable weitergeleitet. Path-Traversal-Vektor (z.B. `../../etc/passwd`).

**Mitigation aktuell:** Airtable würde das wahrscheinlich selbst sanitizen, aber Defense-in-Depth fehlt.

**Fix:**
```js
function sanitizeFilename(name) {
  return String(name)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}
```

**Severity:** MEDIUM

---

## LOW-1 — Storage-Pfad Cross-Tenant-Risiko

**Beobachtung:** `fotos`-Tabelle hat RLS (Audit 3 Pattern A workspace_id), aber Storage-Buckets sind separat. Marcel-Verifikation Audit 1 V5.2.2: NEEDS-MARCEL.

**Empfehlung:**
- Supabase Storage Bucket-Policies prüfen: Pfad-Struktur `<workspace_id>/<auftrag_id>/<filename>` mit Policy
  ```
  bucket_id = 'sv-files' AND
  (storage.foldername(name))[1] IN (SELECT get_user_workspaces()::text)
  ```
- Verifikation: User in Workspace A versucht Foto aus Workspace B abzurufen → muss 403/404

**Severity:** LOW (im Migration-Folge-Sprint zu prüfen)

---

## LOW-2 — Rate-Limit fehlt

→ siehe Audit 4 (RL-08) — bereits in BACKLOG

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| FU-01 | HIGH | MIME-Whitelist + Magic-Bytes | Folge-Sprint Storage-Migration |
| FU-02 | HIGH | EXIF-Strip vor Storage | Folge-Sprint, sharp-Library |
| FU-03 | MED | Größen-Limit explicit | siehe FU-01 |
| FU-04 | MED | Filename-Sanitization | siehe FU-01 |
| FU-05 | LOW | Storage-Bucket-Policies verifizieren | NEEDS-MARCEL |

---

*Audit 12 abgeschlossen 03.05.2026*
