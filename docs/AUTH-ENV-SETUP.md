# Auth-ENV-Setup

**Stand:** 25.04.2026 (S-SICHER P4A.1)
**Bezug:** Sprint 02 Auth-Fundament, AUDIT-REPORT Findings 1.1, 1.2, 7.1, 7.2, 7.3

---

## Erforderliche ENV-Variablen (Netlify)

| Key | Format | Verwendet von | Status |
|---|---|---|---|
| `AUTH_HMAC_SECRET` | 64-Zeichen Hex (32 Bytes) | `lib/auth-token.js` | ✅ gesetzt am 25.04.2026 |
| `URL` | `https://prova-systems.de` | `auth-token-issue.js` (Netlify-Identity-Call) | ✅ Netlify-Standard |
| `AIRTABLE_PAT` | bestehend | `auth-token-issue.js` (SV-Lookup) | ✅ bestehend |

---

## Generierung neues `AUTH_HMAC_SECRET`

Falls Rotation nötig (z. B. Verdacht auf Leak), neues Secret erzeugen:

**PowerShell (Windows):**
```powershell
[System.BitConverter]::ToString((1..32 | ForEach-Object { Get-Random -Max 256 } | ForEach-Object { [byte]$_ })).Replace("-","").ToLower()
```

**Bash (Linux/Mac):**
```bash
openssl rand -hex 32
```

Resultat (Beispiel-Format): 64 Hex-Zeichen, z. B. `a1b2c3d4...`.

---

## Setzen in Netlify

1. Netlify-Dashboard → Site `prova-systems` (Site-ID `79cd5c61-e8e8-451e-9bf1-e2d17f971386`)
2. Site configuration → **Environment variables** → **Add variable**
3. Key: `AUTH_HMAC_SECRET`, Value: das generierte Hex
4. Scope: **Builds + Functions** (beide aktiv)
5. Speichern → nächster Function-Call nutzt das neue Secret automatisch (kein Re-Deploy nötig)

---

## Was die Rotation auslöst

Wenn `AUTH_HMAC_SECRET` rotiert wird, sind **alle bestehenden Auth-Tokens sofort ungültig**:
- HMAC-Verify schlägt fehl → `auth-token-verify` returnt `null` → Frontend leitet zu Login um.
- Kein Cache-Invalidierungs-Aufruf nötig — Tokens sind self-contained.

Bedeutet: **Alle User müssen sich neu einloggen.** Bei produktiver Rotation Marcel vorab informieren.

---

## Notfall-Bypass-Token

Siehe `docs/EMERGENCY-BOOKMARKLET.md` (wird in P4A.8 erstellt). 90-Tage-HMAC-Token für Marcel falls der Login-Flow brechen sollte.
