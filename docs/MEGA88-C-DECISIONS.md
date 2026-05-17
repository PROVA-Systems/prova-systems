# MEGA⁸⁸-C DECISIONS — TOTP-Sync-Bug-Fix

**Stand:** 2026-05-18 · Branch: `feat/mega88-c-totp-sync-fix`
**Tag-Empfehlung:** `v3905-mega88-c-totp-sync-fix`
**Aufwand:** ~25 Min Hotfix

---

## Problem-Analyse

**Symptom:** `public.users.totp_enabled` driftet weg von `auth.mfa_factors`-Wahrheit.

**Root Cause:** Supabase MFA-API (`supabase.auth.mfa.enroll/verify/unenroll`) arbeitet **ausschließlich** auf `auth.mfa_factors`. Unsere App-Logic (`generate-mfa-recovery-codes`, `verify-mfa-recovery-code`, `account-2fa-status.html`) liest aber `public.users.totp_enabled` — Konsistenz nicht garantiert.

**Konkrete Fail-Szenarien:**
1. User aktiviert 2FA via setup-2fa.html → Supabase marked factor 'verified' → `users.totp_enabled` bleibt false → Recovery-Code-Gen schlägt fehl mit "2FA muss erst aktiviert sein"
2. User deaktiviert 2FA → Supabase unenroll → `users.totp_enabled` bleibt true → Account-Status zeigt verwirrend "aktiv"
3. Pre-Migration-User mit altem totp_enabled=true Wert hat keinen Factor → System lässt Recovery-Code-Gen zu, scheitert aber bei Verify

---

## Fix-Strategie (3-fach Defense)

### Layer 1: DB-Trigger als Source-of-Truth (Block A)
- Migration 62: AFTER-Trigger auf `auth.mfa_factors`
- Function `sync_users_totp_from_factors()` mit SECURITY DEFINER
- Trigger feuert bei INSERT/UPDATE/DELETE
- Backfill bestehender User in beide Richtungen

### Layer 2: Edge-Hardening (Block B)
- generate-mfa-recovery-codes + verify-mfa-recovery-code
- Primary: `users.totp_enabled`
- Sekundär: `auth.mfa_factors WHERE status='verified'`
- Wenn EINER aktiv → 2FA gilt als aktiv

### Layer 3: Frontend-Fallback (Block C)
- setup-2fa.html verifyTotp(): nach Supabase-MFA-Verify explizit `UPDATE users SET totp_enabled=true`
- setup-2fa.html disable2FA(): nach unenroll explizit `UPDATE users SET totp_enabled=false, totp_recovery_codes=[], used_count=0`
- Non-blocking — Trigger übernimmt wenn aktiv, sonst Frontend-Sync

---

## Warum 3-Layer statt nur Trigger?

- **Trigger-Permission**: Supabase Cloud erlaubt nicht zwingend Trigger auf `auth.*`-Schema. Falls Migration 62 mit Permission-Error scheitert → Layer 2+3 halten Sync.
- **Race-Conditions**: Trigger feuert nach UPDATE, aber Edge-Function-Read könnte gleichzeitig laufen. Sekundär-Check schließt diese Lücke.
- **Pre-Migration-Drift**: Existing User mit falschem totp_enabled → Backfill in Migration korrigiert sofort.

---

## Files

| File | Status | Beschreibung |
|---|---|---|
| `supabase-migrations/62_mega88c_totp_sync_trigger.sql` | **NEU** | DB-Trigger + Backfill |
| `supabase/functions/generate-mfa-recovery-codes/index.ts` | modified | Sekundär-Check auf auth.mfa_factors |
| `supabase/functions/verify-mfa-recovery-code/index.ts` | modified | Sekundär-Check auf auth.mfa_factors |
| `setup-2fa.html` | modified | Frontend-Fallback in verifyTotp + disable2FA |
| `sw.js` | modified | v3850 → v3905 |
| `docs/SW-VERSION-HISTORY.md` | modified | MEGA88-C-Eintrag |
| `docs/MEGA88-C-DECISIONS.md` | **NEU** | dieses File |

---

## Marcel-Apply

1. **Migration 62 applien:**
   ```
   mcp_use claude_ai_Supabase apply_migration
     project_id=cngteblrbpwsyypexjrv
     name=mega88c_totp_sync_trigger
     query=<supabase-migrations/62_mega88c_totp_sync_trigger.sql>
   ```
   Falls Permission-Error auf `auth.mfa_factors` → Layer 2+3 reichen aus, Migration ignorieren.

2. **2 Edges re-deployen** via MCP:
   - `generate-mfa-recovery-codes`
   - `verify-mfa-recovery-code`

3. **Verify-Query** post-Migration:
   ```sql
   SELECT u.id, u.email, u.totp_enabled,
          (SELECT COUNT(*) FROM auth.mfa_factors f WHERE f.user_id=u.id AND f.status='verified') AS verified_factors
   FROM public.users u
   WHERE u.totp_enabled = true OR EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=u.id AND f.status='verified');
   ```
   Erwartung: für jede Row gilt `totp_enabled = (verified_factors > 0)`.

4. **Smoke**:
   - Test-User: 2FA neu einrichten → `users.totp_enabled=true` direkt nach Verify (DB-Query)
   - Recovery-Codes generieren → klappt sofort
   - 2FA deaktivieren → `users.totp_enabled=false` direkt
   - Login mit Recovery-Code → klappt

5. **PR mergen** + Tag setzen: `v3905-mega88-c-totp-sync-fix`
