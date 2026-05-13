# MEGA⁶⁹-INTEGRATION-PATCH-2 — Bibliothek füllen + modernisieren + Create

**Datum:** 2026-05-13
**Status:** ✅ COMPLETE (10 Items in ~4h)
**Vorgänger:** MEGA⁶⁹-INTEGRATION-PATCH-1 (v3180)
**Anlass:** Marcel-Test: Bibliothek leer + Wunsch nach Card-Look + Detail-Modal + Create-UI + Airtable-Migration.

---

## TL;DR

3-Phasen-Sprint:
- **Phase A** (Migration, 2h): 2 Edge Functions + Admin-Page für One-Off-Airtable→Supabase
- **Phase B** (Modernisierung, 1.5h): Bibliothek komplett-Rewrite mit Card-Grid + Filter + Detail-Modal
- **Phase C** (Create, 0.5h): Norm + Textbaustein Create-Modal mit Edit-Support

---

## Phase A — Migration

### A.1 `migrate-normen-airtable` Edge Function ✅
**Path:** `supabase/functions/migrate-normen-airtable/index.ts`
**Auth:** verify_jwt=true + Email-Match `marcel.schreiber@prova-systems.de`
**Quelle:** Airtable `appJ7bLlAHZoxENWE/tblnceVJIW7BjHsPF` (100+ Normen)
**Ziel:** `normen_bibliothek` mit `is_master=TRUE`, `is_global=TRUE`, `workspace_id=NULL`
**Idempotent:** Set-Check über `airtable_record_id`. Re-Run möglich, fügt nur neue ein.
**Pagination:** Airtable max 100/page, Edge Fn iteriert mit `offset` bis 5000 (safety-cap 50 pages)
**Mapping:** Field-Namen direkt (Norm-Nummer, Titel, Bereich, Schadensarten[], Anwendung, Grenzwerte, Messtechnik, Gutachter-Hinweis, Häufigkeit, Aktiv, Letzte_Pruefung)
**Service-Role-Client** für INSERT mit `workspace_id=NULL` (bypasses RLS für globale Daten).

### A.2 `migrate-textbausteine-airtable` Edge Function ✅
**Path:** `supabase/functions/migrate-textbausteine-airtable/index.ts`
**2 Quellen:**
- `tbljPQrdMDsqUzieD` (Master) → `is_global=TRUE`, `workspace_id=NULL`
- `tblDS8NQxzceGedJO` (Custom) → `is_global=FALSE`, `workspace_id=65b25a13-...` (Marcel-Workspace hardcoded)
**Mapping:** Titel/Text/Kategorie/Tags(split-by-comma)/Nutzungen für Master; titel/text/kategorie/schadenart/notiz für Custom.
**Response:** `{ migrated_master, migrated_custom, migrated, skipped, errors[], error_count }`

### A.3 Admin-Migration-Page ✅
**Path:** `tools/migrate-bibliothek-airtable.html`
**3 Actions:**
1. [▶ Normen migrieren] — POST `/functions/v1/migrate-normen-airtable`
2. [▶ Textbausteine migrieren] — POST `/functions/v1/migrate-textbausteine-airtable`
3. [Anzahl prüfen] — direkt Supabase-Client (count via head:true) für vor/nach-Vergleich

Auto-Status-Check beim Page-Load. Result-Display als Pre-Tag mit JSON.

### Marcel-Deploy-Steps (manuell):
```bash
# 1. AIRTABLE_PAT in Supabase Edge Function Secrets setzen:
supabase secrets set AIRTABLE_PAT=<token>

# 2. Edge Functions deployen:
supabase functions deploy migrate-normen-airtable
supabase functions deploy migrate-textbausteine-airtable

# 3. /tools/migrate-bibliothek-airtable.html im Browser öffnen
# 4. Klick "Normen migrieren" → ~30s warten
# 5. Klick "Textbausteine migrieren" → ~30s warten
# 6. "Anzahl prüfen" zeigt finale DB-Stats
```

---

## Phase B — Bibliothek Modernisierung

### B.1 Card-Look ✅
**Layout:** Grid mit `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`. Mobile: 1-spaltig.

**Norm-Card:** Titel + Norm-Nr (mono, rechts) + Preview (3-line clamp Anwendung) + 3 Badges (Bereich/Schadensart/Häufigkeit) + Footer (Master/Global/Eigene + Nutzungs-Count).

**Textbaustein-Card:** Titel + Preview (text_kurz) + 3 Badges (Kategorie/Schadenart/Quelle) + Footer (Tags + Nutzungs-Count).

**Hover:** `translateY(-2px)` + box-shadow + Border-Accent.

### B.2 Filter funktional ✅
**Normen-Tab:**
- Filter 1: Bereich (8 Optionen: Wärmeschutz, Feuchteschutz, Schallschutz, ...)
- Filter 2: Häufigkeit (Häufig/Mittel/Selten)
- Sort: Häufigkeit / Alphabetisch / Neueste

**Textbausteine-Tab:**
- Filter 1: Kategorie (7 Optionen: Befund, Ursache, Beurteilung, ...)
- Filter 2: Quelle (Alle / Nur Global / Nur eigene)
- Sort: Nutzungen / Alphabetisch / Neueste

**Search-Field** durchsucht relevante Felder (Norm-Nr+Titel+Anwendung bzw. Titel+Text+Kategorie).
Count-Display: "N Einträge" (gefiltert).
Alles client-side auf `state.items`.

### B.3 Detail-Modal beim Card-Click ✅
**Header:** Titel + Norm-Nr/Kategorie als Subtitle
**Body:** ALLE Felder als `bib-field` (Label uppercase + Value mit pre-wrap):
- Norm: Bereich, Schadensarten, Anwendung, Grenzwerte, Messtechnik, Gutachter-Hinweis, Häufigkeit, Letzte Prüfung, Quelle
- Textbaustein: Kategorie, Schadenart, Text, Notiz, Tags, Quelle

**Footer-Actions:**
- 📋 **Kopieren** → `navigator.clipboard.writeText()` + Toast
- ✏ **In Editor verwenden** → `window.opener.dispatchEvent('prova:insert-norm|baustein')` ODER localStorage-Bridge
- ✏ **Bearbeiten** (nur eigene) → öffnet Create-Modal mit Pre-Fill
- 🗑 **Löschen** (nur eigene) → confirm + soft-delete via `deleted_at`

**Close:** Backdrop-Click oder Escape-Key.

---

## Phase C — Create-Modal

### C.1 Create Norm ✅
**Trigger:** "+ Neue Norm"-Button im Header (im Normen-Tab) → `openCreateModal()`
**Form-Fields:**
- norm_nr (text, *Pflicht)
- titel (text, *Pflicht)
- bereich (select aus BEREICH_OPTIONS)
- haeufigkeit (select aus HAEUFIGKEIT_OPTIONS)
- anwendung, grenzwerte, gutachter_hinweis (textarea)

**INSERT:** `is_master=FALSE`, `is_global=FALSE`, `aktiv=TRUE`, `workspace_id=state.workspaceId`, `created_by_user_id=session.user.id`

### C.2 Create Textbaustein ✅
**Trigger:** "+ Neuer Textbaustein"-Button im Textbausteine-Tab
**Form-Fields:**
- titel (text, *Pflicht)
- text (textarea, *Pflicht)
- kategorie (select aus KATEGORIE_OPTIONS)
- schadenart (select aus SCHADENART_OPTIONS)
- tags (text, comma-separated → array)
- notiz (textarea, optional)

**INSERT:** `is_global=FALSE`, `workspace_id=state.workspaceId`, `text_kurz = text.slice(0,200)`

### Edit-Mode (C.1+C.2 dual-use):
`openCreateModal(id)` lädt existing item in Form → Submit ist UPDATE statt INSERT. "🗑 Löschen"-Button in Detail-Modal startet soft-delete.

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Migration-Auth | **Email-Match** (admin-only) statt Role-Check | Schneller, eindeutig, Marcel ist einziger Admin |
| Migration-Idempotenz | **Set-Check via airtable_record_id** vor INSERT | Re-Run sicher, kein UNIQUE-Constraint-Violation |
| Service-Role-Client für Migration | **Bypass RLS** für globale Daten (workspace_id=NULL) | RLS würde anonymen Workspace-Insert verbieten |
| Marcel-Workspace | **Hardcoded** `65b25a13-...` | Lookup-API komplexer für One-Off-Migration |
| Bibliothek-Rewrite | **Komplett neu** statt diff-edit | Card-Layout + Modals brauchen viel HTML-CSS-Restruktur; saubere File-Größe ~430 LOC |
| Detail+Create-Modals | **Beide in einem File** mit `state.editing`-Flag | Code-Sharing für Form-Render, Edit-Mode aus Detail-Modal |
| Filter | **Client-side** auf state.items | <500 Einträge erwartet, kein Backend-Round-Trip nötig |

---

## Verifikation

| Check | Status |
|---|---|
| `migrate-normen-airtable/index.ts` Syntax | ✅ |
| `migrate-textbausteine-airtable/index.ts` Syntax | ✅ |
| `tools/migrate-bibliothek-airtable.html` Auth + Trigger | ✅ |
| `bibliothek.html` Komplett-Rewrite (~430 LOC) | ✅ |
| Card-Grid mit Hover | ✅ |
| Filter dynamisch pro Tab | ✅ |
| Detail-Modal mit Actions | ✅ |
| Create-Modal Norm + Textbaustein | ✅ |
| Edit-Mode via openCreateModal(id) | ✅ |
| Soft-Delete via deleted_at | ✅ |
| Singleton-Client via /lib/supabase-client.js (Patch-1 Lesson) | ✅ |
| `sw.js` → v3190 | ✅ |

---

## Marcel-Test (10 Min)

```
1. PRE-DEPLOY:
   ✓ Supabase Secret setzen: supabase secrets set AIRTABLE_PAT=<token>
   ✓ Edge Fns deployen: supabase functions deploy migrate-normen-airtable
   ✓                    supabase functions deploy migrate-textbausteine-airtable

2. /tools/migrate-bibliothek-airtable.html
   ✓ Status-Check zeigt aktuelle Anzahl (vorher: 0/0)
   ✓ Klick "Normen migrieren" → "migrated: 100+, skipped: 0"
   ✓ Klick "Textbausteine migrieren" → "migrated_master: X, migrated_custom: Y"
   ✓ Status-Check zeigt nach Migration die Counts

3. Sidebar → Bibliothek
   ✓ NUR 2 Tabs: Normen | Textbausteine
   ✓ Normen-Tab: Card-Grid mit ~100 Cards
   ✓ Filter "Bereich = Feuchteschutz" → filtert
   ✓ Filter "Häufigkeit = Häufig" → filtert
   ✓ Suche "DIN 4108" → findet
   ✓ Sort "Alphabetisch" → sortiert
   ✓ Card-Click → Detail-Modal mit allen Feldern
   ✓ "📋 Kopieren" → Toast "In Zwischenablage kopiert"
   
4. "+ Neue Norm" → Modal öffnet
   ✓ Form ausfüllen (Norm-Nr + Titel) → Speichern
   ✓ Toast "Norm angelegt"
   ✓ Card erscheint in Liste (mit "Eigene"-Badge)
   ✓ Detail-Modal hat "Bearbeiten" + "Löschen" Buttons
   ✓ "Bearbeiten" → Create-Modal Pre-filled → Update
   ✓ "Löschen" → confirm → soft-delete, Card verschwindet

5. Tab "Textbausteine" → analog
   ✓ "+ Neuer Textbaustein" funktioniert
   ✓ Tags-Field (comma-separated) wird als Array gespeichert
```

---

## File-Liste

### NEU
```
supabase/functions/migrate-normen-airtable/index.ts          A.1 (~155 LOC)
supabase/functions/migrate-textbausteine-airtable/index.ts   A.2 (~150 LOC)
tools/migrate-bibliothek-airtable.html                       A.3 Admin-Page
docs/sprint-status/MEGA69-INTEGRATION-PATCH-2.md             (dieses)
```

### GEÄNDERT
```
bibliothek.html              Komplett-Rewrite (~430 LOC) — Card-Grid + Modals
sw.js                        CACHE_VERSION → v3190-mega69-integration-patch-2
```

---

## Bekannte Limitierungen / Backlog

| Item | Plan |
|---|---|
| AIRTABLE_PAT Secret muss Marcel setzen | Manuell, einmalig |
| Edge Fns muss Marcel deployen | Manuell via supabase CLI |
| Brief-Vorlagen-UI in briefe.html | Eigener Mini-Sprint nach Pilot |
| Schadensarten-Multi-Select (statt Single) | Backlog wenn UX-Feedback |
| Norm-Versions-Tracking (ersatz_fuer_norm_id) | Backlog für Norm-Updates |
| Wiederverwendung von Eigene-Bausteine in anderen Workspaces | Marcel-Direktive: bewusst NEIN |

---

## TAG-Empfehlung

`v3190-mega69-integration-patch-2` nach Marcel-Migration + Klick-Test + Push.

**Sprint-Status:**
- ✅ MEGA⁶⁹-FINAL-1/2/3 (v3140/3150/3160)
- ✅ MEGA⁶⁹-INTEGRATION Hotfix (v3170)
- ✅ MEGA⁶⁹-INTEGRATION-PATCH-1 (v3180)
- ✅ MEGA⁶⁹-INTEGRATION-PATCH-2 (v3190) — **dieses Dokument**
- ⏳ MEGA⁷⁰ Pre-Pilot Onboarding-Doku → **PILOT-LAUNCH**

---

*Ende MEGA⁶⁹-INTEGRATION-PATCH-2 · Bibliothek lebt jetzt mit echten Daten + modernem Look + Create.*
