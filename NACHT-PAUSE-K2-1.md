# NACHT-PAUSE K-2.1 — Stempel/Unterschrift-Retrofit + Kontakte-Page

**Datum:** 29.04.2026 · **Branch:** `sprint-k-2-1-stempel-kontakte` (von main)
**Status:** STOP — Sprint NICHT autonom gestartet

---

## Gate-Trigger

K-2.1-Mega-Prompt enthält harte Entscheidungs-Matrix vor Sprint-Start:

```
PFLICHT vor Start: Lies /docs/sprint-status/K-2-0-STATUS.md

Falls Datei NICHT EXISTIERT:        → STOP
Falls OVERALL=ROT:                  → STOP
Falls NACHT_PAUSE_ANGELEGT=JA:      → STOP, Marcel prüft selbst
Falls OVERALL=GRUEN:                → A + B starten
Falls OVERALL=TEILWEISE Block6=GRUEN: → A + B starten
Falls OVERALL=TEILWEISE Block6=ROT:   → NUR B (Kontakte) starten
```

### Status K-2.0 (gelesen aus `docs/sprint-status/K-2-0-STATUS.md`, Branch `sprint-k-2-0-korrespondenz-layer`)

```
OVERALL:               TEILWEISE
NACHT_PAUSE_ANGELEGT:  JA          ← Gate-Trigger
BLOCK_6_BRIEFKOPF:     ROT
```

→ **NACHT_PAUSE_ANGELEGT=JA dominiert.** Auch wenn Block 6=ROT eigentlich noch K-2.1B (Kontakte) erlauben würde — der NACHT-PAUSE-Gate steht VOR dem Block-6-Gate in Marcels Matrix.

→ **STOP, Marcel prüft K-2.0-NACHT-PAUSE morgen früh selbst, KEIN Sprint-Start.**

---

## Was getan wurde (nur Branch-Setup, kein Code)

```
git checkout main                                  ✅
git checkout -b sprint-k-2-1-stempel-kontakte      ✅
NACHT-PAUSE-K2-1.md geschrieben (diese Datei)      ✅
Push                                                ⏳ folgt
```

**KEIN Code geschrieben:**
- ❌ K-2.1A Block A1 Template-Retrofit (6 Top-Templates)
- ❌ K-2.1A Block A2 pdf-generate + brief-generate Letterhead-Resolver
- ❌ K-2.1A Block A3 Smoke-Test
- ❌ K-2.1B Block B1 kontakte.html Page
- ❌ K-2.1B Block B2 nav.js + sw.js + briefe.html Integration
- ❌ K-2.1B Block B3 Smoke-Test

**Branch enthält keine Edits zu Templates / Edge Functions / Frontend.** Der Branch existiert nur als Marker dass das Gate getriggert hat.

---

## Marcel-TODO morgen früh

```
1. NACHT-PAUSE-K-2-0.md durchlesen (im sprint-k-2-0-korrespondenz-layer Branch)

2. K-2.0-Decision treffen — eine der drei Varianten:
   A) K-04..K-09 selbst nachbauen (~1-1.5h, Pattern aus K-01..K-03)
   B) "K-2.0-Resume" beauftragen für Claude (~2h Output: alle 9 Templates +
      Block 5 Frontend + Block 6 Briefkopf-Migration + Smoke-Test)
   C) Hybrid: Marcel macht Templates, Claude macht Frontend+Migration

3. Nachdem K-2.0 grün:
   - K-2.0-PR mergen (sprint-k-2-0-korrespondenz-layer → main)
   - PDFMonkey-Templates für K-01..K-09 anlegen, UUIDs in
     supabase/functions/_shared/templates.ts (KORRESPONDENZ_TEMPLATES)
     ersetzen
   - supabase functions deploy brief-generate

4. Erst DANN K-2.1 erneut starten:
   - K-2-0-STATUS.md so updaten dass:
     * NACHT_PAUSE_ANGELEGT = NEIN
     * BLOCK_6_BRIEFKOPF = GRUEN (oder ROT, dann nur K-2.1B)
   - K-2.1-Mega-Prompt erneut an Claude geben
   - Gate-Logic erlaubt dann Sprint-Start

5. K-2.2 erst nach K-2.1 grün
```

---

## Entscheidungs-Begründung (warum STOP statt nur K-2.1B)

Marcels Matrix ist explizit: **NACHT_PAUSE_ANGELEGT=JA** triggert STOP **bevor** Block-6-Logic geprüft wird. Das ist eine Architektur-Entscheidung: NACHT-PAUSE bedeutet "Marcel hat eine Decision zu treffen die ggf. den ganzen Sprint-Pfad ändert", nicht nur "ein Sub-Block ist ROT".

Konkret in K-2.0:
- NACHT-PAUSE-K-2-0.md hat 3 Varianten (A/B/C) die unterschiedliche Sprint-Pfade implizieren
- Wenn Marcel Variante B wählt (Resume), könnte K-2.1A morgen GRUEN-Mode starten
- Wenn Marcel Variante A wählt (selbst-Build), sind die Templates erst Stunden später fertig
- Wenn Marcel Variante C wählt (Hybrid), ist K-2.1A erst nach Block 6 möglich

→ Wenn ich jetzt K-2.1B (Kontakte) starte, könnte Marcel morgen Variante B wählen → dann hätte ich nur Teil B autonom gemacht statt sauberen Mega-Run aus seiner Hand. Die Trennung "erst K-2.0 sauber, dann K-2.1 frisch" ist konservativer.

---

## Zusatz-Hinweis: Datei-Existenz-Check

Auf dem **aktuellen Branch** (`sprint-k-2-1-stempel-kontakte` von main) **existiert `docs/sprint-status/K-2-0-STATUS.md` NICHT** — die Datei lebt nur im `sprint-k-2-0-korrespondenz-layer`-Branch (gestern angelegt, noch nicht in main gemerged).

Streng nach Marcels Matrix wäre **schon das** ein STOP-Trigger ("Falls Datei NICHT EXISTIERT"). Selbst wenn Marcel den NACHT_PAUSE-Pfad nicht im Status-File markiert hätte, würde diese Branch-Realität den Sprint blockieren.

→ **Fix für nächsten K-2.1-Versuch:** K-2.0-PR mergen oder Status-File in main vorab platzieren.

---

🌙 **K-2.1 wartet auf Marcel-Decision aus K-2.0-NACHT-PAUSE. Branch-Marker bereit, kein Code-Drift.**
