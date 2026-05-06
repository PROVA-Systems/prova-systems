# Orphan-Pages Cleanup-Plan (MEGA²⁴ Block 10)

**Stand:** 2026-05-09
**Status:** Audit + Action-Plan, KEINE Löschung in MEGA²⁴

## Identifizierte Orphan-Pages

### Onboarding-Varianten (3 Files, deferred bis Pilot-Feedback)
| File | Status | Empfehlung |
|---|---|---|
| `onboarding.html` | ✅ ACTIVE | Behalten (Welcome-Wizard MEGA²⁰) |
| `onboarding-schnellstart.html` | ⚠️ ORPHAN? | Audit ob noch erreichbar via Nav |
| `onboarding-supabase.html` | ⚠️ ORPHAN? | K-1.3-Phase, nach K-1.5-Cutover prüfen |
| `onboarding-welcome.html` | ⚠️ ORPHAN? | Pre-MEGA²⁰ Variante, sehr wahrscheinlich obsolet |

**Action:** Nach Pilot-Launch (≥ 2 Wochen) Audit ob alle 3 erreichbar — wenn keine Nav-Links existieren, deletion-PR.

### Admin-Backups
| File | Status | Empfehlung |
|---|---|---|
| `admin/voll.html` | ⚠️ BACKUP | War Pre-MEGA²¹ admin-dashboard.html. Nach 30 Tagen Pilot-Stabilität löschen. |

### Tools (sicher behalten)
- `tools/test-pilot-kurzstellungnahme.html` — Test-Tool für Pilot-Phase
- `tools/test-edge-functions.html` — Internal Test-Harness

### Briefe + Vorlagen (alle aktiv)
Alle Files in `briefe/` und `formulare/` sind im production use — KEINE Löschung empfohlen.

## Cleanup-Strategie (nach Pilot)

### Phase 1: Audit (Tag +14 nach Pilot)
1. `grep -rn "onboarding-welcome\.html\|onboarding-supabase\.html\|onboarding-schnellstart\.html" --include="*.html" --include="*.js"` 
2. Pro File: Ergebnis dokumentieren
3. Wenn 0 References → kandidiert für Löschung

### Phase 2: Soft-Delete (Tag +21)
- Files in `_archive/` Subfolder verschieben (statt löschen)
- 1 Sprint warten ob Beschwerden / Rollback nötig

### Phase 3: Hard-Delete (Tag +30)
- `_archive/` Subfolder per `git rm` entfernen
- Commit `chore(cleanup): remove orphan pages after 30d stability`

## Aktuell NICHT zu löschen

- ❌ `airtable.js` (Proxy, Pflicht bis K-1.5 Cutover)
- ❌ `login.html` (Netlify Identity, Pflicht bis K-1.5)
- ❌ Alle 11 Auftragstyp-Pages (CLAUDE.md K-1.4 Refactor pending)

## Mapping zu Sprint-Plan

| Sprint | Cleanup-Action |
|---|---|
| Pilot-Launch + 14d | Audit |
| Pilot-Launch + 21d | Soft-Delete |
| Pilot-Launch + 30d | Hard-Delete |
| K-1.5 Cutover | airtable.js + login.html + Make.com Cleanup |

---

*Orphan-Pages Cleanup-Plan, MEGA²⁴ Block 10*
