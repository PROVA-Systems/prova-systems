# PROVA Systems — Arbeits-Richtlinien für Claude Code

## ⚠️ PFLICHT-LEKTÜRE VOR JEDEM SPRINT

Lies IMMER zuerst `AKTUELLE-ABWEICHUNGEN.md` im Repo-Root.
Dort sind Abweichungen zwischen Sprint-Dokumenten und dem tatsächlichen
Airtable-/Netlify-/Code-Zustand dokumentiert. Diese Datei gewinnt bei Widersprüchen.

> Diese Datei wird bei JEDER Claude-Code-Session automatisch gelesen.
> Sie definiert Regeln und Konventionen, die niemals gebrochen werden dürfen.

---

## Was PROVA ist

PROVA ist ein KI-natives B2B-SaaS für **öffentlich bestellte und vereidigte Bausachverständige (ö.b.u.v. SV)** in Deutschland. Der ganze Workflow eines SV wird abgebildet: Auftrag → Ortstermin → Diktat → KI-Strukturhilfe → §6 Fachurteil → Freigabe → PDF → E-Mail → Rechnung → Zahlung.

**Zielgruppe:** Solo-SVs, die 5–30 Standardfälle/Monat bearbeiten. **Nicht** für 60+ Seiten Komplexgutachten.

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| **Frontend** | Vanilla JavaScript (KEIN React/Vue/Svelte), HTML5, CSS3 |
| **Backend** | Netlify Functions (Node.js) |
| **Datenbank** | Airtable (Base appJ7bLlAHZoxENWE) |
| **Automation** | Make.com (Team 1089536, Folder 320185) |
| **PDFs** | PDFMonkey |
| **Zahlung** | Stripe |
| **E-Mail** | IONOS SMTP |
| **KI** | OpenAI GPT-4o, GPT-4o-mini, Whisper |
| **Hosting** | Netlify (Site 79cd5c61-e8e8-451e-9bf1-e2d17f971386) |
| **Domain** | prova-systems.de |

**WICHTIG:** Niemals zu React migrieren oder neue Frameworks einführen. Marcel hat sich bewusst für Vanilla-JS entschieden weil PROVA wartbar bleiben muss.

---

## ⛔ HARTE REGELN — NIEMALS BRECHEN

### Datenbank
1. **`airtable.js` liest `payload:`, NICHT `body:`** — Verstöße führen zu stillem Schreib-Fail
2. **ALLE Airtable-Queries MÜSSEN `sv_email`-Filter enthalten** (Multi-Tenant-Sicherheit, kritisch!)
3. **Neue Tabelle? → muss in `ALLOWED_TABLES`-Whitelist von `airtable.js` eingetragen werden**, sonst nicht erreichbar

### Service Worker
4. **`sw.js` CACHE_VERSION bei JEDEM Deploy um 1 erhöhen** — sonst sehen User alte Version, persistenter Failure-Point

### KI / OpenAI
5. **GPT/OpenAI/Whisper-Namen NIEMALS in der UI sichtbar** — außer in §407a-Compliance-Texten wo rechtlich Pflicht
6. **KI macht NIE Bewertungen** — nur Strukturhilfen, Konjunktiv-II-Prüfung, Normen-Vorschläge, Rechtschreibung
7. **Konjunktiv II PFLICHT bei KI-Kausalaussagen** — z.B. "es liegt nahe, dass..." statt "es ist..."
8. **HALLUZINATIONSVERBOT** — KI darf nichts erfinden, nur das wiedergeben was im Diktat stand
9. **§6 Fachurteil ist KI-FREI** — Eingabe nicht Copy-Paste-fähig, mindestens 500 Zeichen Eigenleistung des SV

### DSGVO
10. **Pseudonymisierung VOR jeder OpenAI-Übertragung** — Namen/Adressen/Emails/IBAN durch Platzhalter ersetzen
11. **AVV-Konformität** — alle Speicherorte und Verarbeitungen müssen mit `avv.html` übereinstimmen

### Pricing
12. **Solo (149€/mo) und Team (279€/mo)** — KEINE anderen Tier-Namen, NIEMALS andere Preise
13. **Add-ons:** 5F=`price_1TJLnv8`, 10F=`price_1TJLpG8`

### Code-Hygiene
14. **`node --check <file>` VOR jeder Datei-Auslieferung** — Syntax-Fehler stoppen alles
15. **Neue JS-Files müssen in alle relevanten HTML-Pages eingebunden werden** — sonst lädt der Code nicht
16. **Cloudflare-E-Mail-Obfuscation muss AUS bleiben** — `skip_processing = true` in `netlify.toml`

### Legal Pages
17. **Legal-Pages bleiben am Root** (impressum.html, datenschutz.html, agb.html, avv.html) — 48+ Cross-References, NICHT in Subfolder verschieben

### Code-Stil
18. **Bei `airtable.js`: `var` statt `const` für Top-Level-Variablen** (vermeidet Konflikte mit anderen geladenen Skripten)
19. **Niemals von Original-Files bauen** → immer aktuelles File aus Repo lesen, dann ändern
20. **Co-Founder-Ownership** — bei Unsicherheit nicht raten, sondern Marcel fragen

---

## Tooltip-Regel (UX)

Tooltips erklären **NUR PROVA-spezifische Funktionen** (was speichert das System wo, wofür wird es weiterverwendet).

Tooltips erklären **NIEMALS Fachbegriffe** (was ist ein Aktenzeichen, was ist DIN 4108, was ist §407a). Marcel ist 30 Jahre Profi — wir patronisieren ihn nicht.

---

## Arbeitsverzeichnis

```
C:\PROVA-Systems\prova-systems\GitHub\prova-systems\
```

Alle Änderungen passieren hier. Push zu GitHub triggert automatisch Netlify-Deploy.

---

## Vor jeder Multi-File-Änderung

1. **Lies `docs/BLUEPRINT-v1.1.md`** — verstehe die Architektur
2. **Lies `docs/INFRASTRUKTUR-REFERENZ.md`** — kenne IDs und Verbindungen
3. **Lies das Sprint-Dokument für die aktuelle Aufgabe** (`docs/SPRINT-XX-*.md`)
4. **Lies die zu ändernden Files vollständig** — nicht raten was drin steht
5. **Plan vorlegen, dann ausführen** — bei Mehrdeutigkeit: stoppen, Marcel fragen

---

## Bei jeder Datei-Änderung

1. **`node --check` laufen lassen** falls JS-Datei
2. **Wenn `sw.js` im Spiel ist: CACHE_VERSION inkrementieren**
3. **Commit mit aussagekräftiger Message** (Format: `Sprint XX: Was und Warum`)
4. **Bei Airtable-relevanten Änderungen: `airtable.js` Whitelist prüfen**

---

## Kommunikation mit Marcel

- **Deutsch** ist die Sprache
- **Direkt und sachlich** — keine Marketing-Floskeln
- **Bei Bugs: ehrlich sagen was falsch lief, nicht beschönigen**
- **Bei Unsicherheit: nicht raten, sondern fragen**

---

## Was du NIE tun darfst

- ❌ Pricing ändern
- ❌ Neue Frameworks einführen
- ❌ Multi-Tenant-Filter weglassen (auch nicht "vorübergehend")
- ❌ KI-Bewertungen schreiben lassen
- ❌ §6 Fachurteil von KI generieren lassen
- ❌ DSGVO-Klardaten an OpenAI senden ohne Pseudonymisierung
- ❌ Cache-Version vergessen zu erhöhen
- ❌ Files aus früheren Sessions blind übernehmen ohne sie zu lesen
- ❌ Legal-Pages in Subfolder verschieben
- ❌ "Ich glaube schon dass..." → bei Unsicherheit IMMER fragen oder nachschauen

---

## Wenn du fertig bist

Liefere immer:
1. **Was wurde geändert** (File-Liste)
2. **Warum** (Sprint-Bezug)
3. **Was muss Marcel testen** (klare Klick-Checkliste)
4. **Bekannte Limitierungen** (was geht noch nicht)

