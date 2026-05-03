# DSGVO-Audit-Checklist — PROVA Systems

**Erstellt:** 04.05.2026 (MEGA⁶ S2)
**Verantwortlich:** Marcel Schreiber (Data Protection Lead)
**Stand:** Pre-Pilot-Launch

**Legende:** ✅ erfuellt · ⚠ teilweise · ❌ offen · 📝 Doku-Pflicht

---

## Art. 5 DSGVO — Grundsätze

| Punkt | Status | Aktion |
|---|---|---|
| 1. Rechtmäßigkeit, Treu+Glauben, Transparenz | ✅ | Datenschutzerklärung in `legal/datenschutz.html` aktiv |
| 2. Zweckbindung — Daten nur für SV-Workflow | ✅ | KI-Verarbeitung nur fuer Strukturierung, keine fremden Zwecke |
| 3. Datenminimierung | ⚠ | Audit-Trail enthält IP-Hint (3 Octets) — bewusst, fuer Sicherheit |
| 4. Richtigkeit | ✅ | User können Stamm-Daten in `einstellungen.html` korrigieren |
| 5. Speicherbegrenzung | 📝 | **Backup-Retention 7T** dokumentiert. Loesch-Konzept fuer Akten >7J definieren (BGB-Verjährungs-Bezug) |
| 6. Integrität+Vertraulichkeit | ✅ | RLS aktiv, JWT-Auth, HTTPS, AES-256 at-rest (Supabase) |
| 7. Rechenschaftspflicht (Art. 5 Abs. 2) | ✅ | Audit-Trail komplett, DSGVO-Audit-Doku in `docs/compliance/` |

## Art. 6 — Rechtsgrundlagen

| Verarbeitungstätigkeit | Rechtsgrundlage | Status |
|---|---|---|
| User-Anmeldung + Login | Art. 6 Abs. 1 lit. b (Vertragserfuellung) | ✅ |
| Auftragsverarbeitung (Akten + PDFs) | Art. 6 Abs. 1 lit. b + lit. f (berechtigtes Interesse SV) | ✅ |
| KI-Verarbeitung (GPT-4o + Whisper) | Art. 6 Abs. 1 lit. f (Plattform-Funktion) + Pseudonymisierung | ✅ |
| Audit-Logging | Art. 6 Abs. 1 lit. f (IT-Sicherheit, Art. 32) | ✅ |
| Stripe-Zahlung | Art. 6 Abs. 1 lit. b (Vertragserfuellung) | ✅ |
| Email-Newsletter | Art. 6 Abs. 1 lit. a (Einwilligung) | ⚠ Opt-In-Pflicht in onboarding |
| Marketing-Cookies | n/a — KEINE gesetzt | ✅ |

## Art. 7 — Einwilligung

| Punkt | Status |
|---|---|
| Opt-In-Mechanismus dokumentiert | ✅ Forced-Re-Consent ueber `v_user_pending_einwilligungen` View |
| Widerrufbarkeit klar | ✅ in Datenschutzerklärung dokumentiert |
| Granulare Zwecke | ✅ je Rechtsdokument-Version separat |
| Kein default checked | ⚠ Onboarding-UI pruefen |

## Art. 13 — Informationspflichten

| Punkt | Status |
|---|---|
| Identität Verantwortlicher | ✅ Impressum |
| Zwecke der Verarbeitung | ✅ Datenschutzerklärung |
| Empfänger / Drittland | ✅ Subprozessor-Liste in `avv.html` |
| Speicherdauer | ⚠ je Datenkategorie konkretisieren |
| Betroffenenrechte | ✅ Auskunft, Berichtigung, Löschung in dsgvo-handler |
| Widerrufsrecht | ✅ in Datenschutzerklärung |
| Beschwerderecht | ✅ Aufsichtsbehörde NRW |

## Art. 17 — Recht auf Löschung

| Punkt | Status |
|---|---|
| `dsgvo_user_loeschen()` Function | ✅ exposed via `dsgvo-loeschen.js` |
| Kaskadierende Löschung | ⚠ Akten + Anhaenge + Audit-Trail (anonymisieren!) — Schema-Detail-Pruefung pending |
| Retention-Policy fuer Backup-Loeschung | 📝 dokumentieren in DPS |
| Zeitfenster max. 30T (Art. 12 Abs. 3) | ✅ via dsgvo-handler synchron |

## Art. 20 — Datenportabilität

| Punkt | Status |
|---|---|
| `dsgvo_user_export()` Function | ✅ exposed via `dsgvo-auskunft.js` |
| Format strukturiert (JSON) | ✅ |
| Direktübertragung (an anderen Verantwortlichen) | ⚠ aktuell Email-Versand, kein API-Direkt-Push |

## Art. 25 — Privacy by Design / Default

| Punkt | Status |
|---|---|
| Data-Minimization in Forms | ✅ Pflichtfelder minimal |
| Pseudonymisierung VOR OpenAI-Send | ✅ in `lib/prova-pseudo.js` (Server-side) |
| Verschlüsselung at-rest | ✅ Supabase AES-256 (Frankfurt EU) |
| Verschlüsselung in-transit | ✅ HTTPS + TLS 1.3 |
| Default-Privacy-friendly Settings | ✅ kein Tracking, kein Profiling |
| Sentry PII-Filter | ✅ in `lib/sentry-wrap.js` beforeSend |
| Sentry user_pseudo Tag | ✅ ab MEGA-MEGA-MEGA O6 |

## Art. 30 — Verzeichnis von Verarbeitungstätigkeiten

| Punkt | Status |
|---|---|
| Verzeichnis erstellt | ✅ `docs/compliance/VERARBEITUNGSVERZEICHNIS.md` |
| 10+ Tätigkeiten dokumentiert | ✅ |
| Pro Tätigkeit: Zweck/Rechtsgrundlage/Datenkategorien/Empfänger/Aufbewahrung/TOM | ✅ |

## Art. 32 — Sicherheit der Verarbeitung

| Punkt | Status |
|---|---|
| Pseudonymisierung | ✅ (siehe Art. 25) |
| Verschlüsselung | ✅ |
| Verfügbarkeit (Backup) | ✅ Supabase 7T-Retention (Pro: konfigurierbar) |
| Wiederherstellbarkeit | ✅ Supabase Point-in-Time-Recovery |
| Pruefverfahren TOM | 📝 jährliches Review-Datum festlegen |
| Incident-Response-Plan | 📝 erstellen — siehe Art. 33 |

## Art. 33 — Meldepflicht bei Datenschutz-Verletzungen

| Punkt | Status |
|---|---|
| Incident-Response-Plan | 📝 zu erstellen |
| Aufsichtsbehörden-Kontakt (LDI NRW) | 📝 in Plan ergänzen |
| 72h-Meldefrist-Pflicht-Doku | 📝 |
| Betroffenen-Benachrichtigung-Template | 📝 |

## Art. 35 — Datenschutz-Folgenabschätzung (DSFA)

| Punkt | Status |
|---|---|
| DSFA durchgefuehrt | ✅ `docs/compliance/DSFA-PROVA.md` |
| Hohe Risiken adressiert | ✅ KI-Verarbeitung mit Pseudonymisierung |
| Restrisiken dokumentiert | ✅ |

## EU AI Act Art. 50 — Transparenzpflichten

| Punkt | Status |
|---|---|
| Kennzeichnung KI-Inhalte | ✅ in PDFs Teil 1.3 + Teil 4.3 |
| Hinweis fuer Endnutzer | ✅ in Datenschutzerklärung + im UI |
| Verantwortungsklausel SV | ✅ in jedem PDF + KI-Tooltip |

## § 407a ZPO — Sachverständiger-Pflichten

| Punkt | Status |
|---|---|
| Höchstpersönlichkeit (Abs. 1) | ✅ Fachurteil-Editor mit Eigenleistungs-Schwelle |
| Anzeige bei Mitarbeit Dritter (Abs. 2) | ✅ in PDF Teil 1.3 |
| Anzeige bei KI-Hilfsmitteln (Abs. 3) | ✅ identisch Teil 1.3 + Teil 4.3 |

## § 10 IHK-SVO

| Punkt | Status |
|---|---|
| Höchstpersönlichkeit | ✅ |
| Drittmittel-Anzeige | ✅ |

---

## Zusammenfassung

| Status | Anzahl |
|---|---|
| ✅ erfüllt | ca. 30 |
| ⚠ teilweise | 5-7 |
| 📝 Doku-Pflicht | 6-8 |
| ❌ offen | 0 |

**Gesamtbewertung:** PROVA ist **DSGVO-Audit-Ready** mit kleineren Doku-Lücken (Speicherdauer-Konkretisierung, Incident-Response-Plan). Keine kritischen Lücken.

**Marcel-Pflicht vor Pilot-Launch:**
1. Incident-Response-Plan erstellen (Template empfehle ich basierend auf BSI IT-Grundschutz)
2. Speicherdauer-Tabelle pro Datenkategorie konkretisieren
3. Onboarding-UI: Default-Checkbox-State pruefen (Opt-In nicht pre-checked)
4. Email-Newsletter Opt-In-Flow verifizieren

---

*Sprint MEGA⁶ S2 — 04.05.2026 nacht.*
