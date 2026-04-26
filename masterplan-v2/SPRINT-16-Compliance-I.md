# SPRINT 16 — Compliance I (Rechtstext-Schicht)

**Tag:** 16 · **Aufwand:** 6-7h · **Phase:** D Compliance & Rechtliches

---

## Ziel
Alle rechtlich verpflichtenden UI-Elemente + Texte + Versionierung sind da. §407a, EU AI Act, AGB-Versionierung, AVV-Update.

---

## Scope

### §407a ZPO Pre-Send-Checkbox
- In `freigabe.html` vor PDF-Versand:
- Checkbox "Ich habe persönlich geprüft. Die fachliche Beurteilung in §6 wurde eigenhändig von mir erstellt."
- Disabled-Send-Button bis Checkbox an
- Audit-Trail: Timestamp + sv_email + Gutachten-Hash

### EU AI Act Art. 50 in PDFs
- Standardisierter Offenlegungs-Text (3 Varianten):
  - **Gericht:** Förmlich, mit Bezug auf §407a
  - **Versicherung:** Sachlich, technisch
  - **Privat:** Verständlich, Verbraucher-Sprache
- In Design-System v1.0 schon definiert
- Konsistent in allen 22 PDFMonkey-Templates

### AGB-Versionierung
- Tabelle RECHTSDOKUMENTE (existiert)
- Felder: typ (agb/datenschutz/avv), version, datum_veroeffentlicht, inhalt_html, ist_aktuell
- SACHVERSTAENDIGE.akzeptierte_agb_version + akzeptierte_datenschutz_version
- Beim Login: wenn Version != aktuell → Re-Acceptance-Modal mit Diff oder Volltext

### AVV-Update
Aktualisieren mit allen aktuellen Subprozessoren:
- OpenAI (KI)
- Anthropic (falls Claude-Code-Integration)
- Stripe (Billing)
- Airtable (Daten)
- PDFMonkey (PDF-Generation)
- Netlify (Hosting + Functions + Blobs)
- IONOS (SMTP)
- Make.com (4 Cron-Szenarien)
- Cloudflare (zukünftig R2)
- Sentry (Monitoring)
- BetterStack (Status-Page)

---

## Prompt für Claude Code

```
PROVA Sprint 16 — Compliance I (Tag 16)

Pflicht-Lektüre vor Start:
- 02_WORKFLOWS.md (§407a, §312g)
- Memory: Design-System v1.0 EU AI Act Box
- bestehende agb.html, datenschutz.html, avv.html


SCOPE
=====

Block A — §407a Pre-Send-Checkbox

A1: freigabe.html
- Vor "PDF erstellen und versenden"-Button:
  Checkbox + Text:
  "✓ Ich habe das Gutachten persönlich geprüft. Die fachliche Beurteilung 
   in §6 wurde von mir eigenhändig erstellt. (§407a ZPO / EU AI Act Art. 50)"
- Send-Button disabled bis Checkbox an

A2: gutachten-freigabe.js (aus Sprint 14)
- Verifiziert §407a_bestätigt:true im Payload
- Audit-Trail-Eintrag: { typ: "freigabe_§407a", fall_id, sv_email, timestamp, gutachten_hash }
- Bei nicht bestätigt: 400 mit Hinweis

Block B — EU AI Act Art. 50 in PDFs

B1: Standardisierter Text-Block (3 Varianten)
- Gericht-Variante:
  "Hinweis nach EU AI Act Art. 50: Bei der Erstellung dieses Gutachtens wurden 
   KI-gestützte Werkzeuge zur Strukturierung und Recherche eingesetzt. Die 
   fachliche Beurteilung wurde gemäß §407a ZPO persönlich vom Sachverständigen 
   verfasst. Eigenleistungs-Hash: {hash:0:8}..."
- Versicherung-Variante: ähnlich, ohne §407a-Bezug
- Privat-Variante: laienverständlich

B2: PDFMonkey-Templates aktualisieren
- 22 Templates durchgehen
- EU-AI-Act-Box als Standard-Snippet einfügen
- Template-Variablen für hash und Variante
- Position: nach Unterschrift, vor Anhängen

B3: gutachten-freigabe.js erweitern
- ki_genutzt_seit: alle KI-Calls in diesem Fall (aus AUDIT_TRAIL)
- Eigenleistungs-Hash: SHA-256 von §6-Text
- An PDFMonkey übergeben

Block C — AGB-Versionierung

C1: RECHTSDOKUMENTE-Tabelle befüllen
- AGB v1.0 (aktueller Stand)
- Datenschutz v1.0
- AVV v2.0 (neu mit allen Subprozessoren)

C2: SACHVERSTAENDIGE-Felder ergänzen
- akzeptierte_agb_version (Single line)
- akzeptierte_datenschutz_version
- akzeptierte_avv_version
- akzeptiert_am (Date+Time)

C3: Login-Hook
- Nach Login-Verify: Vergleich Version vs. SV
- Wenn Mismatch: Modal "Aktualisierte Bedingungen" mit Diff
- SV muss "Akzeptieren" klicken vor Weiter
- UPDATE SACHVERSTAENDIGE

C4: Versionierungs-UI in einstellungen.html
- "Meine akzeptierten Bedingungen" mit Versions-Anzeige
- Link zu PDF-Download der akzeptierten Version

Block D — AVV-Update

D1: avv.html komplett-Rewrite
- Vorlage: gängige AVV-Struktur
- Subprozessoren-Tabelle:
  | Anbieter | Service | Standort | Zweck |
  | OpenAI | KI | USA (EU AI Pact) | Text-Generation |
  | Anthropic | KI | USA | Code-Assistance (intern) |
  | Stripe | Billing | USA + EU | Zahlungen |
  | Airtable | Datenbank | USA + EU | Datenspeicher |
  | PDFMonkey | PDF | EU | PDF-Generation |
  | Netlify | Hosting | USA + EU | Hosting + Functions |
  | IONOS | SMTP | DE | E-Mail-Versand |
  | Make.com | Automatisierung | EU | 4 Cron-Szenarien |
  | Cloudflare | (Zukunft) | EU + USA | Storage R2 |
  | Sentry | Monitoring | EU | Error-Tracking |
  | BetterStack | Status | EU | Uptime-Monitoring |

D2: Verlinkung in datenschutz.html

Block E — sw.js v219


QUALITÄTSKRITERIEN
==================
- §407a-Workflow lückenlos
- EU-AI-Act-Box in jedem PDF
- AGB-Re-Acceptance-Flow funktioniert
- AVV vollständig + aktuell


TESTS
=====
1. Freigabe ohne §407a-Checkbox → Button disabled
2. Mit Checkbox → Audit-Eintrag entsteht
3. PDF zeigt EU-AI-Act-Box mit Hash
4. AGB-Version manuell hochsetzen → User-Login → Re-Acceptance
5. AVV-Seite zeigt 11 Subprozessoren


ACCEPTANCE
==========
1. §407a-Checkbox + Audit
2. EU-AI-Act-Box in 22 Templates
3. AGB-Versionierung
4. AVV updated


TAG: v180-compliance-1-done
```

---

## Marcel-Browser-Test (15 Min)

1. Freigabe-Test mit/ohne Checkbox
2. PDF prüfen: EU-AI-Act-Box am Ende
3. AGB-Version in Airtable manipulieren → Login → Re-Acceptance
4. AVV-Seite öffentlich erreichbar
