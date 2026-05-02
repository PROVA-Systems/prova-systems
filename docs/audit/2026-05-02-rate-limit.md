# Audit 4 — Rate-Limit-Audit

**Datum:** 02.05.2026 (Sprint S6 Phase 2)
**Auditor:** Claude Code
**Methodik:** grep über alle 31 Functions + manuelle Inspektion

---

## Executive Summary

| Kategorie | Coverage | Status |
|---|---:|---|
| KI-Endpoints | 3/3 | ✅ |
| Auth-Endpoints | 0/2 | ❌ **CRITICAL** |
| File-Upload-Endpoints | 1/2 | ⚠️ |
| Public/Marketing-Endpoints | 2/2 | ✅ |
| Email-Versand | 0/2 | ❌ HIGH |
| PDF-Generation | 0/2 | ❌ HIGH |
| DSGVO-Endpoints | 0/2 | ❌ HIGH (Abuse-Schutz) |
| Admin-Endpoints | 0/3 | ❌ HIGH |
| Sonstige | 0/15 | gemischt (oft N/A) |

**Total mit Rate-Limit:** 6 / 31 (19%)

**CRITICAL-Finding:** `auth-token-issue` (Login-Endpoint) hat **kein** Rate-Limit → Brute-Force-Vulnerable.

---

## Coverage-Tabelle (alle 31 Functions)

| # | Function | Auth-Required | Rate-Limit | Limit-Wert | Window | Bewertung |
|---:|---|---|---|---|---|---|
| 1 | admin-auth | ❌ public-via-Identity | ❌ | — | — | **HIGH-RISK** Brute-Force |
| 2 | admin-cache-clear | ✅ requireAuth | ❌ | — | — | LOW (Founder-only) |
| 3 | akte-export | ✅ requireAuth | ❌ | — | — | MEDIUM |
| 4 | audit-log | ✅ requireAuth | ❌ | — | — | LOW (User schreibt eigene Logs) |
| 5 | **auth-token-issue** | ❌ public (LOGIN) | ❌ | — | — | **🔴 CRITICAL** Brute-Force-Vulnerable |
| 6 | dsgvo-auskunft | ✅ requireAuth | ❌ | — | — | HIGH (Abuse-Schutz, DB-teure Query) |
| 7 | dsgvo-loeschen | ✅ requireAuth | ❌ | — | — | HIGH (Abuse-Schutz, destruktiv) |
| 8 | emails | ✅ requireAuth | ❌ | — | — | HIGH (Spam-Vektor) |
| 9 | error-log | ❌ public | ✅ IP-basiert | 10 | 60s | ✅ |
| 10 | foto-anlage-pdf | ✅ requireAuth | ❌ | — | — | HIGH (Cost-Risk) |
| 11 | **foto-captioning** | ✅ requireAuth | ✅ User-basiert | **30** | 60s | ✅ |
| 12 | foto-upload | ✅ requireAuth | ❌ | — | — | HIGH (File-Flooding) |
| 13 | health | ❌ public | ❌ | — | — | LOW (idempotent) |
| 14 | invite-user | ✅ requireAuth | ❌ | — | — | HIGH (Spam-Invite-Vektor) |
| 15 | **ki-proxy** | ✅ requireAuth | ✅ User-basiert | **20** | 60s | ✅ |
| 16 | ki-statistik | ✅ requireAuth | ❌ | — | — | LOW |
| 17 | make-proxy | ✅ requireAuth | ❌ | — | — | MEDIUM |
| 18 | mein-aktivitaetsprotokoll | ✅ requireAuth | ❌ | — | — | LOW (read-only) |
| 19 | normen | ❌ public | ❌ | — | — | LOW (cached, public) |
| 20 | normen-picker | ❌ public | ❌ | — | — | MEDIUM (KI-Cost-Risk im smart-mode) |
| 21 | pdf-proxy | ✅ requireAuth | ❌ | — | — | HIGH (Cost-Risk PDFMonkey) |
| 22 | provision-sv | ❌ public-internal | ❌ | — | — | MEDIUM (PROVA_INTERNAL_SECRET-protected) |
| 23 | push-notify | ✅ requireAuth | ❌ | — | — | LOW |
| 24 | smtp-credentials | ✅ requireAuth | ❌ | — | — | MEDIUM (read-write Konto-Daten) |
| 25 | smtp-senden | ✅ requireAuth | ❌ | — | — | **HIGH** (Spam-Versand-Vektor) |
| 26 | stripe-checkout | ✅ requireAuth | ❌ | — | — | MEDIUM |
| 27 | stripe-portal | ✅ requireAuth | ❌ | — | — | LOW (read-only Stripe-Portal) |
| 28 | stripe-webhook | ❌ Stripe-signed | ❌ | — | — | N/A (Stripe-Signature) |
| 29 | team-interest | ❌ public | ✅ IP-basiert | 10 | 60s | ✅ |
| 30 | termin-reminder | ❌ Cron-secret | ❌ | — | — | N/A (geheim) |
| 31 | **whisper-diktat** | ✅ requireAuth | ✅ User-basiert | **10** | 60s | ✅ |

---

## Findings

### CRITICAL-1 — `auth-token-issue` ohne Rate-Limit

**Function:** `netlify/functions/auth-token-issue.js`
**Status:** Login-Endpoint, public-callable
**Risiko:** Brute-Force-Angriff auf User-Passwörter unbegrenzt möglich

**Beweis:**
```bash
# Angreifer kann unbegrenzt loops:
for i in {1..10000}; do
  curl -X POST https://app.prova-systems.de/.netlify/functions/auth-token-issue \
    -d '{"email":"victim@example.com","password":"guess'$i'"}' \
    -H "Content-Type: application/json"
done
```

**Aktuelle Mitigation:** keine. Netlify-Edge hat keine globale DDoS-Protection für Functions.

**Wichtiger Kontext:** `auth-token-issue` ist Tot-Code post-Voll-Cleanup-Sprint:
- nutzt Netlify Identity (`grant_type=password`) — bereits durch Voll-Supabase-Migration ersetzt
- nutzt Airtable für SV-Lookup — ENV-Vars werden Marcel noch löschen
- moderne Login: `auth-supabase-logic.js` direkt mit Supabase Auth (nicht über diese Function)

**Empfehlung (Marcel-Entscheidung):**

**Option A — Function löschen (empfohlen):**
- Function ist Legacy, Browser nutzt sie nicht mehr
- Marcel: prüfen ob noch wer aufruft (Server-Logs `[auth-token-issue]`)
- Wenn niemand: Function aus `netlify/functions/` löschen → instant fix

**Option B — Rate-Limit ergänzen (falls Function bleibt):**
- 5 Versuche / 15 Min / IP (klassisches Login-Brute-Force-Limit)
- Sofort-Fix-Code:
```js
// Vor body-parse:
const ip = (event.headers['x-nf-client-connection-ip'] || 'unknown').toString();
// In-Memory-Bucket pro IP:
const RL_BUCKET = global._authBucket = global._authBucket || new Map();
const now = Date.now();
const key = ip;
const bucket = RL_BUCKET.get(key) || { count: 0, windowStart: now };
if (now - bucket.windowStart > 15 * 60 * 1000) {
  bucket.count = 0; bucket.windowStart = now;
}
if (bucket.count >= 5) {
  return j(event, 429, { error: 'Zu viele Login-Versuche. Bitte 15 Min warten.' });
}
bucket.count++;
RL_BUCKET.set(key, bucket);
```

**Severity:** **CRITICAL**
**Phase-2-Action:** **NEEDS-MARCEL** — Marcel-Entscheidung A oder B (NACHT-PAUSE-File geschrieben)

---

### HIGH-1 — `admin-auth` ohne Rate-Limit

**Function:** `netlify/functions/admin-auth.js`
**Risiko:** bcrypt-Brute-Force gegen Admin-Passwort. bcrypt ist langsam (Schutz-Feature) aber 10.000 Versuche pro Tag wären machbar.

**Mitigation aktuell:** bcrypt-Slowness ist primärer Schutz. Aber Defense-in-Depth fehlt.

**Empfehlung:**
- 5 Versuche / 15 Min / IP — analog zu auth-token-issue
- Nach 5 Failures: 1 Stunde Lockout (Marcel-Entscheidung: lockout pro IP oder pro User-Account)

**Severity:** **HIGH**
**Action:** in BACKLOG (Marcel-Pflicht: 2FA für Admin-Account ist parallel-Mitigation)

---

### HIGH-2 — `dsgvo-auskunft` und `dsgvo-loeschen` ohne Rate-Limit

**Functions:**
- `dsgvo-auskunft.js` — exportiert User-Daten als JSON (DB-teure Query)
- `dsgvo-loeschen.js` — destruktiver Lösch-Workflow

**Risiko:**
- Abuse-Vektor: User triggert 100× DSGVO-Auskunft → DB-Performance-Degradation
- Abuse-Vektor: User-versehentliche Mehrfach-Löschung (Race-Condition)

**Empfehlung:**
- `dsgvo-auskunft`: 5 Calls / Tag / User (DSGVO-Auskunft-Frequenz)
- `dsgvo-loeschen`: 1 Call / Tag / User + Confirmation-Token

**Severity:** **HIGH**
**Action:** BACKLOG, Phase 4 (mit DSGVO-Pflicht-Audit) verbinden

---

### HIGH-3 — `smtp-senden` ohne Rate-Limit

**Function:** `smtp-senden.js`
**Risiko:** authentifizierter User kann unbegrenzt Mails über SV-eigenes SMTP-Konto versenden → Spam-Vektor (User-IP, SV-Reputation).

**Mitigation aktuell:** SMTP-Provider (IONOS) hat eigene Limits, aber PROVA-Function-Layer hat keine.

**Empfehlung:**
- 50 Mails / Stunde / User
- 200 Mails / Tag / User

**Severity:** **HIGH**
**Action:** BACKLOG

---

### HIGH-4 — `foto-anlage-pdf` und `pdf-proxy` ohne Rate-Limit

**Risiko:** PDFMonkey-Cost-Flooding. Pro PDF ~$0.01 — 1.000 PDFs/Stunde = $10/h Cost-Burn-Risk.

**Empfehlung:**
- `foto-anlage-pdf`: 20 Calls / Stunde / User (max ~50 Fotos × 20 Calls = 1000 PDFs/Tag akzeptabel)
- `pdf-proxy`: 100 Calls / Stunde / User (read-only, weniger Cost-Risk)

**Severity:** **HIGH**
**Action:** BACKLOG

---

### HIGH-5 — `foto-upload` ohne Rate-Limit

**Risiko:** Storage-Flooding. Pro Upload ~10MB → 100 Uploads/Min = 1GB/Min → Supabase-Storage-Quote-Verbrauch.

**Empfehlung:**
- 30 Uploads / Stunde / User
- 100 Uploads / Tag / User

**Severity:** **HIGH**
**Action:** BACKLOG (zusammen mit Audit 12 Phase 4)

---

### HIGH-6 — `invite-user` ohne Rate-Limit

**Risiko:** Spam-Invite-Vektor. User invitiert 1000× E-Mail-Adressen → Mail-Server-Reputation.

**Empfehlung:**
- 10 Invites / Stunde / User
- 50 Invites / Tag / User

**Severity:** **HIGH**
**Action:** BACKLOG

---

### MEDIUM-1 — `emails`, `make-proxy`, `akte-export` ohne Rate-Limit

Ähnliche Pattern, aber weniger akut. In Backlog für Sprint 7+.

---

## Beobachtungen zu vorhandenen Rate-Limits

### `lib/rate-limit-user.js` (ki-proxy, whisper, foto-captioning)

✅ **Stark:**
- In-Memory-Map pro Function-Instance (kein DB-Hit)
- Per-User-Bucket (Token-sub als Key)
- Sliding-Window (60s)
- Auto-GC nach 5 Min
- AUDIT_TRAIL bei Hit (via `logAuthFailure`)

⚠️ **Schwächen:**
- **Per-Instance Soft-Limit:** Netlify-Lambdas cold-starten oft, mehrere parallele Instances teilen sich nicht den Counter → Angreifer mit 5 parallelen Instances kann 5× das Limit hitten
- **Keine harte Quota:** Tagesquotas pro User fehlen — bei skalierender Pilot-Phase nötig

**Empfehlung für Sprint xx:**
- Redis (Upstash) oder Postgres-Counter für harte Multi-Instance-Quotas
- `ki_protokoll` aggregiert pro User pro Tag — Soft-Block bei Schwellwert

### `error-log.js` (IP-basiert)

✅ Solide IP-basiert. 10/min/IP ist ausreichend für Frontend-Error-Reporting.

### `team-interest.js` (IP-basiert, ENV-konfigurierbar)

✅ ENV-konfigurierbar (`TEAM_INTEREST_RATE_LIMIT_IP_PER_MIN`) — flexibel.

---

## Pflicht-Coverage-Vergleich (Sprint-Prompt vs. Stand)

| Pflicht-Coverage | Stand |
|---|---|
| Auth-Endpoints: 5 / 15 Min / IP | ❌ KEIN Login-Rate-Limit |
| KI-Endpoints: 50 Calls / Tag / User | ⚠️ Pro-Min vorhanden, Pro-Tag fehlt |
| PDF-Generate: 100 / Tag / User | ❌ kein Rate-Limit |
| File-Upload: 10 / Min / User | ⚠️ whisper ja, foto-upload nein |
| Public/Marketing: aggressiv | ✅ team-interest ja |

---

## Findings → BACKLOG

| ID | Severity | Function | Empfehlung |
|---|---|---|---|
| RL-01 | **CRITICAL** | auth-token-issue | NEEDS-MARCEL: Function löschen ODER Rate-Limit |
| RL-02 | HIGH | admin-auth | 5 / 15 Min / IP + Lockout |
| RL-03 | HIGH | dsgvo-auskunft | 5 / Tag / User |
| RL-04 | HIGH | dsgvo-loeschen | 1 / Tag / User + Confirmation |
| RL-05 | HIGH | smtp-senden | 50 / Stunde / User |
| RL-06 | HIGH | foto-anlage-pdf | 20 / Stunde / User |
| RL-07 | HIGH | pdf-proxy | 100 / Stunde / User |
| RL-08 | HIGH | foto-upload | 30 / Stunde / User |
| RL-09 | HIGH | invite-user | 10 / Stunde / User |
| RL-10 | MED | emails | 100 / Stunde / User |
| RL-11 | MED | make-proxy | 50 / Stunde / User |
| RL-12 | MED | akte-export | 10 / Stunde / User |
| RL-13 | MED | normen-picker (smart-mode) | 30 / Stunde / User (KI-Cost) |
| RL-14 | LOW | KI-Endpoints Tagesquotas | Sprint-xx Redis-basiert |

---

## NEEDS-MARCEL

→ siehe `docs/diagnose/NACHT-PAUSE-S6-NACHT-rate-limit-auth-token-issue.md`

---

*Audit 4 abgeschlossen 02.05.2026 nacht*
