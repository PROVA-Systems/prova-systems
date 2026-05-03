# Anwalt-Review-Briefing — PROVA Systems

**Erstellt:** 04.05.2026 (MEGA⁶ S3)
**Empfaenger:** Anwalt-Kanzlei (Tech-SaaS / DSGVO / KI / Sachverständigenrecht)
**Auftraggeber:** Marcel Schreiber, PROVA Systems
**Phase:** Pre-Pilot-Launch (Schwerpunkt) → Public-Launch (zweite Phase)

---

## 1. Was ist PROVA?

**PROVA Systems** ist ein KI-natives B2B-SaaS für **öffentlich bestellte und vereidigte Bausachverständige (ö.b.u.v. SV)** in Deutschland.

**Workflow:**
Auftrag → Ortstermin → Diktat → KI-Strukturhilfe → §6 Fachurteil → Freigabe → PDF → E-Mail → Rechnung → Zahlung

**Zielgruppe:**
- Solo-SVs (5-30 Standardfälle/Monat) — 99-149 €/Monat
- Team-Büros (Solo + Mitarbeiter) — 279 €/Monat

**Tech-Stack:**
- Frontend: Vanilla JavaScript
- Backend: Supabase (Postgres EU/Frankfurt) + Netlify Functions
- KI: OpenAI GPT-4o + Whisper (mit Pseudonymisierung)
- PDF: PDFMonkey (Liquid-Templates)
- Zahlung: Stripe (Subscriptions + Founding-Pilot-Coupon)

**KI-Prinzipien:**
- KI macht NIE eigenständige fachliche Bewertungen
- §6 Fachurteil ist SV-eigenhändig (§ 10 IHK-SVO + § 407a Abs. 1 ZPO)
- KI-Hilfen: Konjunktiv-II-Prüfung, Halluzinations-Check, §407a-Compliance, Rechtschreibung
- EU AI Act Art. 50 Disclosure in jedem PDF (Teil 1.3 + Teil 4.3)

---

## 2. Welche Dokumente sollen reviewed werden?

Alle Dokumente sind in `docs/compliance/legal-current/`:

| Dokument | Status | Schwerpunkt-Fragen |
|---|---|---|
| `agb.md` | Draft | SaaS-Vertrag, Haftungs-Beschränkung bei KI-Output, Subscription-Cancellation |
| `datenschutz.md` | Draft | DSGVO Art. 13/14 vollständig? Subprozessoren-Liste (10 Anbieter) korrekt? |
| `impressum.md` | Final | TMG § 5 + § 55 RStV vollständig? |
| `avv-template.md` | Draft | AVV-Template nach Art. 28 für Pilot-SVs als Auftragsverarbeiter? Oder umgekehrt? |
| `ai-disclosure.md` | Draft | EU AI Act Art. 50 Konformität — sind die Disclosure-Texte ausreichend? |
| `sv-407a-statement.md` | Draft | § 407a ZPO + § 10 IHK-SVO Höchstpersönlichkeit ausreichend abgesichert? |

---

## 3. Konkrete Fragen pro Dokument

### AGB
1. Ist die **Haftungsbeschränkung bei KI-Output** rechtssicher? PROVA generiert Strukturhilfen, nicht aber Fachurteile. Welche Klauseln schützen vor SV-Haftungs-Durchgriff?
2. **Subscription-Lifecycle:** Trial 90T → Founding-99 € lifetime → reguläres Abo. Reicht eine Email-Kuendigung oder muss Customer-Portal verfügbar sein?
3. **§ 312k BGB Kuendigungsbutton:** Erforderlich fuer Solo-SVs (Verbraucher) oder reicht B2B-Klausel?

### Datenschutz
1. **Subprozessoren in USA** (OpenAI, Stripe, PDFMonkey, Netlify) — sind die SCC-Klauseln + DPF + Pseudonymisierung ausreichend?
2. **KI-Verarbeitung mit Kunden-Daten:** Reicht die Pseudonymisierung VOR OpenAI-Send, oder müssen wir explizite Einwilligung pro Auftrag einholen?
3. **Foto-Speicherung:** Schaden-Fotos können incidentell Personen zeigen. Brauchen wir Einwilligung des SV-Auftraggebers, oder reicht Berechtigtes Interesse Art. 6 Abs. 1 lit. f?

### AVV-Template (für Pilot-SVs)
1. **Wer ist Verantwortlicher, wer Auftragsverarbeiter?**
   - PROVA hostet die Daten → wir sind Auftragsverarbeiter für SV-Kunden (Datenkategorien)
   - SV ist Verantwortlicher für seine Auftraggeber-Daten
2. **Sub-Auftragsverarbeiter:** Sind unsere 10 Subprozessoren in der AVV explizit zu benennen?
3. **Weisungsbindung:** Wir nehmen technische Konfigurations-Anpassungen automatisch vor (z.B. neue KI-Modelle). Reicht eine offene Klausel oder Pflicht-Notifikation?

### AI-Disclosure (EU AI Act Art. 50)
1. **Klassifizierung von PROVA:** Limited Risk AI System (Art. 50)? Oder High Risk (Anhang III Punkt 8 — Justizpflege?)?
2. **Disclosure-Texte:** Reichen die in PDFs (Teil 1.3 + Teil 4.3) integrierten Hinweise?
3. **Transparenz-Pflicht in UI:** Muss ein Hinweis in der App "Sie nutzen jetzt KI"-Style-Modal beim ersten Login erscheinen?

### SV § 407a Statement
1. **Höchstpersönlichkeit (Abs. 1):** Reicht der Hinweis im PDF (Teil 1.3 + Teil 4.3) + die UI-Eigenleistungs-Schwelle (500 Zeichen + 2/3 Marker), oder benötigen wir mehr?
2. **Anzeigepflicht (Abs. 2+3):** Wer muss informiert werden — Auftraggeber, Gericht, beide? Reicht das automatische Wording im PDF?
3. **§ 10 IHK-SVO Konformität:** Können IHKs die Pre-Approval verweigern wenn KI eingesetzt wird? Bestehende IHK-Köln-Praxis?

---

## 4. Phasen-Plan

### Phase 1 — Pre-Pilot (Pflicht vor 1. Pilot-SV)
- Datenschutz + AVV + AI-Disclosure + § 407a Statement
- Schwerpunkt: SV-Haftungs-Schutz + DSGVO

**Marcel-Budget:** ca. 1.500-3.000 € (1-2 Tage Anwalt-Zeit)

### Phase 2 — Public-Launch (vor erstem zahlenden Nicht-Pilot)
- AGB + Impressum vollstaendiges Review
- Cookie-Banner-Pruefung (aktuell keine Tracking-Cookies — nur Functional)
- Marketing-Texte (Homepage) auf wettbewerbsrechtliche Aussagen pruefen

**Marcel-Budget:** ca. 2.000-4.000 €

### Phase 3 — Skalierung (>50 Pilots)
- Datenschutzbeauftragten bestellen (extern oder intern)
- ISO 27001 Vorbereitung (optional, fuer Enterprise-Kunden)
- Compliance-Audit jaehrlich

---

## 5. Anwalt-Empfehlungen

Siehe `docs/compliance/ANWALT-RECHERCHE.md`.

---

## 6. Marcel-Aktionen vor Anwalt-Termin

- [ ] Diese Briefing-Doku als PDF exportieren (oder direkt teilen)
- [ ] `docs/compliance/legal-current/` Folder mit allen 6 Drafts uebergeben
- [ ] DSGVO-Audit-Checklist + DSFA + AVV-Liste teilen
- [ ] Konkrete Pilot-Use-Cases vorbereiten (Beispiel-Szenarien fuer "Was waere wenn")

---

*Briefing-Stand 04.05.2026 — MEGA⁶ S3.*
