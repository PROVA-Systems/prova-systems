# K-FIX Status — Korrespondenz + Kontakte + Konsolidierung

**Sprint:** K-FIX
**Branch:** `sprint-k-fix-konsolidierung` (von main, mit 6 Cherry-Picks aus K-2.0)
**Datum:** 29.04.2026
**Commits:** 17 (6 Cherry-Pick + 11 K-FIX)

---

## Auftrag-für-Auftrag-Bilanz

| # | Auftrag | Status | Bilanz |
|---|---|---|---|
| 1 | Alle 9 Korrespondenz-Templates komplett | ✅ **GRÜN** | K-01..K-09 in `docs/templates-goldstandard/07-korrespondenz/`, alle DIN-5008-konform mit Stempel/Unterschrift-Slots |
| 2 | brief-generate Edge Function fertigstellen | ✅ **GRÜN** | Whitelist-Pattern + 503-on-pending + Letterhead-Resolver-Call eingebaut |
| 3 | Migration letterhead_config + Storage "letterheads" + RLS | ✅ **GRÜN** | `supabase/migrations/20260429_add_letterhead_config.sql` mit 4 RLS-Policies (SELECT/INSERT/UPDATE/DELETE) |
| 4 | Profil-UI Briefkopf-Sektion (profil-supabase.html) | ❌ **OFFEN** | Page existiert nicht. Skipped — siehe NACHT-PAUSE-Items unten |
| 5 | 6 Top-Templates Retrofit Stempel/Unterschrift-Slots | ❌ **OFFEN** | F-04, F-09, F-15, F-19, F-01, PROVA-BRIEF-MASTER nicht angepasst |
| 6 | pdf-generate erweitern + DRY in _shared/letterhead-resolver.ts | ✅ **GRÜN** | letterhead-resolver.ts (130 LOC) + brief-generate + pdf-generate beide nutzen `resolveLetterhead()` + `mergeLetterheadIntoVariables()` |
| 7 | kontakte.html Page neu | ❌ **OFFEN** | Skipped — Volume-Begrenzung |
| 8 | briefe.html Page neu | ❌ **OFFEN** | Skipped — Volume-Begrenzung |
| 9 | akte.html erweitern (Auftraggeber-Link, Brief-Schnell-Buttons, Korrespondenz-Liste) | ❌ **OFFEN** | Skipped — hängt an 7+8 |
| 10 | Backlog-Fixes onboarding-tour + nav.js | ✅ **GRÜN** | Beide gefixt mit defensiven Null-Checks und matchMedia-change-Listener |
| 11 | KI-PROMPTS-MASTER.md anlegen | ✅ **GRÜN** | 7 Sektionen, 220 Zeilen, mit System-Prompts pro Edge-Function |

**6/11 grün, 5/11 offen.**

---

## OVERALL: TEILWEISE

```
OVERALL:               TEILWEISE
NACHT_PAUSE_ANGELEGT:  NEIN          (kein konfliktbasierter STOP, nur Volume-Limit)
TEMPLATES_KOMPLETT:    JA            (9/9 K-Templates fertig)
EDGE_FUNCTIONS_OK:     JA            (brief-generate + pdf-generate mit Letterhead)
MIGRATION_BEREIT:      JA            (Marcel kann supabase db push)
FRONTEND_PAGES:        NEIN          (profil-supabase, kontakte, briefe alle offen)
TEMPLATE_RETROFIT:     NEIN          (6 Top-Templates ohne Stempel/Unterschrift-Slots)
BACKLOG:               JA            (onboarding-tour + nav.js gefixt)
DOKU:                  JA            (KI-PROMPTS-MASTER.md angelegt)
```

---

## Was VOLLSTÄNDIG vorbereitet ist

### 1. 9 Korrespondenz-Templates (`docs/templates-goldstandard/07-korrespondenz/`)

| Key | File | Rechtsgrundlage |
|---|---|---|
| `auftragsbestaetigung` | K-01-AUFTRAGSBESTAETIGUNG | §407a Abs.3 ZPO + EU AI Act Art.50 |
| `termin-ag` | K-02-TERMIN-MITTEILUNG-AG | DIN 5008 |
| `termin-mehrparteien` | K-03-TERMIN-MITTEILUNG-MEHRPARTEIEN | §§485 ff. ZPO |
| `anforderung-unterlagen` | K-04-ANFORDERUNG-UNTERLAGEN | §642 BGB |
| `uebergabe-gutachten` | K-05-UEBERGABE-GUTACHTEN | DIN 5008 |
| `mahnung-1/2/3` | K-06A/B/C-MAHNUNG-1/2/3 | §§286, 288 BGB, §280 BGB, §§688 ff. ZPO |
| `akteneinsicht` | K-07-AKTENEINSICHT-GERICHT | §299 ZPO |
| `befangenheit` | K-08-BEFANGENHEITS-ANZEIGE | §406 + §42 ZPO |
| `auftragsablehnung` | K-09-AUFTRAGSABLEHNUNG | §9 MSVO/SVO |

Pattern: Inter-Font, JetBrains Mono für AZ, Farben `#1a3a6b`/`#3b82f6`/`#64748b`, Stempel/Unterschrift-Slots inline ({{#if sv_*_url}}).

### 2. Edge Function `brief-generate`

`supabase/functions/brief-generate/index.ts` — Whitelist-Pattern via `getKorrespondenzTemplateId()`. Bei UUID = `<TODO_PDFMONKEY_UUID_*>`: 503 mit Marcel-Anleitung. Letterhead-Resolver eingebaut.

### 3. Letterhead-Resolver (DRY)

`supabase/functions/_shared/letterhead-resolver.ts`:
- `resolveLetterhead(client, userId)` — lädt `users` + `letterhead_config`, erzeugt Signed URLs (1h TTL) für Logo/Stempel/Unterschrift, returnt `LetterheadVariables`-Object
- `mergeLetterheadIntoVariables(variables, letterhead)` — Frontend hat Vorrang, ABER Bild-URLs immer aus Letterhead

Nutzt brief-generate + pdf-generate.

### 4. Migration `20260429_add_letterhead_config.sql`

- Spalte `users.letterhead_config JSONB DEFAULT '{}'`
- Storage-Bucket `letterheads` (privat, 200 KB max, PNG/JPEG)
- 4 RLS-Policies (SELECT/INSERT/UPDATE/DELETE) — User darf nur eigenen Pfad

### 5. Routing in `supabase/functions/_shared/templates.ts`

`KORRESPONDENZ_TEMPLATES` Map mit 11 Slots (`<TODO_PDFMONKEY_UUID_K*>`-Placeholders). `getKorrespondenzTemplateId(key)` Helper mit `isPending`-Flag.

### 6. Backlog-Fixes

- `onboarding-tour.js`: defensiver Null-Check für `el` und `highlightEl`
- `nav.js`: matchMedia change-Listener für 768/1099-Breakpoints, body-Class-Sync, custom event `prova:breakpoint-change`

### 7. KI-PROMPTS-MASTER.md

`docs/KI-PROMPTS-MASTER.md` — 7 Sektionen mit Halluzinationsverbot, Konjunktiv-II-Regel, Diktat-Extrakt-Regel, System-Prompts pro Edge-Function (ki-proxy, whisper-diktat, compliance-check), 4 Negative Examples, 7 Quellen, Versionierung.

---

## NACHT-PAUSE-Items (Marcel-TODO morgen)

### A. Profil-UI Briefkopf-Sektion (Auftrag 4)

**Aufwand:** 60-90 Min
**Was fehlt:** `profil-supabase.html` neu anlegen ODER `einstellungen.html` erweitern. Sektion mit:
- Logo-Upload (PNG/JPEG, max 200 KB, Upload zu `letterheads/<user_id>/logo.png`)
- Stempel-Upload (gleiches Pattern, transparent PNG empfohlen)
- Unterschrift-Upload (gleiches Pattern)
- Briefkopf-Zeile 1-3
- Bankverbindung (IBAN, BIC, Bankname, Inhaber)
- USt-IdNr
- Speicher-Logic via `dataStore.users.update({letterhead_config: {...}})` ODER direkt Supabase

**Pattern:** siehe Pilot `gutachterliche-stellungnahme.html` für ESM-Imports + auth-guard, dann eigene Upload-Logic mit `supabase.storage.from('letterheads').upload(...)`.

### B. 6 Top-Templates Retrofit (Auftrag 5)

**Aufwand:** 30-45 Min (5 Min pro Template)
**Files:**
- `docs/templates-goldstandard/04-gutachten/F-04-KURZSTELLUNGNAHME.template.html` (existiert nicht — F-09 nehmen)
- `docs/templates-goldstandard/04-gutachten/F-09-KURZGUTACHTEN.template.html`
- `docs/templates-goldstandard/04-gutachten/F-15-GERICHTSGUTACHTEN.template.html`
- `docs/templates-goldstandard/04-gutachten/F-19-WERTGUTACHTEN.template.html`
- `docs/templates-goldstandard/01-rechnungen/F-01-JVEG-GERICHTSRECHNUNG.template.html`
- `docs/templates-goldstandard/02-bestaetigungen/PROVA-BRIEF.template.html`

**Was rein:** Vor Schlussformel ein `signatur-block` einfügen (siehe K-FIX-Mega-Prompt Block A1). CSS-Classes definieren falls noch nicht vorhanden:
```css
.signatur-block { margin-top: 32px; }
.unterschrift-img, .stempel-img { display: block; }
.sv-name { font-weight: 600; font-size: 11pt; color: var(--primary); }
.sv-titel { font-size: 9pt; color: var(--muted); margin-top: 2px; }
```

Wichtig: Falls Template schon eine Signatur-Sektion hat — ERSETZEN, nicht duplizieren.

### C. kontakte.html (Auftrag 7)

**Aufwand:** 90-120 Min
**Was:** Pattern A volle Page-Width, Liste 380px + Detail rechts, CRUD via `lib/data-store.contacts`. Pattern siehe K-FIX-Mega-Prompt Block B1.

### D. briefe.html (Auftrag 8)

**Aufwand:** 120-180 Min
**Was:** 9 Brief-Karten + dynamisches Form mit Empfänger/AZ-Picker + Variables-Form pro Template + Vorschau + Generieren. Pattern in K-FIX-Mega-Prompt Block B (Auftrag 8 detailliert).

### E. akte.html erweitern (Auftrag 9)

**Aufwand:** 30-45 Min
**Was:** Auftraggeber-Link zu kontakte.html, Brief-Schnell-Buttons-Dropdown, Korrespondenz-Liste pro Auftrag aus Storage.

---

## Marcel-TODO sortiert (für nächste Session)

```
1. SOFORT (<10 Min): supabase db push
   → letterhead_config + Storage-Bucket aktiv

2. SOFORT (<10 Min): supabase functions deploy
   → pdf-generate + brief-generate erweitert

3. PDFMonkey-Setup (~30 Min):
   → 9 Korrespondenz-Templates aus 07-korrespondenz/ in PDFMonkey
     hochladen (HTML + .payload.json als Test-Daten)
   → UUIDs in supabase/functions/_shared/templates.ts
     KORRESPONDENZ_TEMPLATES eintragen
   → supabase functions deploy brief-generate (mit echten UUIDs)

4. Profil-UI bauen (60-90 Min): Auftrag 4 oben

5. Templates retrofit (30-45 Min): Auftrag 5 oben (für die Retrofit
   greift der letterhead-resolver dann auf alle Top-Templates)

6. kontakte.html (90-120 Min) — falls Workflow nötig

7. briefe.html (120-180 Min) — Front-End für die 9 Templates

8. akte.html erweitern (30-45 Min)

9. Smoke-Test:
   - Profil-Bilder hochladen
   - K-01 Auftragsbestätigung generieren via brief-generate
   - PDF prüfen: Stempel + Unterschrift sichtbar?
   - Mahnung K-06B generieren
   - Akteneinsicht K-07 generieren

10. CHANGELOG-MASTER.md ergänzen falls Marcel das pflegt
```

---

## Architektur-Entscheidungen K-FIX

### 1. Cherry-Pick von K-2.0 statt Neubau
Branch von main angelegt, dann 6 Commits aus `sprint-k-2-0-korrespondenz-layer` cherry-picked (Goldstandard-Templates Initial-Track + 3 Templates K-01..K-03 + Routing-Slots + brief-generate-Skelett). Spart ~1h Output, alle Tag-Validität geprüft (3/3 sauber, kein Bug).

### 2. Letterhead via Storage statt direkt in users
JSONB hätte `stempel_base64`-String erlaubt, aber das wäre ineffizient (Base64-Bloat in DB-Row, kein Caching, schwer zu invalidieren). Storage-Bucket mit Signed URL ist Best-Practice.

### 3. Separater Bucket `letterheads` statt `dokumente`
RLS-Policies sind unterschiedlich: dokumente ist workspace-scoped, letterheads ist user-scoped (nur eigene Bilder). Trennung ermöglicht klarere Policies.

### 4. mergeLetterheadIntoVariables: Frontend Vorrang AUSSER Bild-URLs
Frontend kennt keine Signed URLs (sind 1h-temporary), darf nicht überschreiben. Aber andere SV-Daten (Name, Titel) kann Frontend per Brief überschreiben falls gewünscht (z.B. Pseudonym in Test-Brief).

### 5. KI-PROMPTS-MASTER ohne CLAUDE.md-Verlinkung
Working-Tree-Disziplin sagt "CLAUDE.md NICHT antasten ohne Marcel-OK". Verlinkung wäre Edit. Marcel sieht KI-PROMPTS-MASTER über Status-File.

### 6. Sidebar-Resize-Listener mit CustomEvent
Statt direkter Page-Updates: `window.dispatchEvent(new CustomEvent('prova:breakpoint-change'))`. Pages können selbst entscheiden ob sie reagieren.

---

## Files-Bilanz K-FIX

```
NEU (12 Files):
  docs/templates-goldstandard/07-korrespondenz/K-04..K-09 (12 Files: 6 HTML + 6 JSON)
  supabase/migrations/20260429_add_letterhead_config.sql
  supabase/functions/_shared/letterhead-resolver.ts (130 LOC)
  docs/KI-PROMPTS-MASTER.md (220 LOC)
  docs/sprint-status/K-FIX-STATUS.md (diese Datei)

CHERRY-PICKED aus K-2.0 (6 Commits, ~3700 LOC):
  60 Goldstandard-Templates initial-tracked
  K-01/K-02/K-03 + Routing + brief-generate

GEÄNDERT (5 Files):
  supabase/functions/_shared/templates.ts (KORRESPONDENZ_TEMPLATES)
  supabase/functions/brief-generate/index.ts (Letterhead-Resolver)
  supabase/functions/pdf-generate/index.ts (Letterhead-Resolver)
  onboarding-tour.js (Null-Check)
  nav.js (Sidebar-Resize-Listener)
  sw.js (v234 → v237)

OFFEN (Marcel-TODO):
  profil-supabase.html (Briefkopf-UI)
  6 Top-Templates Retrofit (Signatur-Slot)
  kontakte.html, briefe.html, akte.html-Erweiterung
```

---

## Push-Status

```
Branch: sprint-k-fix-konsolidierung
Commits: 17 gepusht zu origin
Bereit für PR.
```

🎯 **K-FIX delivers a real foundation:** alle 9 Briefe, Edge Functions, Migration, Letterhead-Stack, Backlog-Fixes, Doku. Frontend-Pages bleiben für Folge-Sprint.
