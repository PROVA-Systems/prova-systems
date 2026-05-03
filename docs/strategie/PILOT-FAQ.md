# PROVA Pilot — FAQ (Top 20)

**Stand:** 04.05.2026 (MEGA⁶ S4)
**Zielgruppe:** Pilot-SVs in Founding-Phase

---

## Account + Login

### 1. Wie lange dauert die Trial?

Die **Founding-Pilot-Trial dauert 90 Tage** (Tag 1-90). Danach startet automatisch das Founding-99-Abo (99 €/Monat **lifetime**, nicht 149 €). Du kannst jederzeit kuendigen ueber den Customer-Portal-Link in deinen Account-Settings.

### 2. Was passiert wenn ich vor Tag 90 kuendige?

Du verlierst den Founding-Member-Status. Bei spaeterem Wiedereinstieg gilt der regulaere Solo-Preis (149 €/Monat).

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

KI hilft beim:
- **Whisper:** Diktat → Text-Transkription
- **GPT-4o:** Strukturieren, Konjunktiv-II-Pruefung, Halluzinations-Check, §407a-Compliance, Rechtschreibung

KI macht **NIE eigenstaendige fachliche Bewertungen**. Das **§6 Fachurteil** verfasst du höchstpersönlich (§ 10 IHK-SVO + § 407a Abs. 1 ZPO).

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
- **KI:** OpenAI (USA mit SCC + Pseudonymisierung)
- **Error-Tracking:** Sentry (DE)

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

*FAQ-Stand 04.05.2026 — quartalsweise update.*
