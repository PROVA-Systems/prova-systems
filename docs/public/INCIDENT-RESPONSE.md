# PROVA Incident-Response-Plan

**Stand:** 02.05.2026 · Skeleton — wird in Sprint S6 Phase 5 ausgearbeitet.

---

## Wofür diese Datei?

Wie PROVA auf Sicherheitsvorfälle reagiert. Pflicht-Behörde-Meldung binnen 72h nach DSGVO Art. 33.

---

## Eskalations-Stufen

| Stufe | Beispiele | Reaktion | Frist |
|---|---|---|---|
| **S0 Beobachtung** | erhöhte Error-Rate, einzelner Login-Failure-Cluster | Logging-Review, kein User-Impact | innerhalb 24h |
| **S1 Inzident** | einzelner User-Account kompromittiert, kleinerer Daten-Ausfall | User informieren, Account zurücksetzen, Logs sichern | innerhalb 4h Kontaktaufnahme |
| **S2 Major** | Multi-User-Auth-Bypass, RLS-Lücke, Cross-Tenant-Daten-Leak | sofort Service-Pause, alle betroffenen User informieren | innerhalb 1h |
| **S3 Catastrophic** | Massendaten-Leak, Ransomware, vollständiger Service-Ausfall | Service offline, Pflicht-Meldung Aufsicht binnen 72h, Strafanzeige | sofort |

---

## Pflicht-Meldung nach DSGVO Art. 33/34

**Wann:** binnen **72 Stunden** an die zuständige Aufsichtsbehörde (für Marcel: Landesbeauftragte für Datenschutz seines Bundeslandes)

**An wen:**
- Aufsichtsbehörde des Sitzlandes (TBD Marcel — welches Bundesland?)
- Bei Hochrisiko: zusätzlich betroffene User direkt (Art. 34)

**Inhalt der Meldung:**
- Art der Verletzung
- Kategorien + Anzahl betroffener Personen
- Kategorien + Anzahl betroffener Datensätze
- Wahrscheinliche Folgen
- Ergriffene Gegenmaßnahmen
- Kontaktdaten Marcel als Verantwortlicher

---

## Kontakt

- **Sicherheitsvorfälle:** security@prova-systems.de (TBD Marcel — Adresse einrichten)
- **Verantwortlicher (Art. 4 Nr. 7 DSGVO):** Marcel Schreiber
- **Datenschutzbeauftragter:** TBD (DSGVO-Anwalt-Termin)

---

## Erste Reaktion (innerhalb 1 Stunde)

1. **Vorfall verifizieren** — keine vorzeitige Service-Unterbrechung bei False-Positives
2. **Scope abgrenzen** — welche User, welche Daten betroffen
3. **Logs sichern** — Supabase-Audit-Trail + Netlify-Function-Logs zeitnah exportieren (Audit-Logs werden auch ohne Maßnahme erst nach 5 Jahren gelöscht)
4. **Service-Pause-Entscheidung** — bei S2/S3: Maintenance-Mode aktivieren (`netlify.toml`-Toggle?)
5. **Kommunikations-Plan** — Marcel + ggf. Anwalt + ggf. Datenschutzbeauftragter

---

## Forensik (S2/S3)

- **Supabase-Audit-Trail** (Tabelle `audit_trail`) — alle Login/Logout/Daten-Zugriffe
- **Netlify-Function-Logs** (90 Tage Retention auf Pro-Plan)
- **Supabase-DB-Logs** (über Supabase-Dashboard exportierbar)
- **Sentry / Error-Monitoring** (geplant Sprint S6 Phase 4)

---

## Wiederherstellung

- **Supabase-Backup-Restore** (Pro-Plan: 7 Tage täglich, Team-Plan: 30 Tage)
- **Test-Restore** wurde durchgeführt: TBD (Audit 17, Phase 3)

---

*Wird in Sprint S6 Phase 5 final.*
