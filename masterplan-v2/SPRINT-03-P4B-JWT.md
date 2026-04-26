# SPRINT 03 — P4B Function-JWT + Rate-Limit

**Tag:** 3 · **Aufwand:** 3-4h · **Phase:** A Security-Fundament

---

## Ziel
Alle Netlify-Functions verlangen gültigen Auth-Token (außer öffentliche). Rate-Limiting pro User-Email.

---

## Scope

**JWT-Pflicht für:**
- ki-proxy.js (war öffentlich!)
- foto-captioning.js
- whisper-diktat.js
- foto-upload.js
- push-notify.js (Origin-Beschränkung statt JWT)
- alle anderen Functions die SV-Daten verarbeiten

**Öffentlich bleiben:**
- health.js
- auth-token-issue.js (logisch — Login)
- stripe-webhook.js (HMAC-signiert, anderer Mechanismus)
- identity-signup.js (Registrierung)

**Rate-Limit:**
- Pro User-Email (aus Token), nicht pro IP
- Standard: 60 Calls/Min
- KI-Endpunkte: 20 Calls/Min (teurer)
- Whisper: 10 Calls/Min (sehr teuer)

---

## Prompt für Claude Code

```
PROVA Sprint 03 — P4B Function-JWT + Rate-Limit (Tag 3)

Pflicht-Lektüre vor Start:
- CLAUDE.md
- AUDIT-REPORT.md Findings 1.2, 4.4
- lib/auth-token.js (aus Sprint 02)
- airtable-rate-limiter.js (existiert bereits, von v98)


SCOPE
=====

Commit 1: lib/jwt-middleware.js
- exports.requireAuth(handler) → wraps Function-Handler
- Liest Authorization: Bearer <token> Header
- Verify via AuthToken.verify
- Bei valid: ruft handler mit context.user = payload
- Bei invalid: 401 mit { error: "Authentifizierung erforderlich" }

Commit 2: lib/rate-limit-user.js
- In-Memory Map (Function-Instance-bound, OK für Netlify-Cold-Starts)
- exports.check(userEmail, max, windowSec) → boolean
- Bei Überschreitung: 429 + Retry-After-Header

Commit 3: ki-proxy.js JWT-Pflicht + Rate-Limit
- Wrapped: requireAuth(handler)
- userEmail = context.user.sub
- if (!RateLimit.check(userEmail, 20, 60)) return 429

Commit 4: whisper-diktat.js JWT + 10/Min Limit

Commit 5: foto-captioning.js JWT + 30/Min Limit

Commit 6: foto-upload.js JWT (kein Rate-Limit hier — Airtable selbst limitiert)

Commit 7: push-notify.js Origin-Check
- Allow-List: prova-systems.de, app.prova-systems.de, admin.prova-systems.de
- Bei fremder Origin: 403

Commit 8: airtable.js JWT-Pflicht
- Bisher per Identity-Header — neu auch per AuthToken
- context.user.sub als sv_email für Multi-Tenant-Filter

Commit 9: sw.js v205 → v206 + Authorization-Header in alle fetch-Calls
- prova-pseudo-send.js erweitern: Authorization: Bearer ${localStorage.prova_auth_token}
- bei 401-Response: localStorage clear, redirect /app-login.html


QUALITÄTSKRITERIEN
==================
- Alle Functions die JWT erwarten haben "Authorization required" als Error wenn fehlend
- Rate-Limit-Errors enthalten Retry-After
- Origin-Block enthält keinen Hint warum (Security)
- Marcel kann normal weiterarbeiten (Token automatisch im Header)


TESTS
=====
- curl ohne Token auf ki-proxy → 401
- curl mit gefälschtem Token → 401
- curl mit Marcel-Token → 200
- 21 schnelle ki-proxy-Calls aus Browser → 21. ist 429
- Origin-fremder Call zu push-notify → 403


ACCEPTANCE
==========
1. Alle 6+ Functions haben requireAuth-Wrap
2. Curl-Tests grün (oben)
3. Marcel browser-test: alles funktioniert wie vorher
4. Airtable AUDIT_TRAIL zeigt 401-Versuche (für späteres Monitoring)


COMMITS
=======
"S-SICHER P4B.1: lib/jwt-middleware + rate-limit-user"
"S-SICHER P4B.2: ki-proxy JWT + Rate-Limit 20/Min"
"S-SICHER P4B.3: whisper-diktat JWT + 10/Min"
"S-SICHER P4B.4: foto-captioning JWT + 30/Min"
"S-SICHER P4B.5: foto-upload JWT"
"S-SICHER P4B.6: push-notify Origin-Check"
"S-SICHER P4B.7: airtable.js JWT-Pflicht"
"S-SICHER P4B.8: prova-pseudo-send mit Authorization-Header"
"S-SICHER P4B.9: sw.js v206"
```

---

## Marcel-Browser-Test (5 Min)

1. Login + Dashboard öffnen → DevTools → Network: alle Function-Calls haben `Authorization: Bearer ...`
2. Manuell Token in localStorage löschen → 401 → Auto-Redirect zu Login
3. Bewusst 25× hintereinander KI-Anfrage → 21. zeigt "Bitte warten, zu viele Anfragen"

---

## Tag

`v180-ssicher-p4b-done`
