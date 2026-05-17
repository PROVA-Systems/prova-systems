# MEGA⁸⁴/⁸⁵ Pass 2b — Marcel-Checkliste

**Stand:** 2026-05-17 · Branch: `feat/mega84-85-pass2b-compliance-search`
**Vor Test:** `git pull` auf der Branch + Browser-Cache leeren (DevTools › Application › Service Workers › Update)

---

## A — Pre-Apply (1 Aktion)

**A.1 Migration 59 applien via MCP**
```
mcp_use claude_ai_Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega84_global_search_v2
  query=<Inhalt von supabase-migrations/59_mega84_global_search_v2.sql>
```
Erwartung: `success: true`. Funktion `global_search_v2` ist danach in Supabase erreichbar.

Quick-Verify im Supabase-SQL-Editor:
```sql
SELECT * FROM public.global_search_v2(
  '65b25a13-17b7-45c0-b567-6edee235dd98'::uuid,
  'rohrbruch',
  10
);
```
Erwartung: Treffer aus mehreren Sources (auftrag/dokument/kontakt/...) oder leere Ergebnismenge bei kein Match — kein Fehler.

---

## B — PDFMonkey Templates patchen (3 Templates)

**B.1 F-04 (Schaden) öffnen** in PDFMonkey-Dashboard
→ Liquid-Block aus `docs/MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md` an Stelle vor `</body>` einfügen
→ Speichern + Test-Render mit Beispieldaten

**B.2 F-09 (Wertgutachten)** — gleiches Vorgehen.

**B.3 F-15 (Beratung)** — gleiches Vorgehen.

**Verify:** Ein Test-Render mit `has_ki_einsatz = true` zeigt LG-Darmstadt-Disclosure-Block. Bei `false`/leer: kein Block.

---

## C — Frontend-Smoke (in `app.prova-systems.de`)

### C.1 Service-Worker Update
1. App öffnen → DevTools → Application → Service Workers
2. Erwartung: aktive Version **`prova-v3550-mega84-85-pass2b-compliance-search`**
3. Wenn alt: "Update" + Page reload

### C.2 Cmd+K / Ctrl+K Global-Search
1. Auf beliebiger App-Page Cmd+K drücken
2. Erwartung: Overlay öffnet
3. Suchen "rohr" oder "müller" — Treffer erscheinen mit Source-Gruppierung (Aufträge/Dokumente/Kontakte/Textbausteine/Normen)
4. Filter-Pill "Aufträge" klicken → nur Auftrag-Treffer sichtbar
5. Enter auf Treffer → öffnet `/akte.html?id=...` korrekt
6. Falls **Migration 59 noch nicht applied**: Fallback auf alte `global_search` läuft, weniger Sources aber funktionsfähig

### C.3 Freigabe-Wizard Pre-Render-Check
1. Auftrag mit befülltem `ki_tasks` öffnen, der noch kein `ki_anzeige_datum` hat
2. Auf "Zur Freigabe" → Step 3
3. "PDF erzeugen" klicken
4. Erwartung: Browser-Prompt fragt nach YYYY-MM-DD
5. Datum eingeben → PDF läuft durch
6. Auftrag in Supabase prüfen: `ki_anzeige_datum` ist gesetzt
7. `audit_trail` prüfen: Eintrag mit `lg_darmstadt_compliance: true`

### C.4 Pre-Render-Check Abbruch-Pfad
1. Anderen Auftrag mit `ki_tasks` ohne `ki_anzeige_datum`
2. PDF erzeugen → Prompt erscheint → "Abbrechen"
3. Erwartung: Status `⛔ PDF blockiert: KI-Anzeige-Datum erforderlich` + keine PDF-Generation

### C.5 Coupon-UI in Registrierung
1. `/app-register.html` öffnen
2. Coupon-Feld erscheint vor Submit-Button
3. `FOUNDING-99` eingeben → grünes Preview "Solo 99 €/mo lifetime ..."
4. `FRIEND-50` → grünes Preview "50% Rabatt für 3 Monate"
5. `WERBER-MONAT-FREI` → grünes Preview "1 Monat geschenkt ..."
6. `BLABLA` → gelbes Preview "⚠ Coupon-Code unbekannt. Stripe prüft beim Checkout final."
7. Mit valid Coupon registrieren → localStorage prüfen: `prova_pending_coupon=FOUNDING-99`

### C.6 Trial-Banner (optional, wenn auto-gemounted)
Voraussetzung: Login als Trial-User (`prova_subscription_status='trial'`)
1. Banner sichtbar mit Tage-Countdown
2. Bei >= 3 Tagen: gelb + dismiss-Button
3. Bei < 3 Tagen: rot + pulse (nicht dismissbar)
4. Bei abgelaufenem Trial: Modal blockiert mit DSGVO-Export + Upgrade-CTAs

**Hinweis:** `lib/trial-banner.js` ist als Auto-Mount-Script gebaut. Marcel kann es per Script-Tag in dashboard.html + akte.html etc. einbinden, oder via Bulk-Sweep wie Bridge in Pass 1. Mount-Sweep ist DEFER für Pass 2c, nicht Pass-2b-Blocker.

---

## D — Quick-Check Pass

| Punkt | Erwartung | OK? |
|---|---|---|
| **D.1** SW v3550 aktiv | ja | ☐ |
| **D.2** Cmd+K öffnet Modal | ja | ☐ |
| **D.3** Cmd+K liefert Multi-Source-Treffer | ja (oder v1-Fallback) | ☐ |
| **D.4** Freigabe-Wizard Pre-Render-Check blockt bei fehlendem KI-Datum | ja | ☐ |
| **D.5** Datum-Eingabe + PDF läuft durch + Audit-Trail-Eintrag | ja | ☐ |
| **D.6** Coupon-Field zeigt Validation | 3 valid + Fallback | ☐ |
| **D.7** Pending-Coupon in localStorage persistiert | ja | ☐ |
| **D.8** PDFMonkey LG-Block bei has_ki_einsatz=true sichtbar | ja | ☐ |
| **D.9** PDFMonkey kein Block bei has_ki_einsatz=false | ja | ☐ |
| **D.10** Console clean (keine ungewohnten Fehler) | ja | ☐ |

---

## E — Bei Fehler

- **Cmd+K wirft RPC-Error**: Migration 59 noch nicht applied → siehe A.1. Fallback auf alte `global_search` läuft automatisch, also App ist nicht blockiert.
- **Pre-Render-Check ignoriert ki_tasks**: prüfe ob `auftragRow` befüllt ist (`window.auftragRow` in DevTools-Console)
- **Coupon-Field fehlt**: prüfe ob `app-register.html` aus richtiger Branch geladen ist (SW v3550)
- **PDFMonkey rendert kein Block**: prüfe Variable-Mapping im PDF-Edge — `has_ki_einsatz` ist aus `(ki_tasks IS NOT NULL AND ki_tasks != '[]'::jsonb)` zu berechnen

---

## F — Nach Pass 2b grünem Test

1. PR mergen auf `main`
2. Tag setzen: `v3550-mega84-85-pass2b-compliance-search`
3. Pass 2c starten (Block G + H + I) — Branch: `feat/mega84-85-pass2c-audit-bibliothek`

---

**Pass 2b komplett.** ✅
