# Audit 5 — Input-Validation

**Datum:** 02.05.2026 (Sprint S6 Phase 2)
**Auditor:** Claude Code
**Methodik:** grep-Survey + manuelle Inspektion 31 Functions

---

## Executive Summary

| Status | Anzahl | % |
|---|---:|---:|
| **Vollständig validiert** | 3 | 10 % |
| **Teilweise validiert** | 13 | 42 % |
| **Minimal validiert** | 9 | 29 % |
| **Nicht validiert** | 6 | 19 % |
| **TOTAL** | 31 | 100 % |

**Schema-Library:** **keine** (Joi/Zod/Ajv/Yup nicht installiert) — bestätigt ASVS-V2.1.2 FAIL.

**CRITICAL:** keine Findings (SQL-Injection nicht möglich dank Supabase-Parameterisierung)
**HIGH:** 5 Functions (siehe unten)
**MEDIUM:** 8 Functions
**NEEDS-MARCEL:** Architektur-Entscheidung Schema-Library (Joi vs. Zod vs. manuell)

---

## Pattern-Survey-Tabelle (alle 25 Functions mit body-parse)

| # | Function | Email-Val | UUID-Val | Max-Length | Pseudo | Schema | Severity |
|---:|---|:-:|:-:|:-:|:-:|:-:|---|
| 1 | admin-auth | ❌ | ❌ | ❌ | ❌ | ❌ | MEDIUM |
| 2 | admin-cache-clear | ❌ | ❌ | ❌ | ❌ | ❌ | LOW (Founder-only) |
| 3 | akte-export | ❌ | ❌ | ❌ | ❌ | ❌ | **HIGH** (Word-Doc XSS-Risk) |
| 4 | audit-log | ❌ | ❌ | ✅ (5) | ❌ | ❌ | MEDIUM |
| 5 | auth-token-issue | ✅ (Email+PW) | ❌ | ✅ (4) | ✅ | ❌ | OK (Tot-Code) |
| 6 | dsgvo-loeschen | ❌ | ❌ | ✅ (1) | ❌ | ❌ | MEDIUM |
| 7 | emails | ❌ | ❌ | ❌ | ❌ | ❌ | **HIGH** (Webhook-Forwarder) |
| 8 | error-log | ❌ | ❌ | ✅ (5) | ❌ | ❌ | LOW (akzeptiert grobes JSON) |
| 9 | foto-anlage-pdf | ❌ | ❌ | ❌ | ❌ | ❌ | **HIGH** (PDFMonkey-Cost) |
| 10 | foto-captioning | ❌ | ❌ | ✅ (1) | ❌ | ❌ | MEDIUM |
| 11 | foto-upload | ❌ | ❌ | ✅ (3) | ❌ | ❌ | **HIGH** (File-Upload) |
| 12 | invite-user | ❌ | ❌ | ❌ | ❌ | ❌ | **HIGH** (Email+Tot-Code) |
| 13 | ki-proxy | ❌ | ❌ | ✅ (5) | ✅ | ❌ | OK (Pseudo+Output-JSON) |
| 14 | ki-statistik | ❌ | ❌ | ✅ (1) | ❌ | ❌ | LOW (read-only) |
| 15 | normen-picker | ❌ | ❌ | ✅ (2) | ❌ | ❌ | MEDIUM |
| 16 | pdf-proxy | ❌ | ❌ | ✅ (1) | ❌ | ❌ | MEDIUM |
| 17 | provision-sv | ❌ | ❌ | ✅ (4) | ❌ | ❌ | LOW (Internal-Secret-protected) |
| 18 | push-notify | ❌ | ❌ | ✅ (3) | ❌ | ❌ | MEDIUM |
| 19 | smtp-credentials | ❌ | ❌ | ✅ (1) | ❌ | ❌ | MEDIUM (Bankdaten-Read-Write) |
| 20 | smtp-senden | ❌ | ❌ | ❌ | ❌ | ❌ | **HIGH** (Empfänger ungeprüft → Spam) |
| 21 | stripe-checkout | ❌ | ❌ | ✅ (2) | ❌ | ❌ | MEDIUM (price_id ungeprüft) |
| 22 | stripe-portal | ❌ | ❌ | ❌ | ❌ | ❌ | LOW (Stripe-API) |
| 23 | team-interest | ❌ | ❌ | ❌ | ❌ | ❌ | MEDIUM (Public-Form) |
| 24 | termin-reminder | ❌ | ❌ | ❌ | ❌ | ❌ | LOW (Cron-secret) |
| 25 | whisper-diktat | ❌ | ❌ | ✅ (3) | ✅ | ❌ | OK (Pseudo+Audio-Limit) |

**Top-5 unvalidierte HIGH-Functions** (in BACKLOG mit konkreten Empfehlungen):

---

## HIGH-Findings

### IV-01 HIGH — `emails.js` (Webhook-Forwarder ohne Validation)

**Risiko:** body wird **komplett** zu Make.com-Webhook weitergeleitet ohne Validierung von:
- Empfänger-Email (CRLF-Injection-Vektor wenn Make.com nicht selbst validiert)
- Subject-Length (DoS-Risk wenn 1MB-String)
- typ-Whitelist OK, aber alle anderen Felder pass-through

**Fix-Vorschlag:**
```js
const ALLOWED_TYPES = ['willkommen', 'trial_erinnerung', 'kauf_bestaetigung', 'support'];
const { typ, email, subject = '', body: msgBody = '' } = body;
if (!ALLOWED_TYPES.includes(typ)) return { statusCode: 400, ... };
if (email && !isValidEmail(email)) return { statusCode: 400, ... };
if (subject.length > 200) return { statusCode: 400, ... };
if (msgBody.length > 10000) return { statusCode: 400, ... };
// CRLF-Injection-Schutz:
if (subject.includes('\r') || subject.includes('\n')) return { statusCode: 400, ... };
```

**Severity:** HIGH

---

### IV-02 HIGH — `smtp-senden.js` (kein Empfänger-Format-Check)

**Risiko:**
- `to`-Feld ungeprüft → CRLF-Injection-Vektor (siehe Audit 6 nodemailer-Vuln, jetzt gefixt durch Upgrade)
- `subject` length unlimited → DoS-Risk
- Multiple-Recipient-Support? Falls ja, Spam-Vektor

**Fix-Vorschlag:**
```js
const { to, subject, text, html, az } = body;
if (!isValidEmail(to)) return { statusCode: 400, ... };
if (subject.length > 200) return { statusCode: 400, ... };
if ((text || html || '').length > 100000) return { statusCode: 400, ... };
if (subject.includes('\r') || subject.includes('\n')) return { statusCode: 400, ... };
// Single-Recipient-Only:
if (Array.isArray(to) || to.includes(',') || to.includes(';')) return { statusCode: 400, ... };
```

**Severity:** HIGH

---

### IV-03 HIGH — `invite-user.js` (Email + paket ungeprüft)

**Risiko:**
- Email ungeprüft → kann beliebige Strings enthalten
- `paket` akzeptiert beliebige Werte (sollte enum: 'Solo', 'Team', 'Founding')
- Function ist **Tot-Code post-K-1.5** (nutzt Netlify Identity API)

**Fix-Vorschlag:**
```js
const ALLOWED_PAKETE = ['Solo', 'Team', 'Founding'];
const { email, name, paket = 'Solo' } = body;
if (!isValidEmail(email)) return { statusCode: 400, ... };
if (!ALLOWED_PAKETE.includes(paket)) return { statusCode: 400, ... };
if (name && (typeof name !== 'string' || name.length > 100)) return { statusCode: 400, ... };
```

**Empfehlung:** wie auth-token-issue — **Function löschen** (Tot-Code) ist primärer Fix-Pfad.

**Severity:** HIGH

---

### IV-04 HIGH — `akte-export.js` (Word-Doc XSS-Risk)

**Risiko:**
- body wird in RTF-Template gerendert
- Wenn body-Strings RTF-Steuerzeichen enthalten (`{`, `}`, `\`) → RTF-Injection
- z.B. body.fall.objekt = `\f0\fs1024 PWNED` würde Schriftgröße umstellen
- Output ist Word-Doc → User öffnet → User-Computer-Risiko

**Fix-Vorschlag:**
```js
function rtfEscape(s) {
  if (!s) return '';
  return String(s).replace(/[\\{}]/g, '\\$&').slice(0, 10000);
}
// Bei jedem body-Field das ins RTF geht:
const safeAz = rtfEscape(body.az);
const safeName = rtfEscape(body.sv_name);
```

**Severity:** HIGH

---

### IV-05 HIGH — `foto-upload.js` (MIME-Type-Whitelist fehlt)

**Risiko:** mediaType wird vom Frontend mitgesendet, ungeprüft im Storage gespeichert. Polyglot-Files (PDF mit JS, gefakte image/jpeg) werden nicht erkannt.

**Fix-Vorschlag:**
```js
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
if (!ALLOWED_MIME.includes(mediaType)) return { statusCode: 400, ... };
// Magic-Bytes-Check (erste 4 Bytes prüfen):
const sig = buffer.slice(0, 4);
const isJpeg = sig[0] === 0xFF && sig[1] === 0xD8;
const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47;
const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
if (!isJpeg && !isPng && !isWebp) return { statusCode: 400, error: 'Datei-Typ nicht erlaubt' };
```

**Severity:** HIGH (Audit 12 Phase 4 erweitert)

---

### IV-06 HIGH — `foto-anlage-pdf.js` (kein Limit auf Foto-Anzahl)

**Risiko:** PDFMonkey-Cost. Wenn body.fotos[] = [array of 1000 photos] → 1000 PDF-Pages → $10+ Kosten.

**Fix-Vorschlag:**
```js
const fotos = Array.isArray(body.fotos) ? body.fotos : [];
if (fotos.length > 50) return { statusCode: 400, error: 'Max 50 Fotos pro PDF' };
```

**Severity:** HIGH

---

## MEDIUM-Findings

| ID | Function | Empfehlung |
|---|---|---|
| IV-07 | admin-auth | Password-Length-Check (8-256) explizit |
| IV-08 | dsgvo-loeschen | confirm-Token (Re-Auth) statt nur `confirm: true` |
| IV-09 | normen-picker | schadensart Whitelist (oder Length-Limit 100) |
| IV-10 | pdf-proxy | URL-Whitelist für Source-PDFs |
| IV-11 | push-notify | Subscription-Endpoint URL-Validation |
| IV-12 | smtp-credentials | IBAN/BIC-Format (oder zumindest Length+Charset) |
| IV-13 | stripe-checkout | price_id Whitelist gegen prova-stripe-prices.js |
| IV-14 | team-interest | Email-Format + Honeypot-Field |

---

## Schema-Library Architektur-Entscheidung (NEEDS-MARCEL)

**Status quo:** ad-hoc Validation in jeder Function, ~15% Code-Duplikation.

**Optionen:**

### Option A — `joi` (npm-Package, Industry-Standard)
- ~125kB gzipped
- Reife API, große Community
- Beispiel:
```js
const Joi = require('joi');
const emailSchema = Joi.object({
  email: Joi.string().email().max(254).required(),
  name: Joi.string().max(100).optional()
});
const { error, value } = emailSchema.validate(body);
```

### Option B — `zod` (TypeScript-first, modern)
- ~14kB gzipped
- TypeScript-Inferenz hervorragend (für zukünftige TS-Migration)
- Beispiel:
```js
const z = require('zod');
const schema = z.object({
  email: z.string().email().max(254),
  name: z.string().max(100).optional()
});
const result = schema.safeParse(body);
```

### Option C — manueller Validator-Helper (bestehender Pfad)
- `lib/auth-validate.js` ausbauen mit `validateBody(schema, body)`-Funktion
- 0kB Library, alles unter PROVA-Kontrolle
- Aber: Code-Aufwand pro Function

**Meine Empfehlung:** **Option B (zod)** — TypeScript-Inferenz ist zukunftsfähig, klein in Bundle-Size, modern. Marcel-Entscheidung.

→ NACHT-PAUSE-File **NICHT** geschrieben weil das eine Architektur-Frage für den Folge-Sprint ist, nicht akut blockierend.

---

## Findings → BACKLOG

| ID | Severity | Function | Action |
|---|---|---|---|
| IV-01 | HIGH | emails | Empfänger + typ-Whitelist + Length-Limits |
| IV-02 | HIGH | smtp-senden | Empfänger-Format + CRLF-Schutz |
| IV-03 | HIGH | invite-user | Email-Format + paket-Whitelist (oder Function löschen) |
| IV-04 | HIGH | akte-export | RTF-Escape gegen Injection |
| IV-05 | HIGH | foto-upload | MIME-Whitelist + Magic-Bytes-Check |
| IV-06 | HIGH | foto-anlage-pdf | Foto-Anzahl-Limit |
| IV-07..14 | MEDIUM | (siehe Tabelle) | Sprint 7+ |
| IV-Arch | NEEDS-MARCEL | repo-weit | Schema-Library (zod empfohlen) |

---

## Beobachtungen positiv

- **SQL-Injection ausgeschlossen:** alle DB-Calls via Supabase-Client (parameterisiert) oder Airtable-API (filterByFormula mit escapeen wo nötig)
- **XSS-Schutz dort wo gerendert:** `lib/auth-validate.js` `escapeHtml()` vorhanden
- **Pseudonymisierung:** auf KI-Pfaden vorbildlich
- **Auth-Wrapper:** `requireAuth` durchgängig verwendet wo nötig

---

*Audit 5 abgeschlossen 02.05.2026 nacht*
