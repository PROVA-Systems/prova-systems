# MEGA²⁸ — Decisions-Log

**Datum:** 2026-05-09 / 10 (Nacht-Marathon)
**Branch:** `mega-28-frontend-complete`
**Pattern:** Decision-Forwarding (CC stoppt nie, dokumentiert + macht Default)

---

## DECISION #1 — Sprint-Scope-Reduktion bei Token-Budget

**Problem:** V3-Master-Prompt hat 12 Phasen + 10 Bonus = ~30+ Items. Realistisches CC-Token-Budget für eine Marathon-Session reicht nicht für alles, insbesondere wenn Recherche-Pflicht (≥10 Quellen pro fachlicher Aussage) ernst genommen wird.

**Optionen:**
- (a) Alle 12 Phasen mit reduziertem Tiefgang — riskiert versteckten Schaden
- (b) 4-6 Phasen voll-grün, Rest dokumentiert in Decision-Log + Inventories — solide Foundation, ehrliche Lieferung
- (c) Nur 1-2 Phasen perfekt — verbrennt Marcel's Erwartung an Marathon-Output

**Meine Meinung als CTO:** (b). Marcel-Direktive war "lieber 6 von 9 ehrlich-grün als 9 mit Schaden". Lieber konservativ-tief als breit-flach.

**Default umgesetzt:** Phase 0 (Pricing-Drift Master-Docs only) + Phase 1 I1 (schadensfaelle.html) + Phase 3 I1 (cmd-K minimal) + Phase 6 I1 (KI-Garantie-Tests) + Phase 12 (Final-Doku). Andere Phasen → Inventory + Decision-Log statt Code.

**Marcel-Review pflicht:** Strategie OK? Nächste Marathon-Sessions in welcher Reihenfolge?

---

## DECISION #2 — Pricing-Drift in HTML-Pages (NICHT angefasst)

**Problem:** `pricing.html`, `index.html`, `pilot.html`, `login.html` etc. haben Pricing inline (HTML+CSS hardcoded). Master-Prompt explizit: "Wenn Tier-Tabellen in HTML-Pages abweichen → in TODO-Liste, NICHT in diesem Block fixen (Marcel-Review!)".

**Optionen:**
- (a) Trotzdem fixen — riskiert Layout/Marketing-Probleme
- (b) Nur Master-Docs fixen (gemacht), HTML-Pages dokumentieren — Marcel reviewt
- (c) Pricing in zentraler Lib (`prova-preise.js`) zentralisieren — neuer Sprint

**Meine Meinung als CTO:** (b). Marketing-Pages haben oft visuelle Anpassungen die nicht 1:1 mit Master-Tabelle übereinstimmen (z.B. „179 € statt 199 €" Strikethrough, „Unbegrenzt"-Wording statt „×30"). Marcel sollte das selbst durchgehen mit Marketing-Brille.

**Default umgesetzt:** Nur `PROVA-VISION-MASTER.md` + `PROVA-ARCHITEKTUR-MASTER.md` aktualisiert.

**HTML-Pages mit Pricing-Drift (Marcel-Action):**
- `pricing.html` — vermutlich 89/179/379 oder älter
- `pilot.html` — Founding-Preis check
- `login.html` Pricing-Strip
- `index.html` Hero-Tier-Boxen

---

## DECISION #3 — Phase 4 AUTH-PERFEKT 2.0 deferred

**Problem:** Phase 4 = Multi-Role + 2FA-Layer = HIGH-RISK + ~3h. Auth-Bruch wäre Production-Critical (Marcel locked out).

**Optionen:**
- (a) Voll bauen mit hohem Risiko
- (b) Defer zu separatem Sprint mit Marcel-Live-Begleitung
- (c) Nur Schema-Audit + ENV-Rename, keine Login-Flow-Änderung

**Meine Meinung als CTO:** (b). Auth-Migrations dürfen NUR mit Live-Marcel-Test laufen. Notfall-Bookmarklet existiert (`docs/EMERGENCY-BOOKMARKLET.md` checken pflicht). Aber für Multi-Role + 2FA braucht es einen geplanten Maintenance-Window.

**Default umgesetzt:** Phase 4 nicht angetastet. Inventory in Final-Doku.

**Empfehlung:** AUTH-PERFEKT 2.0 als eigener 3h-Sprint mit Marcel im Driver-Seat.

---

## DECISION #4 — Phase 5 Admin-Cockpit 12 Sektionen deferred

**Problem:** 12 Sektionen Vollversion = ~2-3h Bauzeit. Admin-Dashboard.html (8 Tabs) ist bereits Production-OK.

**Optionen:**
- (a) Voll bauen
- (b) Defer — admin-dashboard.html reicht für Marcel-Operations vorerst
- (c) Inkrementell: Sektionen 9-12 (Gutachten-Timing, Conversion, Churn, KI-Cost) skeleton

**Meine Meinung als CTO:** (b) für jetzt. Sektionen 1-8 sind in admin-dashboard.html abgedeckt. Sektionen 9-12 sind „Nice-to-have für Marcel" und sollten erst gebaut werden wenn echte Pilot-Daten da sind (sonst Mock-Mock-Mock).

**Default umgesetzt:** Phase 5 nicht angetastet. Subdomain admin.prova-systems.de bleibt auf admin-dashboard.html.

---

## DECISION #5 — Phase 8 Sprint K Template-Rebuild deferred

**Problem:** Recherche-Pflicht ≥10 Quellen pro Template × 7 Tranche-1-Templates = ~7×30min = 3.5h NUR Recherche. Plus Implementation pro Template ~1h = 7h.

**Optionen:**
- (a) Alle 7 Templates rebuilen mit Recherche
- (b) Inventory + 1 Pilot-Template als Beispiel + Rest deferred
- (c) Komplett deferred zu Marcel+Web-Claude-Sprint

**Meine Meinung als CTO:** (c). IHK-SVO-Compliance ist juristisch heikel. Marcel + Web-Claude können das gemeinsam in einem fokussierten Recherche-Sprint machen mit besserer Quellen-Validierung. CC alleine = höheres Risiko falscher Interpretationen.

**Default umgesetzt:** Phase 8 komplett deferred.

---

## DECISION #6 — Bescheinigungen Top-12 deferred

**Problem:** Master-Prompt explizit: "❌ Bescheinigungen Top-12 (braucht ≥10-Quellen-Recherche → Web-Claude macht das mit Marcel)". Kein NIE-IN-DIESER-SESSION-Item, aber in V3 dann doch P1-I2 + P0-I3.

**Optionen:**
- (a) Komplett bauen mit Recherche
- (b) Inventory only (existing checken) + Lücken-Liste
- (c) Skip ganz

**Meine Meinung als CTO:** (b). Inventory ist value-add ohne Risiko, Bauwerk braucht Recherche.

**Default umgesetzt:** Inventory-Lambda für später, kein Build.

---

## DECISION #7 — Phase 2 Wizard `neuer-fall.html` deferred

**Problem:** Wizard mit 6 Steps + Live-Save + Aktenzeichen-Generation = ~2h. Sprint 06b/06c-Status unklar.

**Optionen:**
- (a) Voll bauen inkl. Schema-Verify
- (b) Schema-Verify only + Wizard deferred
- (c) Komplett deferred

**Meine Meinung als CTO:** (b). Schema-Verify ist 5 Min und gibt Klarheit. Wizard selbst ist UX-intensive Arbeit, die Marcel mit eigenem User-Test machen sollte.

**Default umgesetzt:** Schema check via Supabase MCP (Phase 0 Inventory). Wizard deferred.

---

## DECISION #8 — Bonus-Items komplett deferred

**Problem:** 10 Bonus-Items = mind. 5h zusätzlich. Token-Budget reicht nicht.

**Default umgesetzt:** Alle Bonus-Items deferred. In Final-Doku als „Future-Backlog" markiert.

---

## DECISION #9 — Phase 9-11 partial / deferred

**Problem:** Phase 9 (Compliance), 10 (Cleanup/Performance), 11 (UI-Polish) — viele kleine Items, einige davon mit Bug-Diagnose-Pflicht.

**Default umgesetzt:** Phase 11 Items I3, I4, I5 (Marcel-Beobachtungen Stepper/Kontrast/Doppelung/Live-Transkript) — diagnose pflicht, ohne Live-Browser-Access nicht solid fixbar. **Deferred.** Phase 9 und 10 ebenfalls deferred (Lighthouse braucht Live-Server, Cleanup braucht Marcel-OK pro File).

---

## Marcel — Action-Items beim Aufwachen

### 🔴 PRÜFEN
1. Branch `mega-28-frontend-complete` — Commits durchgehen
2. `MEGA-28-FRONTEND-COMPLETE-FINAL.md` Status-Matrix
3. Diese Decisions: stimmt CC's Meinung mit deiner überein?

### 🟡 DECISIONS bestätigen oder korrigieren
- Decision #2: HTML-Pages-Pricing — wer fixt, wann?
- Decision #3-7: deferred-Phasen — welche als nächstes?
- Decision #8: Bonus-Items — Priorität?

### 🟢 Roadmap-Vorschlag (CC's Empfehlung)
1. **Sprint AUTH-PERFEKT 2.0** mit Marcel-Live-Test (3h)
2. **Sprint Bescheinigungen Top-12** mit Web-Claude-Recherche-Begleitung (4h)
3. **Sprint Sprint-K Template-Rebuild** mit IHK-Recherche (5h)
4. **Sprint UI-Polish** mit Live-Browser-Test (2h)
5. **Sprint Admin-Cockpit Sektionen 9-12** sobald Pilot-Daten existieren (2h)

---

*MEGA²⁸ Decisions-Log — Generated by Claude Opus 4.7 (1M context)*

---

## DECISION #10 — KORR-12 Sidebar-Resize: Marcel-Spec-Konflikt

**Problem:** V3.1-Prompt sagt "nav.js:479-488 — Auto-Collapse bei 769-1099px greift nur bei Page-Load, nicht bei Resize" und fordert Resize-Listener-Fix. ABER: aktueller Code (nav.js:947-959) hat ein expliziter Marcel-Spec-Kommentar:

> "P5b.X1.4: Auto-Collapse-Breakpoint deaktiviert fuer Range 768-1024.
> Marcel-Spec: Sidebar bleibt voll sichtbar bei halbiertem Desktop-Fenster."

**Optionen:**
- (a) V3.1-Spec folgen → Auto-Collapse re-aktivieren mit Resize-Listener
- (b) Aktuelle Marcel-Spec respektieren → KORR-12 als no-op markieren
- (c) Hybrid: Resize-Listener für Mobile-Mode-Detection (≤768px) ergänzen, 768-1024 unverändert

**Meine Meinung als CTO:** (b). Der bestehende Code hat eine expliziter Marcel-Spec-Kommentar von P5b.X1.4. V3.1-Prompt-Anforderung widerspricht früherer Marcel-Decision.

**Default umgesetzt:** KORR-12 als no-op markiert. Marcel reviewt: V3.1-Spec überschreibt P5b.X1.4 oder nicht?

---

---

## DECISION #10 RESOLUTION (W1-I6) — Sidebar-Resize-Konflikt-Analyse

**Recherche-Ergebnis:** P5b.X1.4 ist KEIN formales Sprint-Doc, sondern nur ein Code-Kommentar in nav.js (Zeilen 947-950). Das ist eine implizite Marcel-Decision während P5b ohne separate Sprint-Doku.

**Inhalt P5b.X1.4 (zitiert aus nav.js:947-950):**
> "P5b.X1.4: Auto-Collapse-Breakpoint deaktiviert fuer Range 768-1024.
> Marcel-Spec: Sidebar bleibt voll sichtbar bei halbiertem Desktop-Fenster.
> Unter 768px greift sowieso der Mobile-Mode."

**V3.1-Prompt-Anforderung (zitiert):**
> "nav.js:479-488 — Auto-Collapse bei 769-1099px greift nur bei Page-Load, nicht bei Resize"

**Konflikt-Analyse:**
- V3.1 spricht von 769-1099px Range mit erwartetem Auto-Collapse
- P5b.X1.4 sagt: 768-1024 explizit DEAKTIVIERT
- Range-Differenz (1024 vs 1099) wirkt wie Marcel-Memory-Drift
- **Echte Konflikt-Substanz:** sollte 768-1099 (oder 1024) Auto-Collapse haben?

**CTO-Empfehlung (final):** P5b.X1.4-Spec respektieren. Marcel hat explizit dokumentiert, dass Sidebar bei halbiertem Desktop-Fenster voll sichtbar bleibt — User-Hand-Wahl persistent. V3.1-Anforderung wirkt wie alte Memory-Drift. Item bleibt no-op bis Marcel explizite gegenteilige Decision trifft.

**Status:** RESOLVED als "no-op". Falls Marcel ändern will: Decision-Log-Eintrag + nav.js:947-950 Kommentar aktualisieren.

---

## DECISION #11 (W1-I7) — Auftrag&Identifikation Doppelung — Bereits behoben

**Recherche-Ergebnis:** `grep -rn "Auftrag.{0,3}Identifikation"` findet 0 Code-Treffer (nur Treffer in MEGA-28-FRONTEND-COMPLETE-FINAL.md selbst, das die TODO erwähnt).

**Status:** Doppelung wurde in früherem Sprint bereits beseitigt. KORR-13 ist effectively no-op.

**Keine Action nötig.**


---

## DECISION #12 (W1-I5) — Stepper rückwärts klickbar — Audit-Ergebnis

**Recherche-Ergebnis:** `gutachterliche-stellungnahme-logic.js:65-69` `tsGoTo(n)` Funktion erlaubt bereits backward-Click (validateUpTo(n-1) returnt true für n≤current_phase).

**Andere Stepper:** `lib/stepper*.js` existiert nicht. `jveg.html` hat `stepper`-CSS-Klasse (Number-Input-Stepper, nicht Phase-Stepper). Onboarding und stellungnahme.html haben Phase-Logic ohne dedizierte stepper-lib.

**Status:** KORR-11/W1-I5 ist effectively no-op — der erwähnte Bug ist im untersuchten Code nicht reproduzierbar. Bestehende Phase-Stepper sind backward-clickable.

**Empfehlung Marcel:** Browser-Test pflicht — falls Bug an konkreter Page sichtbar ist, Page-Name liefern für gezielten Fix.


---

## DECISION #13 (W1-I9) — Live-Transkript-Bug Diagnose

**Code-Audit (`app-logic.js:2722-2747`):**
- Web-Speech-API mit `recognition.continuous = true; interimResults = false`
- `onresult`-Handler appendet `<p>`-Elements an `#transcriptArea`
- KEINE Pause-on-Manual-Input-Logic

**Vermutete Bug-Mechanik (Marcel-Beobachtung):**
Wenn User manuell in `#transcriptArea` tippt während Recognition läuft, überschreibt der nächste `onresult`-Trigger oder appendet auf einer falschen Position → Live-Transkript "bricht" gefühlt.

**Fix-Optionen:**
- (a) `contenteditable`-Toggle auf `#transcriptArea` (User-Edit pausiert Recognition via blur-Listener)
- (b) Trennung: separate "Live-Stream"-Container vs "User-Edited"-Container
- (c) Recognition komplett pausieren bei Focus-Event auf editable area

**Meine Meinung als CTO:** (c) ist am pragmatischsten — User-Erwartung ist klar.

**Default umgesetzt:** Code-Audit + Decision-Log. Fix erfordert Live-Browser-Verification (Web-Speech-API ist Browser-API), daher per Regel C deferred. Bug-Pattern dokumentiert für gezielten Sprint.

**Empfehlung Marcel:** Browser-Reproduce + Variant (c) implementieren in einem 30-min-Sprint mit Live-Test.


---

## DECISION #14 (W3-I0) — KRITISCH: Modell-Strategie-Update + Anthropic-Backup

**Datum:** 2026-05-10
**Trigger:** Marcel-Erkenntnis 10.05.2026 — "GPT-4o wurde Februar 2026 von OpenAI deprecated"
**V3.1-Fehler:** KORR-3 hat "gpt-4o-mini → gpt-4o" als Rule-14-Fix gemacht — beides deprecated.

**Neue Modell-Strategie (10.05.2026):**

OpenAI Primary:
- gpt-5.5 ($5/$30) — Frontier (Konjunktiv-II / Compliance)
- gpt-5.4 ($2.50/$15) — Mid-Tier
- gpt-5.4-mini ($0.40/$1.60) — Light/Latency

Anthropic Backup (callOpenAIWithFallback bei 429/5xx):
- claude-opus-4-7 — Frontier-Backup
- claude-sonnet-4-6 — Mid-Backup
- claude-haiku-4-5-20251001 — Light-Backup

**Code-Änderungen W3-I0:**
- ki-proxy.js: MODELS-Konstanten + ANTHROPIC_BACKUP-Map + callOpenAIWithFallback-Function
- lib/ki-anthropic.js: MODEL_MAP erweitert für gpt-5.x → claude-4.x + Pass-Through für claude-* Strings
- lib/ki-cost-calc.js: PRICING erweitert mit GPT-5.x + Anthropic, deprecated-Modelle für Backwards-Compat behalten
- ki-konsistenz-check.js: gpt-4o → gpt-5.5 (Compliance-kritisch)
- foto-captioning.js + normen-picker.js: gpt-4o-mini → gpt-5.4-mini
- 9 Frontend-Logic-Files: Bulk-Replace gpt-4o-mini → gpt-5.4-mini
- compliance-check.js: gpt-4o-mini → gpt-5.5 (Konsistenz-Check)
- lib/ki-prompts/index.js: alle 9 Modell-Strings updated
- lib/ki-confidence-badge.js: Confidence-Logik erkennt jetzt GPT-5.x + Claude 4.x
- lib/ki-service-openai.js: DEFAULT_VISION + DEFAULT_TEXT auf gpt-5.4-mini
- lib/ki-service-interface.js: PRICES_USD_PER_1M aktualisiert

**Tests:**
- tests/ki-proxy/model-compliance.test.js: 18/18 grün (komplett neu)
- tests/ki-cost/cost-calc.test.js: 23/23 grün (+11 neue für GPT-5.x + Claude)
- tests/anthropic-helper/anthropic-helper.test.js: 13/13 grün (NEW)

**ENV-Status:**
- `ANTHROPIC_API_KEY` ist bereits live (Marcel hat es in Netlify gesetzt mit $50 Credit, siehe `lib/ki-service-anthropic.js` line 7)
- Falls Key in einer Umgebung fehlt: Fallback-Logic ist defensive — wirft den Original-OpenAI-Error durch, kein Backup

**Marcel-Action-Items:**
1. Verifizieren: `ANTHROPIC_API_KEY` in Netlify-Production-ENV gesetzt? (`netlify env:get ANTHROPIC_API_KEY`)
2. Pricing der Anthropic-Modelle live verifizieren (claude-opus-4-7, claude-haiku-4-5 — Werte in PRICING sind Schätzungen)
3. Smoke-Test im Pilot: einen Konjunktiv-II-Check fahren → Response-Header `_fallback_provider` = 'anthropic'? Nein → OpenAI primary funktioniert.
4. Frontend lib/ki-confidence-badge.js Confidence-Score live prüfen — erkennt GPT-5.5 als Frontier?

**Welle-4-Item:** Anthropic-Pricing live verifizieren + ggf. PRICING-Schätzungen korrigieren.

---

## DECISION #15 (W7N-I1) — Live-Transkript Manual-Input-Schutz IMPLEMENTIERT

**Datum:** 2026-05-10 (Welle 7 NEU)
**Status:** ✅ Code-Fix umgesetzt — Marcel-Browser-Test pflicht
**Vorgänger:** Decision #13 (W2-Welle, Bug-Pattern dokumentiert, Browser-Verify-deferred)

### Variante-A-Lösung (CTO-Vote, implementiert in app-logic.js:2722-2790)

**Pattern:** Manual-Input pausiert Live-Append für 5 Sekunden mit Buffer-Flush.

**State-Variablen:**
- `window._lastManualInputTs` (number, Timestamp letzter manueller Eingabe)
- `window._pendingTranscriptBuffer` (string, gepufferter Live-Text während Pause)

**Event-Listener auf #transcriptArea:**
- `input` (contenteditable Änderung)
- `keydown` (Tastatureingabe)
- `paste` (Paste-Event)

**Idempotenz:** `data-w7i1Bound` Attribut verhindert Doppel-Bind bei Re-Init.

**onresult-Logic:**
1. Wenn `Date.now() - lastManualInputTs < 5000ms` → Final-Text in Buffer parken, KEIN Append
2. Sonst: Buffer-Flush (gepufferte Texte mit `data-buffered-during-edit` Marker als Hellblau-Hintergrund) + neue Final-Texte appenden

### Marcel — Browser-Test-Anleitung

```
1. Mikrofon-Aufnahme starten (vor-ort.html oder app.html)
2. In transcriptArea klicken, Cursor positionieren
3. Manuell tippen oder Text korrigieren während Live-Stream läuft
4. Erwartung:
   - 5 Sekunden lang: KEIN neuer Live-Append (Cursor bleibt stabil)
   - Nach 5s ohne Eingabe: gepufferte Texte erscheinen mit hellblauem Hintergrund
   - Cursor-Position bleibt erhalten
5. Failure-Case: wenn Cursor springt oder Live-Text fehlt → ROLLBACK + Variante B (Cursor-Position-Tracking)
```

### Tests

- `tests/live-transkript/w7n-i1.test.js` — 12/12 grün
- Strukturelle Verifikation: PAUSE_AFTER_MANUAL_MS, Event-Listener, Buffer-Pattern, Audit-Marker
- Volle Browser-Verifikation pflicht (Web-Speech-API kann nicht in Node-Tests gemockt werden)

### Welle-8-Item bei Failure
- Variante B: Cursor-Position-Tracking + Insert-At-Position statt append
- Variante C: explizit "Pause Live"-Toggle-Button

