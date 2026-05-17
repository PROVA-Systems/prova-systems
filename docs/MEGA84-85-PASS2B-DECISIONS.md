# MEGA⁸⁴/⁸⁵ Pass 2b DECISIONS — PDF-Compliance + Trial + Global-Search

**Stand:** 2026-05-17 · Branch: `feat/mega84-85-pass2b-compliance-search`
**Pass 2b:** ~4h Code · 2 Commits · Block D + E + F + Final

---

## Pre-Read ✅

- `docs/MEGA84-85-PASS2A-DECISIONS.md` (additive Strategy als Pattern)
- `lib/prova-global-search.js` 214 Zeilen — existing Cmd+K-Modal mit Pills, RPC `global_search` (MEGA78)
- `trial-guard.js` 326 Zeilen — existing Testpilot/Trial-Logic, Subscription-Status-Guard
- `app-register.html` Form-Struktur + `register()` Function
- `freigabe-wizard.html` Step-3 `fwGeneratePdf` aus MEGA83

---

## Block D — PDF-Compliance LG-Disclosure ✅

### D.1 — PDFMonkey-Doku
`docs/MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md` mit:
- **Liquid-Block** copy-paste-ready für F-04/F-09/F-15 (mit `{% if has_ki_einsatz %}` + ki_modell_label-Default + optional ki_anzeige_datum-Anzeige)
- PDFMonkey-Dashboard-Pfad für Marcel
- Frontend-Variable-Mapping-Doku
- Verify-Tests

### D.2 — Variable-Mapping
`pdf-proxy.js` Patch nicht nötig — Existing-Generator-Edge bekommt die Auftrag-Row via JOIN, hat also `ki_tasks` + `ki_anzeige_datum` bereits zur Verfügung. Liquid kann direkt darauf zugreifen.

### D.3 — Pre-Render-Check ✅
`freigabe-wizard.html` `fwGeneratePdf` erweitert um `_fwPreRenderCheck()`:
- Wenn `auftragRow.ki_tasks` befüllt AND `ki_anzeige_datum` NULL:
  - Modal/Prompt fordert YYYY-MM-DD-Eingabe (Default: heute)
  - Bei Submit: `UPDATE auftraege SET ki_anzeige_datum=...` + Audit-Trail-Eintrag mit `lg_darmstadt_compliance:true`
  - Bei Abbruch: PDF-Generation blockiert mit Status `⛔ PDF blockiert: KI-Anzeige-Datum erforderlich`
- Bei `ki_tasks` leer ODER `ki_anzeige_datum` bereits gesetzt: passt durch

---

## Block E — Trial-Guard + Coupons ✅

### E.1 — `lib/trial-banner.js` ✅ NEU
Auto-Mount-Script (kein DOM-Required, läuft per IIFE):
- Pre-Check: nur für `prova_subscription_status=trial`-User, skipt Testpilot/Founder-Bypass
- `_daysRemaining()` berechnet aus `prova_trial_end` (ISO-Date) oder `prova_trial_start` + `prova_trial_days`
- 3 States:
  - **>= 3 Tage:** Gelber Banner ("Trial endet in X Tagen — sichere deinen PROVA-Zugang"), dismissable via sessionStorage
  - **< 3 Tage:** Roter Banner mit Pulse-Animation, NICHT dismissable
  - **Abgelaufen:** Blocking-Modal `_showExpiredModal()` mit 2 Optionen (DSGVO-Export + Upgrade)
- Pricing-Werte explizit im Modal (Solo 179€, Team 379€)
- Body bekommt `has-trial-banner` Class für padding-top-Compensation

### E.2 — trial-guard.js
Bereits vorhanden + funktional. Kein Refactor nötig — `trial-banner.js` ist additiv, komplementiert die Block-Logic.

### E.3 — Coupon-UI in app-register.html ✅
- Coupon-Field zwischen Passwort-Bestätigung und Submit-Button
- `checkCoupon()` Live-Validation gegen frontend-COUPON_DEFINITIONS:
  - `FOUNDING-99` → "Solo 99 €/mo lifetime (statt 179 €). Erste 10 SVs."
  - `FRIEND-50` → "50% Rabatt für 3 Monate (alle Tier)."
  - `WERBER-MONAT-FREI` → "1 Monat geschenkt nach erster Zahlung."
- Bei valid: grünes Preview "✅ <Label> · <Beschreibung>"
- Bei unknown: gelbes Preview "⚠ Coupon-Code unbekannt. Stripe prüft beim Checkout final."
- Submit: Coupon persistiert in `localStorage.prova_pending_coupon` + Timestamp → Stripe-Checkout-Edge nutzt das später

---

## Block F — Global-Search 360° ✅

### F.1 — Migration 59 `global_search_v2` RPC ✅
- SECURITY DEFINER + `workspace_id`-Pflicht (RLS-konform)
- 5 Quellen: auftraege + dokumente + kontakte + textbausteine (inkl. globale) + normen_bibliothek
- `per_source_limit` = `MAX(LEAST(limit, 50) / 4, 5)` — verhindert dass eine Source alle Slots schluckt
- `websearch_to_tsquery('german', q)` mit Fallback auf `plainto_tsquery`
- Sortierung: `ts_rank DESC, updated_at DESC NULLS LAST`
- Return: `source, id, title, subtitle, href, rank`
- `GRANT EXECUTE TO authenticated, service_role`

### F.2 — `lib/prova-global-search.js` Refactor ✅
`search()` Function umgebaut:
- Workspace-ID via `getActiveWorkspaceId()` aus supabase-client (cached in localStorage)
- Primary-Call: `sb.rpc('global_search_v2', { p_workspace_id, p_query, p_limit:25 })`
- Fallback-Call wenn v2-Error: alter `global_search` aus MEGA78 (q_text/q_limit/q_source_filter)
- Source-Filter: Client-side nach RPC-Call (v2 hat keinen Server-Filter), Mapping zwischen singular (`auftrag`) und plural (`auftraege`)
- Item-Format: `{ type:row.source, id, title, subtitle, url:row.href||row.url, rank }` — backward-compat

### F.3 — Auto-Mount
Existing Cmd+K-Trigger (MEGA78 C.3, Z.201-209 in lib/prova-global-search.js) bleibt aktiv. Script-Tag ist auf 80+ App-Pages bereits via Bridge-Sweep Pass 1 + Auto-Init-Pattern.

---

## DEFER Pass 2c

| Block | Inhalt | Begründung |
|---|---|---|
| **G** 5-Audit-Edges → 1 audit-log-v1 | Konsolidierung | Compliance-Pflicht-Pfad, Pseudonymisierung-Test pro Audit-Source |
| **H** Bibliothek-Funktion komplett | Kategorie-Nav + Volltext-Suche + Zur-Akte-CTA | Nutzt jetzt global_search_v2 RPC als Foundation |
| **I** Sprint-Final komplett (alle Blocks reviewed) | Final-Doku | Nach Pass 2c-Implementation |

---

## Files in Pass 2b

| File | Status |
|---|---|
| `docs/MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md` | **NEU** |
| `freigabe-wizard.html` | modified (Pre-Render-Check) |
| `lib/trial-banner.js` | **NEU** (170 Zeilen) |
| `app-register.html` | modified (Coupon-Field + Validation) |
| `supabase-migrations/59_mega84_global_search_v2.sql` | **NEU** |
| `lib/prova-global-search.js` | modified (v2-RPC + Fallback) |
| `sw.js` | v3500 → v3550 |
| `docs/SW-VERSION-HISTORY.md` | erweitert |
| `docs/MEGA84-85-PASS2B-DECISIONS.md` | **NEU** (dieses File) |
| `docs/MEGA84-85-PASS2B-MARCEL-CHECKLIST.md` | **NEU** |

---

## Marcel-Apply-Pfad

### 1. Migration 59 applien
```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega84_global_search_v2
  query=<Inhalt von supabase-migrations/59_mega84_global_search_v2.sql>
```

### 2. PDFMonkey-Templates patchen (F-04, F-09, F-15)
Liquid-Block aus `docs/MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md` copy-paste.

### 3. Smoke-Test
Siehe `docs/MEGA84-85-PASS2B-MARCEL-CHECKLIST.md` — 10 Punkte.

### 4. trial-banner.js Mount
Optional in App-Pages einbinden via Script-Tag — Auto-Mount-IIFE läuft sofort.
Alternativ: ähnlicher Bulk-Sweep wie Bridge in Pass 1.

### 5. PR mergen + Tag `v3550-mega84-85-pass2b-compliance-search`
