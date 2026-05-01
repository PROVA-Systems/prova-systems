# Airtable ENV-Vars Cleanup für Marcel

**Datum:** 02.05.2026 nachmittags
**Sprint:** Voll-Cleanup-Sprint (Block 4)
**Action:** Marcel entfernt diese ENV-Vars manuell in Netlify-UI

---

## Was zu tun

Netlify-Dashboard → Site `prova-systems` → Site Settings → **Environment Variables** → folgende ENVs **löschen**:

```
AIRTABLE_PAT
AIRTABLE_TOKEN
AIRTABLE_API_KEY
AIRTABLE_API
AIRTABLE_BASE_ID
AIRTABLE_BASE
AIRTABLE_TABLE_SV
AIRTABLE_TABLE
AIRTABLE_BRIEFE_TABLE
AIRTABLE_AUDIT_TRAIL_TABLE
AIRTABLE_RATE_LIMIT
AIRTABLE_UNAVAILABLE
```

**12 ENV-Vars insgesamt.**

---

## Optional behalten (vorerst)

```
PROVA_AUDIT_TRAIL_TABLE      ← evtl. zeigt jetzt auf Supabase-Tabelle, nicht Airtable
                              Wenn nicht-Airtable-Wert: behalten · sonst löschen
```

---

## Was nach dem Löschen passiert

- Verbleibende ~30 Netlify-Functions die noch `process.env.AIRTABLE_*` lesen werden bei diesen Calls `undefined` bekommen → ihre Airtable-API-Calls schlagen mit `401 Unauthorized` fehl
- Das ist OK — `prova-fetch-auth.js` hat bereits einen Wrapper der `/.netlify/functions/airtable` blockiert (Block 2)
- Diese Functions müssen in einem **separaten Refactor-Sprint** auf Supabase umgestellt werden:
  - `audit-log`, `mein-aktivitaetsprotokoll`
  - `dsgvo-auskunft`, `dsgvo-loeschen`
  - `ki-proxy`, `ki-statistik`
  - `foto-upload`, `foto-anlage-pdf`, `foto-captioning`
  - `normen`, `normen-picker`
  - `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `pdf-proxy`
  - `push-notify`, `emails`, `smtp-senden`, `smtp-credentials`
  - `provision-sv`, `auth-token-issue`, `akte-export`
  - `error-log`, `team-interest`, `termin-reminder`, `health`, `make-proxy`
  - `admin-auth`, `admin-cache-clear`, `invite-user`, `whisper-diktat`

---

## Verifikation nach ENV-Löschung

Nach dem Löschen:
1. Netlify triggert kein Auto-Redeploy bei ENV-Change — manuell **Trigger Deploy** klicken (Site Overview → Deploys → Trigger Deploy)
2. Browser-Test: Inkognito-Login → Dashboard → Browser-Konsole sollte zeigen
   - `[airtable-cleanup] blocked legacy call: /.netlify/functions/airtable` (mehrfach, klare Soft-Disable-Meldung)
   - **KEIN** `Airtable Fehler`
   - **KEIN** `supabase nicht verfuegbar`
3. Smoke-Test (`bash scripts/smoke-test-cutover.sh`) muss 15/15 PASS bleiben

---

*ENV-Liste erstellt 02.05.2026 nachmittags · Marcel-Action manuell · Sprint v203-vollcutover-airtable-out*
