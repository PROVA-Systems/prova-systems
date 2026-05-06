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
