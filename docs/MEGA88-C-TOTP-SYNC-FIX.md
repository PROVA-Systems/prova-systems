# MEGA⁸⁸-C — TOTP-Sync-Fix (kompakte Zusammenfassung)

**Tag:** `v3905-mega88-c-totp-sync-fix` · Branch: `feat/mega88-c-totp-sync-fix`

## Problem

Supabase MFA-API arbeitet auf `auth.mfa_factors`. App-Logic liest `public.users.totp_enabled`. Drift möglich. ZUSÄTZLICH: Frontend-Session-JWT bleibt nach `mfa.verify()` im **aal1**-Cache — Edge-Check sieht `auth.jwt()->>'aal' = 'aal1'` und liefert 400 obwohl 2FA aktiv ist.

## Fix (3-fach Defense + Session-Refresh)

### A) DB-Trigger (Migration 62)
- `supabase-migrations/62_mega88c_totp_sync_trigger.sql`
- AFTER-Trigger auf `auth.mfa_factors` sync't `public.users.totp_enabled` automatisch
- Backfill bidirektional für existing User

### B) Edge-Hardening
- `generate-mfa-recovery-codes` + `verify-mfa-recovery-code`
- **auth.mfa_factors ist PRIMARY-Source** (umgekehrt vom ersten Commit)
- 3-stufiger Fallback: `.schema('auth').from('mfa_factors')` → direkter `mfa_factors` → `users.totp_enabled`
- User-Message bei Fail: „Falls du gerade verifiziert hast, lade die Seite einmal neu."

### C) Frontend-Session-Refresh (NEU im Sub-Block)
- `setup-2fa.html` `verifyTotp()` nach erfolgreichem `mfa.verify()`:
  - `supabase.auth.refreshSession()` → JWT bekommt aal2-Claim
  - `await new Promise(r => setTimeout(r, 150))` → DB-Trigger-Sync-Buffer
  - DANN erst `generate-mfa-recovery-codes`-Call
- Verify-Error-UX: klare User-Messages statt cryptic error.message
  - Falscher Code → „Code ungültig. Versuch's mit einem frischen Code aus deiner App (wechselt alle 30 Sekunden)."
  - Network-Fehler → „Verbindungsproblem. Bitte erneut versuchen."
  - Recovery-Codes-Gen-Fail nach Verify → „2FA aktiv ✓ — Recovery-Codes konnten nicht generiert werden..." + Retry-Button

### D) Frontend-Fallback (aus erstem Commit, bleibt)
- `verifyTotp()`: zusätzlicher `UPDATE users SET totp_enabled=true` falls Trigger fehlt
- `disable2FA()`: `UPDATE users SET totp_enabled=false` + Codes leeren

## Migration-Ref

Migration 62 = Source-of-Truth (DB-Trigger). Wenn Marcel sie nicht applizieren kann (Permission auf `auth.*`): Layer B + C reichen aus, weil Frontend selbst sync't UND Edges auf auth.mfa_factors lesen.
