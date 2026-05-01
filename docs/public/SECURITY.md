# PROVA Security-Übersicht

**Stand:** 02.05.2026 · Skeleton — wird in Sprint S6 Phase 5 ausgearbeitet.

---

## Wofür diese Datei?

Öffentliche Übersicht der Sicherheitsmaßnahmen die PROVA umgesetzt hat. Veröffentlicht unter `prova-systems.de/sicherheit` zur Pilot-SV-Information.

---

## Architektur-Sicherheit

*(Phase 5: Inhalt aus PROVA-ARCHITEKTUR-MASTER.md übernehmen + verständlich aufbereiten)*

- Datenhosting: Supabase Frankfurt (EU)
- Authentifizierung: Supabase Auth mit ES256 JWT-Verifikation
- Multi-Tenancy: Row Level Security (RLS) auf Datenbank-Ebene
- Verschlüsselung: TLS 1.3 in Transit, AES-256 at Rest
- Pseudonymisierung: alle KI-Calls durchlaufen Server-Side-Pseudonymisierung

---

## Audit-Status

*(Phase 5: aus AUDIT-SUMMARY-2026-05.md übernehmen)*

- **OWASP ASVS 5.0 Level 1:** TBD (Coverage %)
- **OWASP LLM Top 10 2025:** TBD
- **DSGVO-Compliance:** Datenschutzerklärung + AVV unter Anwalts-Prüfung
- **Letzter Audit-Durchlauf:** 02.05.2026 (intern, Sprint S6)
- **Geplanter externer Pentest:** nach erstem Pilot-Cash

---

## Verantwortliche Disclosure

Sicherheitslücke gefunden? Bitte **vor öffentlicher Bekanntgabe** melden:

- **E-Mail:** security@prova-systems.de (TBD Marcel — Adresse einrichten)
- **Antwort innerhalb:** 72 Stunden
- **Belohnung:** Bug-Bounty noch nicht etabliert, Anerkennung in Hall-of-Fame

---

## Compliance & Frameworks

- DSGVO (Pflicht EU)
- §203 StGB (Schweigepflicht öbuv-SVs)
- §407a ZPO (KI-Hinweis-Pflicht)
- OWASP ASVS 5.0 (freiwillig)
- Geplant: BSI IT-Grundschutz Self-Assessment

---

*Wird in Sprint S6 Phase 5 final.*
