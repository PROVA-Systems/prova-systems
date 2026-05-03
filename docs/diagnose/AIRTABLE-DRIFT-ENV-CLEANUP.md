# AIRTABLE-DRIFT — ENV-Cleanup (Bundle D)

**Erstellt:** 04.05.2026 nacht (MEGA⁴-EXT Q2)
**Vorgaenger:** `docs/diagnose/AIRTABLE-DRIFT-CLEANUP-2026-05-03.md`
**Marcel-Aktion:** Liste am Ende durchgehen, deprecated ENVs in Netlify loeschen

---

## TL;DR

Audit ergab **9 distinct AIRTABLE_*-ENVs** im Repo (nicht 12 wie geschaetzt). 3 sind Dubletten/Aliases die konsolidiert werden sollten. 1 ist tot (nur Migrations-Skript). Marcel kann **2 ENVs sicher in Netlify loeschen** + 3 weitere bei Migration-Abschluss.

---

## ENV-Audit-Ergebnis

| ENV | Status | Verwendung | Anzahl Files | Aktion |
|---|---|---|---|---|
| `AIRTABLE_API_KEY` | ⚠ DUPLIKAT | nur in pdf-proxy.js | 1 | konsolidieren mit AIRTABLE_PAT |
| `AIRTABLE_PAT` | ✅ AKTIV | Personal Access Token (Standard) | 10+ Files | behalten |
| `AIRTABLE_TOKEN` | ⚠ DUPLIKAT | Legacy-Alias zu AIRTABLE_PAT | 8 Files | konsolidieren |
| `AIRTABLE_API` | ✅ AKTIV | Hardcoded `'https://api.airtable.com'` Konstante (kein ENV!) | -- | **NICHT in Netlify** — false positive im Audit (war Variablen-Name) |
| `AIRTABLE_BASE` | ⚠ DUPLIKAT | Frontend Logic-Files | 5 Files | konsolidieren mit AIRTABLE_BASE_ID |
| `AIRTABLE_BASE_ID` | ✅ AKTIV | Standard Base-Identifier | viele Files | behalten |
| `AIRTABLE_TABLE` | ⚠ DUPLIKAT | Default-Tabelle verschiedene Logic-Files | 6 Files | konsolidieren mit AIRTABLE_TABLE_SV |
| `AIRTABLE_TABLE_SV` | ✅ AKTIV | SV-Tabelle Identifier | mehrere Files | behalten |
| `AIRTABLE_SV_TABLE` | ⚠ DUPLIKAT | Alias zu AIRTABLE_TABLE_SV | 0 aktive Treffer | **DEPRECATED** |
| `AIRTABLE_AUDIT_TRAIL_TABLE` | ✅ AKTIV | Audit-Trail-Tabelle | 1 File | behalten bis Bundle-A-Migration done |
| `AIRTABLE_BRIEFE_TABLE` | ✅ AKTIV | Briefvorlagen-Tabelle | 1 File | behalten bis Bundle-A-Migration done |
| `AIRTABLE_META_API` | ❌ DEAD | nur Migrations-Skript scripts/migrate/ | 1 File | behalten (One-Way-Migration-Tool) |

---

## Sofortige Marcel-Aktionen (in Netlify Dashboard)

### Sicher loeschbar (0 Production-Risiko)
- [ ] `AIRTABLE_SV_TABLE` — falls noch in Netlify ENV → loeschen (nirgendwo aktiv genutzt; Alias zu AIRTABLE_TABLE_SV)

### Konsolidierung (manuelle Pflege empfohlen)
- [ ] `AIRTABLE_API_KEY` (Netlify) → Wert pruefen. Wenn = `AIRTABLE_PAT` → loeschen + pdf-proxy.js auf AIRTABLE_PAT umstellen (siehe Q3)
- [ ] `AIRTABLE_TOKEN` (Netlify) → Wert pruefen. Wenn = `AIRTABLE_PAT` → loeschen + Code-Files auf AIRTABLE_PAT umstellen (Bundle-D-Folge)
- [ ] `AIRTABLE_BASE` (Netlify) → ggf. mit AIRTABLE_BASE_ID konsolidieren

### Behalten bis Migration done
- `AIRTABLE_PAT` — wird in Bundle A noch gebraucht
- `AIRTABLE_BASE_ID` — analog
- `AIRTABLE_TABLE_SV` — analog
- `AIRTABLE_AUDIT_TRAIL_TABLE` — bis Bundle A migriert
- `AIRTABLE_BRIEFE_TABLE` — bis Bundle A migriert
- `AIRTABLE_META_API` — Migrations-Skript-Only

---

## Code-Konsolidierung (Bundle D Folge-Aktionen)

Wenn Marcel `AIRTABLE_TOKEN` entfernen will, folgende Files auf `AIRTABLE_PAT` umstellen:

```
netlify/functions/dsgvo-loeschen.js
netlify/functions/health.js
netlify/functions/lib/prova-fachwissen.js
netlify/functions/normen.js
netlify/functions/smtp-credentials.js
scripts/migrate-kontakte-sv-email.js
scripts/sync-normen.js
scripts/test-fachwissen.js
mahnung-pdf.js (Frontend — laesst sich nicht aus ENV lesen, nutzt Server-Endpoint)
```

Pattern:
```js
// VORHER
const token = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT;
// NACHHER
const token = process.env.AIRTABLE_PAT;
```

Wenn Marcel `AIRTABLE_API_KEY` entfernen will:
```
netlify/functions/pdf-proxy.js  (1 File)
```

---

## Final-State nach voller Migration (Bundle A+B+C Done)

Nach Abschluss Bundle A+B+C (Q3 + Q4) werden zusaetzlich loeschbar:
- `AIRTABLE_BRIEFE_TABLE` (wenn brief-generate.js auf Supabase migriert)
- `AIRTABLE_AUDIT_TRAIL_TABLE` (wenn audit-log.js auf Supabase migriert)
- `AIRTABLE_TABLE_SV` (wenn alle SV-Reads auf Supabase migriert)
- `AIRTABLE_BASE_ID` + `AIRTABLE_PAT` (NUR wenn airtable.js Proxy-Function entfernt)

`AIRTABLE_META_API` bleibt fuer das One-Way-Migrations-Skript (`scripts/migrate/`) bestehen.

---

## Verifikation

Quick-Check ob alle ENVs noch genutzt werden:
```bash
for env in AIRTABLE_PAT AIRTABLE_TOKEN AIRTABLE_API_KEY AIRTABLE_BASE AIRTABLE_BASE_ID AIRTABLE_TABLE AIRTABLE_TABLE_SV AIRTABLE_SV_TABLE AIRTABLE_AUDIT_TRAIL_TABLE AIRTABLE_BRIEFE_TABLE; do
  count=$(grep -rln "$env\b" --include='*.js' --include='*.toml' 2>/dev/null | grep -v node_modules | wc -l)
  echo "$env: $count files"
done
```

---

*Sprint MEGA⁴-EXT Q2 (Bundle D) abgeschlossen — 04.05.2026 nacht.*
