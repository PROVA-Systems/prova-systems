# Hotfix K-UI/X1 — Status-Bericht

**Branch:** `hotfix-k-ui-x1-briefe-profil-fab`
**Datum:** 2026-04-29
**Bearbeiter:** Claude Code + Marcel

---

## Zielsetzung

3 zusammengehoerige Frontend-Probleme aus Marcels Browser-Test fixen:

1. briefe.html — 11 Brief-Cards rendern nicht (CSP-Block esm.sh)
2. profil-supabase.html — Logo/Stempel/Unterschrift-Upload funktioniert
   nicht + Drag&Drop fehlt komplett
3. fab.js — "Schnellbrief"-Action verlinkt auf alte briefvorlagen.html
   statt auf neue briefe.html

---

## Bilanz pro Block

### ✅ Block 1 — CSP-Fix (commit 193a0f2)

**Marcel's Diagnose:** "briefe-logic.js importiert Supabase ueber CDN
esm.sh, andere K-UI-Pages aus lokalem lib/supabase-client.js."

**Tatsaechlich:** briefe-logic.js importiert bereits aus
`/lib/supabase-client.js` (genau wie profil-supabase + kontakte-supabase).
Der **echte** Block kommt aus der CSP:

- `script-src` hatte `https://esm.sh` ✓
- `connect-src` hatte `https://esm.sh` ✗

ESM-Module-Imports (z.B. `import { createClient } from 'https://esm.sh/...'`)
werden vom Browser via `fetch()` geladen — fallen damit unter `connect-src`,
nicht `script-src`. Ohne `esm.sh` in `connect-src` -> CORS-Block.

**Files:**
- `netlify.toml`: `connect-src` + `https://esm.sh` + `https://cdn.jsdelivr.net`
- `_headers`: synchron dazu

Zusatz: `cdn.jsdelivr.net` direkt mitgenommen (Shepherd.js Onboarding-
Tour, pdf.js — beides bereits im Code, latente CSP-Falle).

**Marcel-Test:**
- /briefe.html in Inkognito -> 11 Brief-Cards muessen links erscheinen.
- /profil-supabase.html + /kontakte-supabase.html ebenfalls testen
  (gleiche CSP-Falle, Marcel hatte bisher Glueck dass Browser-Cache
  esm.sh-Modul behalten hat).

---

### ✅ Block 2 — profil-supabase Drag&Drop + Limits (commit 43dbce0)

**profil-supabase-logic.js:**
- `MAX_BYTES`: 200 KB -> **5 MB** (Marcel-Vorgabe aus Sprint-Prompt)
- `ALLOWED_MIME`: + `image/svg+xml` (PNG/JPG/SVG)
- `MIME_TO_EXT`-Map: `image/svg+xml -> svg`
- Konkretere Fehlermeldungen mit Werten ("2.34 MB (max. 5 MB)",
  "Format 'application/pdf' nicht unterstützt")
- Neuer `bindDropZone(type)`-Helper: HTML5 dragenter/over/leave/drop
  auf jede `.upload-card`. File-Picker bleibt parallel funktional.
  Schutz gegen Mehrfach-Upload + relatedTarget-Check (kein Flicker
  bei Bewegung ueber Sub-Elemente).
- `init()` ruft `bindDropZone` fuer alle 3 Typen.

**profil-supabase.html:**
- `.upload-card`: transition + neue `.drag-over`-Klasse mit
  Border-Highlight (--accent) + dezenter Background-Tint
- `section-hint` aktualisiert: "PNG/JPG/SVG, max. 5 MB" + "Datei
  reinziehen oder Hochladen klicken"
- `accept`-Attribute auf 3x `<input type=file>`: `image/svg+xml` ergaenzt

---

### ⚠️ Block 3 — Hotfix-Migration (commit 7a391bf)

**Frontend-Aenderung in Block 2 reicht NICHT alleine:**
- Der `letterheads`-Bucket wurde in `20260429_add_letterhead_config.sql`
  mit `file_size_limit=204800` (200 KB) und `allowed_mime_types =
  ['image/png', 'image/jpeg']` angelegt.
- Server-side wuerde 5 MB-Upload mit **413 Payload too large** abgelehnt
  + SVG-Upload mit **415 Unsupported Media Type**.

**Loesung: neue Migration `20260430_relax_letterhead_limits.sql`**:
- `UPDATE storage.buckets SET file_size_limit = 5*1024*1024,
   allowed_mime_types = ['image/png', 'image/jpeg', 'image/svg+xml']
   WHERE id = 'letterheads'`
- Idempotent — RLS-Policies aus Vor-Migration bleiben unveraendert.
- `DO $$ ... RAISE NOTICE`-Block validiert die neuen Werte.

**🚨 MARCEL-TODO (vor Test in Browser):**
Migration ist **NICHT applied**. Bitte manuell ausfuehren:

```sql
-- Im Supabase-Dashboard SQL-Editor (Project cngteblrbpwsyypexjrv):
UPDATE storage.buckets
SET
    file_size_limit    = 5 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml']::text[]
WHERE id = 'letterheads';
```

Sanity-Check (Erwartung):
```sql
SELECT id, file_size_limit, allowed_mime_types
  FROM storage.buckets
  WHERE id = 'letterheads';
-- erwartet: file_size_limit = 5242880, mime_types = {image/png,image/jpeg,image/svg+xml}
```

Alternativ via CLI:
```bash
supabase db push
```

---

### ✅ Block 4 — fab.js Schnellbrief-Action (commit 4f037e2)

**fab.js:**
- "Schnellbrief"-Item: `href` von `briefvorlagen.html?modus=freistehend`
  -> `briefe.html?mode=schnellbrief`
- briefvorlagen.html bleibt unangetastet (parallel bis Sprint 04e
  Konsolidierung)

**briefe-logic.js:**
- `_isSchnellbrief = (URL ?mode=schnellbrief)` — modul-level Konstante
- Renderer im Schnellbrief-Modus:
  - Hinweis-Banner oben (warning-Style, orange):
    "Schnellbrief-Modus - Brief ohne Fall-Zuordnung - wird nicht in
    eine Akte abgelegt"
  - Auftrag-Picker im BEZUG-Block wird via `display:none` versteckt
    (Select bleibt im DOM, damit `generate()`-Code unveraendert bleibt
    -> auftrag_id wird einfach `null`)
- `generate()`: kein Sonderfall, Backend erlaubt `dokumente`-Insert mit
  `auftrag_id=null` (Spalte ist nullable).

---

### ✅ Block 5 — sw.js v239 (commit 3702d91)

CACHE_VERSION v238 -> v239 (Pflicht-Bump bei Frontend-Files).
APP_SHELL bleibt unveraendert (alle K-UI-Files schon drin seit v238).

---

## Sprint-Bilanz

| Block | Status | Commit |
|-------|--------|--------|
| 1 CSP-Fix | ✅ | 193a0f2 |
| 2 Drag&Drop + Limits | ✅ | 43dbce0 |
| 3 Hotfix-Migration | ⚠️ Marcel-TODO | 7a391bf |
| 4 fab.js + Schnellbrief | ✅ | 4f037e2 |
| 5 sw.js v239 | ✅ | 3702d91 |

**5 Commits auf `hotfix-k-ui-x1-briefe-profil-fab`, lokal — Push folgt nach Marcels OK.**

---

## Was Marcel jetzt tun muss

### Pflicht (vor Browser-Test):
1. **Migration applizieren** (Block 3): SQL aus
   `supabase/migrations/20260430_relax_letterhead_limits.sql` im
   Supabase-Dashboard ausfuehren.
2. **Push freigeben:** `git push -u origin hotfix-k-ui-x1-briefe-profil-fab`
   (lokal-only bis hier, weil Migration manuell laufen muss).

### Browser-Test (nach Migration):
1. /briefe.html in Inkognito -> 11 Cards muessen rendern
2. /profil-supabase.html: Logo per Drag&Drop reinziehen -> Border
   wird blau -> Drop -> Toast "Logo gespeichert"
3. SVG-Datei + 4 MB PNG hochladen (Maximaltest)
4. /dashboard.html -> FAB-Burger -> "Schnellbrief" klickt -> /briefe.html
   mit oranger Hinweis-Banner + Auftrag-Picker verschwunden
5. Schnellbrief generieren (z.B. Auftragsablehnung) -> PDF erscheint
   in Result-Card

### Verschoben auf K-1.4 / K-1.5:
- /briefvorlagen.html cleanup (alte Page deprecaten)
- /kontakte.html cleanup (alte Page)

---

## Warum Marcel's Diagnose teilweise off war

Marcel sagte "briefe-logic.js importiert Supabase ueber CDN esm.sh".
Das stimmte nicht — alle drei K-UI-Logic-Files importieren aus
`/lib/supabase-client.js` (lokal, das File seinerseits laedt
@supabase/supabase-js von esm.sh).

Browser-Cache hat das Modul wahrscheinlich beim ersten Profil-/Kontakte-
Test eingelagert — deshalb gingen die. Bei briefe.html (frisch
geoeffnet) hat der Browser neu gefetcht und ist auf den
`connect-src`-Block gestossen.

Die **echte** Loesung ist die CSP-Reparatur, nicht ein Refactor von
briefe-logic.js. CSP-Fix hilft latent auch profil + kontakte (sobald
Marcel deren Browser-Cache leert).

---

## Bekannte Risiken

1. **Migration nicht idempotent fuer "noch nie gelaufen":** Wenn
   `letterheads`-Bucket nicht existiert, schlaegt das UPDATE silent fehl.
   Der `DO $$`-Block am Ende RAISE EXCEPTION wenn Bucket fehlt — also
   sicherer Fehler statt unbemerkt.
2. **CSP gilt nach Netlify-Deploy:** Bis der Push live ist, hilft der
   CSP-Fix Marcel nicht. Workaround in der Zwischenzeit: Browser-Dev-
   Tools -> CSP voruebergehend deaktivieren oder direkt auf
   netlify-staging testen.
3. **SVG-Upload-Sicherheit:** SVG kann `<script>` enthalten. Browsers
   fuehren Script in `<img src="...svg">`-Tags NICHT aus, also kein
   XSS-Risk im Brief-Render. Aber: signed URL koennte direkt in einem
   `<iframe>` referenziert werden. Brief-Templates rendern via `<img>`
   -> safe. Falls Marcel kuenftig SVG anders einbettet -> separater
   Sanitize-Schritt noetig.
