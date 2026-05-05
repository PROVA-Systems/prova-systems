# PROVA Pilot — FAQ (Top 20)

**Stand:** 09.05.2026 (MEGA²⁵)
**Zielgruppe:** Pilot-SVs in Founding-Phase

---

## Account + Login

### 1. Wie lange dauert die Trial?

Die **Founding-Pilot-Trial dauert 90 Tage** (Tag 1-90). Danach startet automatisch das Founding-Member-Abo (**125 €/Monat lifetime**, regulärer Solo-Preis 179 €). Du kannst jederzeit kündigen über den Customer-Portal-Link in deinen Account-Settings.

### 2. Was passiert wenn ich vor Tag 90 kündige?

Du verlierst den Founding-Member-Status. Bei späterem Wiedereinstieg gilt der reguläre Solo-Preis (179 €/Monat).

### 3. Wo aendere ich mein Passwort?

In `app.prova-systems.de/einstellungen.html` → Security → Passwort aendern.

### 4. Ich habe meine Email vergessen — was tun?

Email an `kontakt@prova-systems.de` — Marcel hilft persoenlich.

### 5. Kann ich 2FA aktivieren?

Ja, ab MEGA-MEGA-MEGA O4. Im Account-Settings → Security → Multi-Factor → TOTP-App registrieren.

---

## Akten + Auftraege

### 6. Welche Auftragstypen unterstuetzt PROVA?

**4 Flows:**
- **Flow A — Schaden/Mangel:** Kurzstellungnahme (F-04), Kurzgutachten (F-09), Gerichtsgutachten (F-15)
- **Flow B — Wertgutachten:** Verkehrswert, Beleihungswert, Mietwert (F-19)
- **Flow C — Beratung:** Telefon-/Vor-Ort-Beratung (F-20)
- **Flow D — Baubegleitung:** Periodische Begehungen (F-21) + Bauabnahme (F-22)

### 7. Wie funktioniert die KI-Strukturhilfe?

KI hilft beim (Hybrid-Stack seit MEGA²²):
- **Whisper-1** (OpenAI): Diktat → Text-Transkription
- **Claude Sonnet 4.6** (Anthropic): Foto-Vision (Schaden-Erkennung)
- **GPT-4o** (OpenAI): Konjunktiv-II-Prüfung, Halluzinations-Check, §407a-Compliance, Strukturierung
- **GPT-4o-mini**: Rechtschreibung + Grammatik (S1-Stufe, mechanisch)

KI macht **NIE eigenständige fachliche Bewertungen**. Das **§6 Fachurteil** verfasst du höchstpersönlich (§ 10 IHK-SVO + § 407a Abs. 1 ZPO).

**Disclaimer-Mandate:** Bei jeder KI-Funktion erscheint ein §407a-Hinweis (gemäß EU AI Act Art. 50).

### 8. Wie funktioniert die Eigenleistungs-Schwelle?

Im §6-Fachurteil-Editor brauchst du **mindestens 500 Zeichen + 2 von 3 Qualitaets-Markern** (Norm-Verweis, Konjunktiv II, §-Verweis) für die Freigabe.

Bei Unterschreitung: Override-Modal mit SV-Bestaetigung + Audit-Eintrag.

### 9. Werden meine Daten an OpenAI gesendet?

JA — aber **pseudonymisiert**: Namen → `[PERSON]`, Adressen → `[STRASSE]`, IBAN → `[IBAN]`, Telefon → `[TELEFON]`, Email → `[EMAIL]`. Die Pseudonymisierung ist **server-side** in `lib/prova-pseudo.js` implementiert.

OpenAI hat einen DPA mit Standardvertragsklauseln (SCC) + Opt-Out aus Training-Data-Use.

### 10. Wer ist verantwortlich für das Gutachten?

**Du als SV** bleibst zwingend verantwortlich (§ 10 IHK-SVO + § 407a Abs. 1 ZPO). PROVA ist Strukturhilfe, kein Gutachten-Generator. Die Verantwortungs-Klausel steht in jedem PDF (Teil 4.3).

---

## DSGVO + Datenschutz

### 11. Wer ist Verantwortlicher, wer Auftragsverarbeiter?

**Du** = Verantwortlicher für deine Auftraggeber-Daten.
**PROVA** = Auftragsverarbeiter (technische Plattform).

AVV-Template in `docs/compliance/legal-current/avv-template.md`. Bei Pilot-Onboarding wird AVV automatisch unterzeichnet (Click-Through).

### 12. Wo werden meine Daten gespeichert?

- **Datenbank + Storage:** Supabase EU/Frankfurt
- **Email-Versand:** IONOS (DE) oder Resend (EU)
- **Zahlungen:** Stripe (EU + USA mit SCC)
- **PDF-Generierung:** PDFMonkey (USA mit SCC)
- **KI Vision:** Anthropic (USA mit SCC + Pseudonymisierung)
- **KI Text + Audio:** OpenAI (USA mit SCC + Pseudonymisierung)
- **Error-Tracking:** Sentry (EU/DE)

Vollstaendige Liste: `docs/compliance/AVV-LISTE.md`.

### 13. Wie lange werden Daten aufbewahrt?

| Datenkategorie | Aufbewahrung |
|---|---|
| Account-Daten | aktiv + 30T Backup nach Cancellation |
| Auftrags-Daten + PDFs | 5-30 Jahre (BGB-Verjährung + § 407a Beweissicherung) |
| Audit-Trail | 1 Jahr, danach Anonymisierung |
| Stripe-Daten | 7 Jahre (Buchhaltungs-Pflicht) |

### 14. Kann ich meine Daten exportieren?

Ja, via **Account-Settings → Daten-Export** (JSON-Format) oder Email-Anfrage. Erfuellt Art. 20 DSGVO Datenuebertragbarkeit.

### 15. Kann ich mein Konto vollstaendig loeschen?

Ja, via **Account-Settings → Konto loeschen** (asynchron, max 30 Tage). Loescht Account-Daten + verknuepfte Akten. Audit-Trail-Eintraege werden anonymisiert.

---

## Stripe + Zahlung

### 16. Welche Zahlungsmethoden werden akzeptiert?

Via Stripe: Kreditkarte, SEPA-Lastschrift, Apple Pay, Google Pay, Klarna (zukünftig).

### 17. Bekomme ich eine Rechnung?

Ja, automatisch via Stripe — als PDF im Customer-Portal abrufbar. Steuerlich konform mit deutscher Buchhaltung.

### 18. Was passiert wenn meine Zahlung fehlschlaegt?

Stripe versucht 3× automatisch (Tag 1, 3, 5). Bei weiterhin Fail:
- Email an dich mit Update-Karte-Link
- Subscription wird auf "ueberfaellig" gesetzt (App-Zugang temporär begrenzt)
- Nach 14 Tagen: Subscription gekuendigt

---

## Support

### 19. Wo bekomme ich Hilfe?

**Email:** `kontakt@prova-systems.de` — Marcel persoenlich, max 24h Antwortzeit (in der Pilot-Phase oft <1h).

**In-App:** Tooltips bei Hovern auf "?"-Icons. Kein Live-Chat aktuell.

**Eskalation bei kritischem Bug:** Email mit Subject "[BUG] — kritisch" → Marcel-Push-Notification.

### 20. Wie melde ich Verbesserungs-Vorschlaege?

Antworte auf eine der Onboarding-Mails (Tag 7, 14, 30) oder Email an `kontakt@prova-systems.de`. Marcel sammelt alle Vorschlaege und priorisiert sie in Sprint-Planning.

---

## Marcel-Hinweis

> "PROVA wurde von einem Sachverstaendigen für Sachverstaendige gebaut. Wenn etwas nicht so funktioniert wie du es als SV erwarten wuerdest — sag mir Bescheid. Das wird gefixt." — *Marcel Schreiber*

---

## Pricing-Tier-Übersicht (FINAL nach MEGA²¹)

| Tier | Preis | Ziel | Status |
|---|---|---|---|
| **STARTER** | 89 €/mo | ≤ 5 Fälle/Monat (kleine SVs) | Coming Soon (Juni 2026) |
| **SOLO** ⭐ | **179 €/mo** | 5–30 Fälle/Monat (Standard) | ✅ Pilot |
| **TEAM** | 379 €/mo | Büros ≥ 3 Mitarbeiter | Coming Soon (Juli 2026) |
| **Founding-Member** | **125 €/mo lifetime** | Erste 10 Pilot-SVs | ✅ Pilot (Coupon FOUNDING-30) |

## KI-Funktions-Garantie (Marcel-Direktive)

Jede KI-Funktion in PROVA besteht **5 Tests vor Produktiv-Live-Schaltung**:
1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
2. **Edge-Cases** — 5 Extreme (kurz, lang, ohne Satzzeichen, Fachbegriffe, Tippfehler)
3. **Präzision** — bei 20 korrekten Texten max 10% Falsch-Positiv-Rate
4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator

**Wenn ein Test rot ist, wird die Funktion im UI ausgeblendet bis grün.**

## Beweisbeschluss-Pattern-Extraktion (NEU MEGA²²+²³)

Auf der Gerichtsauftrag-Page kannst du einen Beweisbeschluss als PDF hochladen. Pattern-Matching (kein LLM in Tranche 1) extrahiert:
- Aktenzeichen
- Frist-Datum
- Hauptfragen (nummeriert)
- Parteien-Namen (Kläger / Beklagter)

Du editierst die Erkennungs-Ergebnisse vor dem Speichern. **Disclaimer:** Pattern-Matching ist eine erste Strukturierungs-Hilfe. Du als bestellter SV bleibst nach §407a ZPO letztverantwortlich.

---

*FAQ-Stand 09.05.2026 (MEGA²⁵) — quartalsweise update.*
