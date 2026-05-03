# Audit 16 — DSGVO-Dataflow-Audit

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Vergleich `docs/audit/DSGVO-DATAFLOW.md` mit Code-Realität

---

## Konsistenz-Check Doku vs. Code

| Datenfluss laut Doku | Code-Verifikation | Status |
|---|---|---|
| Frontend → Netlify Functions (TLS 1.3) | `netlify.toml` HSTS, CSP `default-src 'self'` | ✅ |
| Functions → Supabase (Service-Role) | `lib/data-store.js`, Webhook-Functions | ✅ |
| Pseudonymisierung vor OpenAI | `ki-proxy.js:132 pseudonymizeBody()`, `whisper-diktat.js` | ✅ |
| Audit-Trail jede sicherheitsrelevante Aktion | `lib/auth-resolve.js logAuthFailure`, `stripe-webhook.js auditLog` | ⚠️ teilweise — siehe Audit 15 |
| Stripe-Webhook-Verify | `stripe-webhook.js:407 stripe.webhooks.constructEvent` | ✅ |
| KI-Reverse-Mapping NICHT gespeichert | grep-Verifikation: keine Reverse-Map-Speicherung im Code | ✅ |

---

## Nicht-dokumentierte Datenflüsse (gefunden)

### 1. Whisper-Audio direkter Pfad
**Beobachtung:** Audio wird NICHT pseudonymisiert vor OpenAI Whisper (technisch unmöglich — Whisper braucht Audio).

**Doku-Lücke:** `DSGVO-DATAFLOW.md` erwähnt das, aber nicht prominent genug.

**Fix:** in DSE-Sektion 5.3 ergänzt — Klartext-Hinweis dass Audio bei OpenAI transient verarbeitet wird.

**Severity:** LOW (Doku-Update vorhanden)

### 2. Stripe-Customer-Email-Roundtrip
**Beobachtung:** Stripe-Webhook holt Customer-Email via `stripe.customers.retrieve()` zurück → Email wird Cross-Service zwischen Stripe und Supabase gemappt.

**Doku-Status:** im Stripe-Datenfluss-Sequenz-Diagramm dokumentiert (DSGVO-DATAFLOW.md).

**Severity:** OK

### 3. Foto-Captioning-Bilder enthalten potentiell PII
**Beobachtung:** `foto-captioning.js` sendet Schadensbilder an OpenAI Vision. Bilder können Klartext-Schilder, Personen, Adressen enthalten.

**Doku-Status:** in DSGVO-DATAFLOW.md Sektion „Bekannte DSGVO-Restrisiken" dokumentiert.

**Severity:** LOW (dokumentiert + DPA OpenAI mitigiert)

---

## Findings

### LOW-1 — Whisper-Audio-Disclaimer in Onboarding

**Empfehlung:** im Onboarding-Flow expliziten Hinweis:
> "Beim Diktat werden Audio-Inhalte vorübergehend an OpenAI (Ireland Ltd.) übertragen für die Transkription. Die transkribierten Texte werden danach pseudonymisiert. OpenAI speichert API-Audio nicht (Default seit März 2023)."

**Severity:** LOW (Transparenz, nicht Compliance-blocker)

### LOW-2 — Foto-Captioning Hinweis

**Empfehlung:** UI-Hinweis bei erstem Foto-Upload:
> "Tipp: bitte stellen Sie sicher dass Schadensfotos keine Klartext-Schilder mit Adressen oder Personen-Namen enthalten."

**Severity:** LOW

---

## Konsistenz-Bewertung

**Gesamt:** **GUT** — Doku stimmt mit Code-Realität überein. 2 LOW-Findings sind UI-Hinweise, keine Compliance-Lücken.

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| DA-01 | LOW | Whisper-Audio-Disclaimer im Onboarding | Folge-Sprint UI |
| DA-02 | LOW | Foto-Upload Klartext-PII-Hinweis | Folge-Sprint UI |

---

*Audit 16 abgeschlossen 03.05.2026*
