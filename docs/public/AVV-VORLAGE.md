# Auftragsverarbeitungs-Vertrag (AVV) — ENTWURF

**Stand:** 02.05.2026 · Skeleton-Entwurf
**⚠️ ANWALT-REVIEW VOR EINSATZ ZWINGEND**

---

## ⚠️ Hinweis

Dieses Dokument ist ein **Entwurf** und MUSS vor erstem Einsatz von einem DSGVO-Anwalt geprüft werden. Marcel-Aktion: DSGVO-Anwalt-Termin (siehe `docs/audit/MARCEL-PFLICHT-AKTIONEN.md`).

Strukturierung folgt Vorlagen der Aufsichtsbehörden (z.B. LDA Bayern, BayLDA-Mustervorlage).

---

## Entwurf-Struktur (Phase 5 ausarbeiten)

### §1 Gegenstand und Dauer

- Vertragsparteien: PROVA Systems (Auftragnehmer) ↔ SV-Büro (Verantwortlicher)
- Gegenstand: Verarbeitung personenbezogener Daten im Rahmen der PROVA-SaaS-Nutzung
- Dauer: Laufzeit der Hauptvereinbarung (Solo/Team/Founding-Abo)

### §2 Art und Zweck der Verarbeitung

- Speicherung von Auftraggeber-Stammdaten
- Speicherung von Akten-Inhalten (Diktat, §§-Texte, Befunde, Fotos)
- KI-Verarbeitung mit Pseudonymisierung (OpenAI als Subprozessor)
- PDF-Erstellung (PDFMonkey als Subprozessor)
- E-Mail-Versand (Resend als Subprozessor)
- Zahlungsabwicklung (Stripe als Subprozessor)

### §3 Kategorien betroffener Personen

- Auftraggeber des SVs (Privatpersonen, Unternehmen, Behörden, Versicherungen)
- Beteiligte (Bauunternehmen, Architekten, weitere Sachverständige)
- Geschädigte / Eigentümer

### §4 Kategorien personenbezogener Daten

- Stammdaten: Name, Adresse, Kontakt
- Vertragsdaten: Auftragstyp, Honorar, Aktenzeichen
- Inhaltsdaten: Diktat, Bilder, Gutachten-Texte
- (Keine Gesundheitsdaten, keine Strafregister-Daten ausgenommen wenn relevant für Gutachten)

### §5 Pflichten des Auftragnehmers (PROVA)

- Verarbeitung nur auf dokumentierte Weisung
- Vertraulichkeit der Mitarbeiter (Marcel als Solo-Founder + ggf. Freelancer mit NDA)
- Technische und organisatorische Maßnahmen (siehe Anlage 1)
- Subprozessoren-Liste (siehe Anlage 2)
- Unterstützung bei Datensubjekt-Anfragen
- Meldung von Datenschutzverletzungen binnen 72h

### §6 Subprozessoren (Anlage 2)

[Liste aus PROVA-ARCHITEKTUR-MASTER.md → Subprozessoren-Sektion]

### §7 Technische und organisatorische Maßnahmen (Anlage 1)

- Vertraulichkeit: TLS 1.3, AES-256, RLS, 2FA für Admins
- Integrität: Audit-Trail, Versions-Kontrolle (Git)
- Verfügbarkeit: Supabase Pro Backups, geplant tägliches `pg_dump` zu S3
- Belastbarkeit: Multi-Region-Edge-Hosting (Netlify)
- Wiederherstellbarkeit: Audit 17 Backup-Drill (Sprint S6 Phase 3)
- Verfahren regelmäßiger Überprüfung: 22 Audits aus Sprint S6, jährliche Wiederholung

### §8 Datensubjekt-Rechte

- Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch
- DSGVO-Functions in PROVA: `dsgvo_user_export()`, `dsgvo_user_loeschen()`

### §9 Rückgabe / Löschung nach Vertragsende

- Daten-Export als JSON-Archiv binnen 14 Tagen nach Vertragsende
- Hard-Delete der Daten 30 Tage nach Vertragsende (Grace-Period)
- Audit-Logs werden 5 Jahre aufbewahrt (gesetzliche Pflicht §147 AO)

### §10 Kontroll-Rechte des Verantwortlichen

- Nachweise der TOM auf Anforderung
- Audit-Recht (mit angemessener Vorankündigung, max. 1×/Jahr)
- Vor-Ort-Audit auf Kosten des Verantwortlichen

### §11 Haftung

- Beschränkung auf 12 Monatsbeiträge des Hauptvertrags (außer bei Vorsatz/grober Fahrlässigkeit)

### §12 Schlussbestimmungen

- Schriftform
- Gerichtsstand: TBD (Marcels Sitz)
- Anwendbares Recht: deutsches Recht

---

*Wird vom DSGVO-Anwalt finalisiert.*
