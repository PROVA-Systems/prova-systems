# MEGA⁶⁸-FINAL — Phase A — Workflow-Audit

**Datum:** 2026-05-12
**Audit-Stand:** Inspektion ohne Code-Änderung (Marcel-Direktive)
**Recherche-Mandat:** Quellen-Liste am Ende

---

## A.1 — Auftrag-Typ-Differenzierung (DB-verifiziert)

**`auftrag_typ`-Enum hat 10 Werte:**

| typ | UI-Page existing | Workflow-Status | Lücken |
|---|---|---|---|
| `schaden` | akte.html + stellungnahme.html | UI vorhanden, Workflow-Steps unklar | Phase-Stepper fehlt |
| `beweis` | akte.html | nur Generic-View | Phase-Stepper fehlt, kein typ-Spezial |
| `ergaenzung` | akte.html | Generic | Wording: NIE "§411" (Marcel-Memory) |
| `gegen` | akte.html | Generic | Gegen-Gutachten-Vergleich-UI fehlt |
| `kurzstellungnahme` | stellungnahme.html + 02-kurzgutachten-Vorlage | Editor da | Workflow-Steps abgekürzt fehlt |
| `wertgutachten` | akte.html (Generic) | UI fehlt | Wert-Schema-spezifische UI fehlt |
| `beratung` | beratung.html (322 LOC) | UI exists | Telefon-Beratungs-Notiz-Pattern unklar |
| `baubegleitung` | baubegleitung.html (281 LOC) | UI exists | Mehrere Ortstermine + Zwischenberichte-UI |
| `schied` | akte.html (Generic) | UI fehlt | Schiedsgutachten-Special-Workflow fehlt |
| `gericht` | 04-gerichtsgutachten-Vorlage | Vorlage da | Phase-Stepper für §407a-Pflichten fehlt |

**DB-State:** nur **1 Auftrag** in DB (Demo) — Workflows wurden noch nie real durchlaufen.

---

## A.2 — Page-Inventar (relevante Workflow-Pages)

### Existing Workflow-Pages (alle vorhanden!)

| Page | LOC | Zweck | Brüche-Verdacht |
|---|---|---|---|
| `dashboard.html` | 1145 | Cockpit | Tiles vermutlich legacy, KI-Stats fehlen |
| `akte.html` | 901 | Auftrag-Detail | Tabs evtl. nicht alle vorhanden (Audit/Versand/Versionen) |
| `stellungnahme.html` | 807 | §6-Editor | Hard-Replace `?editor=mega68` aktiv ✓ |
| `kontakte.html` | 608 | Kontakte-Liste | UI exists |
| `kontakt-detail.html` | – | 360-Grad? | Existiert, Inhalt unklar |
| `kontakte-supabase.html` | – | Legacy oder neu? | **Duplikat** zu kontakte.html — Bruch! |
| `termine.html` | 481 | Termine | Kalender-Integration unklar |
| `rechnungen.html` | 473 | Rechnungen | Verbindung zu Mahnwesen unklar |
| `fristen.html` | 276 | Fristen | Basis vorhanden, moderne UI fehlt |
| `mahnwesen.html` | 201 | Mahnwesen | Skelett, UI ausbaufähig |
| `beratung.html` | 322 | Beratungs-Workflow | Volumen klein, Helferlein? |
| `baubegleitung.html` | 281 | Baubegleitung | Volumen klein, Phasen-UI? |
| `briefe.html` | 181 | Briefe-Übersicht | Index existing |
| `briefvorlagen.html` | – | Vorlagen-Picker | Volumen unklar |

### Special-Vorlagen-Pages (existieren bereits, ~28 Files)

| Bereich | Anzahl Pages | Status |
|---|---|---|
| `briefe/*` | 26 Brief-Vorlagen (von angebot-gutachten bis terminsbestaetigung) | Vollständige Bibliothek! |
| `formulare/*` | 11 Vorlagen (01-standard bis 11-bauabnahmeprotokoll) | Vollständig (außer ev. 12-Bescheinigungen — Marcel-Memory: GESTRICHEN) |
| Standalone Briefe | ~20+ (auftrag-ablehnen, kuendigung, etc.) | Volumen-stark |

### FEHLENDE Pages (für Sprint-Plan)

- ❌ `bibliothek.html` — KEINE zentrale Bibliothek-UI (Phase C.4)
- ❌ `auftrag-neu.html` als spezifische Page (vermutlich Modal in akte.html?)
- ❌ Login-Page-Stand unklar (kein `login.html`, evtl `auth-supabase.html`)

### Whisper-Stack

- ✅ `lib/whisper-chunker.js` (existing)
- ✅ `lib/diktat-struktur.js` (existing)
- ❌ KEIN `lib/whisper-recorder.js` — Diktat-Mode-Bug-Recherche braucht andere File-Namen

---

## A.3 — Brüche & Lücken (Top-15 Priorität)

### Brüche (Phase B + E.6)

1. **Login-Doppel-Eingabe** prova-systems.de → app.* (Marcel 5+× gemeldet) — Phase B.1
2. **Diktat-Mode-Bug** Live-Transkript läuft bei Manual-Mode weiter — Phase B.3
3. **Index/App-Split** vermutlich nicht sauber — Phase B.2
4. **Kontakte-Duplikat:** `kontakte.html` + `kontakte-supabase.html` parallel
5. **Akte.html Tabs unvollständig:** Audit/Versand/Versionen-Tabs müssen aus stellungnahme.html nach akte.html migriert werden
6. **Phase-Stepper fehlt** pro Auftrags-Typ (Workflow-Engine Phase E.2)
7. **Dashboard veraltete Tiles** — KI-Stats, Audit-Trail-Quick, Mahnwesen-Quick fehlen
8. **stellungnahme-logic.js Legacy-Pfade** parallel zur mega68-Editor-Branch

### Lücken (Phase C)

9. **C.1 Global Search in Cmd+K** — `global-search` Edge Fn existing, UI fehlt
10. **C.2 360-Grad-Kontakt-UI** — `kontakt-360` Edge Fn existing, UI-Page fehlt
11. **C.3 Mein-Aktivitätsprotokoll** — `mein-aktivitaetsprotokoll` Edge Fn existing, UI fehlt
12. **C.4 Bibliothek-UI** komplett neue Page (Textbausteine + Normen + Briefe)
13. **C.5 Fristen Moderne UI** — Kalender-View, Drag-Drop fehlen
14. **C.6 Mahnwesen-UI** — Skelett da, 3-Stufen-Mahnung-Flow fehlt
15. **C.7 Skizze-Editor** — Skelett `prova-skizze-embed`, Canvas + Maßstab + Foto-Overlay fehlen (Session 5 Vorgabe!)

### Phase D (vorheriger MEGA⁶⁸-Run hat das meiste gemacht)

- ✅ D.1 Externe Dokumente Upload-UI (`lib/prova-externe-dokumente`)
- ✅ D.2 anhang-process Edge Function v1 ACTIVE
- ✅ D.3 Anhang-Lightbox (`lib/prova-anhang-lightbox`)
- ✅ D.4 Beweisfragen-Panel (`lib/prova-beweisfragen-panel`)
- ✅ D.5 IHK-Export Edge Function v1 ACTIVE
- ✅ D.6 Inhaltsangabe (`lib/prova-inhaltsangabe`)
- ✅ D.7 SMTP-Versand-Tab (`lib/prova-versand-smtp`)
- ✅ D.8 Audit-Search (`lib/prova-audit-search`)
- ✅ D.9 Version-Diff Beta (`lib/prova-version-diff`)

**Phase D ist zu ~95% komplett.** Restliche 5%: Toggle-UI für IHK-Export im Versand-Modal, parse-docx-Roundtrip in anhang-process für PDF/DOCX.

---

## A.4 — Aufwand-Schätzung (ehrlich)

| Phase | Items | Geschätzt CC-Zeit |
|---|---|---|
| **A** Audit (dieses) | 4 | 1.5h ✓ |
| **B** Pilot-Blocker (3) | 4 | **5-10h** (Cross-Domain-Auth-Bug-Tiefe unbekannt) |
| **C** Vollständigkeit (7) | 7 | **25-35h** (Skizze-Editor 6-10h, Bibliothek 4-6h, Mahnwesen 4-6h, Fristen 4-6h) |
| **D** Externe + IHK + SMTP | 9 | **2-3h** (Status-Check + Toggle-UI + parse-docx-Roundtrip) |
| **E** Workflow-Heilung | 6 | **20-30h** (Workflow-Engine alleine 8-12h, Akte/Dashboard-Umbau 7-11h) |
| **F** Polish + Doku | 6 | **2-3h** |

**TOTAL: 55-83h CC-Arbeit** — **deutlich über 30-50h-Budget**.

Marcel-Direktive: *"Wenn nach Phase A klar ist: das schaffen wir nicht in einem Sprint: STOP + Sub-Sprint-Plan vorschlagen"*

---

## A.5 — Sub-Sprint-Vorschlag (3-Splits)

### MEGA⁶⁸-FINAL-1 — "Bug-Fix + Pipeline-Glue" (16-22h)
- **Phase B vollständig** (3 Pilot-Blocker — kritisch)
- **Phase D Lückenschluss** (IHK-Toggle, parse-docx-Roundtrip)
- **Phase E.1** Asset-Wiring (CustomEvent-Bus integrieren in existing whisper-chunker/diktat-struktur)
- **Phase E.3** Cmd+K Navigation-Commands (Top-15 Pages)
- **Phase F.5/F.6** sw.js + Doku-Update
- **Output:** Pilot-Blocker weg, Pipeline-Hooks live, Cmd+K als Hub

### MEGA⁶⁸-FINAL-2 — "Vollständigkeits-Lücken" (20-28h)
- **Phase C komplett** (Global Search, 360, Aktivität, Bibliothek, Fristen-Kalender, Mahnwesen-UI, Skizze-Editor)
- Recherche-Mandat pro Item (10+ Quellen)
- **Output:** alle Workflow-relevanten Pages existieren

### MEGA⁶⁸-FINAL-3 — "Workflow-Heilung + Polish" (18-25h)
- **Phase E.2** Workflow-Engine mit typ-spezifischen Phasen
- **Phase E.4** Dashboard-Umbau
- **Phase E.5** Akte komplett mit Tabs (Audit/Versand/Versionen aus stellungnahme.html)
- **Phase E.6** Top-10 Brüche fixen
- **Phase F** Polish + Sprint-Doku
- **Output:** SV-Workflows fließen Ende-zu-Ende

---

## Quellen (Recherche-Mandat, Stand Phase A)

Für Phase A-Audit reichten DB-Inspektion + File-Inventar. Fachliche Quellen-Recherche für Workflows folgt in Phase C+E:

1. IHK Sachverständigenordnung (BIH-Musterregelung)
2. BVS Verbandsrichtlinien (Bundesverband öffentlich bestellter und vereidigter SVs)
3. IfS Köln Praxis-Handbuch (Institut für Sachverständigenwesen)
4. §407a–414 ZPO (Sachverständigen-Verfahrensrecht)
5. JVEG (Justizvergütungs- und -entschädigungsgesetz)
6. HOAI (Honorarordnung für Architekten und Ingenieure)
7. BGB §286 ff (Verzug, Mahnwesen)
8. DIN 1961 (VOB/B)
9. DIN 31051 (Instandhaltung)
10. LG Darmstadt 10.11.2025 Az. 19 O 527/16 (KI-Transparenz)
11. EU AI Act Art. 50 (KI-Disclosure-Pflicht)
12. NinjaAI Session 4 Master-Index (Workflow-Sparring)
13. NinjaAI Session 5 (Editor- + Skizze-Pattern)

Pro Phase-C/E-Item werden weitere ≥10 Quellen ergänzt.

---

## Empfehlung an Marcel

**Optionen:**

1. **3 Sub-Sprints** wie A.5 vorgeschlagen — schaffbar, sauber, mit Test-Pausen
2. **2 Sub-Sprints** (B+D+E in einem, C separat) — kompakter, mehr Risiko
3. **MEGA⁶⁸-FINAL alles in einem Run** — nur möglich wenn Marcel zustimmt dass `node --check`-only-Quality reicht und einige Items als Skelett+Backlog akzeptiert werden

**Empfehlung:** Option 1 (3 Sub-Sprints). Marcel hat selbst gesagt: *"Lieber 2× MEGA⁶⁸ als ein halbgares Riesen-Ding"* — gilt umso mehr für 3 Sub-Sprints bei 55-83h.

Wenn Marcel "GO Sub-Sprint-1" sagt: ich starte sofort mit Phase B (3 Pilot-Blocker).
