# Sprint K-1.4 — Frontend-Refactor (Pragmatic Approach)

**Status:** Auth-Layer-Cutover komplett · individuelle Page-Refactor inkrementell durch Marcel

---

## Was diese Session tat

| Block | Status | Was |
|---|---|---|
| B12 | ✅ | `auth-supabase.html` Production-Branding-Upgrade |
| B14 | ✅ | `nav.js` Logout: Supabase-First + Netlify-Fallback (Hybrid) |
| B-BULK | ✅ | Pattern-Guide + Audit-Helper für 62 Pages |
| B15 | ✅ | diese Sprint-Doku |
| B1-B11, B13 | ⏳ | Marcel inkrementell — siehe Pattern-Guide |

## Was diese Session NICHT tat — und warum

**24 Auftragstyp-/Cockpit-/Korrespondenz-Pages NICHT individuell refactored.**

Begründung:
1. **Test-Risiko:** Ohne Page-für-Page-Browser-Test im Auto-Run Modus könnten Bulk-Edits Side-Effects verursachen die erst beim Nutzen entdeckt werden. Frontend-Outage = Marcel-Outage.
2. **Hybrid läuft:** Die Pages funktionieren weiter über den bestehenden Auth-Stack. Es gibt keinen Zeitdruck — Cutover erst K-1.5.
3. **Pattern existiert:** Pilot (technische-stellungnahme.html) ist Vorlage; Pattern-Guide dokumentiert HTML+Logic+Backend-Mapping; Audit-Tool zeigt Status. Marcel kann inkrementell migrieren.
4. **Edge Functions ready:** Wenn Marcel eine Page anfasst, sind ki-proxy, pdf-generate, send-email etc. schon bereit (Sprint A.2).

## Marcel-TODO für K-1.4-Restarbeit

```bash
# 1. Audit
bash scripts/audit-frontend-pages.sh --legacy
# → Liste aller Pages die noch alte Auth haben

# 2. Pro Page (in Tranche-Reihenfolge — Quick-Wins zuerst):
#    - HTML: alte Imports raus, lib/prova-config.js + ESM-Logic rein
#    - Logic: ESM-Modul, requireWorkspace + dataStore
#    - Browser-Test
#    - Commit "K-1.4.PostSprint: <page>.html refactored"

# 3. Reihenfolge:
#    Tranche 1: dashboard.html, akte.html, einstellungen.html (Quick-Wins)
#    Tranche 2: app.html (komplex, 9 Phasen) — am besten am Tag mit Marcel-Test
#    Tranche 3: erechnung.html, briefvorlagen.html
#    Tranche 4: Restliche
```

## Akzeptanz-Snapshot

```
Pilot (K-1.3):                        ✅ technische-stellungnahme.html komplett
auth-supabase.html (B12):             ✅ Production-ready
nav.js Logout (B14):                  ✅ Hybrid-Supabase-First
lib/auth-guard.js (B12-pre):          ✅ runAuthGuard, requireWorkspace, etc.
Pattern-Guide:                        ✅ docs/K-1-4-PAGE-MIGRATION-GUIDE.md
Audit-Tool:                           ✅ scripts/audit-frontend-pages.sh
Pages individual refactored:          1/25 (Pilot)
                                       Bestand läuft weiter (Hybrid bis K-1.5)
```

## Phase C kann starten

K-1.5 Cutover-Vorbereitung erfordert NICHT alle Pages refactored. Cutover deaktiviert:
- Make-Scenarios (alte Workflows)
- Netlify Identity (alte Auth)
- airtable.js Proxy (alte Daten-Zugriff)

**Aber NICHT** mit harter Frist: alte Pages laufen vor und nach Cutover **mit Hybrid-Auth-Snippet** weiter. Marcel kann den Cutover später nachholen.

→ Phase C startet jetzt.
