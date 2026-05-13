# MEGA⁶⁹-INTEGRATION-PATCH-1 — nach Marcel-Test 13.05.2026

**Datum:** 2026-05-13
**Status:** ✅ COMPLETE (5 Items in ~2h)
**Vorgänger:** MEGA⁶⁹-INTEGRATION Hotfix (v3170)
**Anlass:** Marcel-Klick-Test zeigte 3 echte Bugs + 1 UX-Refresh-Wunsch nach v3170-Push.

---

## TL;DR

| # | Bug | Fix |
|---|---|---|
| PATCH.1 | "Keine Anmeldung" beim Auftrag-Anlegen | Singleton-Client aus `lib/supabase-client.js` (Cross-Domain-Cookie-Storage) statt eigener createClient |
| PATCH.2 | Brief-Vorlagen-Tab in Bibliothek (Marcel Q2: gehört zu Büro) | Tab entfernt, 2 Tabs übrig: Normen + Textbausteine |
| PATCH.3 | "Keine Treffer" bei leerer DB | Freundlicher Empty-State + Verlinkung zu normen.html / textbausteine.html |
| PATCH.4 | 5-Step-Stepper irreführend, Steps 2-5 tot | Stepper raus, Sticky-Header + Sticky-Action-Bar, existing 4 Cards (A/B/C/D) bleiben |

---

## PATCH.1 — Session-Bug ✅

**Problem-Diagnose:**
`auftragAnlegenUndOeffnen()` in `app-logic.js` (MEGA⁶⁹-INTEGRATION INT.5) erstellte einen NEUEN Supabase-Client via:
```js
const mod = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
const sb = mod.createClient(URL, ANON, { auth: { persistSession: true } });
```
Dieser Client nutzt **Standard-localStorage**. Aber `lib/supabase-client.js` (MEGA³⁹ P10 F1, Cross-Domain-Login-Fix) speichert Session in einem **Cookie auf `.prova-systems.de`** (Cross-Subdomain-Storage-Adapter). Resultat: `sb.auth.getSession()` returns `null` → "Keine Anmeldung".

**Fix:**
Dynamic-Import des Singleton-Clients statt eigenen createClient:
```js
const mod = await import('/lib/supabase-client.js');
const sb = mod.supabase;
```

**Lesson für zukünftige Sprints:**
> **Niemals** `createClient(...)` in app-logic.js / inline-Scripts erstellen.
> **Immer** `import('/lib/supabase-client.js').supabase` nutzen.
> Sonst: Session-Mismatch zwischen MEGA³⁹-Cookie-Storage und Standard-localStorage.

## PATCH.2 — Brief-Vorlagen-Tab raus ✅

**Vorher (3 Tabs):**
```
📐 Normen | 📝 Textbausteine | ✉ Brief-Vorlagen
```

**Nachher (2 Tabs):**
```
📐 Normen | 📝 Textbausteine
```

**Subtitle:** Hinweis "Brief-Vorlagen findest du in „Briefe" unter Büro."

**JS-Branch `tab === 'briefe'` entfernt** aus `loadTab()`.

**Backlog:** `briefe.html` bekommt eigenen Vorlagen-Bereich mit `document_templates`-Daten (5 Einträge in DB). Marcel-Direktive Q2-Implementierung in eigenem Mini-Sprint.

## PATCH.3 — Bibliothek Empty-State ✅

**Vorher:** `<div class="bib-empty">Keine Treffer</div>` (für alle Cases gleich)

**Nachher:**
- Bei `allItems.length === 0` (DB leer):
  - **Normen-Tab:** Icon 📐 + "Noch keine Normen hinterlegt" + Hinweis "DIN-Normen + Grenzwerte + Anwendung — wiederverwendbar" + CTA-Button "+ Erste Norm hinzufügen →" → `/normen.html`
  - **Textbausteine-Tab:** Icon 📝 + Analog mit Link zu `/textbausteine.html`
- Bei `items.length === 0 && allItems.length > 0` (Filter-Mismatch): "Keine Treffer für aktuellen Filter."

Beide Pages existieren (`normen.html`, `textbausteine.html`) → Verlinkung sicher.

## PATCH.4 — Wizard Single-Page-Redesign ✅

**Vorher:**
- Stepper 1-5 (Stammdaten / Diktat&Fotos / Analyse / Freigabe / Export) → suggeriert mehrstufigen Prozess
- Aber: Steps 2-5 sind tot (Marcel: "alter Code, KEINE neuen Features")
- User-Verwirrung: "Bin ich auf Step 1 von 5?"

**Nachher (1-Page):**
- Stepper komplett `display:none` (Steps 2-5 als Markup gehalten, aber nie sichtbar)
- **Sticky-Header** oben: `<h1>Neuer Auftrag · <span id="page-header-typ">Stammdaten</span></h1>` + Subtitle: "Pflichtfelder ausfüllen, dann Auftrag anlegen — alle weiteren Schritte (Diktat, Fotos, Skizzen, Befund) in der Akte."
- **Dynamischer Typ-Label** via URL-Param `?typ=schaden|gericht|beratung|...` (Mapping zu deutschem Label)
- Existing **Sektion A/B/C/D Card-Layout** bleibt (war schon Card-Pattern — Marcel-Direktive Q1 "Wizard behalten für Stamm-Daten")
- **Sticky-Action-Bar** unten: [Entwurf speichern] [Auftrag anlegen + Akte öffnen →] — Button-Text aktualisiert (vorher "Auftrag anlegen + öffnen")
- **KEIN Stepper-Logik-Rewrite** in `app-logic.js`: `goToStep` etc. bleiben als unused functions (nicht aufgerufen). PATCH-Minimal-Invasive.

**Self-Scoping:** Card-CSS bleibt unverändert (existing `.card`, `.card-header`, `.form-group` etc. sind schon modern). Marcel-Spec "weniger Rahmen, mehr Whitespace" ist erfüllt durch die Sticky-Header-Trennung.

---

## Marcel-Test (3 Min)

```
1. "Neuer Auftrag" → Schadensgutachten
   ✓ KEIN Stepper 1-5 mehr
   ✓ Sticky-Header "Neuer Auftrag · Stammdaten" oben
   ✓ 4 Cards (Auftrag / Auftraggeber / Schadensort / Geschädigter)
   ✓ Sticky-Action-Bar unten

2. Stammdaten ausfüllen → "Auftrag anlegen + Akte öffnen"
   ✓ KEIN "Keine Anmeldung"-Fehler mehr!
   ✓ Toast "Auftrag angelegt: AZ-..."
   ✓ Redirect zu /akte?id=NEUE_UUID
   ✓ Akte zeigt 12-Tab-Bar + AZ

3. Sidebar → "Bibliothek"
   ✓ NUR 2 Tabs: Normen | Textbausteine
   ✓ Subtitle erwähnt "Brief-Vorlagen findest du in Briefe unter Büro"
   ✓ Empty-State sichtbar: Icon + "Noch keine Normen hinterlegt" + CTA-Button
   ✓ Klick CTA → /normen.html (existing Page)
```

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| PATCH.1 Approach | **Singleton-Client wiederverwenden** statt Storage-Key manuell matchen | Sauber, future-proof, ein Source-of-Truth |
| PATCH.2 Folow-up | **Brief-Vorlagen in briefe.html → BACKLOG** | Eigene Mini-Sprint, briefe.html ist 181 LOC und braucht eigenes Vorlagen-UI |
| PATCH.4 Stepper-Logik | **Code bleibt** (goToStep etc.) | Minimal-invasiv, nicht aufgerufen, kein Risiko |
| PATCH.4 Card-CSS | **Existing Cards bleiben** | War schon ordentlich, nur Stepper war das Problem |

---

## File-Liste

### GEÄNDERT
```
app-logic.js                 PATCH.1 Singleton-Client-Import
bibliothek.html              PATCH.2 Tab entfernt + Subtitle Hinweis + PATCH.3 Empty-State
app.html                     PATCH.4 Stepper hidden + Sticky-Header + Button-Text "Akte öffnen"
sw.js                        CACHE_VERSION → v3180-mega69-integration-patch-1
```

### NEU
```
docs/sprint-status/MEGA69-INTEGRATION-PATCH-1.md   (dieses)
```

---

## TAG-Empfehlung

`v3180-mega69-integration-patch-1` nach Marcel-3-Min-Test + Push.

**Sprint-Status:**
- ✅ MEGA⁶⁹-FINAL-1 Pilot-Core (v3140)
- ✅ MEGA⁶⁹-FINAL-2 Skizze-Editor (v3150)
- ✅ MEGA⁶⁹-FINAL-3 Pre-Pilot 100% Vision (v3160)
- ✅ MEGA⁶⁹-INTEGRATION Hotfix (v3170)
- ✅ MEGA⁶⁹-INTEGRATION-PATCH-1 (v3180) — **dieses Dokument**
- ⏳ MEGA⁷⁰ Pre-Pilot Onboarding-Doku (kein Code mehr) → PILOT-LAUNCH

---

## Bekannte Limitierungen / Backlog

| Item | Plan |
|---|---|
| Brief-Vorlagen-UI in briefe.html | Eigener Mini-Sprint nach Pilot-Start |
| Stepper-Logik (goToStep etc.) in app-logic.js | Cleanup-Backlog (toter Code) |
| Stepper-Markup in app.html | Cleanup-Backlog (display:none gehaltene Reste) |
| Normen/Textbausteine seed-Daten | Marcel füllt via /normen.html + /textbausteine.html |

---

*Ende MEGA⁶⁹-INTEGRATION-PATCH-1 · 3 Bugs gefixt + Wizard-UX neu · Pilot-Launch ready.*
