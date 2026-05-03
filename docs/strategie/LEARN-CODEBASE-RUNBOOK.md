# `/learn-codebase` Runbook (claude-mem)

**Stand:** 03.05.2026 (MEGA-SKALIERUNG M6)
**Status:** READY — Marcel führt einmalig aus, in **fresh** CC-Session
**Plugin:** `claude-mem:learn-codebase` (siehe `claude-mem` Plugin)

---

## Was es macht

`/learn-codebase` liest jeden Source-File des Repos vollständig in `claude-mem`'s Persistenz-DB. Folge: alle zukünftigen CC-Sessions können via `mem-search` darauf zugreifen, ohne den Code erneut lesen zu müssen.

**Dauer:** 10–20 Min (abhängig von Repo-Grösse). Token-intensiv — daher in **fresh Session** ausführen, NICHT in einer aktiven Sprint-Session.

---

## Wann ausführen

- **Sofort nach M7-Tag** (PROVA-Status nach MEGA-SKALIERUNG eingefroren)
- **Nach jedem grösseren Refactor** (z.B. Sprint K-1.5 Voll-Supabase-Cutover)
- **NICHT mitten im Sprint** — würde aktive Arbeits-Session belasten

---

## Marcel-Aktivierung

```
# In einer NEUEN Claude Code Session (vorher /clear):
/learn-codebase
```

Ergebnis:
- claude-mem `observation_count` steigt um mehrere hundert
- `mem-search "Sentry-Wrap"` findet sofort relevante Files
- `smart_outline <file>` erspart re-reads

---

## Verifikation

```
/claude-mem:list_corpora
```

Sollte einen Eintrag für PROVA-Repo mit aktualisiertem Stand listen.

```
/claude-mem:smart_search "stripe-checkout"
```

Sollte mehrere Treffer mit Kontext liefern (Function + Schema + Tests).

---

## Re-Run-Regeln

Wenn `/learn-codebase` nach grossem Refactor erneut laufen soll:
```
/claude-mem:rebuild_corpus
```

(reine Re-Indexierung der bereits gemerkten Observations)

oder vollständiger Re-Scan via:
```
/learn-codebase
```

(neuer Voll-Scan + Re-Index)

---

*M6 abgeschlossen mit READY-Status. Marcel kann jederzeit aktivieren — Sprint-Plan wartet nicht darauf.*
