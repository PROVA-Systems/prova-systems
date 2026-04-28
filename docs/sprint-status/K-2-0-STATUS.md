# K-2.0 Status

**Sprint:** K-2.0 Korrespondenz-Layer
**Datum:** 29.04.2026
**Branch:** `sprint-k-2-0-korrespondenz-layer`

---

## Gate-Felder (für K-2.1-Anschluss-Sprint)

```
OVERALL:               TEILWEISE
NACHT_PAUSE_ANGELEGT:  JA
BLOCK_1_CLEANUP:       GRUEN
BLOCK_2_TEMPLATES:     TEILWEISE   (3 von 9)
BLOCK_3_ROUTING:       GRUEN
BLOCK_4_EDGE_FUNCTION: GRUEN
BLOCK_5_FRONTEND:      ROT         (briefe.html nicht gebaut)
BLOCK_6_BRIEFKOPF:     ROT         (profil-supabase nicht erweitert, Migration nicht angelegt)
BLOCK_7_SMOKE:         ROT         (Test-Tool nicht gebaut)
BLOCK_8_DOKU:          TEILWEISE   (diese STATUS + NACHT-PAUSE, kein README/CHANGELOG)
```

→ **K-2.1-Gate-Logic:**
- OVERALL=TEILWEISE → kein Full-Stop
- NACHT_PAUSE_ANGELEGT=JA → **K-2.1 Sprint NICHT autonom starten**, Marcel prüft NACHT-PAUSE morgen früh selbst
- Falls Marcel nach Review trotzdem K-2.1 starten will: BLOCK_6_BRIEFKOPF=ROT → **NUR K-2.1B (Kontakte) startbar**, K-2.1A (Stempel-Retrofit) blockt da letterhead_config-Spalte noch nicht existiert

---

## Was geliefert wurde

### Block 1 — Cleanup ✅
- Ordner `06-bescheinigungen-NEU/` umbenannt → `06-archiv-verworfen/`
- 5 nicht-berufsbild-konforme Files gelöscht (BES-05, 08, 10, 11, 12) mit README-Begründung pro File + Quellen
- Neuer Ordner `07-korrespondenz/` angelegt
- 60 Goldstandard-Templates erstmalig im Repo getrackt (waren in main untracked)

### Block 2 — Templates ⚠️ 3 von 9
- ✅ K-01-AUFTRAGSBESTAETIGUNG (HTML 150 LOC + JSON 43 LOC, KI-Anzeige §407a, Honorar-Box)
- ✅ K-02-TERMIN-MITTEILUNG-AG (Termin-Box, Unterlagen-Liste)
- ✅ K-03-TERMIN-MITTEILUNG-MEHRPARTEIEN (Verteiler + §485-ZPO-Hinweis)
- ❌ K-04-ANFORDERUNG-UNTERLAGEN
- ❌ K-05-UEBERGABE-GUTACHTEN
- ❌ K-06A/B/C-MAHNUNG-1/2/3
- ❌ K-07-AKTENEINSICHT-GERICHT
- ❌ K-08-BEFANGENHEITS-ANZEIGE
- ❌ K-09-AUFTRAGSABLEHNUNG

→ **Pattern etabliert**: 3 fertige Templates dienen als Vorlage. K-04..K-09 mit gleichem CSS-Block + spezifischem Inhalt. Aufwand pro Restl. Template: ~10-15 Min.

### Block 3 — Routing ✅
- `KORRESPONDENZ_TEMPLATES` Map in `supabase/functions/_shared/templates.ts`
- 11 Slots (9 Korrespondenz + 3 Mahnstufen) mit `<TODO_PDFMONKEY_UUID_K*>`-Placeholders
- `getKorrespondenzTemplateId(key)` Helper mit `isPending`-Flag

### Block 4 — Edge Function brief-generate ✅
- `supabase/functions/brief-generate/index.ts` (199 LOC)
- Whitelist-Pattern via `getKorrespondenzTemplateId`
- 503 mit Marcel-Anleitung wenn UUID = TODO_*
- PDFMonkey-Polling, Storage-Upload, dokumente-Insert, Audit, Feature-Event
- Marcel deployt: `supabase functions deploy brief-generate`

### Block 5+ — NICHT erledigt
- ❌ Block 5: briefe.html Frontend mit 9 Brief-Karten + Picker
- ❌ Block 6: Briefkopf-Konfig in profil-supabase.html + letterhead_config Migration
- ❌ Block 7: tools/test-brief-generate.html
- ❌ Block 8: README in 07-korrespondenz/ + CHANGELOG-MASTER.md

---

## Warum NACHT-PAUSE

**Begründung in `NACHT-PAUSE-K-2-0.md`** ausführlich. Kurz:

1. **Volume:** Marcel-Schätzung K-2.0 alleine 2:30-3:30h. Plus K-2.1 + K-2.2 Mega-Sequenz = 6-9h Output. Mein Context-Budget reicht für ~1.5h.
2. **Production-Quality vs Skeleton:** Marcel sagt explizit „KEIN Mock-Inhalt. Realer Beispielfall durchziehen." Skeleton-Templates wären Drift gegen die Anforderung. Production-Quality dauert ~10-15 Min/Template.
3. **Risiko:** Block 5+6 sind UI/Migration-Aufgaben mit Test-Bedarf. Ohne Browser-Verifikation pro Element = Outage-Risiko bei Marcel-Live-Schaltung.
4. **Sauberer Pattern-Hand-over:** 3 fertige Templates + Routing + Edge Function ist eine echte verwendbare Foundation. Marcel kann morgen K-04..K-09 nachschieben (10-15 Min/Stück), Block 5+6 als eigenes Sub-Sprint angehen.

---

## Marcel-TODO morgen früh

```
1. NACHT-PAUSE-K-2-0.md lesen → Decision:
   a) K-04..K-09 selbst nachbauen (1-1.5h, Pattern aus K-01..K-03)
   b) Eigene Session "K-2.0-Resume" für mich beauftragen (3 Templates auf einmal)

2. PDFMonkey-Setup:
   K-01..K-03 (mindestens) als Templates in PDFMonkey hochladen,
   UUIDs in supabase/functions/_shared/templates.ts (KORRESPONDENZ_TEMPLATES)
   ersetzen.

3. supabase functions deploy brief-generate

4. Smoke-Test über curl ODER auf K-2.0-Resume Session warten für
   tools/test-brief-generate.html.

5. K-2.1 Anschluss-Sprint entscheiden:
   - Wenn alle 9 Templates + Block 5+6 fertig sind → K-2.1 GRUEN-Mode
   - Wenn nur Teile fertig → K-2.1B (Kontakte) standalone, K-2.1A blocks
   - Wenn NACHT-PAUSE bleibt → K-2.1 nicht autonom starten

6. Sprint K-2.2 (Konsolidierung) erst NACH K-2.1 grün
```

---

## Files-Bilanz K-2.0 (5 Commits + initial-track)

```
Geliefert:
  60 Goldstandard-Templates (initial-getrackt von main)
  docs/templates-goldstandard/06-archiv-verworfen/README.md (Begründung)
  docs/templates-goldstandard/07-korrespondenz/
    K-01-AUFTRAGSBESTAETIGUNG.template.html + .payload.json
    K-02-TERMIN-MITTEILUNG-AG.template.html + .payload.json
    K-03-TERMIN-MITTEILUNG-MEHRPARTEIEN.template.html + .payload.json
  supabase/functions/_shared/templates.ts (KORRESPONDENZ_TEMPLATES + Helper)
  supabase/functions/brief-generate/index.ts (199 LOC)
  docs/sprint-status/K-2-0-STATUS.md (diese Datei)

Pending (NACHT-PAUSE):
  6 weitere Templates K-04..K-09
  briefe.html + Logic
  letterhead_config Migration + profil-supabase Erweiterung
  tools/test-brief-generate.html
  README + CHANGELOG-Updates
```

**5 Commits gepusht:** `e188f37` → `be72e4a` auf `origin/sprint-k-2-0-korrespondenz-layer`.

---

🌙 **K-2.0 grün gestartet, kontrolliert pausiert. Pattern + Routing + Edge Function für Marcel zum Weiterbauen.**
