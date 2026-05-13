# Teil 5 — Top-10-Prioritäten (ROI-priorisiert)
**Wenn Zeit knapp ist (1-3 Tage bis Pilot-Launch) — das hier fixen.**

> Bewertung:
> **Impact:** Gefühlter UX-Sprung beim User (1-10)
> **Effort:** Reine Dev-Zeit, nicht Kalender-Zeit (Stunden)
> **ROI:** Impact / Effort × Hebel (betroffene Pages)

---

## 🔴 PRIORITÄT 1: Kontrast-Token-Fix (global)
**Impact: 10 · Effort: 1h · ROI: MASSIV**

**Was:** `prova-design.css` :root-Block austauschen → `--text3` von FAIL (2.61:1) zu OK (6.35:1).
Dazu `--border`, `--muted`, Focus-Ring, Disabled-Token.

**Warum jetzt:**
- Marcels explizites Feedback („schwierig lesbar")
- WCAG-2.2-AA-Compliance (EU-Accessibility-Act ab 28.06.2025)
- **80+ Pages profitieren durch 1 File-Change**

**Liefer-Paket:** `patches/patched-files/prova-design.css`

**Risiko:** Sehr niedrig. Bestehende Pages werden nur _besser_ lesbar. Keine Struktur-Änderungen.

**Test:** Dashboard, stellungnahme, rechnungen in dunkler Umgebung ansehen → „Oh wow, kann ich plötzlich alle Sub-Texte lesen."

---

## 🔴 PRIORITÄT 2: kontakt-detail.html Rebuild (Activity-Stream)
**Impact: 9 · Effort: 4h · ROI: HOCH**

**Was:** 9 Tabs → Activity-Stream + Filter-Chips + Smart-Sidebar.

**Warum jetzt:**
- Kontakt-Detail ist **core-Workflow** (Marcel: „Wer ruft mich an? → Kontakt aufrufen")
- Laut Master-Doku „FEHLT noch im aktuellen System" / „Backend ready, Frontend nie gebaut" → ideal, Neuanfang ohne Migration-Schmerz
- Pattern wird Vorlage für rechnungen-detail, bescheinigungs-detail etc.

**Liefer-Paket:**
- `patches/patched-files/kontakt-detail.html` (zeigt das Pattern-in-Action)
- `patches/new-files/lib/prova-detail-sidebar.js` + `.css` (universell wiederverwendbar)
- `patches/new-files/lib/prova-filter-chips.js`

**Risiko:** Moderat. Benötigt funktionierende `kontakt-360` Edge-Function (laut Master-Doku: ✅ vorhanden).

**Fallback:** Wenn 9 Tabs behalten werden müssen → mindestens `<details>`-Collapse für 4-9
damit Mobile erträglich.

---

## 🔴 PRIORITÄT 3: stellungnahme.html — Bubble-Menu + Slash-Commands
**Impact: 10 · Effort: 6h · ROI: HOCH**

**Was:** Persistente TipTap-Toolbar → Bubble-Menu on-selection. Plus Slash-Command-Menü (`/`) für Einfügen (Norm, Baustein, Bild, KI-Rewrite-opt-in).

**Warum jetzt:**
- §6 Editor ist **DAS Hauptwerkzeug** der SVs (Master-Doku: „DAS Hauptwerkzeug")
- Regel 11: 60% Viewport für Editor → persistente Toolbar frisst 80px Platz
- Master-Doku sagt explizit: „Bubble-Menu vorbereitet (CSS da, Init fehlt)" → **die Hälfte ist schon gemacht**

**Liefer-Paket:**
- `patches/new-files/lib/prova-bubble-menu.js` + `.css`
- `patches/new-files/lib/prova-slash-menu.js` (triggert auf `/`)
- `patches/patched-files/stellungnahme.html` (Integration-Beispiel)

**Compliance-Regel:** Slash-Menü hat **immer** einen sichtbaren Button-Spiegel (`+ Einfügen`)
daneben für 50+-User und Entdeckbarkeit.

**Risiko:** Mittel. TipTap-API stabil, aber Test auf Touch-Devices nötig (iPad-SV!).

---

## 🟠 PRIORITÄT 4: Empty-States konsequent auf Listen-Pages
**Impact: 7 · Effort: 3h · ROI: GUT**

**Was:** `lib/empty-states.js` existiert schon, aber nur teilweise eingesetzt.
In `archiv.html`, `rechnungen.html`, `briefe.html`, `kontakte.html`, `mahnwesen.html`,
`bescheinigungen.html`, `fristen.html`, `eintraege.html` konsequent nutzen.

**Pattern:**
```
🗂️ (Dezent, 80px)
Noch keine Rechnungen
Schreibe deine erste Rechnung in 2 Minuten.

[ + Erste Rechnung erstellen ]   (primary)
  Import aus CSV                  (secondary link)
```

**Warum jetzt:** Pilot-Kunden starten MIT leeren Datenbanken → ihr erster Eindruck ist aktuell „leere Tabelle". Erster Eindruck sollte **einladend + handlungsleitend** sein.

**Liefer-Paket:** `patches/patched-files/archiv.html`, `rechnungen.html` (als Templates)

**Risiko:** Sehr niedrig.

---

## 🟠 PRIORITÄT 5: Sticky-Action-Footer auf allen Wizards
**Impact: 7 · Effort: 2h · ROI: GUT**

**Was:** Unten bleibende Zeile mit „Entwurf speichern" (sek) + „Weiter →" (prim).
Aktuell inkonsistent: einige Pages haben es, viele nicht.

**Betroffen:** app.html, gericht-auftrag.html, stellungnahme.html, freigabe.html,
vor-ort.html, bescheinigung-erstellen.html, wertgutachten.html, beratung.html, alle Vorlagen.

**Warum jetzt:**
- User in langem Formular müssen nie Scrollen-zum-Speichern → **Entwurf-Rettung**
- Reduziert „habe-ich-was-vergessen?"-Angst → weniger Support-Requests

**Liefer-Paket:** `patches/new-files/lib/prova-sticky-footer.js` (60 LOC)

**Risiko:** Null.

---

## 🟠 PRIORITÄT 6: kostenermittlung.html — Tabs → Initial-Picker
**Impact: 6 · Effort: 4h · ROI: MITTEL**

**Was:** 3-Modus-Tabs (Sachwert/Vergleichswert/Ertragswert) → Initial-Picker-Karten.

**Warum jetzt:** Wertgutachten-Flow (Flow B) wird ab Pilot genutzt. Tab-Pattern ist
**irreführend** (User wechselt zwischen Modi und verliert ggf. Daten).

**Liefer-Paket:** `patches/patched-files/kostenermittlung.html`

**Risiko:** Mittel (Migration für bestehende Drafts).

---

## 🔷 PRIORITÄT 7: Cmd+K-Ausbau (Actions + Kontext-Commands)
**Impact: 8 · Effort: 6h · ROI: GUT (Power-User-Feature)**

**Was:** `lib/cmd-k-modal.js` ausbauen:
- Aktion-Suggestions (nicht nur Pages): „Neuer Auftrag", „DSGVO-Export", „Backup erstellen"
- Kontext-Commands: Auf stellungnahme.html → „§6 prüfen", „PDF exportieren" zusätzlich
- Recent/Frequent: letzte 5 genutzte Actions oben
- Filter-Operatoren: `status:offen typ:gutachten`

**Warum jetzt (nicht P1-3):**
- Hat **schon** Basis (`cmd-k-modal.js` + `global-search-engine.js` vorhanden)
- Power-User-Feature → 50+-Nutzer entdecken es später
- Differenziert PROVA gegen „einfache" B2B-Tools

**Liefer-Paket:** `patches/patched-files/lib/cmd-k-modal.js`

**Risiko:** Niedrig (isoliertes Modul).

---

## 🔷 PRIORITÄT 8: Density-Toggle (Compact/Comfortable)
**Impact: 6 · Effort: 3h · ROI: MITTEL (Nice-to-have)**

**Was:** In einstellungen.html → „Darstellung" → Radio:
- Standard (Default)
- Kompakt (−30% Padding, −2px Font, mehr Inhalt pro Screen)

Umgesetzt per `body.density-compact` mit CSS-Variablen-Override.

**Warum:** Marcel (als Power-User) wird „Compact" lieben. Neu-Onboarder bleiben bei „Standard". Linear, GitHub, Notion haben es alle.

**Liefer-Paket:** `patches/new-files/lib/prova-density-toggle.js` + Tokens

**Risiko:** Niedrig.

---

## 🔷 PRIORITÄT 9: Inline-Edit auf profil-supabase + kontakte
**Impact: 7 · Effort: 5h · ROI: MITTEL**

**Was:** Click-to-Edit auf Feldern (Name, E-Mail, Telefon etc.). Enter speichert, ESC abbricht. Skeleton bei Save.

**Warum:** Attio/Notion-Standard. Spart 2-3 Klicks pro Edit.

**Liefer-Paket:** `patches/new-files/lib/prova-inline-edit.js` + `.css`

**Risiko:** Moderat (Conflict-Detection für Multi-Device — vereinfacht möglich).

---

## 🔷 PRIORITÄT 10: Skeleton-Loading-Helper + Optimistic-UI
**Impact: 6 · Effort: 4h · ROI: MITTEL**

**Was:** `lib/prova-skeleton.js` extrahieren:
```js
ProvaSkeleton.wrap(containerEl, { rows: 5, height: 40 });
// ...
ProvaSkeleton.clear(containerEl);
```

Plus: Optimistic-UI-Helper für Toggles (Favoriten, Checkboxen, Status-Change):
```js
ProvaOptimistic.toggle(el, asyncFn, { onFail: rollback });
```

**Warum:** Perceived-Performance +30%. Linear-Style. Aber als P10, weil Impact hardcore-gemessen <10% — subjektiv hoch.

**Liefer-Paket:** `patches/new-files/lib/prova-skeleton.js`

**Risiko:** Niedrig.

---

## 📆 Empfohlener Sprint-Plan bis Pilot-Launch

### Day 1 (8h)
- **Morgens (2h):** Kontrast-Fix (P1) — deployed & getestet
- **Mittags (2h):** Empty-States konsequent (P4)
- **Nachmittags (4h):** kontakt-detail Rebuild (P2)

### Day 2 (8h)
- **Morgens (4h):** kontakt-detail finalisieren + Test (P2)
- **Nachmittags (4h):** Bubble-Menu (P3) in stellungnahme.html

### Day 3 (8h)
- **Morgens (2h):** Slash-Commands (P3 Fortsetzung)
- **Mittags (2h):** Sticky-Footer-Konsistenz (P5)
- **Nachmittags (4h):** kostenermittlung Umbau (P6) — optional, kann auf Post-Pilot

→ **Nach Day 3 ist PROVA „pilot-ready mit deutlich besserer UX".**

### Post-Pilot (Woche 2+)
- P7-P10 + die ca. 30 Post-Pilot-🔷-Empfehlungen aus der Matrix.

---

## 🎯 Die EINE-Frage-Checkliste

Pro Priorität: „Wenn wir das NICHT machen, was passiert?"

| P | Nicht-Gemacht = | Konsequenz |
|---|---|---|
| P1 | Kontrast bleibt 2.61:1 | Pilot-User klagen „schwer lesbar" nach 3 Tagen, Support-Request-Welle |
| P2 | kontakt-detail bleibt 9 Tabs | Mobile-unbrauchbar, Pilot-SV-Kollegen sagen „sieht überladen aus" |
| P3 | stellungnahme persistente Toolbar | Editor-Viewport <60%, Schreib-Flow gestört, Marcels Kern-Beschwerde bleibt |
| P4 | Keine Empty-States | „Leere Anwendung-Gefühl" beim Onboarding, Conversion 20% schlechter |
| P5 | Kein Sticky-Footer | „Wo ist der Speichern-Button?"-Support-Tickets |
| P6 | kostenermittlung bleibt Tabs | Weniger schlimm (Flow B selten Pilot) |
| P7 | Cmd+K minimal | Power-User frustriert, aber kein Blocker |
| P8 | Kein Density-Toggle | Neutral, Nice-to-have |
| P9 | Kein Inline-Edit | Mehr Klicks, aber nicht blocker |
| P10 | Kein Skeleton | Gefühlt langsam, aber funktional OK |

→ **P1-P5 sind Pilot-blockierend. P6-P10 sind „post-Pilot-iteration".**
