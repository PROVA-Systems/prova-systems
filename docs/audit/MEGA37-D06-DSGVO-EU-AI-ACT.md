# MEGA³⁷ D06 — DSGVO + EU AI Act Art. 50 Compliance

**Datum:** 2026-05-08
**Methodik:** Gesetzes-Recherche (5 Quellen) + PROVA-Code-Audit für jeden Artikel.

## DSGVO-Compliance-Tabelle

| Artikel | Anforderung | PROVA-Status | Severity |
|---------|-------------|--------------|----------|
| Art. 5 Datensparsamkeit | nur nötige Daten erheben | 🟢 Wizard hat optionale vs. Pflicht-Felder | 🟢 LOW |
| Art. 7 Einwilligung | Cookie-Consent granular | 🟢 lib/cookie-consent.js (M³⁴ A1) | 🟢 LOW |
| Art. 13/14 Info-Pflicht | Datenschutzerklärung zugänglich | 🟢 datenschutz.html (Root-Level) | 🟢 LOW |
| Art. 17 Löschung | DSGVO-Löschpfad nutzerseitig | 🟢 dsgvo-loeschen-antrag Lambda (M³⁵ C5) | 🟢 LOW |
| Art. 20 Datenübertragbarkeit | Export | 🟢 dsgvo-portability.js | 🟢 LOW |
| Art. 25 Privacy by Design | RLS, Pseudonymisierung | 🟢 Pseudo vor KI-Calls (lib/prova-pseudo.js) | 🟢 LOW |
| Art. 30 Verarbeitungsverzeichnis | Pflicht ab >250 MA, KMU-Ausnahme bei nicht-Risiko | 🟡 PROVA: KMU + verarbeitet besondere Daten (Gutachten = personenbezogene Schadensdaten) → Pflicht trotz <250 MA | 🟠 HIGH — Marcel-Manual erstellen |
| Art. 32 TOMs | technische + organisatorische Maßnahmen | 🟡 RLS+Pseudo+Vault vorhanden, **TOM-Doku** als Marcel-Beilage zum AVV fehlt | 🟠 HIGH |
| Art. 33 Meldepflicht | 72h-Notify bei Breach | ⚠️ Prozess nicht dokumentiert | 🟠 HIGH |
| Art. 35 DSFA | Pflicht bei Hoch-Risiko-Verarbeitung | ⚠️ DSFA für KI-Pseudonymisierung empfohlen | 🟡 MEDIUM |
| TTDSG §25 Cookie-Consent | echte Wahl, kein Pre-Select | 🟢 erfüllt | 🟢 LOW |

## EU AI Act Art. 50 (anwendbar ab August 2026)

| Anforderung | PROVA-Status | Severity |
|-------------|--------------|----------|
| Disclosure: KI-generierter Inhalt sichtbar markieren | ⚠️ KI-Hilfen in §1-§5 — Marker-Box auf PDF? | 🟠 HIGH |
| Maschinenlesbar: Output `tagged` als KI-generated | ⚠️ Implementation offen | 🟡 MEDIUM |
| Ausnahme: künstlerisch/satirisch | n/a | n/a |

## Top-3-Empfehlungen
1. **Verarbeitungsverzeichnis Art. 30** (Marcel-Pflicht + Anwalts-Review): Liste aller Verarbeitungen (Auftrag, Kontakte, Diktat, KI-Calls, Logs).
2. **TOM-Doku Art. 32:** RLS + Pseudonymisierung + Vault + Backup explizit beschreiben → Anhang zu jedem AVV.
3. **EU AI Act Art. 50 Compliance** vor August 2026: Disclosure-Box auf JEDEM KI-generierten PDF-Abschnitt + maschinenlesbare Marker (z. B. Watermark im PDF-Metadaten).

## Quellen
1. [EU AI Act Article 50 — artificialintelligenceact.eu/article/50](https://artificialintelligenceact.eu/article/50/)
2. [Code of Practice on AI-generated content — digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)
3. [Art. 17 DSGVO Löschpflicht — dsgvo-gesetz.de/art-17-dsgvo](https://dsgvo-gesetz.de/art-17-dsgvo/)
4. [Art. 30 DSGVO Verarbeitungsverzeichnis — dsgvo-gesetz.de/art-30-dsgvo](https://dsgvo-gesetz.de/art-30-dsgvo/)
5. [Art. 32 DSGVO TOMs — datenschutz-grundverordnung.eu/dsgvo/art-32-dsgvo](https://datenschutz-grundverordnung.eu/dsgvo/art-32-dsgvo/)
