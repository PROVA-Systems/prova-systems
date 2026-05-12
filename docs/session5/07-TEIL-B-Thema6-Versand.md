# TEIL B · Thema 6 — Versand des Gutachtens

**Die Frage (Marcel):** *"Wir müssen über den Versand nachdenken … schönes PDF runterladen? Über Platform abwickeln? Eigenes SMTP? Komplett eigenes E-Mail-System?"*

---

## Die Antwort in einem Satz

**Baue NIE ein eigenes E-Mail-System. Biete 3 Export-Pfade: Download (immer), Platform-Link (für Premium), beA-kompatibles ZIP (für den Anwalt).** Direkt-SMTP im SV-Namen ist eine Falle.

---

## Der DSGVO-Abgrund (entscheidet fast alles)

Gutachten enthalten fast immer besondere Kategorien personenbezogener Daten (DSGVO Art. 9): Gesundheits­daten (med. Gutachten), strafrechtlich Relevantes, Vermögens­verhältnisse, etc.

**Regel:** Übertragung außerhalb EU/EWR ohne DPA + SCCs = Rechtsverstoß. Schrems-II macht US-Services hochrisiko, selbst mit EU-RZ.

**Die 4 Varianten aus der Frage:**

| Variante | DSGVO-Risiko | UX | Aufwand | Empfehlung |
|---|---|---|---|---|
| A. Download-PDF, SV verschickt selbst | gering (Verantwortung liegt beim SV) | mittel (SV klickt viel) | S | **Pilot Tag 1** |
| B. PROVA versendet via Plattform-Link | mittel (wir sind Auftragsverarbeiter) | hoch (1 Klick, Empfänger bekommt Link) | M | **Q2 2026** |
| C. PROVA versendet via eigenes SMTP im SV-Namen | **hoch** (Spoofing-Risiko, SPF/DKIM/DMARC-Nightmare, Haftungsfrage) | hoch | L | **NEIN** |
| D. Komplett eigenes E-Mail-System in PROVA | extrem hoch (DSGVO-Auftragsverarbeiter für Mail, Spam-Reputation, Support-Last) | mittel | XXL | **NEIN, auch nie** |

---

## Empfohlene Stufen-Strategie

### Stufe 1 — Download (Pilot Tag 1)
Der SV klickt "Als PDF exportieren". Das PDF landet in seinem Download-Ordner. Er verschickt es wie bisher: via Outlook, beA-Anwalt, USB-Stick zum Gericht.

**Das klingt schwach, ist aber die rechtliche Basis.** Alle SV machen das heute schon. PROVA muss das perfekt haben (Zertifikat-PDF angehängt, Audit-Log-Export optional, ZIP mit Anlagen).

Features Stufe 1:
- PDF-Export mit Auswahl: "Nur Gutachten" / "Gutachten + Anlagen als ZIP" / "Gutachten + Zertifikat + Anlagen"
- Optional: PAdES-Signatur (PDF-Advanced-Electronic-Signature). Hier braucht der SV ein qualifiziertes Zertifikat von D-Trust/Bundesdruckerei; PROVA integriert die Signatur-API.
- Filename-Convention konfigurierbar: `YYYY-MM-DD_Az_SV-Kurzname.pdf`

### Stufe 2 — Platform-Share (Q2 2026)
Alternative zum Download: "Sicheren Link erstellen und per E-Mail teilen".

Wie das funktioniert:
1. SV klickt "Freigabe-Link erstellen"
2. Dialog: Empfänger-E-Mail(s), Passwort (auto oder manuell), Ablaufdatum (default 30 Tage), Zugriffs-Limit (wie oft öffnen)
3. PROVA generiert Einmal-Link `prova.app/share/<token>`
4. Empfänger bekommt E-Mail von **PROVAs** Mail-Absender `no-reply@prova.app` (nicht vom SV!): *"Marcel Müller hat Ihnen ein Gutachten freigegeben. Klicken Sie hier und geben Sie das Passwort ein."*
5. Passwort bekommt Empfänger separat (vom SV per Telefon/SMS)
6. Beim Öffnen: PDF-Viewer inline ODER Download-Option
7. Jeder Zugriff wird geloggt (`audit_trail` und per E-Mail an SV bei erstem Öffnen)
8. Nach Ablauf: Link tot, Datei in Supabase-Storage zu löschen (Retention-Job)

**DSGVO-Situation:** 
- PROVA ist Auftragsverarbeiter (Art. 28 DSGVO) → AV-Vertrag mit jedem SV
- Empfänger bekommt Daten nur via Login mit Passwort → Zugriffs­schutz
- Deutsche/EU-Server (Frankfurt) → sichere Datenlokalität
- TLS durchgehend → Übertragungs­sicherheit

**Vorteil gegenüber SMTP:** Kein E-Mail-Anhang mit 50 MB PDF, der auf irgendeinem Mail-Server zwischengelagert wird. Daten bleiben in PROVAs Storage. Zugriffs-Nachweis ist sauber.

### Stufe 3 — beA-kompatibles Export-Paket (Q3 2026)
Speziell für Gerichts­gutachten, die via beA (Anwalts-Postfach) laufen.

**NICHT** PROVA sendet via beA. Stattdessen: Der SV gibt das Export-ZIP an den Anwalt, der lädt es via DATEV/beA hoch.

Das ZIP enthält:
- `gutachten.pdf` (signiert, mit PAdES)
- `anhaenge/*.pdf` (Fotos als PDF-Anhang, Messprotokolle etc.)
- `metadaten.xml` (nach XJustiz-Standard, wenn machbar)
- `zertifikat.pdf` (PROVA-Audit-Zertifikat)
- `MANIFEST.json` (Liste aller Dateien + SHA256-Hashes)

Filename: `<Az>_Gutachten_SV-<Name>.zip`

**Wichtig:** Das ZIP ist nach XJustiz-Standard (wenn der vom BMJ definiert ist) maschinenlesbar für beA/eAkte-Systeme. Das ist ein **Differenzierungs-Feature**.

### Stufe 4 (DEPRECATED — nie bauen) — Eigenes SMTP im SV-Namen

Warum das eine Falle ist:

1. **SPF/DKIM-Nightmare:** Um E-Mails als `marcel@mueller-sv.de` zu versenden, musst du SPF-Records beim SV-Domain-Admin modifizieren. Jeder SV hat eine andere Domain. Setup-Kosten pro Onboarding: Stunden.

2. **Haftung:** Wenn PROVA-SMTP eine E-Mail an den falschen Empfänger sendet (Tippfehler, Bug), haftet PROVA neben dem SV.

3. **Spam-Reputation:** Wenn ein SV-Mandant die Mail als Spam markiert, bricht die Reputation des PROVA-Mailservers ein. Das schadet ALLEN SV.

4. **Zustellbarkeits­bestätigung:** Outlook/Google blockieren zunehmend "im-Namen-Sende"-Systeme. Du wirst im Spam landen.

5. **Setup-Komplexität:** Jeder SV muss MX-Records, TXT-Records (SPF), DKIM-Schlüssel konfigurieren. Das skaliert nicht.

**Einzige Ausnahme:** Wenn PROVA irgendwann SMTP anbietet, dann als **Absender `@prova.app`** (mit Reply-To auf SV-Adresse). Das ist Stufe 2 (Platform-Share) in anderer Verpackung. Aber das ist kein "im Namen des SV" — das ist "von der Platform im Auftrag".

---

## Die DSGVO-Matrix im Detail

| Akt | Rechtsgrundlage | Erforderliche Dokumentation |
|---|---|---|
| SV lädt sensible Daten in PROVA hoch | Art. 6 Abs. 1 f + Art. 28 DSGVO | AV-Vertrag PROVA ↔ SV |
| PROVA speichert diese Daten in Frankfurt | Art. 32 DSGVO (Sicherheit) | TOMs (Technische & Organisatorische Maßnahmen) |
| Empfänger bekommt Platform-Link, öffnet, liest | Art. 6 Abs. 1 b + c (Vertrag/rechtliche Pflicht) | Zustellungsnachweis via audit_trail |
| Empfänger lädt Daten herunter | Art. 6 Abs. 1 b (Vertrag) + ggf. Art. 9 für Gesundheits­daten | Einwilligung/Rechtsgrundlage muss der SV vorweisen |
| Passwort wird separat per SMS/Telefon übergeben | — | Best-Practice, nicht Pflicht |
| Nach 30 Tagen Link tot | Art. 5 Abs. 1 e (Speicherbegrenzung) | Retention-Policy in AV-Vertrag |

**Was PROVA liefern muss:**
- AV-Vertrag-Vorlage (generisch, mit Name einfüllbar)
- TOMs-Dokument (einmal erstellt, für alle SV verfügbar)
- DSGVO-Auskunfts-Self-Service: der SV oder Empfänger kann jederzeit "Welche Daten habt ihr über mich" fragen → Export-CSV aus audit_trail + fotos + gutachten-Datenbank, gefiltert auf den betreffenden Mandanten.

---

## Empfänger-Erlebnis (User Journey)

Der Empfänger ist Anwalt/Gericht/Privatkunde. Nicht unser Produkt-Nutzer. Aber die UX entscheidet, ob die Platform angenommen wird.

### Empfänger-Flow (Stufe 2, Platform-Share)

**Mail-Eingang:**
```
Von: PROVA Gutachten-Portal <no-reply@prova.app>
An: ra.meier@kanzlei-xy.de
Betreff: Gutachten zu Az. 12 O 345/25 freigegeben

Sehr geehrte(r) Empfänger(in),

Sachverständiger Marcel Müller hat Ihnen ein Gutachten im 
Verfahren 12 O 345/25 zur Einsicht freigegeben.

➡ Gutachten öffnen: https://prova.app/share/a3f2…

Das Passwort erhalten Sie separat vom Absender.
Zugang gültig bis: 15.06.2026.

Nach Ablauf oder drei fehlgeschlagenen Passwort-Eingaben wird 
der Link automatisch deaktiviert.

Mit freundlichen Grüßen
PROVA Gutachten-Portal im Auftrag von Marcel Müller
```

**Landing-Page:**
```
┌────────────────────────────────────────────────────┐
│  PROVA Gutachten-Portal                             │
│  ────────────────────────────────────────────────  │
│                                                     │
│  Gutachten im Verfahren 12 O 345/25                 │
│  Sachverständiger: Marcel Müller                    │
│  Datum: 12. Mai 2026                                │
│                                                     │
│  Bitte geben Sie das Passwort ein:                  │
│  [··········································] 🔒    │
│                                                     │
│  [ Gutachten öffnen ]                               │
│                                                     │
│  Haben Sie kein Passwort? Kontaktieren Sie bitte    │
│  den Absender direkt.                               │
└────────────────────────────────────────────────────┘
```

Nach Eingabe:
```
┌────────────────────────────────────────────────────┐
│  Gutachten (PDF-Viewer inline)                      │
│  [ Download PDF ]  [ Download ZIP mit Anlagen ]     │
│  [ Zertifikat anzeigen ]                            │
└────────────────────────────────────────────────────┘
```

Protokollierung:
- Beim ersten Öffnen: E-Mail an SV: *"Anwältin Dr. Meier hat das Gutachten um 14:32 geöffnet."*
- Beim Download: ebenso.
- Alles in audit_trail.

---

## Die Kosten der Stufe 2 (Platform-Share)

- Mail-Versand via Postmark / SendGrid EU / Amazon SES Frankfurt: ~0,01 € pro Mail
- Storage für Export-PDFs (30 Tage Aufbewahrung): in Supabase Storage inkludiert
- Support-Last: nur wenn Passwort vergessen — dafür Self-Service-Reset via zweiter Token-Mail

Operative Kosten pro versendetem Gutachten: **< 0,05 €**.

---

## Konkrete Empfehlung

| Feature | Pilot | Q2 2026 | Q3 2026 |
|---|:-:|:-:|:-:|
| PDF-Export Basis | ✓ | | |
| PDF-Export mit Zertifikat | ✓ | | |
| ZIP-Export mit Anlagen | ✓ | | |
| PAdES-Signatur | | ✓ | |
| Platform-Share mit Link+Passwort | | ✓ | |
| Empfänger-Viewer-Seite | | ✓ | |
| Zugriffs-Notifikationen | | ✓ | |
| beA-kompatibles ZIP (XJustiz) | | | ✓ |
| SMTP-Versand im SV-Namen | **NIE** | | |
| Eigenes Mail-System | **NIE** | | |

---

## Der wichtigste Satz zu Thema 6

> *Die Frage "Wie versenden wir?" ist eigentlich "Wer haftet wofür?". Wenn PROVA in der Versand-Kette ist, muss PROVAs Rolle als Auftragsverarbeiter (Art. 28) sauber definiert sein. Das schließt Direkt-SMTP im SV-Namen aus — das verwischt Verantwortlichkeiten.*

Bleib in der Auftragsverarbeiter-Rolle. Der SV bleibt Verantwortlicher. Das Produkt verkauft sich besser mit klarer Rollenverteilung als mit "alles aus einer Hand".

DATEV hat das genauso gelöst (Quelle 19): DATEV bietet die *Schnittstelle* zu beA, aber der Anwalt ist es, der versendet. DATEV sendet nicht im Namen des Anwalts. PROVA sollte das imitieren.
