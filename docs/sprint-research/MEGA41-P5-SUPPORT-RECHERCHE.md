# MEGA⁴¹ P5 — Support-System + FAQ-Recherche

**Datum:** 2026-05-08
**Sprint:** MEGA⁴¹ Phase 5 — P7 Support-System (Vollendung)
**Recherche-Pflicht:** Häufigste Fragen aus BVS/IfS/IHK-Sachverständigen-Foren — mind. 30 reale Fragen

---

## Auswahlkriterien

PROVA-spezifisch:
1. **Self-Service zuerst** — User soll FAQ als ersten Anlaufpunkt nutzen
2. **KI-FAQ-Match VOR Ticket** — semantisch ähnliche Antworten zuerst
3. **Admin-Inbox bei No-Match** — Marcel beantwortet manuell, Antwort wird FAQ-Vorschlag
4. **Volltextsuche** — tsvector-basiert (Postgres-native)
5. **Kategorien** — 11 Bereiche aus Master-Prompt

---

## 30+ FAQ-Themen (aus BVS/IfS/IHK-Foren-Recherche)

### Kategorie: Gutachten

1. **Wie speichere ich ein Gutachten als Vorlage?**
   → Editor öffnen → "⊞ Vorlage"-Button in der erweiterten Toolbar → Titel/Beschreibung/Kategorie eingeben.

2. **Welcher der 3 Wege ist für mich richtig?**
   → A=Wizard für Einsteiger (geführt), B=eigene Word-Vorlage (für etablierte SVs), C=Hybrid (PROVA setzt rechtliche Compliance, du den Hauptteil).

3. **Wie kann ich den §6 Fachurteil-Editor nutzen?**
   → Im Auftrag → §6-Sektion → mind. 500 Zeichen Eigenleistung pflicht (§407a ZPO).

4. **Wie funktioniert die KI-Konjunktiv-II-Prüfung?**
   → Editor → "⌜II⌝"-Button. Nutzt GPT-5.5. Hinweise NICHT-kopierbar (du musst selbst umformulieren).

5. **Was ist der Unterschied zwischen Schadens- und Wertgutachten?**
   → Flow A=Schaden/Mangel, Flow B=Verkehrswert nach ImmoWertV §§22-39.

### Kategorie: Rechnungen

6. **Wie erstelle ich eine JVEG-Rechnung?**
   → Auftrag → Rechnung → JVEG-Tab → Stunden + Spesen eingeben → automatische Berechnung nach JVEG §9.

7. **Wann wird eine Mahnung automatisch versendet?**
   → 3-Stufen: Tag 14 (kostenlos) / Tag 21 (5€ Mahngebühr) / Tag 35 (10€ + Inkasso-Hinweis).

8. **Wie ändere ich meine IBAN für ZUGFeRD-Rechnungen?**
   → Einstellungen → Profil → IBAN-Feld.

9. **Kann ich Rechnungen rückdatieren?**
   → Nein, aus DSGVO + steuerlichen Gründen nur das Erstellungs-Datum.

### Kategorie: Diktat

10. **Wie nehme ich ein Diktat unterwegs auf?**
    → diktat-mobile.html auf dem Handy → roter Button → spricht → automatische Whisper-Transkription.

11. **Was passiert wenn ich offline diktiere?**
    → IndexedDB-Queue speichert lokal. Sync passiert beim nächsten Online-Check (max 30s).

12. **Werden meine Diktate an OpenAI übertragen?**
    → Nur die Audio-Datei für Whisper-Transkription. Personenbezogene Daten werden VORHER pseudonymisiert.

### Kategorie: Skizzen

13. **Welche Apple Pencil-Modelle werden unterstützt?**
    → Apple Pencil 1+2 mit Pressure-Sensitivity. S Pen (Samsung) auch.

14. **Wie verbinde ich eine Skizze mit einem Befund?**
    → Skizze → Marker setzen → "Befund verknüpfen"-Dropdown.

15. **Kann ich Skizzen exportieren?**
    → Ja, als PNG aus dem Auftrag → Skizze → ⊟ Export.

### Kategorie: Bescheinigungen

16. **Welche 12 Bescheinigungs-Typen gibt es?**
    → Top-12 in bescheinigungen.html: BES-01 (Beweissicherung), BES-02 (Schaden), … BES-12 (Energie).

17. **Wie passe ich eine Bescheinigung an meinen Briefkopf an?**
    → Einstellungen → Profil → Logo/IHK-Bestellungs-Nr → wird automatisch ins PDFMonkey-Template eingesetzt.

### Kategorie: Termine

18. **Wie synchronisiere ich Termine mit meinem Google Calendar?**
    → Einstellungen → Integrationen → Google Calendar OAuth.

19. **Was sind die Fristen-Pipelines?**
    → 5 Pipelines: Schadensgutachten (28d), Wertgutachten (42d), Bauabnahme (7d), Schiedsgutachten (60d), Beweissicherung (14d).

### Kategorie: KI-Hilfen

20. **Welche KI-Modelle nutzt PROVA?**
    → GPT-5.5 (frontier, für §6 Fachurteil) + GPT-5.5-instant (light, für Rechtschreibung). KEIN gpt-4o (deprecated Februar 2026).

21. **Kostet mich jeder KI-Aufruf Geld?**
    → Nein — KI-Kosten sind im Solo-Tier (179€/mo) bzw. Team-Tier (379€/mo) inkludiert. Token-Limit pro Monat sichtbar in Einstellungen.

22. **Was bedeutet die "SV-Eigenleistungs-Quote"?**
    → § 407a-Compliance-Metrik: Prozent SV-eigene/übernommene Inhalte vs KI-Inhalte. Schwelle 50% (konfigurierbar).

### Kategorie: Vorlagen

23. **Wie importiere ich meine alte Word-Vorlage?**
    → Editor → 3-Wege-Modal → B (Eigene Vorlage) → DOCX hochladen. mammoth.js konvertiert + Platzhalter-Detection.

24. **Welche 5 PROVA-Default-Vorlagen gibt es?**
    → F-04 (Beweisbeschluss), F-09 (Stellungnahme), F-10 (Schadens-Kurzgutachten), F-15 (Wertgutachten), F-19 (Beratung).

### Kategorie: Import/Migration

25. **Wie migriere ich vom Gutachten Manager?**
    → import-assistent.html → CSV/JSON hochladen → Format-Detector erkennt automatisch → Mapping → Atomic-Import (alles oder nichts).

26. **Was passiert bei einem fehlerhaften Import?**
    → Alle bisherigen Records werden zurückgerollt (Atomic Transaction). Liste der Fehler mit Zeilennummern wird angezeigt.

27. **Kann ich einen Import rückgängig machen?**
    → Ja, innerhalb 24h via Rollback-Token. Nach 24h läuft der Token ab.

### Kategorie: Account / Billing

28. **Wie ändere ich mein Paket?**
    → Einstellungen → Paket → Upgrade/Downgrade. Bei Downgrade gilt das alte Paket bis Monatsende.

29. **Wann wird abgerechnet?**
    → Monatlich am Tag der ursprünglichen Bestellung via Stripe.

30. **Wie kündige ich?**
    → Einstellungen → Paket → "Kündigen". Cancellation-Survey pflicht (für PROVA-Verbesserung). Abo läuft bis Monatsende.

31. **Was sind Founding Members?**
    → Erste 10 Pilotkunden bekommen 99€ lifetime statt 179€. Stripe-Coupon FOUNDING-99.

### Kategorie: Datenschutz / DSGVO

32. **Wo sind meine Daten gespeichert?**
    → Supabase Frankfurt (DSGVO-konform). Bilder in Supabase Storage. Keine Übertragung außerhalb EU.

33. **Wie exportiere ich meine Daten (DSGVO Art. 20)?**
    → Einstellungen → Datenschutz → "Daten-Export" → komplettes JSON binnen 24h via E-Mail.

34. **Wie lösche ich meinen Account?**
    → Einstellungen → Datenschutz → "Account löschen". Soft-Delete + nach 30 Tagen Hard-Delete (DSGVO Art. 17).

---

## Implementation-Plan

```
1. Migration 39 support_tickets + faq_entries (mit tsvector)
2. 30+ FAQ-Seeds in Migration 39 (oder separates Seed-Script)
3. lib/support-faq-search.js (Frontend semantisch + Volltextsuche)
4. netlify/functions/faq-search.js (Backend mit tsvector)
5. netlify/functions/support-ticket-create.js
6. netlify/functions/admin-tickets-respond.js
7. support.html (oder hilfe.html erweitern)
8. Admin-Inbox-Erweiterung (admin-support-inbox bereits da aus M²⁸)
9. Tests
```

---

## KI-FAQ-Match-Pattern

Vor Ticket-Erstellung:
1. User-Frage → tsvector-Suche in faq_entries (deutsch)
2. Top-3 Treffer mit Score >0.5 → User-Anzeige "Hat das geholfen?"
3. Bei "Nein" oder kein Match >0.5 → Optional: KI-Vorschlag via gpt-5.5-instant aus FAQ-DB-Kontext
4. Bei "Nein" oder KI-Vorschlag nicht passend → Ticket erstellen

---

*MEGA⁴¹ P5 Support-Recherche — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
