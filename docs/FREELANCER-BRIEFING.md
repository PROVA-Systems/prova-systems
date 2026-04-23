# Freelancer-Briefing · Security-Audit + Pen-Test für PROVA Systems

> **Zweck:** Dieses Dokument gibst Du dem Freelancer bevor er anfängt. Es klärt Scope, Liefergegenstände, Grenzen.
> **Zeitpunkt:** Vor Testpiloten-Onboarding (nach Abschluss aller Claude-Code-Sprints).
> **Budget:** 2.000-3.900€ gesamt (Stufe 1 + Stufe 2 kombiniert: 3-4 Arbeitstage).

---

## Über PROVA Systems

PROVA ist ein B2B-SaaS für öffentlich bestellte Bausachverständige (ö.b.u.v. SV) in Deutschland. Die App verarbeitet:

- **Personenbezogene Daten** (Mandanten, Adressen, Fotos von Baustellen)
- **Sensible Geschäftsdaten** (Gutachten, Rechnungen, Vertragliches)
- **Zahlungsdaten** (via Stripe, aber Session-Info auf unseren Systemen)

**DSGVO-Kritikalität:** Hoch. Jedes Datenleck ist meldepflichtig nach Art. 33 DSGVO.

---

## Tech-Stack (für Reconnaissance)

- **Frontend:** Vanilla JS, HTML5, CSS3 (kein React/Vue)
- **Backend:** Netlify Functions (Node.js)
- **Datenbank:** Airtable (Base `appJ7bLlAHZoxENWE`)
- **Automation:** Make.com (Webhook-Scenarios)
- **PDF:** PDFMonkey
- **Zahlung:** Stripe (Subscription)
- **Email:** IONOS SMTP + Gmail via Make
- **KI:** OpenAI (GPT-4o, Whisper)
- **Hosting:** Netlify (`prova-systems.de`)
- **Auth:** Custom (bcrypt, JWT, TOTP-2FA)

**Tech-Dokumentation:** `docs/INFRASTRUKTUR-REFERENZ.md` im Repo.

---

## Scope — was geprüft werden soll

### Stufe 1 (Tag 1) — Angreifer-Perspektive auf Web-App

Du bekommst 2 Test-Accounts als normale Solo-SV-User:
- `test-sv1@prova-systems.de`
- `test-sv2@prova-systems.de`

**Deine Aufgabe:**
- Versuche mit SV1-Account an Daten von SV2 zu kommen (Multi-Tenant-Bypass)
- Versuche aus Solo-Tarif zu Team-Tarif zu "escapen" (Business-Logic)
- Versuche 2FA zu umgehen
- Versuche Rate-Limiting auszuhebeln (Login, Passwort-Reset)
- Versuche XSS/Injection in allen Input-Feldern
- Versuche via DevTools/Proxy Request-Manipulation
- Teste Session-Hijacking (Token-Theft, CSRF)
- Prüfe Password-Reset-Flow auf Schwachstellen (Enumeration, Token-Wiederverwendung)

### Stufe 2 (Tage 2-3) — Tiefere Infrastruktur-Analyse

**Zusätzlich zur Webapp:**
- Prüfe **Netlify-Konfiguration** (`netlify.toml`, `_redirects`, `_headers`): CSP, HSTS, Referrer-Policy
- Prüfe **Stripe-Webhook** `stripe-webhook.js`: Signatur-Verifizierung, Replay-Attacks, Event-Spoofing
- Prüfe **Make-Scenarios**: sind Webhook-URLs raterbar? Rate-Limiting? Input-Validation?
- Prüfe **PDFMonkey-Integration**: sind PDF-URLs raterbar? Public access ohne Auth?
- Prüfe **IONOS-SMTP-Konfiguration**: SPF, DKIM, DMARC richtig gesetzt? Email-Spoofing möglich?
- Prüfe **OpenAI-Integration** (`ki-proxy.js`): werden Klardaten gesendet? DSGVO-Pseudonymisierung?
- Prüfe **Airtable-Backend** (`airtable.js`): funktioniert Whitelist wirklich? kann API-Bypass passieren?
- Prüfe **Race-Conditions** bei: Stripe-Webhook + Checkout-Success-Page, Passwort-Reset + Login, §6-Bestätigung + PDF-Render
- Prüfe **Timing-Attacks** auf: Login (existierender vs. nicht-existierender User), 2FA-Code-Check

### Was NICHT im Scope ist

- Kein DDoS-Angriff (würde echte User treffen)
- Kein Social Engineering gegen Marcel oder Testpiloten
- Keine Angriffe gegen Airtable/Stripe/OpenAI-Infrastruktur selbst (die haben eigene Pen-Tests)
- Kein physischer Zugriff auf Server (Netlify ist Cloud)

---

## Liefergegenstände

**Am Ende von Stufe 1 (Ende Tag 1):**

`docs/SECURITY-AUDIT-STUFE-1.md` mit:
- Zusammenfassung "Top 3 kritische Findings"
- Vollständige Finding-Liste mit Schweregrad (CVSS v3.1 Score)
- Reproduktions-Steps für jedes Finding
- Empfohlene Behebungs-Maßnahme

**Am Ende von Stufe 2 (Ende Tag 3):**

`docs/SECURITY-AUDIT-STUFE-2.md` mit:
- Infrastruktur-Audit-Ergebnisse (Netlify, Stripe, Make, PDFMonkey, SMTP)
- Business-Logic-Findings
- Race-Condition-/Timing-Analysen
- DSGVO-Bewertung (kritische Punkte aus Sicht der DSGVO-Meldepflicht)
- Priorisierte Behebungs-Roadmap
- **Empfehlung:** "Pilot-ready Ja/Nein/Nach Behebung von X"

**Bonus (optional):**

- Kurzes Call (30 Min) zur Durchsprache der Findings mit Marcel
- Re-Test nach Behebung der kritischen Findings (+ 1 Std)

---

## Zugriff + Test-Umgebung

Du erhältst:
- 2 Test-Accounts (siehe oben)
- Lese-Zugriff auf `/mnt/project/` (kompletter Source Code als ZIP)
- `docs/AUDIT-REPORT.md` (Claude-Code-Audit-Report, bereits vorhanden — Du checkst NICHT was drin ist, sondern suchst was NICHT drin ist)
- Netlify Deploy-URL zum Testen
- (KEINE Stripe Live-Keys, keine ENV-Var-Werte, keine Admin-Zugänge)

**Burp Suite / OWASP ZAP / sqlmap / nmap** gerne. Kein Rate-Limit auf Test-Accounts.

---

## Formale Bedingungen

- **Vertraulichkeit:** NDA wird vor Start unterzeichnet
- **Responsible Disclosure:** Findings gehen AUSSCHLIESSLICH an Marcel, nicht an Dritte, nicht öffentlich
- **Haftung:** Du haftest nicht für Schäden die durch deinen Test entstehen KÖNNTEN (Test-Accounts, keine Produktion)
- **Nach Abschluss:** Alle Test-Daten auf deinen Systemen löschen (Screenshots, Notizen, Logs)

---

## Zeitrahmen

| Tag | Aktivität |
|---|---|
| Tag 0 | NDA, Briefing-Call (30 Min), Zugänge einrichten |
| Tag 1 | Stufe 1 Web-App-Pentest |
| Tag 1 Abend | Report Stufe 1 an Marcel |
| Tag 2 | Stufe 2 Infrastruktur |
| Tag 3 | Stufe 2 Business-Logic + Timing + Race-Conditions |
| Tag 3 Abend | Report Stufe 2 an Marcel |
| Tag 4 (optional) | Call, Re-Test |

---

## Preis

- **Stufe 1:** 500-900€ (1 Tag, 6-8h)
- **Stufe 2:** 1.500-3.000€ (2-3 Tage)
- **Gesamt-Paket:** ab 2.000€ Rabatt bei Kombi, realistisch **2.500-3.500€**

Vorauszahlung: 50% nach NDA, 50% nach Report-Abgabe.

---

## Wo Marcel solche Freelancer findet

### Deutschsprachige Plattformen
- **malt.de** — Suche: "Security Consultant" oder "Pen-Tester"
- **freelance.de** — Suche: "IT-Security"
- **XING ProJobs** — sehr deutsche SV-konform, oft ehemalige Big-4-Consultants

### Internationale Plattformen (englisch, oft günstiger)
- **toptal.com** — geprüfte Qualität, teurer (~1500€/Tag)
- **upwork.com** — große Auswahl, aber Quality-Check nötig
- **codementor.io** — Security-Bereich

### Deutsche Security-Communities
- **CCC-Erfakreise** in Deiner Stadt (Berlin/Hamburg/Köln/München)
- **DACHsec Slack** — deutschsprachige IT-Security-Community
- **XING-Gruppe "IT-Security Deutschland"**

### Bug-Bounty-Plattformen (Alternative)
- **intigriti.com** — Du veröffentlichst Bug-Bounty, Hunter testen auf Deine Kosten, zahlst pro Finding
  - Budget: 2.000-5.000€ für "kleines Programm" (ca. 5-10 Findings zu erwarten)
  - Vorteil: mehrere Augenpaare
  - Nachteil: ohne "Managed Service" mehr eigene Koordination

---

## Was Marcel dem Freelancer im Erst-Gespräch zeigt

1. Dieses Dokument (`FREELANCER-BRIEFING.md`)
2. `docs/BLUEPRINT-v1.1.md` (um Architektur zu verstehen)
3. `docs/INFRASTRUKTUR-REFERENZ.md` (ohne Secrets)
4. `docs/AUDIT-REPORT.md` (Claude-Code-Audit, damit Freelancer weiß was schon geprüft wurde)

Der Freelancer soll vor Vertragsabschluss ein Angebot machen mit:
- Seiner Erfahrung mit Pen-Tests (Zertifikate: OSCP, CEH, CISSP sind Plus)
- Beispiel-Findings früherer Audits (ohne NDA-Verletzung)
- Methodologie (OWASP-Testing-Guide, PTES, OSSTMM)
- Haftpflicht-Versicherung?

---

## Bonus: Wenn Marcel es richtig ernst meint (später, nicht jetzt)

Vor öffentlichem Marktstart (wenn PROVA 100+ echte Kunden hat):

### Zertifizierter Pen-Test
- **Kosten:** 3.000-8.000€
- **Dauer:** 3-5 Tage
- **Anbieter:** TÜV, Süßmann & Partner, secunet, usd, Cure53 (international)
- **Output:** Zertifikat das Du auf `prova-systems.de/sicherheit` veröffentlichen kannst ("TÜV-geprüft")

### DSGVO-Compliance-Audit
- **Kosten:** 1.500-3.000€
- **Anbieter:** externe Datenschutzbeauftragte
- **Output:** Formal-rechtliche Bestätigung dass AVV/Datenverarbeitung/Auftragsverarbeitung DSGVO-konform sind

Diese beiden sind **Vertrauens-Multiplikatoren für Enterprise-Kunden** (Versicherungen, Gerichte). Aber nicht für Testpiloten-Phase.

---

## Was Marcel an Leo kommunizieren kann

> "Vor dem Testpiloten-Start investiere ich bewusst 3.000€ in externen Security-Check (kombiniert Tagessatz-Audit + Pen-Test über 3 Tage). Damit habe ich:
> - ✅ DSGVO-Sicherheit für Mandantendaten
> - ✅ Stripe-Zahlungs-Sicherheit 
> - ✅ 2FA gegen Account-Takeover
> - ✅ Formalen Report den ich bei Fragen vorzeigen kann
> - ✅ Schutz gegen jeden denkbaren Haftungsfall
>
> Das ist für mich Basis-Investment bevor echte Mandantendaten über PROVA laufen."

Das ist ein starkes Signal an Leo: Marcel ist nicht "Coder mit Idee", sondern **verantwortlicher Founder**.
