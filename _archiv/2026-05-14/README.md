# Archiv 2026-05-14 — MEGA⁷² Phase-D Quarantine (revidiert nach MEGA⁷³ Phase 1)

## Inhalt

9 Files in finaler Quarantäne. **2 Files (`share.html`, `datenschutz-intern.html`) wurden im MEGA⁷³ Phase-1 Sanity-Check zurückgeholt** — siehe Sektion „Rollback-Historie" unten.

| File | Begründung |
|---|---|
| `mahnung-1.html` | Old Mahnungs-Mock — ersetzt durch `mahnwesen.html` (Status-basierter Workflow) |
| `mahnung-2.html` | dito |
| `mahnung-3.html` | dito |
| `test-edge-functions.html` (war tools/) | Dev-Test-Stub, keine Production-Refs |
| `test-mega62.html` (war tools/) | Alter Sprint-Test, nicht referenziert |
| `test-mega63.html` (war tools/) | dito |
| `test-mega64.html` (war tools/) | dito |
| `anforderung-unterlagen-erweitert.html` | Brief-Vorlage ohne Inbound-Refs (MEGA⁷³ Phase 1 verified 0 hits) |
| `ortstermin-arbeitsblatt.html` (war briefe/) | Brief-Vorlage ohne Inbound-Refs (MEGA⁷³ Phase 1 verified 0 hits) |

## Rollback-Historie (MEGA⁷³ Phase 1, 2026-05-15)

| File | Begründung | Wieder eingefügt |
|---|---|---|
| `share.html` | Public-Share-Feature mit Passwort-Schutz, PDF-iframe, noindex-Header — kein Zombie | Marcel-Verdikt: definitiv KEEP. `./share.html` |
| `datenschutz-intern.html` | Eigenständiges Dokument (36 LOC vs. root 393 LOC, >20% Diff) — interner Datenschutz, KEIN Duplikat | Diff-Check: >20% Diff. `./legal/datenschutz-intern.html` |

## Quarantäne-Status

7-Tage-Live-Monitoring bis **2026-05-21**. Bei 0 Errors / Console-Warns / 404s in
DevTools-Network: echtes Löschen in Phase G.

## Rollback

Pro File:
```bash
git mv _archiv/2026-05-14/<file>.html <target-dir>/<file>.html
```

Beispiel:
```bash
git mv _archiv/2026-05-14/mahnung-1.html ./mahnung-1.html
```

## Methodik (Phase D-quarantine)

Kandidat-File quarantänisiert WENN alle erfüllt:
1. ❌ Nicht in MEGA⁷²-Marathon-Spec §5 (Master-Feature-Liste)
2. ❌ In MEGA⁷¹-Kartographie §6 als Zombie (0 Inbound-Refs) gelistet
3. ❌ Nicht in `nav.js` / `prova-layout.config.js` referenziert
4. ❌ Nicht in `netlify.toml` / `_redirects` geroutet
5. ❌ Nicht in `sw.js` APP_SHELL gelistet
6. ❌ Nicht in irgendeinem Test verwendet (`grep -r "<basename>" tests/`)

`fragmente.html` (502 LOC) ist Phase-1.3-Stub und wurde **NICHT quarantänisiert**
— wird in Phase E vom akte-Hub via Tab-Link angebunden.

## Komplettes Cleanup nach 7 Tagen Monitoring

```bash
# Phase G (2026-05-21+):
rm -rf _archiv/2026-05-14/
git commit -m "chore(mega72-phase-g): remove _archiv/2026-05-14 (7-day monitoring clean)"
```
