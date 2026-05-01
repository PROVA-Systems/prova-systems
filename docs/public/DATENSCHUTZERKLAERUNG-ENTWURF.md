# Datenschutzerklärung — ENTWURF

**Stand:** 02.05.2026 · Skeleton-Entwurf
**⚠️ ANWALT-REVIEW VOR VERÖFFENTLICHUNG ZWINGEND**

---

## ⚠️ Hinweis

Dieses Dokument ist ein **Entwurf** für die Datenschutzerklärung unter `prova-systems.de/datenschutz`. MUSS vor Veröffentlichung von einem DSGVO-Anwalt geprüft werden.

Bestehende `datenschutz.html` im Repo-Root ist die aktuell live geschaltete Version (vor Voll-Supabase-Refactor). Diese muss nach Anwalts-Review **ersetzt** werden, da sich Subprozessoren-Liste durch den Refactor verändert hat (Airtable raus, Supabase rein, Make reduziert).

---

## Pflicht-Inhalte (Art. 13/14 DSGVO)

1. **Verantwortlicher** — Marcel Schreiber, Adresse, Kontakt
2. **Datenschutzbeauftragter** — TBD (oft nicht erforderlich für Solo-Founder, prüfen lassen)
3. **Verarbeitungszwecke** — Vertragserfüllung Solo/Team-Abo, KI-Strukturhilfe
4. **Rechtsgrundlagen** — Art. 6 Abs. 1 lit. b (Vertrag) + lit. f (berechtigtes Interesse) + Einwilligung wo nötig
5. **Empfänger / Subprozessoren** — Liste aus `docs/public/DATA-PROCESSING.md`
6. **Drittstaatentransfer** — OpenAI US, Netlify US, Resend US (mit SCC + DPA)
7. **Speicherdauer** — siehe DATA-PROCESSING.md
8. **Datensubjekt-Rechte** — Art. 15-22
9. **Beschwerderecht** — Aufsichtsbehörde
10. **Pflicht zur Datenbereitstellung** — wo erforderlich
11. **Automatisierte Entscheidungen** — KEINE (PROVA macht KI-Hilfen, keine eigenständigen Bewertungen — relevant für §22 DSGVO)
12. **Cookies / Tracking** — TBD nach Cookie-Banner-Sprint (Sprint 05 P6)

---

## Sektionen (Phase 5 ausarbeiten)

### 1. Verantwortlicher

[Marcels Daten]

### 2. Erhebung und Verarbeitung beim Besuch der Website

- Server-Logs (Netlify)
- Cookies / LocalStorage (Auth-Token, UI-State)
- Kontaktformulare (Newsletter, Demo-Anfrage)

### 3. Erhebung und Verarbeitung bei Nutzung der App

- Account-Anlage (E-Mail, Passwort)
- SV-Stammdaten + Briefkopf
- Auftraggeber + Akten-Inhalte
- Foto-Uploads
- Diktat-Audio (Whisper)
- KI-Verarbeitung (mit Pseudonymisierung)
- Zahlungsabwicklung (Stripe)

### 4. Empfänger / Auftragsverarbeiter

[Liste aus DATA-PROCESSING.md]

### 5. Drittstaatentransfer

[OpenAI US, Netlify US, Resend US — SCC + DPA + Pseudonymisierung]

### 6. Speicherdauer

[Tabelle aus DATA-PROCESSING.md]

### 7. Ihre Rechte

[Art. 15-22 + Beschwerderecht]

### 8. Datensicherheit

[TLS 1.3, AES-256, RLS, 2FA, Audit-Logs, Pseudonymisierung]

### 9. Aktualität

[Datum letzte Anpassung]

---

*Wird vom DSGVO-Anwalt finalisiert.*
