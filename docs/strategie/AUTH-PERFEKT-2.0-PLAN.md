# AUTH-PERFEKT 2.0 — Migrations-Plan

**Erstellt:** 03.05.2026 abend (Sprint MEGA-MEGA-MEGA O4)
**Status:** Phase 1 (2FA-Pflicht Admin) ✅ done, Phase 2 (Cleanup) als BACKLOG

---

## TL;DR

Marcel-Direktive war komplette Auth-Migration mit 30T Backward-Compat. Pragmatisch heute Nacht erledigt:

✅ **2FA-Pflicht fuer Admin** (server-side enforced + UI-Hint)
✅ **AAL-Claim** in auth-resolve.js durchgereicht
✅ **Migrations-Plan** dokumentiert

⏸ **app-login.html → auth-supabase.html Cutover** — Marcel-Pflicht (Live-Test erforderlich)
⏸ **Netlify Identity Cleanup** — Backlog (zu riskant ohne Live-Test)
⏸ **30-Tage-Backward-Compat** — bereits implementiert via Hybrid-Auth in auth-resolve.js

---

## Phase 1 — 2FA-Pflicht Admin (✅ done)

### Was sich geaendert hat

**`netlify/functions/lib/admin-auth-guard.js`:**
- Neuer Pre-Check Stufe 3: AAL2-Pflicht
- Default: `require2FA = true` (Opt-Out via `opts.require2FA = false`)
- Globale Notfall-Deaktivierung via `PROVA_ADMIN_REQUIRE_2FA=false` in Netlify ENV
- Nur bei Supabase-Sessions enforced (HMAC-Token via Backward-Compat passieren)
- Bei AAL1-Login: 403 mit `code: 'AAL2_REQUIRED'` + Hint
- Audit-Trail-Eintrag `admin.<fn>.no_2fa` mit aal-Wert

**`netlify/functions/lib/auth-resolve.js`:**
- `aal` und `amr` Claims werden jetzt aus Supabase-JWT durchgereicht
- HMAC-Token bekommen kein aal (Default `aal1`)

**`admin/index.html`:**
- Banner-Warnung bei AAL1-Login: "2FA nicht aktiviert"
- Direktlink zu Supabase-Dashboard MFA-Settings

### Marcel-Pflicht-Aktion

1. Supabase Dashboard → Account-Settings → MFA → TOTP-App registrieren
2. Logout aus Admin-Cockpit
3. Neu einloggen — bei Login zweiten Factor (TOTP-Code) eingeben
4. Cockpit laedt → Banner sollte weg sein

### Testfaelle

- ✅ AAL1-Login + Admin-Zugriff → 403 `AAL2_REQUIRED`
- ✅ AAL2-Login (mit TOTP) + Admin-Zugriff → 200 OK
- ✅ HMAC-Token (Test-Skripte) → durchgelassen (Backward-Compat)
- ✅ `PROVA_ADMIN_REQUIRE_2FA=false` → 2FA optional (Notfall-Schalter)

---

## Phase 2 — app-login.html Cutover (Backlog)

### Stand

Zwei Login-Pages existieren parallel:
- `app-login.html` (Hybrid: HMAC-Token-Login + Netlify Identity fuer Register/Reset)
- `auth-supabase.html` (Voll-Supabase, K-1.4 B12)

Cutover-Plan war in K-1.5: app-login.html durch auth-supabase.html ersetzen.

### Was noch fehlt

1. Test-Run auf Production: `app-login.html` -> `auth-supabase.html`-Redirect
2. `app-login-logic.js` deaktivieren oder loeschen
3. Netlify Identity Widget aus allen Pages entfernen (siehe Liste unten)
4. `prova-auth-api.js` HMAC-Token-Pfad pruefen ob noch lebt (Webhook-Calls? Server-zu-Server?)

### Files mit Netlify-Identity-Refs

```
app-login-logic.js        — Register + Password-Reset
account-gesperrt.html     — Display-only
prova-auth-api.js         — Token-Refresh
push-optin.js             — User-Preference-Speicher
nav.js                    — Logout-Button
mahnung.html              — TODO pruefen
briefe/maengelanzeige.html — TODO pruefen
vor-ort-logic.js          — TODO pruefen
```

### Backward-Compat-Strategy (30T)

- `auth-resolve.js` akzeptiert beide Token-Typen (HMAC + Supabase) → automatischer Backward-Compat
- Bei Cutover: alte Sessions laufen aus durch JWT-Expiry (15 Min)
- Refresh wird neue Supabase-Session erzeugen
- Alte HMAC-Tokens veralten natürlich nach 7d (Token-Lifetime)

### Risiko-Bewertung

**HOCH** ohne Marcel-Live-Test:
- Login-Page ist die First-Touch-Page fuer neue Pilots
- Bei Cutover-Bug ist die App komplett nicht erreichbar
- Rollback-Pfad: einfach Git-Revert + Netlify-Re-Deploy (5 Min)

**Empfehlung:** Marcel macht Cutover-Test selbst:
1. Logout
2. `auth-supabase.html` direkt aufrufen
3. Login + Workflow durchklicken
4. Bei Erfolg: Sprint K-2 Cutover-PR mergen
5. Bei Fehler: NACHT-PAUSE-File schreiben

---

## Phase 3 — Netlify Identity vollstaendig raus (Backlog)

### Heutige Realitaet

Netlify Identity wird noch verwendet fuer:
- Register-Flow (`netlifyIdentity.signup()` in app-login-logic.js Zeile 174-218)
- Password-Reset (`netlifyIdentity.open('recovery')` Zeile 240)

### Migrations-Plan

1. Register-Flow zu `supabase.auth.signUp()` umstellen
2. Password-Reset zu `supabase.auth.resetPasswordForEmail()` umstellen
3. Welcome-Email-Templates aus Supabase Dashboard nutzen (statt Netlify)
4. Netlify Identity Widget-Script aus allen Pages entfernen
5. Netlify Dashboard: Identity-Service deaktivieren (Marcel-Pflicht)

**Aufwand:** ~3-4h + Marcel-Live-Tests

---

## Phase 4 — Backlog-Eintraege

| ID | Titel | Aufwand | Status |
|---|---|---|---|
| H-25 | app-login.html Cutover zu auth-supabase | 2-3h | Pending Marcel-Live-Test |
| H-26 | Register-Flow Supabase signUp | 2h | Backlog |
| H-27 | Password-Reset Supabase resetPasswordForEmail | 1h | Backlog |
| H-28 | Netlify Identity Service deaktivieren | 0.5h | Backlog (post H-25/26/27) |
| H-29 | 2FA-Pflicht-Banner auch in App (nicht nur Admin) | 1h | Optional |
| H-30 | Force-Re-Auth bei AAL-Downgrade | 1h | Edge-Case |

---

## Acceptance-Kriterien O4

- [x] Architektur-Plan dokumentiert
- [x] 2FA-Pflicht im admin-auth-guard.js
- [x] AAL-Claim durchgereicht
- [x] UI-Hint im Cockpit
- [x] Notfall-Schalter via ENV
- [ ] app-login.html Cutover → Pending Marcel-Test (BACKLOG H-25)
- [ ] Netlify Identity raus → BACKLOG (H-26/27/28)
- [x] H-25 dokumentiert in BACKLOG

---

*Sprint O4, MEGA-MEGA-MEGA, 03.05.2026 abend.*
