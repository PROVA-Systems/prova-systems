# MEGA⁵² — 2FA Komplett-Implementation

**Datum:** 2026-05-10 01:15 GMT+2
**Sprint:** Native Supabase MFA + Recovery-Codes + Login-Step-2 + Banner

---

## Architektur

PROVA nutzt **Supabase Native MFA** (TOTP-RFC 6238) + **Recovery-Codes** in
`mfa_recovery_codes`-Tabelle.

```
┌─────────────────────────────────────────────────────────┐
│  Setup-Flow (settings/setup-2fa.html)                   │
│  ────────────────────────────────────────────           │
│  1. supabase.auth.mfa.enroll({ factorType: 'totp' })   │
│     → QR-Code + Manueller Secret-String                │
│  2. User scannt mit Authy / Google Auth / 1Password    │
│  3. supabase.auth.mfa.challenge() + verify()           │
│     → Factor-Status: 'unverified' → 'verified'         │
│  4. Edge call: generate-mfa-recovery-codes              │
│     → 8 Codes (Format: ABCDE-FGHJK), SHA-256 in DB     │
│     → Plain-Codes 1× anzeigen, Print/Download           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Login-Flow Step-2 (app-login-logic.js)                 │
│  ────────────────────────────────────────────           │
│  1. supabase.auth.signInWithPassword() → aal1-Token     │
│  2. supabase.auth.mfa.getAuthenticatorAssuranceLevel() │
│     → currentLevel='aal1' && nextLevel='aal2'?          │
│  3. JA: zeige #mfa-step Form (6-stelliger Code)         │
│     supabase.auth.mfa.challenge() + verify() → aal2     │
│  4. ALT-Pfad: Recovery-Code-Link                        │
│     → /functions/v1/verify-mfa-recovery-code             │
│     → setUsed=true, setSession, weiter zu Dashboard     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  DB-Schema (mfa_recovery_codes)                         │
│  ────────────────────────────────────────────           │
│  id           UUID PRIMARY KEY                           │
│  user_id      UUID → auth.users(id) ON DELETE CASCADE   │
│  code_hash    TEXT NOT NULL (SHA-256 hex)               │
│  used_at      TIMESTAMPTZ (NULL = unused)               │
│  created_at   TIMESTAMPTZ DEFAULT now()                  │
│  UNIQUE(user_id, code_hash)                              │
│  RLS: SELECT für own user_id (own user kann lesen)      │
│  Service-Role bypass für Edge-Insert/Update/Delete      │
└─────────────────────────────────────────────────────────┘
```

---

## Lieferung MEGA⁵²

| Artifact | Beschreibung |
|---|---|
| **Migration `mega52_mfa_recovery_codes_and_workspace_2fa`** | Neue Tabelle `mfa_recovery_codes` + RLS, Spalten `workspaces.require_2fa_for_admins/_members`, `users.mfa_required_at` |
| **`setup-2fa.html` neu** | Vollständige Setup-UI: Status-Card, QR-Code, Verify, Recovery-Codes (Print + TXT-Download), Disable mit Passwort-Bestätigung |
| **Edge `generate-mfa-recovery-codes` (NEU, ACTIVE)** | User-JWT, generiert 8 Codes (Format ABCDE-FGHJK, ohne I/O/0/1), SHA-256 Hash in DB, löscht alte unused-Codes |
| **Edge `verify-mfa-recovery-code` (NEU, ACTIVE)** | Public, Body `{email, password, recovery_code}`. Re-Auth via signInWithPassword + Hash-Match → setUsed + Session zurück |
| **`app-login.html`** | Erweitert um `#mfa-step` und `#recovery-step` Sections (initial hidden) |
| **`app-login-logic.js`** | Login-Flow erweitert: nach signIn aal-Check, MFA-Step zeigen, `_completeLogin()` als Continuation; `verifyMfa()`, `verifyRecoveryCode()`, `zeigeRecoveryCode()`, `zurueckZuMfa()` |
| **`lib/dashboard-2fa-banner.js` (NEU)** | Sticky-Top-Banner für non-2FA-User. Critical für Admins (rot), recommended für Solo/Team (orange). 7-Tage-Dismissable für non-Critical |
| **`sw.js`** | `prova-v2070-mega52-2fa` |
| **`docs/sprint-status/MEGA52-2FA.md`** | dieses Doc |

**Total: 146 Edge Functions ACTIVE** (von 144 vor MEGA⁵²).

---

## User-Anleitung — 2FA aktivieren

### 1. Authenticator-App installieren
- **Authy** (kostenlos, Multi-Device-Sync)
- **Google Authenticator** (kostenlos, simpel)
- **Microsoft Authenticator** (Enterprise-Grad)
- **1Password** / **Bitwarden** (Passwort-Manager-Integration)

### 2. PROVA-Setup
1. Login auf https://app.prova-systems.de
2. Settings → Sicherheit ODER direkt `/setup-2fa.html`
3. Klick "2FA einrichten" → QR-Code erscheint
4. App öffnen → "+" → "QR-Code scannen" → PROVA-Code scannen
5. App zeigt PROVA-Eintrag mit 6-stelligem Code (alle 30s neu)
6. Aktuellen 6-stelligen Code in PROVA eingeben → "Aktivieren"
7. Recovery-Codes erscheinen → **PFLICHT: drucken oder als TXT speichern!**
8. Checkbox "Ich habe gespeichert" → "Fertig"

### 3. Login mit 2FA
1. Email + Passwort wie gewohnt
2. PROVA fragt nach 6-stelligem Code aus App
3. App öffnen → aktuellen Code für PROVA eingeben → "Bestätigen"
4. Dashboard öffnet sich

### 4. Recovery (Authenticator verloren)
1. Login-Page → Email + Passwort
2. MFA-Step erscheint → "Authenticator verloren? Recovery-Code verwenden →"
3. Recovery-Code eingeben (Format: ABCDE-FGHJK)
4. **Code wird verbraucht** (1× Verwendung)
5. Sofort danach: Settings → Sicherheit → 2FA neu einrichten (alte App ist nutzlos)

### 5. Recovery-Codes neu generieren
- Settings → Sicherheit → "Recovery-Codes neu generieren"
- ALLE alten Codes werden ungültig
- 8 neue erscheinen → speichern!

### 6. 2FA deaktivieren (NICHT empfohlen)
- Settings → Sicherheit → "Deaktivieren"
- Passwort bestätigen
- TOTP-Factor wird unenrolled

---

## Edge Function Details

### `generate-mfa-recovery-codes` (User-JWT)
**Endpoint:** `POST /functions/v1/generate-mfa-recovery-codes`

```javascript
// Request:
fetch(SB_URL + '/functions/v1/generate-mfa-recovery-codes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + session.access_token,
               'apikey': SB_ANON, 'Content-Type': 'application/json' }
});

// Response 201:
{
    "codes": ["ABCDE-FGHJK", "MNPQR-STUVW", ...],   // 8 Codes
    "count": 8,
    "hint": "Diese Codes werden NICHT erneut angezeigt."
}
```

Löscht VORHER alle `used_at IS NULL` Codes des Users → echte Regeneration.
Audit-Log: `audit_trail.action='create', entity_typ='mfa_recovery_codes',
payload.event='mfa_recovery_regenerated'`.

### `verify-mfa-recovery-code` (Public)
**Endpoint:** `POST /functions/v1/verify-mfa-recovery-code`

```javascript
// Request:
{
    "email": "marcel@example.com",
    "password": "...",
    "recovery_code": "ABCDE-FGHJK"
}

// Response 200:
{
    "ok": true,
    "session": { access_token, refresh_token, expires_at, ... },
    "user": { id, email },
    "remaining_codes": 7,
    "warning": null,                                  // oder "Nur 2 übrig..."
    "next_step": "Bitte neue 2FA-App in Settings einrichten."
}

// Response 401: { error: "Recovery-Code ungültig" }
//               oder "Recovery-Code bereits verbraucht"
```

Audit-Log: `mfa_recovery_used` bei Erfolg, `mfa_recovery_invalid_code` /
`mfa_recovery_reuse_attempt` bei Fail.

---

## Multi-Tier-Pflicht (Vorbereitung)

DB-Schema erweitert:
```sql
workspaces.require_2fa_for_admins   BOOLEAN DEFAULT true
workspaces.require_2fa_for_members  BOOLEAN DEFAULT false
users.mfa_required_at               TIMESTAMPTZ
```

**Live im Code aktuell:**
- Admin (`PROVA_ADMIN_EMAILS`): MFA-Banner kritisch (rot)
- Solo/Team-User: MFA-Banner empfohlen (orange, dismissable 7 Tage)

**Defer auf MEGA⁵³+:**
- 24h-Hard-Lock für Admin ohne MFA
- Workspace-Owner-Toggle: erzwinge MFA für Members
- Onboarding-Step 7 mit MFA-Empfehlung
- Edge-Functions `aal2-Required` Helper für sensitive Operations

---

## Audit-Log Events

`audit_trail`-Einträge bei:

| Event | Action | Entity | Trigger |
|---|---|---|---|
| `mfa_enrolled` | create | mfa_factor | supabase.auth.mfa.enroll |
| `mfa_unenrolled` | delete | mfa_factor | supabase.auth.mfa.unenroll |
| `mfa_recovery_regenerated` | create | mfa_recovery_codes | Edge generate-mfa-recovery-codes |
| `mfa_recovery_used` | login | mfa_recovery | Edge verify-mfa-recovery-code (success) |
| `mfa_recovery_invalid_code` | login_failed | mfa_recovery | Edge (Code-Mismatch) |
| `mfa_recovery_reuse_attempt` | login_failed | mfa_recovery | Edge (already used) |

Alle mit IP-Adresse, User-Agent, Timestamp.

---

## Browser-Test (~5 Min)

```
1. Inkognito → /setup-2fa.html (mit gültigem Login)
2. "2FA einrichten" → QR-Code scanen mit Authy
3. 6-stelligen Code eingeben → "Aktivieren"
4. Recovery-Codes erscheinen → screenshot/print
5. Logout → Login mit Email+Passwort
6. MFA-Step erscheint → 6-stelligen Code aus Authy → "Bestätigen"
7. Dashboard lädt
8. Logout → Login → "Recovery-Code verwenden →"
9. Einer der 8 Codes → "Bestätigen"
10. Dashboard lädt + Warning "Nur 7 Codes übrig"
11. /setup-2fa.html → "Recovery-Codes neu generieren" → 8 neue
12. /setup-2fa.html → "Deaktivieren" → Passwort → bestätigt
```

---

## Bekannte Restprobleme (defer)

- **Aal2-required für sensitive Operations** (delete-mandant, export-bulk, etc.)
  → Edge `_shared/admin-auth.ts` hat schon AAL2-Check für Admin-Functions.
  Für non-Admin-User-Functions defer K-1.4.

- **Onboarding-Step 7** mit MFA-Empfehlung im Wizard. Defer K-1.4.

- **24h-Hard-Lock für Admin** ohne MFA (Pilot-Phase: nur Banner).

- **Playwright-Tests** für 2FA-Flow. Manueller Test-Plan ist im Doc.

- **`PROVA_ADMIN_REQUIRE_2FA=false`** ist aktuell in Edge-Secrets gesetzt
  (Marcel-Pilot-Phase). Wenn 2FA für Admins aktiviert: Edge-Secret entfernen
  → adminHandler erzwingt aal2.
