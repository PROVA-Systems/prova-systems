# NACHT-PAUSE K-2.0 — Korrespondenz-Layer (Phase 2 pending)

**Datum:** 29.04.2026 · **Branch:** `sprint-k-2-0-korrespondenz-layer`
**Status:** TEILWEISE FERTIG (Block 1 + 3 + 4 grün, 3/9 Templates fertig, Block 5-8 offen)

---

## Was wirklich abgeliefert wurde

### Solide Foundation ✅
- Block 1: Cleanup + Goldstandard initial-tracked (60 Files)
- Block 2.1: 3 Templates (K-01, K-02, K-03) als Production-Quality-Vorlage
- Block 3: Routing-Slots in templates.ts mit Whitelist-Pattern
- Block 4: Edge Function brief-generate (Whitelist + 503-on-pending)

### Ausstehend ⏳
- Block 2.2: K-04 (Anforderung Unterlagen), K-05 (Übergabe Gutachten), K-06A/B/C (3 Mahnstufen)
- Block 2.3: K-07 (Akteneinsicht), K-08 (Befangenheit), K-09 (Auftragsablehnung)
- Block 5: briefe.html Frontend
- Block 6: profil-supabase Briefkopf-Sektion + letterhead_config Migration
- Block 7: tools/test-brief-generate.html
- Block 8: README in 07-korrespondenz/ + CHANGELOG

---

## Realitäts-Check — warum nicht alles autonom

### Marcels eigene Schätzung
> ERWARTETE GESAMT-DAUER: 2:30 - 3:30 h
> COMMITS: ~10-12 (Block-by-Block)

→ K-2.0 alleine ist Marcels Schätzung 2:30-3:30h. Plus K-2.1 (1:30-2:30h) + K-2.2 (1:30-2:30h) = **6-9h Output-Sequenz**.

### Mein Realismus
- 60 Files initial-tracked + 3 vollständige Templates + Routing + Edge Function = ~600+ LOC neuer Code
- Mein Context-Budget reicht realistisch für 1-1.5h fokussierten Output
- 6 weitere Templates × ~150 LOC + briefe.html (~800 LOC) + profil-Erweiterung (~300 LOC) + Migration + Test-Tool wäre nochmal 2-3h+ Output

### Marcel-Anweisung wäre Drift gegen Quality
Marcel hat explizit gesagt:
> KEIN Mock-Inhalt. Realer Beispielfall durchziehen.

Wenn ich die 6 fehlenden Templates flach durchziehe ohne durchgängige fachliche Sorgfalt (Quellenverweise, korrekte §-Zitate, DIN-konforme Struktur), produziere ich Drift gegen die Anforderung. Das wäre schlechter als ein ehrliches "Pattern etabliert, Rest morgen".

---

## Marcel-Decision-Matrix für morgen

### Variante A — Pattern-Übernahme (1-1.5h Marcel-Aufwand)
**Eigenständig nachbauen mit den 3 Vorlagen aus 07-korrespondenz/.**

Pro Template:
1. K-01..K-03 als Basis kopieren
2. Inhalt + Variables anpassen für K-04..K-09
3. JSON-Payload mit Realdaten (GS-2026-031 Frau Kowalski)
4. Commit pro Template

**Empfohlen** wenn Marcel produktiv ist und Template-Pattern verstanden hat.

### Variante B — Resume-Session für mich
**Mich morgen früh wieder anfeuern: "K-2.0-Resume — 6 Templates + Block 5+6+7"**

Aufwand: ~2h Output. Dann sind alle 9 Templates + Frontend + Briefkopf-Konfig + Smoke-Test fertig.

Empfohlen wenn Marcel an anderen Sprints (K-2.1, K-2.2) parallel arbeiten will.

### Variante C — Hybrid
**Marcel baut K-04..K-09 selbst (~1.5h), ich bekomme separate Session für Block 5+6 (Frontend + Briefkopf-Migration).**

Empfohlen für saubere Trennung Inhalt (Marcel) vs. Infra (Claude).

---

## Konsequenzen für K-2.1

K-2.1-Mega-Prompt sagt:
```
Falls NACHT_PAUSE_ANGELEGT=JA:
  → STOP, schreibe NACHT-PAUSE-K2-1.md
  → Marcel prueft K-2.0-NACHT-PAUSE morgen frueh selbst
  → KEIN Sprint-Start
```

→ **K-2.1 darf morgen nicht autonom starten.** Marcel muss erst:
1. Diese Datei lesen
2. Variante A/B/C wählen
3. Block 6 (letterhead_config Migration) abschließen — dann ist K-2.1A unblocked
4. Wenn K-2.0 nicht 100%: K-2.1B (Kontakte) kann standalone starten

---

## Konsequenzen für K-2.2

K-2.2 baut auf K-2.1, das wiederum auf K-2.0 letterhead_config baut. Solange K-2.0 nicht 100% (insb. Block 6) → K-2.2 hat ebenfalls Vorbedingungen unerfüllt.

→ **K-2.2 erst nach K-2.0+K-2.1 grün.**

---

## Empfehlung Marcel

**Schlafen, morgen 30 Min Pattern-Lernen mit den 3 fertigen Templates, dann Variante B oder Variante A.**

Variante B ist effizienter (2h Output → alle 9 fertig). Variante A ist autonomer (Marcel kontrolliert Inhalt, fachliche Tiefe).

🌙 **K-2.0 ist ehrlich teilweise fertig. Foundation steht. Marcel-Decision für morgen.**
