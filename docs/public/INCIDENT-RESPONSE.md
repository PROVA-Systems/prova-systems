# PROVA Incident-Response-Plan

**Stand:** 03.05.2026 · Version 1.0
**Zielgruppe:** Marcel + zukünftiges Team + DSB

---

## Wofür dieser Plan

Strukturierter Ablauf bei Sicherheits- oder Datenschutz-Vorfällen.
**Pflicht-Meldung an Aufsichtsbehörde binnen 72h** nach DSGVO Art. 33 — der Plan macht diese Frist machbar.

---

## Eskalations-Stufen

| Stufe | Beispiele | Reaktionszeit | Wer |
|---|---|---|---|
| **S0 Beobachtung** | Erhöhte Error-Rate, einzelner Login-Failure-Cluster, Rate-Limit-Hits | innerhalb 24h | Marcel allein |
| **S1 Inzident** | Einzelner User-Account kompromittiert, kleinerer Daten-Zugriff durch Unbefugten, gestohlenes Passwort | innerhalb 4h | Marcel + ggf. DSB |
| **S2 Major** | Multi-User-Auth-Bypass, RLS-Lücke, Cross-Tenant-Daten-Leak, Subprozessor-Breach | innerhalb 1h | Marcel + DSB + ggf. Anwalt |
| **S3 Catastrophic** | Massendaten-Leak, Ransomware, vollständiger Service-Ausfall, Supabase-Pegel-Breach | sofort | Vollständige Eskalation, externe Forensik |

---

## Erste Reaktion (S2/S3) — innerhalb 1 Stunde

### 1. Vorfall verifizieren
**Nicht voreilig den Service abschalten.** Erst prüfen:
- Sind die Symptome real?
- Wie viele User betroffen?
- Welche Daten-Kategorien?
- Aktive Exploitation oder historischer Vorfall?

### 2. Scope abgrenzen
- Welche Workspaces / User?
- Welche Tabellen / Storage-Buckets?
- Zeitfenster der Kompromittierung?

### 3. Logs sichern (kritisch)
- **Supabase Audit-Trail:** Tabelle `audit_trail` zeitnah exportieren (5 Jahre Retention, aber Backup)
- **Netlify Function-Logs:** Dashboard → Functions → einzelne Function → Logs (90T Retention auf Pro-Plan)
- **Supabase DB-Logs:** Dashboard → Database → Logs (export als JSON)
- **Stripe-Webhook-Logs:** Dashboard → Developers → Webhooks → Recent deliveries (export)

### 4. Service-Pause-Entscheidung (S2/S3)
Bei aktiver Exploitation: **Maintenance-Mode aktivieren**:
```bash
# In netlify.toml einen Toggle setzen oder
# Edge-Function /maintenance.html als Catchall
```

### 5. Kommunikations-Plan
- **Marcel** (immer)
- **Datenschutzbeauftragter** (S1+, sobald bestellt)
- **Datenschutz-Anwalt** (S2+)
- **Betroffene User** (Art. 34 DSGVO bei hohem Risiko)
- **Aufsichtsbehörde** (Art. 33 DSGVO bei meldepflichtigem Vorfall)

---

## Pflicht-Meldung nach DSGVO Art. 33

### Wann
**Binnen 72 Stunden** nach Kenntniserlangung — bei jeder Verletzung des Schutzes personenbezogener Daten, die zu einem Risiko für die Rechte und Freiheiten natürlicher Personen führt.

### Wem
**Aufsichtsbehörde** des Sitzlandes.
*gelb: TBD beim DSGVO-Anwalts-Termin festlegen — basierend auf Marcels Bundesland-Sitz.*

Beispiele Aufsichtsbehörden:
- Bayerisches Landesamt für Datenschutzaufsicht (BayLDA) — bayerische Unternehmen
- Berliner Beauftragte für Datenschutz (BlnBDI) — Berliner Unternehmen
- Hessischer Datenschutzbeauftragter (HBDI) — hessische Unternehmen

### Inhalt der Meldung (Art. 33 Abs. 3)
- **Art der Verletzung** (z.B. „unautorisierter Zugriff auf Akten-Daten")
- **Kategorien + Anzahl** betroffener Personen
- **Kategorien + Anzahl** betroffener Datensätze
- **Wahrscheinliche Folgen** für Betroffene
- **Ergriffene Gegenmaßnahmen** (technisch + organisatorisch)
- **Kontaktdaten** Marcel als Verantwortlicher (oder DSB)

### Information der Betroffenen (Art. 34)
**Pflicht** bei voraussichtlich **hohem Risiko** für Rechte und Freiheiten:
- Klarsprache
- Beschreibung des Vorfalls
- Empfohlene Maßnahmen (Passwort ändern, Karte sperren, etc.)
- Kontakt für Rückfragen

**Ausnahme** Art. 34 Abs. 3:
- Daten waren verschlüsselt → kein hohes Risiko
- Anschließende Maßnahmen reduzieren hohes Risiko (z.B. Passwort-Reset durchgeführt)
- Unverhältnismäßiger Aufwand → öffentliche Bekanntmachung statt Direkt-Kontakt

---

## Forensik (S2/S3)

### Datenquellen
- **Supabase audit_trail** — User-Aktionen
- **Supabase DB-Logs** — alle Queries
- **Netlify Function-Logs** — API-Calls
- **stripe_events** — Stripe-Webhook-Aktivität
- **Netlify Edge-Logs** — Request-Volume, geographische Verteilung
- **Sentry** (geplant Sprint 21) — Error-Tracking + Stack-Traces

### Korrelations-Methodik
1. Zeitfenster eingrenzen
2. IP-Adressen + User-Agents korrelieren
3. Anomalien identifizieren (ungewöhnliche Zugriffs-Pattern, Geo-Anomalien)
4. Root-Cause-Analyse
5. Lessons-Learned dokumentieren

---

## Wiederherstellung

### Daten-Restore
- **Supabase Pro-Plan:** Backup-Restore via Dashboard (7 Tage Retention)
- **Granular-Restore:** Nicht direkt möglich — entweder Full-Restore oder logical Export-Import
- **RTO** (Recovery Time): < 30 Min für PROVA-DB-Größe (< 100MB)
- **RPO** (max. Daten-Verlust): < 24h (täglicher Backup)

### Test-Restore
Backup-Drill durchgeführt → Doku in `docs/audit/2026-05-02-backup-restore-drill.md`

### Service-Wiederherstellung
1. Sicherheits-Patch deployen
2. Smoke-Tests (15/15 Tests aus `scripts/smoke-test-cutover.sh`)
3. Multi-Tenant-Isolation-Tests (33 Tests)
4. Schrittweise User-Re-Aktivierung
5. Service-Status-Public-Update

---

## Post-Incident

### 1. Lessons-Learned
- `docs/diagnose/POST-INCIDENT-<datum>-<thema>.md` schreiben
- Was ist passiert?
- Wie wurde detected?
- Wie wurde reagiert?
- Was hat funktioniert / was nicht?
- Welche Maßnahmen vorgenommen?

### 2. Folge-Aktionen
- Audit-Trail-Eintrag mit Severity + Disposition
- ggf. BACKLOG-Items für Mitigations
- Externes Pentest-Engagement nach S2+

### 3. Kommunikation an User
- Status-Update via E-Mail
- ggf. öffentlicher Status-Page-Eintrag

---

## Kontakte

### Verantwortlicher
**Marcel Schreiber** (Founder, PROVA Systems)
- E-Mail: kontakt@prova-systems.de
- Sicherheit: security@prova-systems.de
- Notfall: *gelb: Telefon-Nummer einsetzen*

### Datenschutzbeauftragter
*gelb: TBD — wird beim DSGVO-Anwalts-Termin geklärt (Marcel-Solo-Founder ggf. nicht zur Bestellung verpflichtet nach Art. 37)*

### Externe Unterstützung (vorab identifizieren!)
- **DSGVO-Anwalt:** *gelb: Marcel-Recherche pending (siehe MARCEL-PFLICHT-AKTIONEN)*
- **IT-Forensik:** TBD nach erstem Major-Incident (ggf. SySS, Cure53)
- **Crisis-PR:** TBD (ggf. nicht relevant für 10-Pilot-SV-Phase)

---

## Subprozessor-Vorfälle

Bei einem Vorfall bei einem Subprozessor (Supabase, OpenAI, Stripe, etc.):

### 1. Vorfall-Meldung empfangen
- Via E-Mail-Subscription Status-Page (Marcel: Status-Pages aller 9 Subprozessoren in Bookmarks)
- Status.supabase.com, status.openai.com, status.stripe.com, etc.

### 2. Eigene Auswirkung prüfen
- Sind unsere Daten betroffen?
- Welche User-Daten?
- DSGVO-Pflicht-Meldung an unsere User?

### 3. Weiter-Eskalation
- Bei DSGVO-relevantem Vorfall: 72h-Frist für UNS gilt ab unserer Kenntnisnahme
- Subprozessor wahrscheinlich selbst meldepflichtig (Verantwortlicher = Subprozessor-Kunde)

---

## Übungen + Tests

### Quartalsweise
- **Backup-Restore-Drill** (Backup-Drill-Doku ausführen)
- **Tabletop-Exercise:** „Was wäre wenn …"-Szenarien durchgehen

### Jährlich
- **Externes Pentest** (geplant nach erstem Pilot-Cash)
- **Phishing-Simulation** (Marcel + zukünftiges Team)
- **DSGVO-Schulung** für Mitarbeiter

---

## Versionierung

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 03.05.2026 | Initial — Sprint S6 Phase 4 |

---

*Incident-Response-Plan 03.05.2026 · 72h-DSGVO-Pflicht-fähig · Anwalt-Review für Aufsichtsbehörde-Festlegung pending*
