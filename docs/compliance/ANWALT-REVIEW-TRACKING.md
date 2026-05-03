# Anwalt-Review-Tracking

**Erstellt:** 04.05.2026 (MEGA⁶ S3)
**Marcel-Update-Pflicht:** nach jedem Anwalt-Termin

---

## Status-Übersicht

| Dokument | Status | Anwalt-Termin | Feedback erhalten | Final |
|---|---|---|---|---|
| `legal-current/agb.md` | Draft | — | — | — |
| `legal-current/datenschutz.md` | Draft | — | — | — |
| `legal-current/impressum.md` | Final-Draft | — | — | — |
| `legal-current/avv-template.md` | Draft | — | — | — |
| `legal-current/ai-disclosure.md` | Draft | — | — | — |
| `legal-current/sv-407a-statement.md` | Draft | — | — | — |

**Status-Legende:**
- **Draft:** PROVA-intern erstellt, noch nicht reviewed
- **Final-Draft:** Standard-Wording, kaum Anwalt-Bedarf (z.B. Impressum)
- **In Review:** beim Anwalt zur Pruefung
- **Feedback:** Anwalt-Antwort erhalten, Marcel-Aenderungen pending
- **Final:** alle Aenderungen eingearbeitet, Live-fähig

---

## Phasen-Plan (Pre-Pilot)

### Phase 1 — Kritische Pre-Pilot-Docs (vor 1. Pilot-SV)

**Pflicht-Review:**
1. `datenschutz.md` (Art. 13/14 vollstaendig?)
2. `avv-template.md` (Verantwortlicher-Auftragsverarbeiter-Rollen)
3. `ai-disclosure.md` (EU AI Act Art. 50 — Limited vs. High Risk)
4. `sv-407a-statement.md` (§ 407a + § 10 IHK-SVO)

**Erwartete Aufwand:** 1-2 Tage Anwalt-Zeit
**Marcel-Budget:** 1.500-3.000 €

### Phase 2 — Public-Launch (vor 1. Nicht-Pilot-Kunde)

**Review:**
1. `agb.md` (vollständige Pruefung, Haftung, § 312k BGB)
2. `impressum.md` (Final-Validation)
3. Marketing-Texte auf Homepage (UWG-Konformitaet)

**Erwartete Aufwand:** 1-1.5 Tage
**Marcel-Budget:** 2.000-4.000 €

### Phase 3 — Skalierung (>50 Pilots)

- Datenschutzbeauftragten extern bestellen
- ISO 27001 Vorbereitung (optional, Enterprise-Kunden)
- Compliance-Audit jaehrlich

---

## Marcel-Update-Workflow

Nach jedem Anwalt-Termin:

```
1. In dieser Tabelle Status updaten
2. Anwalt-Feedback in `docs/compliance/anwalt-feedback/<datum>-<anwalt>.md` ablegen
3. Aenderungen am Dokument einarbeiten + commit
4. Bei wesentlichen Aenderungen: Pilots informieren via Forced-Re-Consent
```

---

## Wichtige Fragen-Liste fuer Anwalt-Termin (Phase 1)

Aus den Drafts:

### datenschutz.md
- [ ] Cookie-Banner-Pflicht trotz fehlender Tracking-Cookies?
- [ ] KI-Verarbeitung: Reicht berechtigtes Interesse + Pseudonymisierung, oder Einwilligung pro Auftrag?
- [ ] Speicherdauer-Tabelle vollständig?

### avv-template.md
- [ ] Verantwortlicher-Auftragsverarbeiter-Rollenklarheit korrekt?
- [ ] Reicht "Weisung durch Plattform-Nutzung", oder explizite Pro-Akte-Vereinbarung?
- [ ] Sub-AVs: 14T Anzeige genuegt, oder Pflicht-Vorab-Zustimmung?

### ai-disclosure.md
- [ ] Limited Risk korrekt? Oder Anhang III Punkt 8 (Justizpflege)?
- [ ] PDF-Hinweise + UI-Modal reichen für Art. 50?
- [ ] KI-Modell-Wechsel: Pflicht-Re-Consent oder Email-Info?

### sv-407a-statement.md
- [ ] Eigenleistungs-Schwelle 500 Zeichen + 2/3 Marker ausreichend?
- [ ] Copy/Paste-Erlaubnis mit Audit-Log § 10 IHK-SVO-konform?
- [ ] Override-Modal bei Unterschreitung — reicht das?

---

*Tracking-Stand 04.05.2026 — naechste Update nach Anwalt-Kontaktaufnahme.*
