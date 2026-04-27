# PROVA Systems — Arbeits-Richtlinien für Claude Code

**Version:** v3.0 (27. April 2026 — nach Voll-Supabase-Refactor + Make-Out-Decision)
**Vorgänger:** v2.1 (vor Schema-Refactor) — archiviert in `/docs/archiv-alte-sprints/CLAUDE-v2.1.md`

---

## 🎯 AKTIVER PLAN

Ab 27. April 2026 läuft Sprint K-1 (Voll-Supabase-Migration in 6 Sub-Sprints):

```
PROVA-SUPABASE-REFACTOR-MASTER.md   ← Strategische Master-Doku (lesen!)
PROVA-CHAT-TRANSPORT-v35.md         ← Aktueller Stand
SPRINT-K-1-0-MASTER-PROMPT.md       ← Aktiver Sub-Sprint
EDGE-FUNCTION-INVENTAR-K-1-2.md     ← Vorausschau für K-1.2
/supabase-migrations/                ← 6 Schema-SQL-Files (61 Tabellen)
```

**Pflicht-Lektüre vor jedem Sub-Sprint:**
1. `PROVA-CHAT-TRANSPORT-v35.md` (oder neuer) — wo stehen wir
2. `PROVA-SUPABASE-REFACTOR-MASTER.md` — Migration-Strategie + Decisions-Log
3. Aktueller `SPRINT-K-1-X-MASTER-PROMPT.md` — Detail-Plan
4. `PROVA-VISION-MASTER.md` — Was bauen wir (4-Flow-Architektur)
5. `PROVA-REGELN-PERMANENT.md` — Anti-Patterns

**Veraltet — nur historischer Kontext, NICHT als aktuelle Wahrheit nutzen:**
- `PROVA-ARCHITEKTUR-MASTER.md` (alter Stack: Airtable + Make + Cloudinary)
- `PROVA-CHAT-TRANSPORT-v34.md` (vor Schema-Refactor)
- `/masterplan-v2/` (alte Sprint-Struktur)
- `BLUEPRINT-v1.1.md` (alter Architektur-Stand)
- `INFRASTRUKTUR-REFERENZ.md` (alte IDs/Tabellen)
- `/docs/archiv-alte-sprints/` (Übernahme von ENV-Namen, Audit-Findings OK; Sprint nicht ausführen)

---

## ⚠️ PFLICHT-LEKTÜRE VOR JEDEM SPRINT

> Diese Datei wird bei JEDER Claude-Code-Session automatisch gelesen.
> Sie definiert Regeln und Konventionen, die niemals gebrochen werden dürfen.

---

## Was PROVA ist

PROVA ist ein KI-natives B2B-SaaS für **öffentlich bestellte und vereidigte Bausachverständige (ö.b.u.v. SV)** in Deutschland. Workflow: Auftrag → Ortstermin → Diktat → KI-Strukturhilfe → §6 Fachurteil → Freigabe → PDF → E-Mail → Rechnung → Zahlung.

**Zielgruppe:** Solo-SVs (5–30 Standardfälle/Monat) und Team-Büros. **Nicht** für 60+-Seiten-Komplexgutachten.

**4-Flow-Architektur:** A=Schaden/Mangel, B=Wertgutachten, C=Beratung, D=Baubegleitung.

---

## Tech-Stack (NEU v3.0!)

| Bereich | Technologie |
|---|---|
| **Frontend** | Vanilla JavaScript (KEIN React/Vue/Svelte), HTML5, CSS3 |
| **Datenbank** | **Supabase Postgres** (Project: `cngteblrbpwsyypexjrv`, Frankfurt) |
| **Auth** | **Supabase Auth** (Email/Password, JWT, Multi-Faktor in K-1.0) |
| **Storage** | **Supabase Storage** (Buckets: `sv-files`, `sv-public`, `sv-system`) |
| **Backend** | **Supabase Edge Functions** (Deno-basiert) |
| **Workflow** | **pg_cron + Edge Functions** (kein Make.com mehr ab K-1.5!) |
| **PDFs** | PDFMonkey (via Edge Function `pdf-generate`) |
| **Email** | **Resend** (via Edge Function `email-send`) |
| **Zahlung** | Stripe (Webhook in Edge Function `stripe-webhook`) |
| **KI** | OpenAI GPT-4o, GPT-4o-mini, Whisper (via Edge Function `ki-proxy`) |
| **Hosting** | Netlify (Frontend + paar verbleibende Functions als Bridge) |
| **Domain** | prova-systems.de (Landing) / app.prova-systems.de (App) / admin.prova-systems.de (Cockpit) |

**Reduktion:** 7 externe Services → 5 (Supabase + Resend + PDFMonkey + Stripe + OpenAI). **Make.com + Cloudinary + Netlify Identity raus.**

**WICHTIG:** Niemals zu React migrieren oder neue Frameworks einführen. Marcel hat sich bewusst für Vanilla-JS entschieden weil PROVA wartbar bleiben muss.

**WICHTIG für K-1.0–K-1.4:** Das ALTE System (Airtable + Make + Netlify Identity) **läuft parallel weiter** bis Sprint K-1.5 Cutover. Nicht antasten:
- ❌ `airtable.js` Proxy-Function NICHT antasten
- ❌ `login.html` (Netlify Identity) NICHT antasten
- ❌ Make-Scenarios NICHT deaktivieren
- ❌ Cloudinary-Foto-Upload NICHT brechen
- ❌ Bestehende 11 Auftragstyp-Pages NICHT umbauen (kommt erst in K-1.4)

---

## ⛔ HARTE REGELN — NIEMALS BRECHEN

### Datenbank (NEU v3.0!)
1. **Frontend liest/schreibt via `lib/data-store.js` und `lib/supabase-client.js`** — direkter `supabase.from()`-Aufruf nur in Skeleton-Code, in Production immer über data-store.
2. **Multi-Tenancy schützt Supabase RLS automatisch** — jede Tabelle hat RLS-Policy basierend auf `workspace_id`. Nicht selbst filtern „zur Sicherheit", das umgeht das Pattern.
3. **Neue Tabelle? → SQL-Migration in `/supabase-migrations/<NN>_<name>.sql` + RLS-Policy + data-store-Methode**, in dieser Reihenfolge.
4. **Service-Role-Key NUR Server-Side** (Edge Functions, Migrations-Skripte). NIE im Frontend-Code, auch nicht in Tests.
5. **Schema-Änderungen sind versioniert** — neues SQL-File in `/supabase-migrations/` mit fortlaufender Nummer, Datum im Header. Niemals direkt im Supabase-Dashboard SQL Editor in Production.

### Service Worker
6. **`sw.js` CACHE_VERSION bei JEDEM Deploy um 1 erhöhen** — sonst sehen User alte Version, persistenter Failure-Point.

### KI / OpenAI
7. **GPT/OpenAI/Whisper-Namen NIEMALS in der UI sichtbar** — außer in §407a-Compliance-Texten wo rechtlich Pflicht.
8. **KI macht NIE eigenständige fachliche Bewertungen** — nur strukturierte Hilfen: Konjunktiv-II-Prüfung, Halluzinations-Check, §407a-Check, Normen-Vorschläge, Rechtschreibung, Grammatik, Absatz-Strukturierung, Fachsprache-Check.
9. **Konjunktiv II PFLICHT bei KI-Kausalaussagen** — z.B. "es liegt nahe, dass..." statt "es ist...".
10. **HALLUZINATIONSVERBOT** — KI darf nichts erfinden, nur das wiedergeben was im Diktat oder den Stamm-Daten stand. Halluzinations-Check läuft automatisch vor Freigabe.

### §6 Fachurteil — Drei Verantwortungs-Stufen
11. **§6 Fachurteil-Editor folgt dem Leitsatz "SV muss ohne KI schneller schreiben können als mit"**:
    - Leeres Textfeld dominiert Seite (60% Viewport), Fokus automatisch
    - Befunde-Panel rechts (rein faktisch aus §1-§5, KEINE Formulierungen vorgeben)
    - Mindestens 500 Zeichen Eigenleistung + 2/3 Qualitäts-Marker (Norm/Konjunktiv/§-Verweis) als Gate
    - Override mit Modal-Bestätigung + Audit-Eintrag in `audit_trail`
    - **Copy/Paste erlaubt** (KEIN `user-select: none`), aber Paste-Events werden in `audit_trail` geloggt

12. **KI-Hilfen sind opt-in, nicht default** — keine KI-Anzeige ohne expliziten SV-Klick. Ausnahmen: Halluzinations-Check und §407a-Check vor Freigabe (laufen automatisch).

13. **Drei KI-Verantwortungs-Stufen strikt getrennt:**
    - **S1 Mechanisch** (Rechtschreibung, Kommas, Grammatik) — live erlaubt
    - **S2 Strukturell** (Absätze, Überschriften) — auf Klick mit Diff-Anzeige
    - **S3 Inhaltlich** (Konjunktiv II, Halluzinations-Check, Fachsprache) — auf Klick mit Begründung

14. **Konjunktiv-II-Check verwendet GPT-4o, NICHT GPT-4o-mini** — Mini scheitert reproduzierbar an deutscher Konjunktiv-II-Grammatik. Prompts in `/KI-PROMPTS-MASTER.md` (32K Zeichen, von Marcel getestet).

### KI-Funktions-Garantie
15. **Jede KI-Funktion muss vor Produktiv-Deployment 5 Tests bestehen:**
    1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
    2. **Edge-Cases** — 5 Extreme (sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler) liefern entweder Ergebnis oder sauberes "nicht anwendbar"
    3. **Präzision** — bei 20 korrekten Texten: maximal 10% Falsch-Positiv-Rate
    4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
    5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

    **Wenn ein Test rot ist → Funktion wird im UI ausgeblendet bis grün.** Nicht-funktionierende KI-Funktionen kosten Pilotkunden.

### KI-Kosten-Tracking
16. **Jeder KI-Call MUSS in `ki_protokoll` loggen:** `workspace_id`, `user_id`, `funktion`, `modell`, `tokens_in`, `tokens_out`, `kosten_eur`, `auftrag_id` (falls), `created_at`. Plus Aggregation in `feature_events`. Ohne dieses Logging kein Cockpit-Monitoring → keine Pricing-Anpassung möglich.

### DSGVO
17. **Pseudonymisierung VOR jeder OpenAI-Übertragung** — Namen/Adressen/Emails/IBAN durch Platzhalter ersetzen. Server-side Pflicht in Edge Function `ki-proxy` (nicht nur client).
18. **AVV-Konformität** — alle Speicherorte und Verarbeitungen müssen mit `avv.html` und der Tabelle `versicherungs_partner` übereinstimmen.
19. **DSGVO-Pflicht-Functions:** `dsgvo_user_export()` und `dsgvo_user_loeschen()` (DB-Functions in Phase 4) sind via Edge Function `dsgvo-handler` exposed. Niemals umgehen.
20. **Forced Re-Consent** — bei neuer Version eines Rechtsdokuments (`rechtsdokumente.aktuell = TRUE`) müssen alle aktiven User vor nächstem Login neu zustimmen. View `v_user_pending_einwilligungen` und Function `record_einwilligung()` nutzen.

### Pricing
21. **Solo (149€/mo) und Team (279€/mo)** — KEINE anderen Tier-Namen, NIEMALS andere Preise.
22. **Add-ons:** 5F=`price_1TJLnv8`, 10F=`price_1TJLpG8`.
23. **Founding-Members:** 99€ lifetime für erste 10 Pilotkunden (Stripe-Coupon `FOUNDING-99`).

### Code-Hygiene
24. **`node --check <file>` VOR jeder Datei-Auslieferung** — Syntax-Fehler stoppen alles.
25. **Neue JS-Files müssen in alle relevanten HTML-Pages eingebunden werden** — sonst lädt der Code nicht.
26. **Cloudflare-E-Mail-Obfuscation muss AUS bleiben** — `skip_processing = true` in `netlify.toml`.

### Legal Pages
27. **Legal-Pages bleiben am Root** (impressum.html, datenschutz.html, agb.html, avv.html) — 48+ Cross-References, NICHT in Subfolder verschieben.

### Code-Stil
28. **Niemals von Original-Files bauen** → immer aktuelles File aus Repo lesen, dann ändern.
29. **Co-Founder-Ownership** — bei Unsicherheit nicht raten, sondern Marcel fragen.
30. **Frontend-JS/CSS-Änderungen erfordern sw.js CACHE_VERSION-Bump im selben Commit.** Jeder Commit, der eine Datei aus `APP_SHELL` (sw.js Zeile 11+) oder eine im SW-Runtime-Cache liegende `.js`/`.css`-Datei ändert, MUSS im selben Commit `sw.js` CACHE_VERSION inkrementieren. Kein Sammel-Bump am Ende eines Sprints.

### Edge Functions (NEU v3.0!)
31. **Edge Functions in `/supabase/functions/<name>/index.ts`** — Deno + TypeScript.
32. **Idempotenz für Webhook-Handler** — Stripe-Events haben UNIQUE-Constraint in `stripe_events.stripe_event_id`. Bei Duplicate: 200 zurück, nicht erneut verarbeiten.
33. **CORS-Header in jedem HTTP-Endpoint** — `Access-Control-Allow-Origin: https://prova-systems.de` (oder via ENV configurable).
34. **Audit-Logging für Edge Functions** — bei state-changing Operations: Eintrag in `audit_trail` mit `function_name`, `payload` (pseudonymisiert), `result`.

### Schema-Änderungen (NEU v3.0!)
35. **Migration-File-Naming:** `<NN>_<verb>_<topic>.sql` — z.B. `07_add_invoice_attachments.sql`. Fortlaufende Nummer, kein Lücken-Springen.
36. **Idempotente DDL:** `CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DO $$ BEGIN ... EXCEPTION END $$` für ENUMs.
37. **GENERATED Columns nur mit IMMUTABLE Functions** — `lower()` OK, `unaccent()` NICHT (ist STABLE). Bei Bedarf: BEFORE-Trigger statt GENERATED.
38. **CREATE OR REPLACE VIEW kann keine Spalten umbenennen** → DROP VIEW + CREATE neu.

---

## Tooltip-Regel (UX)

Tooltips erklären **NUR PROVA-spezifische Funktionen** (was speichert das System wo, wofür wird es weiterverwendet).

Tooltips erklären **NIEMALS Fachbegriffe** (was ist ein Aktenzeichen, was ist DIN 4108, was ist §407a). Marcel ist 30 Jahre Profi — wir patronisieren ihn nicht.

---

## Empty-States — Regel

Empty-States sind eigene Features, **nicht** Lückenfüller. Pflicht-Struktur:
1. Icon (groß, freundlich, passend)
2. Titel (was fehlt, neutral, nicht beschämend)
3. 1-2 Sätze was passiert nach der Aktion
4. **Primär-Button** (nicht optional!)
5. **Optional zweiter Weg** (Demo-Fall-Link, Video, Hilfe)

Bei neuen Usern: Demo-Fall-Link auf SCH-DEMO-001 zeigen.

---

## Arbeitsverzeichnis

```
C:\PROVA-Systems\prova-systems\GitHub\prova-systems\
```

Alle Änderungen passieren hier. Push zu GitHub triggert automatisch Netlify-Deploy.

**Repo-Struktur (NEU v3.0!):**
```
prova-systems/
├── CLAUDE.md                              ← Diese Datei (v3.0)
├── PROVA-VISION-MASTER.md                 ← 4-Flow-Architektur, Tier-Modell
├── PROVA-REGELN-PERMANENT.md              ← Anti-Patterns
├── PROVA-CHAT-TRANSPORT-v35.md            ← Aktueller Stand (jeweils neueste)
├── PROVA-SUPABASE-REFACTOR-MASTER.md      ← Migration-Strategie
├── SPRINT-K-1-X-MASTER-PROMPT.md          ← Aktueller Sub-Sprint
├── EDGE-FUNCTION-INVENTAR-K-1-2.md        ← Edge-Function-Plan
├── KI-PROMPTS-MASTER.md                   ← KI-Prompts
├── CHANGELOG-MASTER.md                    ← Sprint-Historie (chronologisch)
├── supabase-migrations/                   ← SQL-Schema-Files (versioniert)
│   ├── 01_schema_foundation.sql
│   ├── 02_schema_kerngeschaeft.sql
│   ├── 03_schema_artefakte_storage.sql
│   ├── 04_schema_komplett_finale.sql
│   ├── 05_v2_patch_billing_master_uebersicht_FIXED.sql
│   └── 06_v3_patch_final_lueckenschluss.sql
├── supabase/
│   └── functions/                         ← Edge Functions (ab K-1.2)
│       ├── pdf-generate/
│       ├── email-send/
│       ├── user-lifecycle/
│       ├── stripe-webhook/
│       └── ...
├── lib/                                   ← Frontend-Lib (ab K-1.0)
│   ├── supabase-client.js
│   ├── data-store.js
│   └── template-registry.js
├── netlify/functions/                     ← Bestehende, werden in K-1.2 reduziert
├── public/                                ← HTML-Pages
├── docs/
│   ├── FLOSKELN-SEED-DATEN.md             ← Seed für textbausteine (bleibt)
│   ├── FREELANCER-BRIEFING.md             ← Bleibt
│   ├── UI-DIAGNOSE-AKUT.md                ← Mobile-Bugs (bleibt)
│   └── archiv-alte-sprints/               ← Nur Referenz
└── README.md
```

---

## Vor jeder Multi-File-Änderung

1. **Lies das aktuelle Sprint-Dokument** (`SPRINT-K-1-X-MASTER-PROMPT.md`)
2. **Lies `PROVA-SUPABASE-REFACTOR-MASTER.md`** — verstehe die Migration-Strategie
3. **Lies `PROVA-CHAT-TRANSPORT-v3X.md`** — kenne den aktuellen Stand
4. **Lies die zu ändernden Files vollständig** — nicht raten was drin steht
5. **Plan vorlegen, dann ausführen** — bei Mehrdeutigkeit: stoppen, Marcel fragen

---

## Bei jeder Datei-Änderung

1. **`node --check` laufen lassen** falls JS-Datei
2. **Wenn `sw.js` im Spiel ist: CACHE_VERSION inkrementieren**
3. **Commit mit aussagekräftiger Message** (Format: `K-1.X.Y: Was und Warum`)
4. **Bei Schema-Änderungen: neues File in `/supabase-migrations/`, nicht direkt im Dashboard**
5. **Bei Edge-Function-Änderungen: lokal testen, dann `supabase functions deploy`**
6. **Bei KI-Functions: Test-Suite ergänzen** (siehe Regel 15)

---

## Sprint-Workflow

**Pro Sub-Sprint immer dieser Ablauf:**

### 1. Sprint-Start-Ritual
- Lies das Sprint-Dokument vollständig
- Code-Check: was existiert von den genannten Files?
- Datenfluss-Check: was läuft heute, was kommt neu?
- Scope-Fix: keine Erweiterungen über das Sprint-Dokument hinaus

### 2. Implementierung in Commits
- Pro Commit eine logische Einheit
- Commit-Message-Format: `K-1.X.Y: <Kurzbeschreibung>` (z.B. „K-1.0.4: data-store.js Skeleton")
- Nach jedem Commit: `node --check` für JS-Files
- Wenn `sw.js` betroffen: CACHE_VERSION +1

### 3. Sprint-Abschluss
- Acceptance-Kriterien aus Sprint-Doc durchgehen
- TAG-BEFUND setzen (Format: `v300-supabase-foundation` für K-1.5 Cutover)
- Push zu GitHub
- Liefere Marcel:
  - **Was wurde geändert** (File-Liste)
  - **Warum** (Sprint-Bezug)
  - **Was muss Marcel testen** (klare Klick-Checkliste)
  - **Bekannte Limitierungen** (was geht noch nicht)

### 4. Memory + CHANGELOG-Update
- Marcel macht das selbst über Memory-Updates
- Du erinnerst ihn nur am Ende: „Sprint X done — bitte Memory aktualisieren + CHANGELOG-MASTER ergänzen"

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
- ❌ RLS-Policies umgehen mit Service-Role-Key im Frontend
- ❌ KI-Bewertungen schreiben lassen (nur strukturierte Hilfen)
- ❌ §6 Fachurteil von KI generieren lassen (SV macht es selbst)
- ❌ DSGVO-Klardaten an OpenAI senden ohne Pseudonymisierung
- ❌ Cache-Version vergessen zu erhöhen
- ❌ Files aus früheren Sessions blind übernehmen ohne sie zu lesen
- ❌ Legal-Pages in Subfolder verschieben
- ❌ KI-Funktion live schalten ohne KI-Funktions-Garantie-Tests (5 Tests Pflicht)
- ❌ KI-Calls ohne `ki_protokoll`-Logging schreiben
- ❌ Konjunktiv-II-Check mit GPT-4o-mini bauen (nur GPT-4o!)
- ❌ „Ich glaube schon dass..." → bei Unsicherheit IMMER fragen oder nachschauen
- ❌ Make.com-Scenarios in Sprint K-1.0 bis K-1.4 deaktivieren (erst in K-1.5!)
- ❌ Bestehende `airtable.js`/`login.html`/Cloudinary-Integration brechen vor K-1.5
- ❌ Schema direkt im Supabase-Dashboard SQL Editor in Production ändern
- ❌ GENERATED Columns mit nicht-IMMUTABLE Functions (z.B. `unaccent()`)
- ❌ Migrations-Files mit Lücken-Nummern oder ohne Datum

---

## Wenn du fertig bist

Liefere immer:
1. **Was wurde geändert** (File-Liste mit Pfad)
2. **Warum** (Sprint-Bezug)
3. **Was muss Marcel testen** (klare Klick-Checkliste, max 10 Punkte)
4. **Bekannte Limitierungen** (was geht noch nicht)
5. **TAG-Empfehlung** (z.B. `v300-supabase-foundation` nach K-1.5 grün)

---

## 📋 Sprint-K-1-Übersicht (Mini-Roadmap)

```
K-1.0  Foundation (Supabase-Client + Auth + Frontend-Lib)        6-8h    NEXT
K-1.1  Migrations-Pipeline (Airtable → Supabase)                 8-12h
K-1.2  Edge Functions (8 Stück, ersetzt alle Make-Scenarios)     6-8h
K-1.3  Frontend-Pilot Kurzstellungnahme                          4-6h
K-1.4  Frontend-Refactor Rest (11 Pages + Bürotools)             12-16h
K-1.5  Cutover + Make-Deaktivierung + Tag                        3-4h
```

**Total Sprint K-1: 6-7 Arbeitstage. Nach Cutover: Make-Account kündigen.**

---

*Ende CLAUDE.md v3.0*
