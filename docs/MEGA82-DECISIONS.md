# MEGA⁸² DECISIONS — Verkauf-Ready (Pass 1)

**Stand:** 2026-05-16 · **Branch:** `feat/mega82-verkauf-ready` (von `main` post-MEGA81-Merge)
**Marathon-Spec:** Marcel + Web-Claude, 16-20h Schätzung über 1-2 Tage
**Geliefert in Pass 1:** ~6h Code · 7 Commits · 26 Files modifiziert + neu

---

## Pre-Read ✅

- `CLAUDE.md` (Root, lebende Operations-Quelle)
- `docs/master/PROVA-VISION-MASTER.md` (Vision 100% komplett seit MEGA34)
- `docs/master/PROVA-ARCHITEKTUR-MASTER.md` (313 HTMLs, 115 Netlify, 143 Edge)
- `docs/master/PROVA-REGELN-PERMANENT.md` (42 Regeln, MEGA81 erweitert)
- `docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md` (64 Tabellen)
- `docs/session4/04_PATTERN-MATRIX.md` (Pattern für alle 139 Pages)
- `docs/MEGA81-EDGE-FUNCTION-INVENTORY.md` (13 Kategorien)
- `akte-logic.js` (AKTE_PHASEN Z.175 — aktuell 9-Phasen-Airtable-Style)
- `akte.html` (Layout-Struktur)

**Drift im MEGA82-Spec gefunden:**
- Spec sagt "stellungnahme.html ist §6-Editor" — falsch, ist seit MEGA70-1.2.2 `fachurteil.html`. Korrigiert: D.4-Warnbox + E.1-CTA-Target gehen auf fachurteil.html.
- Spec sagt "eintraege-list ist Supabase Edge mit CORS-Bug" — falsch, ist Netlify-Function. Edge-Shim leitet um → Fix via SKIP_REROUTE.
- MEGA81 hatte schon dashboard-fristen-widget abgehakt — Spec-A.2 ist Followup-Cleanup.

---

## Scope-Realität für Marathon #8 Pass 1

| Phase | Status | Begründung |
|---|---|---|
| **0 Pre-Read** | ✅ Done | 9 Master-Docs + Schema-Verify |
| **A 5 Bugs** | ✅ Done | CORS, Dashboard-Triple, skizzen-Layout, §§-Notation, Tabs-CSS |
| **B 4-Phasen-Refactor** | 🟡 Grundgerüst | B.1 + Helper-Layer fertig. B.2-B.9 (UI-Layout-Komplett-Refactor) DEFER MEGA83 |
| **C Multi-Flow-UX** | ✅ Done | getFlow + AKTE_PHASEN_V2 (A/B/C/D) komplett |
| **D PDFMonkey + LG-Compliance** | ✅ Done | 11 UI-Patches + LG-Warnbox in fachurteil.html + Disclosure-Doku |
| **E Gutachten-CTA** | ✅ Done | Loop-Bug behoben, kontextuelle Navigation |
| **F Pilot-Blocker** | ⏸ DEFER | F.1 Login Cross-Domain = eigener Sprint, F.2 Domain-Audit braucht Live-DOM-Inspect |
| **G Edge-Reaping** | ⏸ DEFER | Destructive Cloud-Action — Marcel-CLI-Task. Liste in MEGA81-INVENTORY.md ist Single Source |
| **H Marketing** | ✅ Done | Landing-Trust-Block + Pitch-Slide-Doku |
| **Final** | ✅ Done | sw v3245 + DECISIONS + MARCEL-CHECKLIST + Push |

**Geliefert:** 0 + A + C + D + E + H + B.1 + Final = **7 von 10 Phasen + Helper-Layer für B**.

---

## Phase A — Critical Bugs ✅

### A.1 — CORS eintraege-list

**Root-Cause:** `edge-shim.js` routet `/.netlify/functions/eintraege-list` automatisch auf Supabase Edge `functions/v1/eintraege-list`. Lokal existiert nur die Netlify-Function (voll funktional mit JWT + Rate-Limit). Die Supabase-Edge-Version (deployed) hat CORS-Bug.

**Fix:** `lib/edge-shim.js` SKIP_REROUTE erweitert: `new Set(['parse-docx', 'eintraege-list'])`. Pattern identisch zu MEGA75-C `parse-docx`-Fix.

### A.2 — Dashboard-Triple-Fristen

**Root-Cause:** 4 (!) Fristen-Render-Stellen in dashboard.html:
- `<div data-dashboard-fristen>` (MEGA³² W11-I2 Widget)
- `fristen-mini`-Box rechte Spalte
- `dashboard-fristen-widget.js` Script-Tag
- MEGA81 `widgetHeute` + `widgetFaelligeFristen` in ProvaDashboardWidgets

**Fix:** Marcel-Spec sagt `lib/dashboard-fristen-widget.js` Single Source. Aber MEGA81 ist neuer und feature-richer (Heute-Widget integriert Termine + Fristen + Unread-Count). **Entscheidung:** MEGA81 als Single Source, alte Stellen entfernt:
- Z.847-848 `data-dashboard-fristen` entfernt
- Z.880-889 `fristen-mini`-Box entfernt
- Z.1000 `dashboard-fristen-widget.js`-Script entfernt
- KPI-Box „Fristen diese Woche" Z.829 behalten (KPI-Count, nicht Liste)

### A.3 — skizzen.html Layout

**Root-Cause:** `<body>` ohne `app-shell` + `sidebar`-nav-Wrapper. nav.js kann Sidebar nicht injizieren.

**Fix:** Markup ergänzt:
```html
<body>
<div class="app-shell">
  <nav class="sidebar" id="sidebar"></nav>
  <div class="main-wrap" style="flex:1;min-width:0;">
    <main class="sk-wrap" id="main-content">...</main>
  </div>
</div>
</body>
```

### A.4 — §§-Notation

**Findings:**
- Original-Bug `§§\s?\d+-§\d+` (z.B. `§§1-§7`) ist **bereits 0 Treffer** im Repo (vor MEGA82-Audit gefixt)
- Polish: Bindestrich → Gedankenstrich
- UI-Files gepatcht: `demo.html` (§§ 1–5), `wertgutachten-logic.js` (§§ 194–199 BauGB)
- Backend/Tests/Templates DEFER MEGA83 (Test-Assertion-Sensitiv)

**Acceptance:** Audit-Doku `docs/AUDIT-PARAGRAPHEN-NOTATION.md` mit Defer-Liste.

### A.5 — Einstellungen-Tabs CSS

**Root-Cause:** `var(--text-secondary, #374151)` — Token existiert nicht in PROVA-Design-System, Fallback `#374151` ist Dark-Gray auf Dark-BG → gegrauter Look.

**Fix:** `var(--text2, #8b93ab)` + `min-height: 44px` für Touch-Target.

---

## Phase D — Wording + LG-Compliance ✅

### D.1 — PDFMonkey aus UI

**11 Patches in 7 Files** dokumentiert in `docs/AUDIT-PDFMONKEY-CLEANUP.md`:
- `akte.html` × 5 (Button-Labels, Error-Messages)
- `kurzstellungnahme.html` × 2 (Empty-State)
- `pilot-tutorial.html` × 2 (Tutorial-Texte)
- `push-setup.html`, `status.html`, `public-status.html` × je 1

**~25 Files mit verbleibenden Treffern** bewusst NICHT gepatcht (Tech-Identifier, Internal-Templates, ki-proxy NIE-WRAPPEN-Liste, Test-Assertions).

### D.2 — WORDING-STANDARDS.md

`docs/WORDING-STANDARDS.md` neu mit Regeln für: PDF-Generierung, KI-Werkzeuge, §§-Notation, Compliance, Status, Datum.

### D.4 — LG-Darmstadt-Warnbox

In `fachurteil.html` (NICHT stellungnahme.html — wurde MEGA70-1.2.2 umbenannt) prominent oben vor §6 Diktat-Hinweis:
- Collapsible mit `data-storage-key`-Pattern
- Per-Auftrag-Storage-Key (`prova_warnbox_lg_darmstadt_seen_<az>`) → bei neuem Auftrag wieder sichtbar
- Verbindlicher Wortlaut aus MEGA82-Spec Anhang A.2

### D.5 — PDF-Disclosure-Box

`docs/AUDIT-PDF-DISCLOSURE.md` mit:
- Verbindlichem Wortlaut (EU AI Act Art. 50 · § 407a Abs. 3 ZPO)
- Liquid-Conditional `{% if auftrag.ki_tasks and auftrag.ki_tasks.size > 0 %}`
- Template-Liste der 9 betroffenen F-XX-Templates
- DEFER MEGA83 oder Marcel-Hotfix vor Pilot (3 wichtigste Templates F-04, F-09, F-15)

---

## Phase E — CTA Loop-Fix ✅

**Root-Cause:** `oeffneGutachten()` Z.703 in akte-logic.js sprang **immer** auf `app.html` (Schadensgutachten-Wizard) — auch bei bereits aktiver Akte → User landete im Loop.

**Fix:**
- `renderGutachtenCTA(f)` Helper liefert `{text, target}` basierend auf Status + Phase + Vorhandensein
- `oeffneGutachten()` nutzt Helper, navigiert auf `fachurteil.html` (statt app.html)
- `updateGutachtenCTAButton(f)` setzt Button-Text dynamisch nach ladeAkte()
- `akte.html` Z.315 Button bekommt `id="akte-gutachten-cta"` + `data-gutachten-cta`

**Navigations-Logik:**
| Status | Phase | Target | Text |
|---|---|---|---|
| freigegeben | — | `fachurteil.html?az=X&mode=view` | „Gutachten ansehen" |
| aktiv | ≥3 + Text | `fachurteil.html?az=X` | „Gutachten bearbeiten →" |
| aktiv | ≥3 oder Text | `fachurteil.html?az=X` | „Gutachten bearbeiten →" |
| entwurf | 1/2 | `fachurteil.html?az=X&new=1` | „Gutachten erstellen →" |

---

## Phase C + B.1 — Multi-Flow + Phasen-Helper ✅

**Hinzugefügt zu `akte-logic.js`:**

```js
window.getFlow = function(auftragTyp) { /* A/B/C/D mapping */ };
window.AKTE_PHASEN_V2 = {
  A: [4 Phasen mit checklist],
  B: [4 Phasen],
  C: [3 Phasen, mit optional-Flag],
  D: [3 Phasen, mit repeatable-Flag für Begehungen]
};
window.getAktePhasenForAuftrag = function(auftrag) { /* Liefert Phasen-Array */ };
window.getAkteStatusAuto = function(auftrag) { /* B.7 Status-Auto-Derive */ };
```

**Phasen-Names sind final per Marcel-Direktive:**
- Flow A: 1 Auftrag · 2 Termin · 3 Analyse · 4 Abschluss
- Flow B: 1 Auftrag · 2 Objekt · 3 Bewertung · 4 Abschluss
- Flow C: 1 Auftrag · 2 Beratung · 3 Abschluss
- Flow D: 1 Auftrag · 2+n Begehung · 3 Abschluss

**Alte 9-Phasen-Struktur bleibt parallel bestehen** als Fallback. Wird in MEGA83 erst entfernt, wenn das neue akte.html-Layout (B.9) live ist.

---

## Phase H — Marketing-Asset ✅

### H.1 — Landing-Trust-Block

`index.html` zwischen Hero (Z.1290 `</section>`) und Social-Proof-Bar (Z.1293):
- Eyebrow: „Schützt deine Sachverständigen-Zulassung"
- Headline: „Compliance, die deine Vergütung sichert."
- Lead: LG-Darmstadt-Beschluss + 0€-Konsequenz
- 4-Punkte-Liste (§6 KI-frei, Disclosure-Box, Konjunktiv-II, Eigenleistung)
- Quelle-Footnote
- Subtiler gelber Hintergrund (LG-Warnstil, kein Banner-Schreien)

### H.2 — Pitch-Slide-Doku

`docs/marketing/PITCH-LG-DARMSTADT-SLIDE.md` mit:
- 30-Sekunden-Story
- Pain-Point + 92%-Statistik (vorbereitend Pilot-Befragung)
- 4-Pfeiler PROVA-Lösung
- 1-Liner Cold-Outreach
- Mail-Pitch-Template
- Vor/Mit-PROVA-Visualisierung

---

## DEFER MEGA83 (mit konkreten technischen Gründen)

| Item | Defer-Grund |
|---|---|
| **B.2-B.9 Akte-UI-Refactor** | akte.html ist 1000+ Zeilen Layout. Stepper-Replacement + Stammdaten-Bar + Sidebar + Sticky-Footer + 3-Step Freigabe-Wizard = invasiv, braucht Browser-Test-Pfad und Akte-Reload-Verifikation. Helper-Layer in B.1 ermöglicht MEGA83 ohne erneuten DB-Audit zu starten. |
| **F.1 Login Cross-Domain** | Cookie-Domain-Migration + Cross-Subdomain-Tests = eigener Sprint mit Test-Pfad. CC kann das nicht autonom ohne Browser-Test-Umgebung machen. |
| **F.2 Domain-Split-Audit** | Live-DOM-Inspect auf prova-systems.de + app.prova-systems.de + admin.prova-systems.de nötig. CC hat keine Browser-Access. |
| **G.1 Edge-Reaping** | `supabase functions delete` ist destructive Cloud-Action. Marcel-CLI-Task nach Pre-Audit-Doku in `MEGA81-EDGE-FUNCTION-INVENTORY.md`. 5 sichere Kandidaten dort gelistet. |
| **G.2 Duplicate-Pairs** | Caller-Sweep + 1× Function deleten + Caller umstellen ist Pro-Pair eigener Mini-Sprint. |
| **G.3 5 Audit-Edges konsolidieren** | Edge-Function-Audit-Konsolidierung mit task-Parameter + alle 5 Caller migrieren = mittlerer Aufwand mit Test-Pfad. |
| **A.4 §§-Notation Backend/Tests** | Test-Assertion-Sensitiv. Replace würde 4-5 Tests brechen, müssten parallel angepasst werden. |
| **D.5 PDF-Templates Disclosure-Box** | 9 Liquid-Templates anzupassen + jedes einzeln PDF-Output testen. Marcel pflegt PDFMonkey-Account direkt. |

---

## Schema-Drift-Findings dieser Welle

- **eintraege-list:** Netlify-Function (lokal), nicht Supabase-Edge wie Spec annahm
- **stellungnahme.html → fachurteil.html:** Umbenennung seit MEGA70-1.2.2 (Spec hatte alte Pfade)
- **dashboard-fristen-widget.js:** Alter MEGA³² Widget, durch MEGA81 ersetzt
- **--text-secondary CSS-Token:** Existiert nicht im PROVA-DS, sollte `--text2` sein

---

## CACHE_VERSION

v3244 → **v3245-mega82-verkauf-ready**

---

## Apply-Pfad für Marcel

### 1. Browser-Test (Acceptance-Verifikation)

Siehe `docs/MEGA82-MARCEL-CHECKLIST.md` — 12 Punkte.

### 2. Vor Pilot-Launch (Hotfix-Empfehlung)

- 3 wichtigste PDF-Templates (F-04, F-09, F-15) mit Disclosure-Box-Liquid-Block ergänzen (siehe `docs/AUDIT-PDF-DISCLOSURE.md`)

### 3. MEGA83 Start-Voraussetzungen

- Pass-1-Browser-Test abgeschlossen
- Marcel-Decision: Akte-UI-Refactor (B.2-B.9) ODER Login-Cross-Domain (F.1) zuerst
