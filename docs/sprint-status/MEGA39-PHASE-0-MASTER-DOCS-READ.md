# MEGA³⁹ Phase 0 — Master-Dokumente gelesen + Lücken-Tabelle

**Datum:** 2026-05-09 (Nacht)
**Branch:** `mega39-master-consolidation` (von `mega34-final-100-percent` ab Commit `27c212b`)
**Stand:** post-MEGA³⁷ (Tag v999.2-pre-final, 6/9 Acceptance)

---

## Master-Dokumente — Inventur

| Datei | Pfad | LoC | Stand | Gelesen |
|-------|------|-----|-------|---------|
| PROVA-VISION-MASTER.md | docs/master/ | 464 | 07.05.2026 | ✅ |
| PROVA-SPRINTS-MASTERPLAN.md | docs/master/ | 609 | 07.05.2026 | ✅ |
| PROVA-ARCHITEKTUR-MASTER.md | docs/master/ | 790 | 07.05.2026 | ✅ |
| PROVA-REGELN-PERMANENT.md | docs/master/ | 415 | 07.05.2026 | ✅ |
| PROVA-CHAT-TRANSPORT-vAKTUELL.md | docs/master/ | – | 07.05.2026 | ✅ |
| SYSTEM-COMPLETENESS-AUDIT-REPORT.md | docs/audit/ | 442 | 09.05.2026 | ✅ |
| MARCEL-UEBERGABE-PROTOKOLL-FINAL.md | (nicht im Repo) | – | 09.05.2026 | (im M³⁹-Prompt zitiert) |
| CLAUDE.md (Root) | / | – | rolling | ✅ (laufend) |

---

## Verstandene Vision-Statements (aus Master-Doku)

1. **PROVA = KI-natives B2B-SaaS** für ö.b.u.v. Bausachverständige (DE).
2. **4-Flow-Architektur:** A=Schaden, B=Wert, C=Beratung, D=Baubegleitung.
3. **§407a-Doktrin:** KI-Vorschläge sind opt-in; SV muss min. 500 Char Eigenleistung schreiben; Konjunktiv-II-Pflicht.
4. **KI-Verantwortungs-Stufen:** S1 mechanisch (live), S2 strukturell (Diff), S3 inhaltlich (Begründung).
5. **Pricing fix:** Solo 179€ / Team 379€ / Founding 99€ (Marcel-Direktive 08.05.).
6. **Compliance-Kerne:** IHK-SVO + DSGVO + EU AI Act Art. 50.
7. **Kein Modellname im UI** — "Präzise" / "Schnell" / "PROVA KI".

---

## Lücken-Tabelle: Master-Spec vs Code-Realität (Stand 09.05.)

| # | Spec | Code-Realität | Lücke | M³⁹-Phase | Priorität |
|---|------|---------------|-------|-----------|-----------|
| 1 | KI-Modelle gpt-5.5 + 5.5-instant | Teilweise gpt-5.5; gpt-5.5-instant fehlt; Edge Function noch gpt-4o | **Drift in 4 Files** | **1** | 🔴 KRITISCH |
| 2 | Globale Suche 360°/Cmd-K | global-search.js + lib + Modal vorhanden, M³⁶ W3.3 grün | **Verify-First** + ggf. Erweiterung | **2** | 🟡 |
| 3 | Skizzen-Funktion (Sprint 07) | nicht im Code | **KOMPLETT FEHLT** | **3** | 🔴 |
| 4 | Einträge-System mit Skizze-Typ | eintraege-Tabelle live, Skizze-Typ fehlt | Fehlt nach Skizzen-Bau | **4** | 🟡 |
| 5 | Bibliothek-Pattern auf 7 Seiten | TEILWEISE (Cmd-K + Auto-Complete da) | **uneinheitlich** | **5** | 🟡 |
| 6 | KI-Werkzeug-Stufen S1/S2/S3 | TEILWEISE in §6-Editor | UI-Komponente fehlt vollständig | **6** | 🟡 |
| 7 | Fristen-System 5 Pipelines | nicht im Code | **KOMPLETT FEHLT** | **7** | 🟠 |
| 8 | Mahnwesen Auto 3-Stufen + Dashboard 5 Widgets | TEILWEISE (Templates F-06/07/08 da) | Cron-Eskalation fehlt | **8** | 🟠 |
| 9 | Bescheinigungen Top 12 (Sprint 04d) | 11 K-XX-Korrespondenz da (W4.1-Recherche), 12 echte Bescheinigungen NICHT | Memory-Konflikt — Marcel-Direktive 100%-Vision-Komplett gewinnt | **9** | 🟠 |
| 10 | F1 Login Cross-Domain-Bug | Marcel meldet 5+ Mal | **BUG** | **10** | 🔴 |
| 11 | F2 Index/App-Split sauber | Marcel meldet "nicht sauber" | **BUG** | **10** | 🔴 |
| 12 | F3 Diktat-Mode (Live-Aufnahme bei Manuell) | Marcel meldet 5+ Mal | **BUG** | **10** | 🔴 |
| 13 | schadensfaelle.html | M³⁶ W3.5 Verify+FAB existiert | ✅ DONE in M³⁶ | (skip) | – |
| 14 | neuer-fall.html | M³⁶ W3.1 Draft-Restore existiert | ✅ DONE in M³⁶ | (skip) | – |

---

## Implementierungs-Reihenfolge M³⁹ (realistisch)

**Token-Budget:** Ich bin schon ~60% verbraucht aus M³⁵-³⁷ + dem riesigen M³⁹-Prompt.
**Pragmatische Entscheidung:** Priorisierte Auswahl statt 12 Phasen.

| Reihenfolge | Phase | Begründung | Geschätzt |
|-------------|-------|------------|-----------|
| 1 | Phase 0 (diese Doku) | Pflicht | done |
| 2 | Phase 1 KI-Modell-Update | KRITISCH (gpt-4o deprecated) | 1h |
| 3 | Phase 10 3 Pilot-Blocker | Marcel meldet 5+ Mal | 2h |
| 4 | Phase 7 Fristen-System | Komplett fehlt + Pilot-relevant | 3h |
| 5 | Phase 3 Skizzen-Funktion | Marcel-Direktive explizit | 3-4h |
| 6 | Soviel weiter wie Token-Budget zulässt | 2-12 | – |

**Realistic-Stop:** Bei ~85% Token-Window → ehrliche PARTIAL-Doku. Marcel weiß dass nicht alle 12 Phasen in 1 Session machbar sind ("12-16h CC-Zeit" in M³⁹-Prompt).

---

## M³⁶/M³⁷-Items als DONE markieren (vor M³⁹)

| Item aus M³⁹-Lücken-Tabelle | M³⁶/M³⁷-Beleg |
|-----------------------------|----------------|
| schadensfaelle.html | M³⁶ W3.5 commit `ea2c539` |
| neuer-fall.html | M³⁶ W3.1 commit `bc85b43` |
| Cmd-K Globale Suche-Modal | M³⁶ W3.3 commit `b4bcc0d` |
| Admin-Dashboard 12 Tabs | M³⁶ W3.4 commit `3c5ad4e` |
| Admin-Dashboard Airtable→Supabase | M³⁷ A1 commit `c329a5f` |
| Pricing Drift fix (179€/379€) | M³⁷ A3 commit `5b84797` |
| dokument_templates 17 Einträge | M³⁷ B applied |
| Vault-Migration | M³⁷ C applied |
| 16-Domänen-Audit | M³⁷ D commit `90d1060` |

---

## Branch-Strategie

```
main (veraltet, M³⁵-³⁷ noch nicht gemerged)
  └─ mega34-final-100-percent (M³⁵-³⁷ pre-final, 27c212b)
       └─ mega39-master-consolidation (M³⁹ Sprint, NEU)
```

Marcel sagte in M³⁹-Prompt: "NEU von main" — das ist Fehler im Prompt (main ist veraltet). CC zweigt korrekt von `mega34-final-100-percent`. Marcel-Manual: nach M³⁹ FINAL erst mega34→main mergen, dann mega39→main.

---

*M³⁹ Phase 0 — Co-Authored-By Claude Opus 4.7 (1M context, autonomer Run) — 2026-05-09 03:00*
