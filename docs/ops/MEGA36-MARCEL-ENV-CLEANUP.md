# MEGA³⁶ ENV-Konsolidierung — Marcel's Action-Liste

**Datum:** 2026-05-07
**Sprint:** MEGA³⁶ Welle 6 (W6.1–W6.5)
**Branch:** `mega34-final-100-percent`

---

## Was wurde gebaut (Code-Side)

| Item | Datei | Zweck |
|------|-------|-------|
| W6.1 | `lib/dokument-templates-cache.js` | Browser-Cache, lädt Template-IDs aus DB statt aus PROVA_TEMPLATE_*-ENVs |
| W6.1 | `netlify/functions/list-dokument-templates.js` | GET-Lambda, Single-Source-of-Truth für aktive Templates |
| W6.2 | `netlify/functions/lib/make-webhooks-config.js` | Helper, parsed `MAKE_WEBHOOKS_JSON` — fallback auf Legacy-ENVs |
| W6.3 | `netlify/functions/lib/prova-stripe-prices.js` | Bereits vorhanden (Stripe-Migration 03.05.2026), unverändert |
| W6.4 | `docs/audit/ENV-AUDIT-REPORT.md` | M³⁶-Append-Sektion |
| W6.5 | _diese Datei_ | Marcel-Action-List (du liest gerade) |

---

## ⚠️ DIESE ENVs SOFORT NEU SETZEN

### 1. `MAKE_WEBHOOKS_JSON` — NEU (ersetzt 8 Einzel-ENVs)

**Aktion:** Im Netlify-Dashboard hinzufügen unter
*Site Settings → Environment variables → Add variable.*

**Key:** `MAKE_WEBHOOKS_JSON`
**Value:** (eine Zeile, mit deinen echten Make-URLs ersetzen):

```json
{"rechnung_generate":"https://hook.eu1.make.com/xxx","mahnung_send":"https://hook.eu1.make.com/xxx","stripe_signup":"https://hook.eu1.make.com/xxx","kontakt_sync":"https://hook.eu1.make.com/xxx","auftrag_close":"https://hook.eu1.make.com/xxx","termin_remind":"https://hook.eu1.make.com/xxx","support_inbox":"https://hook.eu1.make.com/xxx","audit_archive":"https://hook.eu1.make.com/xxx"}
```

**Backward-Kompatibilität:** Solange `MAKE_WEBHOOKS_JSON` nicht gesetzt
ist, fällt der Helper auf die Legacy-Einzel-ENVs zurück
(`MAKE_WEBHOOK_RECHNUNG_GENERATE`, …). Du kannst die JSON also
**parallel** setzen — danach die Einzel-ENVs in einer separaten
Aktion löschen.

---

## ⚠️ DIESE ENVs KÖNNEN GELÖSCHT WERDEN (nach JSON-Setup)

Nach erfolgreichem Test der `MAKE_WEBHOOKS_JSON` (1 Auftrag durch den
ganzen Workflow ziehen):

```
MAKE_WEBHOOK_RECHNUNG_GENERATE
MAKE_WEBHOOK_MAHNUNG_SEND
MAKE_WEBHOOK_STRIPE_SIGNUP
MAKE_WEBHOOK_KONTAKT_SYNC
MAKE_WEBHOOK_AUFTRAG_CLOSE
MAKE_WEBHOOK_TERMIN_REMIND
MAKE_WEBHOOK_SUPPORT_INBOX
MAKE_WEBHOOK_AUDIT_ARCHIVE
```

**Test-Pfad:**
1. Eine Test-Rechnung erstellen → Make-Scenario triggert?
2. Eine Mahnung versenden → Make-Scenario triggert?
3. Logs in `audit_trail` prüfen (`function_name='make-webhooks-config'`)

---

## ⚠️ DIESE PROVA_TEMPLATE_*-ENVs WERDEN OBSOLET (nach W5.3-Apply)

Marcel muss zuerst Migration 24 anwenden (siehe
`supabase-migrations/24_seed_dokument_templates.sql`).

Nach erfolgreichem Apply:

```
PROVA_TEMPLATE_F04_ID
PROVA_TEMPLATE_F09_ID
PROVA_TEMPLATE_F10_ID
PROVA_TEMPLATE_K01_ID
PROVA_TEMPLATE_K02_ID
…
PROVA_TEMPLATE_K09_ID
```

Frontend liest die IDs jetzt aus der DB via
`ProvaDokumentTemplates.byCode('F-04')` (siehe
`lib/dokument-templates-cache.js`).

**Migration 24 Apply-Schritte:**
1. Supabase Dashboard öffnen → SQL Editor:
   <https://supabase.com/dashboard/project/cngteblrbpwsyypexjrv/sql>
2. Inhalt von `supabase-migrations/24_seed_dokument_templates.sql` einfügen
3. Run drücken
4. RAISE-NOTICE-Output prüfen: 14 Templates erwartet
5. ENV-Cleanup (siehe oben) durchführen

---

## ⚠️ STRIPE-IDs sind bereits konsolidiert (W6.3)

`netlify/functions/lib/prova-stripe-prices.js` existiert seit
Stripe-Migration 03.05.2026 mit Default-Fallback-Pattern. Keine
neue Aktion nötig — bestehende ENVs `STRIPE_PRICE_SOLO`,
`STRIPE_PRICE_TEAM`, `STRIPE_PRICE_ADDON_5/10/20`,
`STRIPE_FOUNDING_COUPON_ID` bleiben.

⚠️ **Nicht in diesem Sprint behoben (separater Item):** Comments in
`prova-stripe-prices.js` referenzieren noch alte Preise (149€/279€).
CLAUDE.md Regel 21 (179€/379€ ab 2026-05-08) gilt — die echten
Stripe-Price-IDs sind schon korrekt konfiguriert, nur die Doc-
Strings sollten in einem späteren Patch synchronisiert werden.

---

## Verifikations-Checkliste (nach Marcel-Apply)

- [ ] Migration 24 angewendet (14 Templates in DB)
- [ ] `MAKE_WEBHOOKS_JSON` in Netlify gesetzt
- [ ] 1 Test-Auftrag durch den Make-Workflow → erfolgreich
- [ ] 1 Test-Brief generiert via DB-Lookup (DevTools-Network: Aufruf zu
      `/list-dokument-templates`)
- [ ] Legacy-MAKE_WEBHOOK_*-ENVs gelöscht
- [ ] Legacy-PROVA_TEMPLATE_*-ENVs gelöscht
- [ ] `docs/audit/ENV-AUDIT-REPORT.md` "deletable count" reduziert um 8 + N

---

## Token-/Sprint-Hinweis

Diese Konsolidierung war Welle 6 von MEGA³⁶ (Sprint zu „echtem 100%").
Verbleibend: W7 (Mobile-Polish), W8 (KI-Garantie + AUTH-COCKPIT + 2FA),
W9 (FINAL Pre-Checks + Tag v1000).

*— Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-07*
