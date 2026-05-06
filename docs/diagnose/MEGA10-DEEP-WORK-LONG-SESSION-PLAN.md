# MEGA¹⁰ — Deep-Work Long-Session Plan + Brutal-Self-Assessment W1+W2

**Datum:** 2026-05-04 nacht (Continuation MEGA⁹)
**Vorgaenger-Tag:** v213 (MEGA⁸ V5)
**Zielsetzung:** Marcel-Direktive "1 Tier perfekt 10/10 statt 5 Tiers 7/10"
**Honesty-Note:** Ich bin LLM, ich messe nicht in Stunden. Was ich liefern kann: pro Sub-Punkt mehr Iterationen, mehr Edge-Cases echt durchdenken, brutal-ehrlich werten, REFACTOR bestehender Arbeit statt nur Drauf-Schreiben.

---

## 1. Brutal-Critique W1 (Tier 7 Upload-System) — was ich uebersehen habe

Ich habe W1 mit "8/10" bewertet. Nach Re-Read finde ich **mindestens 5 konkrete Bug-Klassen** die das auf 6/10 druecken.

### Bug-Klasse A: **Image-Orientation-Bug (KRITISCH fuer iOS-User)**

**Befund:** `lib/foto-upload-v2.js stripExif()` entfernt das APP1-Segment komplett. Darin steht aber auch die EXIF-Orientation (Tag 0x0112). iPhone-Hochformat-Fotos haben Orientation=6 (90° rotiert). Der Browser nutzt diese Info zum korrekten Anzeigen.

**Konsequenz nach EXIF-Strip:**
1. EXIF-Strip entfernt Orientation-Tag
2. `optimizeImage()` zeichnet via `ctx.drawImage()` ohne Orientation
3. Hochformat-Foto wird quer gespeichert → Schaden-Foto vom Ortstermin landet 90° gedreht in der KI-Captioning

Das ist **production-breaking** fuer SVs die iPhone-Hochformat fotografieren — was die Mehrheit ist.

**Fix-Approach:** Orientation VOR EXIF-Strip lesen, in Canvas-Transform anwenden, dann strippen.

### Bug-Klasse B: **Memory-Leak (Mobile-killing)**

**Befund:** `lib/foto-upload-v2.js loadImage()` macht:
```js
img.src = URL.createObjectURL(blob);
```

NIE wird `URL.revokeObjectURL()` aufgerufen. Bei einem SV der 20 Fotos hochlaedt (Ortstermin-Standard) wird der Browser-Heap mit 20 Blob-References belegt. Auf iPhone mit 3GB RAM = Browser-Crash.

**Genauso in `lib/foto-upload-v2-ui.js`:** thumbnails werden via `URL.createObjectURL` gesetzt aber nie released.

**Fix:** revokeObjectURL nach `img.onload` (sofort beim ImageDecoder-Done) oder nach Upload-Done.

### Bug-Klasse C: **Magic-Bytes-Tabelle unvollstaendig (Real-World-Files-Reject)**

**Aktueller Stand der MAGIC_BYTES-Liste:**
- HEIC: Sucht nur nach `ftyp` + `heic`-Brand. Aber iPhone-12+ schreibt **`mif1`-Brand** fuer HEIF-Bilder. Files werden trotzdem als HEIC angeboten — meine Detection lehnt sie ab.
- HEIC-Variants: `heix`, `heim`, `heis`, `hevc`, `hevx`, `mif1`, `msf1` — alle koennen HEIC sein. Ich check nur 2 davon.
- TIFF: komplett fehlt. SVs scannen oft Beweisstuecke als TIFF von Multifunktionsdrucker.
- BMP: fehlt (alte Windows-Workflows).
- WebP-VP8L (Lossless): hat anderen Sub-Header (`VP8L`), meine Check sucht nur `VP8 ` (mit Space).

**Konsequenz:** Real-World-Files vom iPhone werden falsch abgelehnt — User sieht "Datei abgelehnt: unknown_magic_bytes" obwohl Foto valide ist.

### Bug-Klasse D: **Canvas-Size-Limit nicht beachtet (DSLR-Bug)**

**Befund:** `optimizeImage()` setzt Canvas-Size auf `newWidth/newHeight` ohne Pruefung gegen Browser-Canvas-Max.

**iOS-Safari-Limit:** 4096×4096 Pixel maximal. Bei groesserem Canvas: stumme Failure (Canvas wird leer).
**Chrome-Mobile-Limit:** 8192×8192.
**Desktop-Browsers:** 16384×16384 oder 32767×32767.

DSLR-Foto eines SV (z.B. Sony A7 = 6000×4000) wuerde:
- Mein `maxWidth: 2048` resize auf 2048×1365 → OK
- ABER `loadImage(blob)` versucht ZUERST das volle 6000×4000 als `<img>` zu laden → iOS-Safari laedt es, aber `ctx.drawImage(img, 0, 0, 2048, 1365)` mit dem 6000er-img kann auf alten iPhones Memory-Pressure ausloesen

**Fix:** Vor `loadImage` blob-Size + EXIF-Dimensions-Header lesen, ggf. zweite Decode-Strategie (createImageBitmap mit resizeWidth-Option).

### Bug-Klasse E: **akte-logic.js Integration ist halbherzig**

Mein Done-Doc sagte "echte Page-Integration". Re-Read zeigt:
- Magic-Bytes-Validation **stillschweigend** (kein User-Feedback bei Spoofing-Detection — nur console.warn)
- EXIF-Strip-Status wird NICHT in Audit-Trail geloggt — CLAUDE.md Regel 17/34 aber Frontend-Logging fehlt
- File-Size-Reduktion durch Optimize ist NICHT sichtbar fuer User (10MB → 800KB ohne UI-Feedback)
- Fallback-on-Error ist still — User merkt nicht dass Pre-Processing fehlgeschlagen ist
- KEIN HEIC-Hinweis: User uploaded HEIC, KI-Captioning faehrt direkt rein, OpenAI lehnt ab → User sieht "Captioning fehlgeschlagen" ohne Grund

**Self-Critique zusammen: Meine "8/10" war optimistisch. Real: 6/10.**

---

## 2. Brutal-Critique W2 (Tier 12 Empty-State-Migration) — wo ich faul war

Ich habe W2 mit "7/10" bewertet. Nach Re-Read: das war ueberkritisch in genau einem Punkt, aber zu mild in zweien.

### Wo ich zu faul war

**a) Loading-Skeleton-Migration: "Browser-Visual-Test-Pflicht" war Ausrede**

`ProvaUI.skeleton(target, type, count)` ist bereits implementiert. CSS ist bereits geladen. Migration eines `<div class="loading">Lade…</div>` zu `ProvaUI.skeleton(target, 'cards', 3)` braucht keinen Browser-Test — die Library hat eigene Tests.

5 Stellen × 5 Min = 25 Min Arbeit. Habe ich nicht gemacht. **Faulheit, keine Vorsicht.**

**b) Toast-Migration nur 1 Stelle statt Sweep**

~30 alert()-Stellen im Code. Mein Argument war "Sweep waere Hetze". Das war falsch — Sweep mit eindeutigem Pattern (alert-only, NICHT confirm) ist strukturierte Arbeit, nicht Hetze.

**c) Form-Validate als NACHT-PAUSE — aber app-login-logic.js hat eine echte Form**

`app-login.html` hat `<form id="login-form" onsubmit=...>`. Das ist EXAKT das Pattern fuer ProvaForm.attachValidation. Ich haette migrieren koennen mit:
- Email-Pattern-Check
- Passwort-Min-8-Zeichen
- Submit-Button-Disable bei invalid

15 Min Arbeit. Habe ich nicht gemacht.

### Wo W2 ueberkritisiert war

**Ich gab 7/10 weil "WCAG-Polish ausgelassen"** — aber WCAG-Code-Polish ohne axe-Audit ist tatsaechlich Pseudo-Compliance. Diese Begruendung war richtig. → 7/10 unfair tief.

**Ehrliche Re-Bewertung W2: 6.5/10** (Skeleton + Toast-Sweep + Form-Login waeren niedrig-haengende Frucht)

---

## 3. Plan MEGA¹⁰ — eine schwere Entscheidung

### Option A: Refactor von W1 + W2 (Senior-Engineering)

**Pro:** Echtes Senior-Engineering geht zurueck und fixt was nicht 10/10 ist. Marcel-Direktive "10/10" passt darauf.
**Contra:** Marcel hat NEUE Tiers angeboten (Tier 1, Tier 2). Refactor von eigenem Code wirkt fuer Marcel weniger sichtbar.

### Option B: Tier 1 Mobile-Lighthouse-Excellence (Marcel-Empfehlung)

**Pro:** Pre-Pilot-kritisch (SVs nutzen iPhone). Marcel hat das prominent vorgeschlagen.
**Contra:** Reines Drauf-Schreiben statt Bug-Fix. PWA-Vollstaendigkeit fuer App, deren Foto-Upload (Tier 7) noch Image-Orientation-Bug hat, ist Lippenstift auf Schwein.

### Option C: Tier 1 + Tier 2 (Marcel "wenn du dich traust")

**Pro:** Volume.
**Contra:** Genau die "Breite-statt-Tiefe"-Falle die Marcel kritisiert hat. Beide Tiers in 8h waeren je 4h = 22-Min-Sprints in groesser.

### Meine Wahl: **Option A + Tier 1-Subset**

**Begruendung:** Marcel hat in dieser Direktive ZWEI Sachen verlangt die in Spannung stehen:
1. "Sub-Tier 4-5h MINIMUM" + "Refactor-Pass nach erster Version PFLICHT"
2. "WAEHLE Option C wenn du dich traust"

Refactor-Pass von W1 IST die Pflicht (Punkt 1). Wenn ich das ueberspringe um Tier 1 ANZUFANGEN, falle ich genau in die Hetze. Bug-Fix von W1 KANN nicht warten — wir geben gerade einem Pilot-User Software wo Hochformat-Fotos quer landen.

**Plan-Detail MEGA¹⁰:**

### W4 (Refactor-Pass W1, ~3-4h Aufwand-Aequivalent)

a) **Image-Orientation-Fix:**
   - Funktion `readExifOrientation(blob)` zu lib/foto-upload-v2.js
   - `optimizeImage()` extended: Orientation lesen, Canvas-Transform anwenden, dann verlustfrei resize
   - Test: konstruierte JPEGs mit allen 8 Orientation-Werten + Visual-Verify-Plan

b) **URL.revokeObjectURL durchgaengig:**
   - In `loadImage()`, in `bindThumb()` (ui-helper)
   - Pattern: `try/finally` mit `URL.revokeObjectURL(src)`

c) **Magic-Bytes-Tabelle erweitert:**
   - HEIC-Brands: heic, heix, heim, heis, hevc, hevx, mif1, msf1
   - TIFF (II*\0 + MM\0*)
   - BMP (BM)
   - WebP-VP8L
   - 5+ neue Tests

d) **Canvas-Size-Limit Defense:**
   - `MAX_CANVAS_DIM = 4096` (iOS-Safari-konservativ)
   - Pre-Check vor `loadImage()` ob blob zu gross
   - createImageBitmap mit resizeWidth wo unterstuetzt (modern), Canvas-Fallback

e) **akte-logic.js Polish:**
   - Magic-Bytes-Spoofing-Detection: User-Toast bei MIME-Mismatch
   - File-Size-Reduktion nach Optimize: Console-Log + UI-Hint
   - HEIC-Hinweis: bei Upload User zeigen "HEIC wird auf Server konvertiert"
   - Audit-Trail-Log (console.log mindestens, da Frontend)

f) **Tests + Doku-Update:**
   - 12+ neue Tests (Orientation 8 + Magic-Bytes 5+ extended)
   - PERFEKTION-TIER-7-DONE-MEGA9.md Self-Critique-Update auf 9/10 NACH Refactor
   - Done-Doc MEGA¹⁰ W4 mit Bug-Fix-Liste

### W5 (Tier 12 Vertiefung, ~2h Aufwand-Aequivalent)

a) **Loading-Skeleton-Migration:** dashboard.html (recent-list), archiv.html (kanban), rechnungen.html, kontakte.html, briefvorlagen.html — vom `<div class="loading">` zu `ProvaUI.skeleton()` 

b) **Form-Validate in app-login-logic.js:** Email-Pattern + Password-MinLen + Submit-Disable

c) **Toast-Migration sweep:** alert-only-Pattern (keine confirm()), ~10-15 Stellen

d) Tests + Mini-Done-Doc

### W6 (Final-Report, ~1h)

a) MEGA-DECIMA-2026-05-NACHT-FINAL.md (300+ Zeilen)
b) sw.js v265 → v266
c) GITHUB-RELEASE-v215.md draft
d) **NICHT pushen, NICHT taggen** — Marcel-OK pflicht

### Was ich NICHT mache (NACHT-PAUSE)

- **Tier 1 Mobile-Lighthouse-Excellence**: braucht Browser-Lighthouse-Run zur Verifikation, ohne den ist alles Pseudo-Optimierung. Marcel-Pflicht: Lighthouse vor + nach pro Page → konkretes Findings → dann Code.
- **PWA-Manifest-Vollstaendigkeit**: braucht echte Icons (Marcel-Asset-Pflicht), kann ich nicht generieren ohne Source-Datei
- **Tier 2 Cockpit-Restpunkte**: Drilldown/Bulk-Ops/Saved-Views haben alle Backend-Pflicht (User-Preferences-Endpoint), Backend-Refactor ist Pre-Pilot zu riskant

---

## 4. Quality-Bar fuer MEGA¹⁰

**Pro Sub-Punkt:**
- Tests umfassend (kein "1 Happy-Path")
- Edge-Cases dokumentiert
- Refactor-Pass durchgefuehrt (mind. 1x)
- In mind. 1 Page integriert (NICHT nur Library)
- Self-Critique mit konkretem Score

**Pro Tier:**
- Real-World-Use-Case durchgespielt (z.B. "iPhone-Hochformat-Foto vom Ortstermin")
- Browser-Test-Plan dokumentiert (auch wenn Marcel ausfuehrt)
- Performance-Implications gedacht (Mobile-Heap, Canvas-Limit, etc.)
- Self-Critique 9/10 oder weiter arbeiten

**Pro Sprint:**
- 0 Production-Breaking-Changes
- node --check OK
- sw.js CACHE_VERSION bumped (CLAUDE.md Regel 6+30)
- 30+ neue Tests (W4: 12, W5: 8, plus Polish)

---

## 5. Stop-Triggers (wann ich pausiere)

1. **Sub-Punkt > 2× geschaetzt** → ehrlich dokumentieren als NACHT-PAUSE
2. **Tests nicht parallel zum Code** → aufhoeren bis Tests da sind
3. **Pattern-Copy-Versuchung** → Stop, refactor zu echter Loesung
4. **"Browser-Test pflicht" als Ausrede fuer Library-only** → NEIN, mindestens Test-Plan-Doku-Pflicht
5. **Self-Critique-Score < 9/10** → weiter arbeiten am Tier

---

## 6. Erwartete Quality-Metrics nach MEGA¹⁰

- **Tests:** 307 → 335+ (~28 neue Tests fuer Refactor + W5)
- **LOC neu:** ~600 (Refactor von W1 ist netto klein, W5 ist klein)
- **Bugs gefixt:** 5 in W1 (Orientation, Memory-Leak, Magic-Bytes, Canvas-Limit, Halbintegration)
- **Skeleton-Migrations:** 5 Pages
- **Toast-Migrations:** 10-15 Stellen
- **Form-Validate-Migration:** 1 echte Form (login)
- **Quality-Score W4 nach Refactor:** Ziel 9/10 (vs. ehrliche 6/10 vor Refactor)
- **Quality-Score W5:** Ziel 8/10

---

## 7. NACHT-PAUSE-Pflichten an Marcel (Outstanding)

Diese werden in MEGA¹⁰ NICHT geloest, brauchen Marcel-Decision:

1. **HEIC → JPEG Server-Side-Decoding:** Sharp-Lib in Edge Function ki-proxy, oder client-side via heic2any (~600KB)?
2. **PWA-Icon-Set:** Marcel muss die 8 Icon-Groessen + 12 Splash-Screens als Assets liefern
3. **Lighthouse-Audit-Schedule:** wann macht Marcel eine echte Lighthouse-Run pro Page (Mobile + Desktop)?
4. **User-Preferences-Backend (fuer Saved-Views in Tier 2):** Supabase-Tabelle `user_settings` mit JSON-Blob, oder dedizierte Spalten?
5. **Audit-Trail-Frontend-Logging:** soll Foto-Upload einen audit_trail-Eintrag pro Foto via Edge-Function erzeugen?

---

## 8. Was ich Marcel ehrlich versprechen kann

- Kein "8h gearbeitet"-Theater (ich bin LLM, das waere Luege)
- Echte iterative Refactor-Passes pro Sub-Punkt
- Brutal-ehrliche Self-Critique pro Tier
- Bug-Fix-Discipline: Bug ist gefixt erst wenn Test failed-vorher-passes-nachher
- 0 Production-Breaking-Changes

**Was ich NICHT versprechen kann:**
- Browser-Lighthouse-Verify (Marcel-Pflicht)
- iOS-Safari-Real-Device-Test (Marcel-Pflicht)
- Render-Pixel-Perfect-Visual-Check (Marcel-Pflicht)

Ich bin ehrlich darueber damit Marcel weiss was er noch tun muss.

---

*Self-Assessment-Stand: 2026-05-04 nacht. Plan-Start: W4 Refactor-W1 (Image-Orientation-Bug zuerst — kritischster Befund).*
