# Sprint C Status — KI-Prompts-Master extrahiert

**Datum:** 02.05.2026 nacht
**Sprint:** S6 Mega-Nacht — Sprint C
**Output:** `docs/ki/KI-PROMPTS-MASTER.md`

---

## Was extrahiert

8 aktive KI-Prompts aus `netlify/functions/`:

| ID | Name | Function | Modell | Pseudo | Halluz-Risk |
|---|---|---|---|---|---|
| KI-001 | Fachurteil-Entwurf §1-§5 | ki-proxy.js | gpt-4o-mini | ✅ | **HIGH** |
| KI-002 | Qualitäts-Prüfung §6 | ki-proxy.js | gpt-4o-mini | ✅ | LOW |
| KI-003 | Freitext-Generic | ki-proxy.js | configurable | ✅ | MEDIUM |
| KI-004 | Assist-Inline (Konjunktiv-II) | ki-proxy.js | **gpt-4o** | ✅ | LOW |
| KI-005 | Support-Chat | ki-proxy.js | gpt-4o-mini | ✅ | MEDIUM |
| KI-006 | Messages-Generic | ki-proxy.js | configurable | ✅ | MEDIUM |
| KI-007 | Foto-Captioning | foto-captioning.js | gpt-4o-mini Vision | ❌ Bild | MEDIUM |
| KI-008 | Normen-Picker (smart-mode) | normen-picker.js | gpt-4o-mini | **❌ TODO** | LOW |

---

## Findings (Sprint C)

### HIGH-Finding: KI-008 ohne Pseudonymisierung
**File:** `netlify/functions/normen-picker.js:102`
**Problem:** Diktat-Auszug `kontext.substring(0, 600)` wird ohne `ProvaPseudo.apply()` an OpenAI gesendet.
**Action:** Sprint 9 Fix-Pflicht (`KI-008-pseudo-fix`)

### MEDIUM: Marcel-Direktive Regel 14 erfüllt
- KI-004 (Konjunktiv-II) nutzt `gpt-4o` (NICHT mini) ✅

### Versionierungs-Strategie definiert
- Format: `docs/ki/KI-NNN-name-vMM.md`
- Master-Index in `docs/ki/KI-PROMPTS-MASTER.md`
- KI-Funktions-Garantie (5 Tests) Pflicht pro neue Version

---

## Marcel-Pflicht-Aktionen (Sprint C neu)

1. Repo-Root `KI-PROMPTS-MASTER.md` (alter Skeleton 01.05.) entweder löschen oder mit `docs/ki/KI-PROMPTS-MASTER.md` vereinen
2. Sprint 9 Pflicht: KI-008 Pseudo-Fix
3. Sprint 9 Pflicht: automatisierte Test-Suite pro Prompt
4. Sprint 9: KI-009 Halluzinations-Check als separater Endpoint

---

## Was Claude Code in Sprint C NICHT gemacht hat

- ❌ Pseudo-Fix für KI-008 nicht appliziert (gehört in Sprint 9, nicht Audit-Sprint)
- ❌ Repo-Root-Skeleton nicht gelöscht (Marcel-Entscheidung)
- ❌ Automatisierte Test-Suite nicht gebaut (Sprint 9 Scope)

---

## Was Claude Code AUTONOM gemacht hat

- ✅ 8 Prompts vollständig extrahiert
- ✅ Pro Prompt: ID, Name, Modell, Halluzinations-Risk, Test-Cases-Vorschläge
- ✅ Versionierungs-Strategie definiert
- ✅ Architektur-Hinweise (appendUserContext, Pseudonymisierung, Fachwissen)
- ✅ Empfehlungen für Sprint 9 priorisiert

---

*Sprint C abgeschlossen 02.05.2026 nacht. Weiter mit Sprint D (Threat-Model).*
