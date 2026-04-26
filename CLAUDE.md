# PROVA Systems — Arbeits-Richtlinien für Claude Code

**Version:** v2.1 (25. April 2026 — nach Masterplan-v2.1-Einführung)

---

## 🎯 AKTIVER PLAN

Ab 25. April 2026 ist der aktive Arbeitsplan:

```
/masterplan-v2/         ← Pilot-Ready Plan, 21 Tage, v2.1 (HIER!)
/KI-PROMPTS-MASTER.md   ← KI-Prompts für Sprint 9 (im Root)
```

**Pflicht-Lektüre vor jedem Sprint:**
1. `/masterplan-v2/00_MASTERPLAN.md` — Gesamtüberblick
2. `/masterplan-v2/SPRINT-XX-*.md` — der konkrete Sprint
3. `/masterplan-v2/01_UI-PRINZIPIEN.md` — bei UI-Arbeit
4. `/AKTUELLE-ABWEICHUNGEN.md` — falls vorhanden, bei Widersprüchen entscheidet diese Datei

**Archivierte alte Sprints:**
```
/docs/archiv-alte-sprints/   ← nur Referenz, NICHT mehr ausführen
```
Wenn Du dort etwas Nützliches findest (Airtable-IDs, ENV-Namen, Befunde) — übernehmen ist OK. Aber den alten Sprint nicht ausführen, der ist überholt.

---

## ⚠️ PFLICHT-LEKTÜRE VOR JEDEM SPRINT

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
| **Automation** | Make.com (Team 1089536, Folder 320185) — wird abgelöst durch Netlify Functions in Sprint 13/14 |
| **PDFs** | PDFMonkey |
| **Zahlung** | Stripe |
| **E-Mail** | IONOS SMTP |
| **KI** | OpenAI GPT-4o, GPT-4o-mini, Whisper |
| **Storage** | Netlify Blobs (Pro-Plan, 100 GB) für Audio + Backups |
| **Hosting** | Netlify (Site 79cd5c61-e8e8-451e-9bf1-e2d17f971386) |
| **Domain** | prova-systems.de (Landing) / app.prova-systems.de (App, ab Sprint 19) / admin.prova-systems.de (Cockpit, ab Sprint 18) |

**WICHTIG:** Niemals zu React migrieren oder neue Frameworks einführen. Marcel hat sich bewusst für Vanilla-JS entschieden weil PROVA wartbar bleiben muss.

---

## ⛔ HARTE REGELN — NIEMALS BRECHEN

### Datenbank
1. **`airtable.js` liest `payload:`, NICHT `body:`** — Verstöße führen zu stillem Schreib-Fail
2. **ALLE Airtable-Queries MÜSSEN `sv_email`-Filter enthalten** (Multi-Tenant-Sicherheit, kritisch!)
3. **Neue Tabelle? → muss in `ALLOWED_TABLES`-Whitelist von `airtable.js` eingetragen werden**, sonst nicht erreichbar

### Service Worker
4. **`sw.js` CACHE_VERSION bei JEDEM Deploy um 1 erhöhen** — sonst sehen User alte Version, persistenter Failure-Point

### KI / OpenAI (überarbeitet v2.1!)
5. **GPT/OpenAI/Whisper-Namen NIEMALS in der UI sichtbar** — außer in §407a-Compliance-Texten wo rechtlich Pflicht
6. **KI macht NIE eigenständige fachliche Bewertungen** — nur strukturierte Hilfen: Konjunktiv-II-Prüfung, Halluzinations-Check, §407a-Check, Normen-Vorschläge, Rechtschreibung, Grammatik, Absatz-Strukturierung, Fachsprache-Check
7. **Konjunktiv II PFLICHT bei KI-Kausalaussagen** — z.B. "es liegt nahe, dass..." statt "es ist..."
8. **HALLUZINATIONSVERBOT** — KI darf nichts erfinden, nur das wiedergeben was im Diktat oder den Stamm-Daten stand. Halluzinations-Check läuft automatisch vor Freigabe.

### §6 Fachurteil — Drei Verantwortungs-Stufen (NEU v2.1!)
9. **§6 Fachurteil-Editor folgt dem Leitsatz "SV muss ohne KI schneller schreiben können als mit"**:
   - Leeres Textfeld dominiert Seite (60% Viewport), Fokus automatisch
   - Befunde-Panel rechts (rein faktisch aus §1-§5, KEINE Formulierungen vorgeben)
   - Mindestens 500 Zeichen Eigenleistung + 2/3 Qualitäts-Marker (Norm/Konjunktiv/§-Verweis) als Gate
   - Override mit Modal-Bestätigung + Audit-Eintrag
   - **Copy/Paste erlaubt** (KEIN `user-select: none`), aber Paste-Events werden in AUDIT_TRAIL geloggt

10. **KI-Hilfen sind opt-in, nicht default** — keine KI-Anzeige ohne expliziten SV-Klick. Ausnahmen nur: Halluzinations-Check und §407a-Check vor Freigabe (laufen automatisch).

11. **Drei KI-Verantwortungs-Stufen strikt getrennt:**
    - **S1 Mechanisch** (Rechtschreibung, Kommas, Grammatik) — live erlaubt
    - **S2 Strukturell** (Absätze, Überschriften) — auf Klick mit Diff-Anzeige
    - **S3 Inhaltlich** (Konjunktiv II, Halluzinations-Check, Fachsprache) — auf Klick mit Begründung

12. **Konjunktiv-II-Check verwendet GPT-4o, NICHT GPT-4o-mini** — Mini scheitert reproduzierbar an deutscher Konjunktiv-II-Grammatik. Prompt liegt in `/KI-PROMPTS-MASTER.md` (32K Zeichen, von Marcel getestet).

### KI-Funktions-Garantie (NEU v2.1!)
13. **Jede KI-Funktion muss vor Produktiv-Deployment 5 Tests bestehen:**
    1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
    2. **Edge-Cases** — 5 Extreme (sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler) liefern entweder Ergebnis oder sauberes "nicht anwendbar"
    3. **Präzision** — bei 20 korrekten Texten: maximal 10% Falsch-Positiv-Rate
    4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
    5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

    **Wenn ein Test rot ist → Funktion wird im UI ausgeblendet bis grün.** Marcel hat klargestellt: "Wenn ein Helferlein nicht funktioniert, bin ich verbrannt." Nicht-funktionierende KI-Funktionen kosten Pilotkunden.

### KI-Kosten-Tracking (NEU v2.1!)
14. **Jeder KI-Call MUSS in KI_STATISTIK loggen:** sv_email, funktion, modell, tokens_in, tokens_out, kosten_eur, fall_id, zeitpunkt. Ohne dieses Logging kein Cockpit-Monitoring → keine Pricing-Anpassung möglich.

### DSGVO
15. **Pseudonymisierung VOR jeder OpenAI-Übertragung** — Namen/Adressen/Emails/IBAN durch Platzhalter ersetzen. Server-side Pflicht (nicht nur client).
16. **AVV-Konformität** — alle Speicherorte und Verarbeitungen müssen mit `avv.html` übereinstimmen

### Pricing
17. **Solo (149€/mo) und Team (279€/mo)** — KEINE anderen Tier-Namen, NIEMALS andere Preise
18. **Add-ons:** 5F=`price_1TJLnv8`, 10F=`price_1TJLpG8`
19. **Founding-Members:** 99€ lifetime für erste 10 Pilotkunden (Stripe-Coupon `FOUNDING-99`)

### Code-Hygiene
20. **`node --check <file>` VOR jeder Datei-Auslieferung** — Syntax-Fehler stoppen alles
21. **Neue JS-Files müssen in alle relevanten HTML-Pages eingebunden werden** — sonst lädt der Code nicht
22. **Cloudflare-E-Mail-Obfuscation muss AUS bleiben** — `skip_processing = true` in `netlify.toml`

### Legal Pages
23. **Legal-Pages bleiben am Root** (impressum.html, datenschutz.html, agb.html, avv.html) — 48+ Cross-References, NICHT in Subfolder verschieben

### Code-Stil
24. **Bei `airtable.js`: `var` statt `const` für Top-Level-Variablen** (vermeidet Konflikte mit anderen geladenen Skripten)
25. **Niemals von Original-Files bauen** → immer aktuelles File aus Repo lesen, dann ändern
26. **Co-Founder-Ownership** — bei Unsicherheit nicht raten, sondern Marcel fragen
27. **Frontend-JS/CSS-Änderungen erfordern sw.js CACHE_VERSION-Bump im selben Commit.** Jeder Commit, der eine Datei aus `APP_SHELL` (sw.js Zeile 11+) oder eine im SW-Runtime-Cache liegende `.js`/`.css`-Datei ändert, MUSS im selben Commit `sw.js` CACHE_VERSION inkrementieren. Kein Sammel-Bump am Ende eines Sprints. Begründung: verlorener Sprint S-SICHER P4A am 25.04.2026 — Block B brach den Browser-Login, vermutete Ursache war alter SW-Cache, Rollback erforderlich.

---

## Tooltip-Regel (UX)

Tooltips erklären **NUR PROVA-spezifische Funktionen** (was speichert das System wo, wofür wird es weiterverwendet).

Tooltips erklären **NIEMALS Fachbegriffe** (was ist ein Aktenzeichen, was ist DIN 4108, was ist §407a). Marcel ist 30 Jahre Profi — wir patronisieren ihn nicht.

---

## Empty-States — Regel (NEU v2.1!)

Empty-States sind eigene Features, **nicht** Lückenfüller. Pflicht-Struktur:
1. Icon (groß, freundlich, passend)
2. Titel (was fehlt, neutral, nicht beschämend)
3. 1-2 Sätze was passiert nach der Aktion
4. **Primär-Button** (nicht optional!)
5. **Optional zweiter Weg** (Demo-Fall-Link, Video, Hilfe)

Bei neuen Usern: Demo-Fall-Link auf SCH-DEMO-001 zeigen (kommt in Sprint 20).

---

## Arbeitsverzeichnis

```
C:\PROVA-Systems\prova-systems\GitHub\prova-systems\
```

Alle Änderungen passieren hier. Push zu GitHub triggert automatisch Netlify-Deploy.

**Repo-Struktur:**
```
prova-systems/
├── masterplan-v2/                ← Aktiver Arbeitsplan (lesen!)
├── docs/
│   ├── BLUEPRINT-v1.1.md         ← Architektur (lesen vor Multi-File!)
│   ├── INFRASTRUKTUR-REFERENZ.md ← IDs, Verbindungen
│   ├── AUDIT-REPORT.md           ← Aktuelle Findings
│   ├── UI-DIAGNOSE-AKUT.md       ← Mobile-Bugs
│   └── archiv-alte-sprints/      ← Nur Referenz
├── netlify/functions/
├── public/
├── KI-PROMPTS-MASTER.md          ← Vor Sprint 9 zwingend!
├── CLAUDE.md                      ← Diese Datei
├── README.md
└── ...
```

---

## Vor jeder Multi-File-Änderung

1. **Lies das aktuelle Sprint-Dokument** (`masterplan-v2/SPRINT-XX-*.md`)
2. **Lies `docs/BLUEPRINT-v1.1.md`** — verstehe die Architektur
3. **Lies `docs/INFRASTRUKTUR-REFERENZ.md`** — kenne IDs und Verbindungen
4. **Lies die zu ändernden Files vollständig** — nicht raten was drin steht
5. **Plan vorlegen, dann ausführen** — bei Mehrdeutigkeit: stoppen, Marcel fragen

---

## Bei jeder Datei-Änderung

1. **`node --check` laufen lassen** falls JS-Datei
2. **Wenn `sw.js` im Spiel ist: CACHE_VERSION inkrementieren**
3. **Commit mit aussagekräftiger Message** (Format: `Sprint XX: Was und Warum`)
4. **Bei Airtable-relevanten Änderungen: `airtable.js` Whitelist prüfen**
5. **Bei KI-Functions: Test-Suite ergänzen** (siehe Regel 13)

---

## Sprint-Workflow (NEU v2.1!)

**Pro Sprint immer dieser Ablauf:**

### 1. Sprint-Start-Ritual
- Lies das Sprint-Dokument vollständig
- Code-Check: was existiert von den genannten Files?
- Datenfluss-Check: was läuft heute, was kommt neu?
- Scope-Fix: keine Erweiterungen über das Sprint-Dokument hinaus

### 2. Implementierung in Commits
- Pro Commit eine logische Einheit
- Commit-Message-Format: `Sprint XX.Y: <Kurzbeschreibung>` (z.B. "Sprint 09a.3: Konjunktiv-II-Function GPT-4o")
- Nach jedem Commit: `node --check` für JS-Files
- Wenn `sw.js` betroffen: CACHE_VERSION +1

### 3. Sprint-Abschluss
- Acceptance-Kriterien aus Sprint-Doc durchgehen
- TAG-BEFUND setzen (Format: `v180-<sprint-name>-done`)
- Push zu GitHub
- Liefere Marcel:
  - **Was wurde geändert** (File-Liste)
  - **Warum** (Sprint-Bezug)
  - **Was muss Marcel testen** (klare Klick-Checkliste)
  - **Bekannte Limitierungen** (was geht noch nicht)

### 4. Memory-Update
- Marcel macht das selbst über Memory-Updates
- Du erinnerst ihn nur am Ende: "Sprint X done — bitte Memory aktualisieren"

---

## Kommunikation mit Marcel

- **Deutsch** ist die Sprache
- **Direkt und sachlich** — keine Marketing-Floskeln
- **Bei Bugs: ehrlich sagen was falsch lief, nicht beschönigen**
- **Bei Unsicherheit: nicht raten, sondern fragen**
- **Co-Founder-Ton, nicht Assistenten-Ton** — du bist gleichberechtigter Architekt

---

## Was du NIE tun darfst

- ❌ Pricing ändern (Solo 149€ / Team 279€ sind fix)
- ❌ Neue Frameworks einführen (Vanilla-JS bleibt)
- ❌ Multi-Tenant-Filter weglassen (auch nicht "vorübergehend")
- ❌ KI-Bewertungen schreiben lassen (nur strukturierte Hilfen)
- ❌ §6 Fachurteil von KI generieren lassen (SV macht es selbst)
- ❌ DSGVO-Klardaten an OpenAI senden ohne Pseudonymisierung
- ❌ Cache-Version vergessen zu erhöhen
- ❌ Files aus früheren Sessions blind übernehmen ohne sie zu lesen
- ❌ Legal-Pages in Subfolder verschieben
- ❌ KI-Funktion live schalten ohne KI-Funktions-Garantie-Tests (5 Tests Pflicht)
- ❌ KI-Calls ohne KI_STATISTIK-Logging schreiben
- ❌ Konjunktiv-II-Check mit GPT-4o-mini bauen (nur GPT-4o!)
- ❌ "Ich glaube schon dass..." → bei Unsicherheit IMMER fragen oder nachschauen
- ❌ Alte Sprint-Dokumente aus `/docs/archiv-alte-sprints/` als gültig behandeln

---

## Wenn du fertig bist

Liefere immer:
1. **Was wurde geändert** (File-Liste mit Pfad)
2. **Warum** (Sprint-Bezug)
3. **Was muss Marcel testen** (klare Klick-Checkliste, max 10 Punkte)
4. **Bekannte Limitierungen** (was geht noch nicht)
5. **TAG-Empfehlung** (z.B. `v180-sprint-01-done`)
