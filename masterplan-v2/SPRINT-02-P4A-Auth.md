# SPRINT 02 — P4A Auth-Fundament

**Tag:** 2 · **Aufwand:** 5-6h · **Phase:** A Security-Fundament

---

## Ziel
Auth-System hat **eine** Quelle der Wahrheit (Backend), Legacy-Migration und fallback-login sind raus, Sessions HMAC-signiert. Schluss mit Hintertüren.

---

## Scope

**In Scope:**
- Legacy-Migration in `auth-guard.js:136-147` **vollständig entfernen**
- `fallback-login` in `app-login-logic.js:259-260` entfernen (Finding 7.1)
- HMAC-Token einführen: `AUTH_HMAC_SECRET` als Netlify ENV, `lib/auth-token.js` mit sign/verify
- `_userEmail`-Body-Bypass in `airtable.js:100-115` entfernen (Finding 1.1)
- E-Mail-Validation + HTML-Escaping (Findings 1.3, 1.5, 7.2)
- Inline-Auth-Guard aus P2.6 vereinfachen (Härte-Check wird teilweise überflüssig)
- Login-Flow: `app-login-logic.js` ruft neue `/.netlify/functions/auth-token-issue` → bekommt HMAC-Token zurück → speichert in localStorage als `prova_auth_token`
- Migration-Path: alle bestehenden Sessions expired, User muss einmal neu einloggen (Marcel-Email vorher!)

**Out of Scope:**
- 2FA für normale User (nur Admin-Cockpit-2FA in Sprint 18)
- Function-JWT-Pflicht → Sprint 3
- Passwort-Reset-Flow überarbeiten → späteres Backlog

---

## Prompt für Claude Code

```
PROVA Sprint 02 — P4A Auth-Fundament (Tag 2)

Pflicht-Lektüre vor Start:
- CLAUDE.md (Regel 4 sw.js, Regel 14 node --check, Regel 1 Multi-Tenant)
- AUDIT-REPORT.md Findings 1.1, 1.3, 1.5, 7.1, 7.2, 7.3
- 03_SYSTEM-ARCHITEKTUR.md Abschnitt "Sicherheits-Schichten"
- auth-guard.js Komplettlesen
- app-login-logic.js Komplettlesen

KONTEXT
=======
Auth heute hat 4 Hintertüren:
1. Legacy-Migration in auth-guard.js:136-147 nimmt jeden alten 'prova_user'-localStorage-Eintrag 
   und macht daraus eine gültige Session (CRITICAL Finding 7.1)
2. fallback-login in app-login-logic.js:259-260 erlaubt Login ohne Backend-Call wenn IDB hat
3. _userEmail in airtable.js:100-115 erlaubt jedem Body, sv_email zu setzen statt aus JWT
4. Keine HMAC-Signatur — Token sind reine localStorage-Strings, fälschbar

Fix: Eine Quelle der Wahrheit (Backend), HMAC-signierte Sessions, alle Hintertüren zu.


SCOPE-COMMITS
=============

Commit 1: AUTH_HMAC_SECRET ENV setzen
- Marcel-Aktion: openssl rand -hex 32 → in Netlify ENV als AUTH_HMAC_SECRET
- Per Netlify-MCP: Tool nutzen wenn möglich, sonst manuelle Anleitung

Commit 2: lib/auth-token.js (Server-Modul)
- exports.sign(payload, ttl_sec) → returns JWT-style HMAC-Token: base64(payload).hmac
- exports.verify(token) → returns payload oder null wenn invalid/expired
- Payload-Schema: { sub: sv_email, sv_id: at_record_id, plan: 'solo'|'team', exp: timestamp }
- TTL: 7 Tage normale Session, 30 Min Admin-Session

Commit 3: netlify/functions/auth-token-issue.js
- POST mit { email, password }
- Validiert via existing Identity (Netlify Identity oder eigenes Schema?)
- Bei Erfolg: payload aus SACHVERSTAENDIGE-Lookup → AuthToken.sign → response { token, sv: {...} }
- Bei Fail: 401, generic message ("E-Mail oder Passwort ungültig" — kein Hint)

Commit 4: auth-guard.js Legacy-Migration entfernen
- Zeilen 136-147 vollständig löschen
- Stattdessen: Wenn kein prova_auth_token in localStorage → redirect /app-login.html
- Mit prova_auth_token: An /.netlify/functions/auth-token-verify schicken
- Bei valid: Session bestätigt, Window-globals setzen (currentSV, etc.)
- Bei invalid: Token + alle prova_*-localStorage-Keys löschen, redirect /app-login.html

Commit 5: app-login-logic.js fallback-login entfernen
- Zeilen 259-260 löschen (fallback-Block)
- Login geht NUR über auth-token-issue
- Bei Erfolg: localStorage.setItem('prova_auth_token', token); + redirect /dashboard.html

Commit 6: airtable.js _userEmail-Bypass entfernen
- Zeilen 100-115: _userEmail aus body löschen (immer)
- sv_email IMMER aus context.clientContext.user oder verifiziertem Token
- Falls JWT noch nicht überall (kommt in Sprint 3): vorerst Fail-Closed wenn kein User

Commit 7: E-Mail-Validation
- Neuer Helper in lib/auth-validate.js
- isValidEmail(str): RFC-5322-ish, max 254 Zeichen
- escapeHtml(str): in alle Server-Templates die User-Input rendern
- Anwendung: alle E-Mail-Inputs in Functions

Commit 8: Marcel-Notfall-Bookmarklet vorher prüfen
- Marcel speichert in Bookmarks: javascript:void(localStorage.setItem('prova_auth_token','EMERGENCY_TOKEN_AUS_NETLIFY_ENV'))
- Falls Login bricht, kann Marcel das nutzen
- Nach erfolgreichem Test wieder löschen

Commit 9: sw.js v204 → v205


QUALITÄTSKRITERIEN
==================
- node --check für alle .js
- HMAC-Verify konstant-zeit (timing-safe-equal aus crypto)
- Keine Klartext-Passwörter in Logs
- Existing Sessions werden invalidiert (CACHE_VERSION-Bump tut den Job)
- Marcel kann sich nach Deploy einloggen — vorher sicherstellen dass bcrypt-Hash für 
  marcel_schreiber891@gmx.de in SACHVERSTAENDIGE.password_hash gesetzt ist


TESTS
=====
- Curl mit gefälschtem Token → /.netlify/functions/airtable → 401
- Versuch _userEmail in Body zu setzen → 400 oder ignored
- Marcel browser-test: Logout → Login → Dashboard erreichbar
- Inkognito + manueller localStorage-Set "prova_user" mit fake-Daten → wird ignoriert, redirect zu Login


ACCEPTANCE
==========
1. AUTH_HMAC_SECRET in Netlify ENV gesetzt
2. auth-token-issue + auth-token-verify deployed und 200
3. auth-guard.js Zeilen 136-147 nicht mehr im Repo
4. app-login-logic.js Zeilen 259-260 nicht mehr im Repo
5. airtable.js: _userEmail wird gelöscht oder ignoriert
6. Marcel logged in → Dashboard funktioniert
7. Gefälschter Token → 401 bei jedem Function-Call


COMMITS
=======
"S-SICHER P4A.1: AUTH_HMAC_SECRET ENV gesetzt"
"S-SICHER P4A.2: lib/auth-token.js HMAC sign/verify"
"S-SICHER P4A.3: auth-token-issue + auth-token-verify Functions"
"S-SICHER P4A.4: Legacy-Migration aus auth-guard.js entfernt (Finding 7.1)"
"S-SICHER P4A.5: fallback-login aus app-login-logic.js entfernt"
"S-SICHER P4A.6: _userEmail-Bypass aus airtable.js entfernt (Finding 1.1)"
"S-SICHER P4A.7: E-Mail-Validation + HTML-Escape Helpers"
"S-SICHER P4A.8: sw.js v205"


PUSH + TAG
==========
git push origin main
git tag v180-ssicher-p4a-done
```

---

## Marcel-Browser-Test (10 Min)

1. **VOR Deploy:** Sicherstellen dass marcel_schreiber891@gmx.de in SACHVERSTAENDIGE einen `password_hash` (bcrypt) hat
2. **Bookmarklet** als Notfall-Token speichern (siehe Commit 8)
3. Nach Deploy: Logout → Login funktioniert
4. Edge Inkognito: `localStorage.setItem('prova_user', '{"email":"hack@test.de"}')` → Refresh → wird redirected zu Login
5. DevTools → `prova_auth_token` ist da, base64+hmac-Format
6. Curl mit altem Token → 401

---

## Rollback

Wenn Marcel nicht mehr einloggen kann: `git reset --hard v180-ssicher-p3-done && git push --force-with-lease`. Bookmarklet nutzen falls auch das fehlschlägt.
