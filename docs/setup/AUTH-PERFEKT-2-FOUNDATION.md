# AUTH-PERFEKT 2.0 Foundation (MEGA²⁹ W9-I1)

**Datum:** 2026-05-10
**Branch:** `welle-9-market-ready`
**Status:** Foundation done — Vollausbau Welle 11

---

## TL;DR

W9-I1 baut die **Foundation** für 2FA mit TOTP (Time-based One-Time Password, RFC 6238).
Welle 11 baut Frontend-UI + Login-Flow-Integration + Force-Enable für Admin.

**Was W9-I1 liefert:**
- Schema-Migration (5 Felder in users-Table)
- TOTP-Helper-Lib ohne npm-Dep (Sicherheit > Convenience)
- 3 Stub-Endpoints (setup / verify / disable)
- 29 Tests grün

---

## Marcel — Manual-Steps

### 1. SQL-Migration anwenden

**Datei:** `supabase/migrations/2026_05_10_w9_2fa_foundation.sql`

**Apply:**
- Supabase MCP: `Supabase:apply_migration` (Marcel-Approval pflicht)
- ODER Dashboard SQL Editor (Production)

**Hinzugefügte Felder:**
- `totp_secret TEXT NULL` (verschlüsselt)
- `totp_enabled BOOLEAN DEFAULT FALSE NOT NULL`
- `totp_recovery_codes TEXT[] NULL` (10 Codes, encrypted)
- `totp_last_used_at TIMESTAMPTZ NULL` (Anti-Replay)
- `totp_setup_started_at TIMESTAMPTZ NULL`

### 2. ENV-Var setzen

```bash
# 32-Byte Random-Key generieren (PowerShell):
[System.BitConverter]::ToString((1..32 | ForEach-Object { Get-Random -Min 0 -Max 255 })).Replace('-', '').ToLower()

# Oder Bash:
openssl rand -hex 32
```

In Netlify Dashboard → Environment Variables:
- `PROVA_TOTP_ENCRYPTION_KEY` = `<64 hex chars>`

**Wichtig:** Diesen Key NIE rotieren ohne Migration der existierenden encrypted secrets!

### 3. Test-Endpoint manuell

Nach Apply + ENV-Set:

```bash
# Setup-Test (eingeloggter User)
curl -X POST https://app.prova-systems.de/.netlify/functions/auth-2fa-setup \
  -H "Authorization: Bearer $JWT_TOKEN"
# → 200 { qr_url, recovery_codes[] }

# QR-Code im Authenticator-App scannen (Google Authenticator, Authy, 1Password)
# Code aus App ablesen, dann:

# Verify-Test
curl -X POST https://app.prova-systems.de/.netlify/functions/auth-2fa-verify \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'
# → 200 { verified: true, totp_enabled: true }
```

---

## Welle 11 Vollausbau-Scope

### Frontend-UI
- `einstellungen.html` neue Sektion "2FA"
- Setup-Wizard mit QR-Code-Display + Recovery-Codes-Download
- Disable-Button mit TOTP-Verifikation

### Login-Flow-Integration
- Nach Password-Auth: prüfe `totp_enabled` → wenn TRUE, redirect zu TOTP-Prompt
- Recovery-Code-Fallback-Link
- 30-Tage-Trust-Device-Cookie (optional, mit User-Consent)

### Force-Enable für Admin
- `admin@prova-systems.de` MUSS 2FA haben
- Lambda-Helper: `requireAdmin2FA(handler)`
- Sentry-Alert wenn Admin ohne 2FA-Login

### Recovery-Code-UI
- Anzeige verbleibender Codes in einstellungen.html
- Bei < 3 Codes: Warnung + Re-Generate-Option
- Code-Print-View (Marcel-Direktive: ausdruckbar)

---

## Sicherheits-Architektur

### TOTP RFC 6238 + RFC 4226
- Algorithmus: HMAC-SHA1 (Standard, kompatibel mit Google Authenticator)
- Secret-Länge: 20 Bytes = 160 Bit (RFC 4226 minimum 128 Bit)
- Time-Step: 30 Sekunden
- Time-Skew-Tolerance: ±1 Slot (60s Window)
- Code-Format: 6 Digits, decimal

### Storage-Verschlüsselung
- Algorithmus: AES-256-GCM
- Key: 32 Bytes (256 Bit) aus PROVA_TOTP_ENCRYPTION_KEY
- IV: 12 Bytes random pro Encryption
- Auth-Tag: 16 Bytes (Anti-Tampering)
- Format: `iv(12) | tag(16) | ciphertext`, Base64-encoded

### Rate-Limiting
- auth-2fa-setup: 5/60s pro User
- auth-2fa-verify: 10/60s pro User (Brute-Force-Schutz!)
- auth-2fa-disable: 5/60s pro User

### Anti-Replay
- `totp_last_used_at` Tracking
- Code darf nicht 2× im selben 30s-Slot genutzt werden

### Recovery-Codes
- 10 Codes initial, jeder 8 hex-chars (XXXX-XXXX Format)
- Bei Verwendung: Code aus Array entfernt
- Verschlüsselt in DB
- Bei < 3 Codes: User-Warnung in Welle 11

---

## Sicherheits-Begründung: keine npm-Dep

**Warum nicht otplib oder speakeasy?**
- 0 Supply-Chain-Risk (post-2024 lieferketten-Angriffe)
- RFC 6238 ist <100 Zeilen Standard
- Node-Built-In `crypto` reicht (HMAC-SHA1, AES-256-GCM, randomBytes)
- Tests gegen RFC 6238 Test-Vektoren (Appendix B) verifiziert

---

## Tests-Stand

29/29 grün:
- 2 Base32-Encoding/Decoding (RFC 4648)
- 3 TOTP RFC 6238 Test-Vektoren (T=59, 1111111109, 2000000000)
- 2 generateTotpSecret
- 7 verifyTotpCode (Time-Skew, Format, Edge-Cases)
- 4 generateRecoveryCodes
- 5 encryptSecret/decryptSecret (Roundtrip + Anti-Tampering)
- 3 getEncryptionKey (ENV-Migration W6P2-I5 Pattern)
- 3 Endpoint-Files Strukturverifikation

---

*MEGA²⁹ W9-I1 — Foundation komplett, Welle 11 Vollausbau-Plan dokumentiert.*
