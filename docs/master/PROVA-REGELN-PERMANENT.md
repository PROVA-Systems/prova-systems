# PROVA Regeln Permanent

**Stand:** 01.05.2026 abend (Tag 7)
**Single Source of Truth** — siehe `docs/master/README.md`
**Quellen:** `CLAUDE.md` v3.0 (Repo-Root, lebend) + Tag-7-Lessons-Learned

---

## Wozu dieses File?

Konsolidierte Regel-Liste die NIE gebrochen werden darf. `CLAUDE.md` im Repo-Root ist die **lebende Operations-Quelle** (wird von Claude Code beim Sprint-Start automatisch gelesen). Diese Datei hier ist die **architektonisch-strategische Regel-Quelle** für Marcel zur Knowledge-Sync und für Audit-Zwecke.

Bei Konflikt: **`CLAUDE.md` gewinnt** (operations-relevanter, häufiger aktualisiert). Wenn ein Konflikt auftritt → in `CLAUDE.md` und HIER beide synchronisieren.

---

## Datenbank (1-5)

### Regel 1 — Frontend nutzt `lib/data-store.js`
Frontend liest/schreibt via `lib/data-store.js` und `lib/supabase-client.js`. Direkter `supabase.from()`-Aufruf nur in Skeleton-Code, in Production immer über data-store.

### Regel 2 — Multi-Tenancy via Supabase RLS
Multi-Tenancy schützt Supabase RLS automatisch — jede Tabelle hat RLS-Policy basierend auf `workspace_id`. Nicht selbst filtern „zur Sicherheit", das umgeht das Pattern.

### Regel 3 — Schema-Änderung-Reihenfolge
Neue Tabelle? → SQL-Migration in `/supabase-migrations/<NN>_<name>.sql` + RLS-Policy + data-store-Methode, in dieser Reihenfolge.

### Regel 4 — Service-Role-Key NUR Server-Side
Service-Role-Key NUR Server-Side (Edge Functions, Migrations-Skripte). NIE im Frontend-Code, auch nicht in Tests.

### Regel 5 — Schema-Änderungen versioniert
Schema-Änderungen sind versioniert — neues SQL-File in `/supabase-migrations/` mit fortlaufender Nummer, Datum im Header. Niemals direkt im Supabase-Dashboard SQL Editor in Production.

---

## Service Worker (6)

### Regel 6 — `sw.js` CACHE_VERSION-Bump bei jedem Deploy
Bei JEDEM Deploy mit JS/CSS/HTML-Änderung in APP_SHELL (siehe sw.js APP_SHELL-Liste): CACHE_VERSION inkrementieren in DEMSELBEN Commit. Kein Sammel-Bump am Ende eines Sprints.

**Warum:** Verhindert dass User alte Version sehen — persistenter Failure-Point.

---

## KI / OpenAI (7-10)

### Regel 7 — KI-Modell-Namen NICHT in UI sichtbar
GPT/OpenAI/Whisper-Namen NIEMALS in der UI sichtbar — außer in §407a-Compliance-Texten wo rechtlich Pflicht.

### Regel 8 — KI macht NIE eigenständige fachliche Bewertungen
Nur strukturierte Hilfen: Konjunktiv-II-Prüfung, Halluzinations-Check, §407a-Check, Normen-Vorschläge, Rechtschreibung, Grammatik, Absatz-Strukturierung, Fachsprache-Check.

### Regel 9 — Konjunktiv II PFLICHT bei KI-Kausalaussagen
Z.B. „es liegt nahe, dass..." statt „es ist...".

### Regel 10 — HALLUZINATIONSVERBOT
KI darf nichts erfinden, nur das wiedergeben was im Diktat oder den Stamm-Daten stand. Halluzinations-Check läuft automatisch vor Freigabe.

---

## §6 Fachurteil — Drei Verantwortungs-Stufen (11-14)

### Regel 11 — §6 Editor-Doktrin
§6 Fachurteil-Editor folgt dem Leitsatz „SV muss ohne KI schneller schreiben können als mit":
- Leeres Textfeld dominiert Seite (60% Viewport), Fokus automatisch
- Befunde-Panel rechts (rein faktisch aus §1-§5, KEINE Formulierungen vorgeben)
- Mindestens 500 Zeichen Eigenleistung + 2/3 Qualitäts-Marker (Norm/Konjunktiv/§-Verweis) als Gate
- Override mit Modal-Bestätigung + Audit-Eintrag in `audit_trail`
- Copy/Paste erlaubt (KEIN `user-select: none`), aber Paste-Events werden in `audit_trail` geloggt

### Regel 12 — KI-Hilfen sind opt-in, nicht default
Keine KI-Anzeige ohne expliziten SV-Klick. Ausnahmen: Halluzinations-Check und §407a-Check vor Freigabe (laufen automatisch).

### Regel 13 — Drei KI-Verantwortungs-Stufen strikt getrennt
- **S1 Mechanisch** (Rechtschreibung, Kommas, Grammatik) — live erlaubt
- **S2 Strukturell** (Absätze, Überschriften) — auf Klick mit Diff-Anzeige
- **S3 Inhaltlich** (Konjunktiv II, Halluzinations-Check, Fachsprache) — auf Klick mit Begründung

### Regel 14 — Konjunktiv-II-Check verwendet GPT-4o, NICHT GPT-4o-mini
Mini scheitert reproduzierbar an deutscher Konjunktiv-II-Grammatik. Prompts in `/KI-PROMPTS-MASTER.md` (von Marcel getestet).

---

## KI-Funktions-Garantie (15)

### Regel 15 — 5 Tests vor Live-Deployment
Jede KI-Funktion muss vor Produktiv-Deployment 5 Tests bestehen:

1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
2. **Edge-Cases** — 5 Extreme (sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler) liefern entweder Ergebnis oder sauberes „nicht anwendbar"
3. **Präzision** — bei 20 korrekten Texten: maximal 10% Falsch-Positiv-Rate
4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

**Wenn ein Test rot ist → Funktion wird im UI ausgeblendet bis grün.**

> Marcel-Direktive (25.04.2026): „Wenn ein Helferlein nicht funktioniert, SV springt ab."

---

## KI-Kosten-Tracking (16)

### Regel 16 — Pflicht-Logging in `ki_protokoll`
Jeder KI-Call MUSS in `ki_protokoll` loggen: `workspace_id`, `user_id`, `funktion`, `modell`, `tokens_in`, `tokens_out`, `kosten_eur`, `auftrag_id` (falls), `created_at`. Plus Aggregation in `feature_events`. Ohne dieses Logging kein Cockpit-Monitoring → keine Pricing-Anpassung möglich.

---

## DSGVO (17-20)

### Regel 17 — Pseudonymisierung VOR OpenAI
Pseudonymisierung VOR jeder OpenAI-Übertragung — Namen/Adressen/Emails/IBAN durch Platzhalter ersetzen. Server-side Pflicht in Edge Function `ki-proxy` (nicht nur client).

### Regel 18 — AVV-Konformität
Alle Speicherorte und Verarbeitungen müssen mit `avv.html` und der Tabelle `versicherungs_partner` übereinstimmen.

### Regel 19 — DSGVO-Pflicht-Functions
`dsgvo_user_export()` und `dsgvo_user_loeschen()` (DB-Functions in Phase 4) sind via Edge Function `dsgvo-handler` exposed. Niemals umgehen.

### Regel 20 — Forced Re-Consent
Bei neuer Version eines Rechtsdokuments (`rechtsdokumente.aktuell = TRUE`) müssen alle aktiven User vor nächstem Login neu zustimmen. View `v_user_pending_einwilligungen` und Function `record_einwilligung()` nutzen.

---

## Pricing (21-23)

### Regel 21 — Tier-Namen + Preise sind fix
- **Solo:** 149 €/Monat
- **Team:** 279 €/Monat
- KEINE anderen Tier-Namen (kein Starter/Pro/Enterprise mehr), NIEMALS andere Preise.

### Regel 22 — Add-on-Stripe-IDs
- 5F = `price_1TJLnv8`
- 10F = `price_1TJLpG8`

### Regel 23 — Founding-Members
99 € lifetime für erste 10 Pilotkunden (Stripe-Coupon `FOUNDING-99`).

---

## Code-Hygiene (24-26)

### Regel 24 — `node --check` vor Auslieferung
`node --check <file>` VOR jeder Datei-Auslieferung — Syntax-Fehler stoppen alles.

### Regel 25 — Neue JS-Files in HTMLs einbinden
Neue JS-Files müssen in alle relevanten HTML-Pages eingebunden werden — sonst lädt der Code nicht.

### Regel 26 — Cloudflare-E-Mail-Obfuscation AUS
`skip_processing = true` in `netlify.toml`.

---

## Legal-Pages (27)

### Regel 27 — Legal-Pages bleiben am Root
`impressum.html`, `datenschutz.html`, `agb.html`, `avv.html` bleiben am Root — 48+ Cross-References, NICHT in Subfolder verschieben.

---

## Code-Stil (28-30)

### Regel 28 — Niemals von Original-Files bauen
Immer aktuelles File aus Repo lesen, dann ändern.

### Regel 29 — Co-Founder-Ownership
Bei Unsicherheit nicht raten, sondern Marcel fragen.

### Regel 30 — sw.js CACHE_VERSION-Bump im selben Commit
(Doppelt-Code-Hygiene-Regel zu Regel 6 — gleicher Inhalt, andere Section in CLAUDE.md.)
Frontend-JS/CSS-Änderungen erfordern sw.js CACHE_VERSION-Bump im selben Commit. Jeder Commit, der eine Datei aus `APP_SHELL` (sw.js Zeile 11+) oder eine im SW-Runtime-Cache liegende `.js`/`.css`-Datei ändert, MUSS im selben Commit `sw.js` CACHE_VERSION inkrementieren.

---

## Edge Functions (31-34)

### Regel 31 — Edge Functions in `/supabase/functions/<name>/index.ts`
Deno + TypeScript.

### Regel 32 — Idempotenz für Webhook-Handler
Stripe-Events haben UNIQUE-Constraint in `stripe_events.stripe_event_id`. Bei Duplicate: 200 zurück, nicht erneut verarbeiten.

### Regel 33 — Diagnose-First-Methodik (NEU 01.05.2026)
**Browser-Claude beschreibt Problem in fachlicher Sprache. Claude Code analysiert SELBST aus echten Files und schlägt begründete Lösung vor. KEINE blinde Code-Vorgabe von außen.**

#### Anwendungs-Trigger
Browser-Claude hat Bug-Symptom beobachtet (Loop, 401, weisser Screen, etc.) und eine Theorie. Versuchung: direkt die Theorie als Code-Auftrag durchgeben.

#### Was stattdessen passieren muss
1. **Phase 1 — VERSTEHEN** (kein Code-Change): Claude Code liest die echten Files, identifiziert Code-Stellen, validiert ODER widerlegt die Theorie aus dem Code heraus
2. **Phase 2 — HYPOTHESE-DOKU**: Diagnose-Doc unter `docs/diagnose/<bug-name>.md` mit Datei+Zeile, exakter Trigger-Bedingung, mehreren Lösungs-Optionen, Empfehlung
3. **Phase 3 — STOPP, Marcel-Freigabe**: explizite Bestätigung welche Lösungs-Variante implementiert wird
4. **Phase 4 — Implementation** (erst nach OK)

#### Rationale
Quick-Fix-Pflaster (z.B. Hotfix-1 → Hotfix-2 → noch ein Hotfix in 24h) verursachen technical debt + Folge-Bugs. Echte Diagnose vor Code-Change ist langsamer im Einzelfall, sicherer im Gesamt-System.

#### Beispiele aus Tag 7
- ✅ `docs/diagnose/LOGIN-LOOP-SOLUTION.md`: Bug nicht in `auth-supabase-logic.js` Pfad A (wie Vermutung), sondern in fehlender Bridge zu Hybrid-Pages
- ✅ `docs/diagnose/TOKEN-EXPIRED-BUG.md`: Bug in `prova-fetch-auth.js` Zeile 66-67 + Bridge-Token server-side HMAC-invalid

### Regel 34 — Hardcoded-Defaults vor Cutover greppen (NEU 01.05.2026)
**Bei Auth-Migration vom Test-File zu Production-File: alle hardcoded Defaults im Code suchen (grep) bevor Cutover. Test-Defaults im Production-Login verursachen Loops.**

#### Was prüfen
```bash
grep -n "test-supabase\|tools/test\|skeleton\|mock\|fake\|dev-only\|TODO\|FIXME" <file>
grep -rn "<verdächtige-URL>" *.js *.html
```

Suchen nach:
- Default-Redirects auf Test-Pages (`/tools/test-...`)
- Hard-codierte Email-Empfänger
- Hard-codierte Workspace-IDs
- TODO-Comments mit URL-Platzhaltern

#### Rationale + Beispiel
Tag 7: `auth-supabase-logic.js` (originally Sprint K-1.0 Test-File) hatte hardcoded `/tools/test-supabase-login.html?logged_in=1` als Default in Zeile 123 + 223. Hotfix v246 fixte beide auf `/dashboard`. Wäre vor Production-Cutover gegrept worden, wäre der Hotfix-1-Bug nie produktiv gegangen.

### Regel 35 — ENV-Var-Naming PROVA-Prefix bei Multi-Tenant (NEU 01.05.2026)
**PROVA-Prefix für ENV-Vars verwenden um Konflikt mit existierenden Variables zu vermeiden. `PROVA_SUPABASE_JWKS_URL` statt `SUPABASE_JWKS_URL`.**

#### Konvention
```
PROVA_<service>_<purpose>

Beispiele:
PROVA_SUPABASE_JWKS_URL
PROVA_SUPABASE_PROJECT_URL
PROVA_INTERNAL_WRITE_SECRET
PROVA_SETUP_SECRET
PROVA_SMTP_*
PROVA_AUDIT_TRAIL_TABLE

NICHT-Prefix erlaubt für:
- Standard-Library-ENVs (NODE_ENV, URL, NETLIFY_*, DEPLOY_URL)
- Service-spezifische Standards (STRIPE_SECRET_KEY, OPENAI_API_KEY, AIRTABLE_PAT)
```

#### Rationale
Multi-Project-Netlify-Accounts haben oft generische Namen vorbelegt. Wenn ein anderes Repo `SUPABASE_URL` benutzt, kann das aktuelle Projekt eine falsche URL erben. PROVA-Prefix isoliert eindeutig zu PROVA-internen Functions.

---

## Audit-Logging (36-37)

### Regel 36 — Audit-Logging für Edge Functions
Bei state-changing Operations: Eintrag in `audit_trail` mit `function_name`, `payload` (pseudonymisiert), `result`.

### Regel 37 — CORS-Header in jedem HTTP-Endpoint
`Access-Control-Allow-Origin: https://prova-systems.de` (oder via ENV configurable).

---

## Schema-Änderungen (38-40)

### Regel 38 — Migration-File-Naming
`<NN>_<verb>_<topic>.sql` — z.B. `07_add_invoice_attachments.sql`. Fortlaufende Nummer, kein Lücken-Springen.

### Regel 39 — Idempotente DDL
`CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DO $$ BEGIN ... EXCEPTION END $$` für ENUMs.

### Regel 40 — GENERATED Columns nur mit IMMUTABLE Functions
`lower()` OK, `unaccent()` NICHT (ist STABLE). Bei Bedarf: BEFORE-Trigger statt GENERATED.

---

## Tooltip-Regel (UX)

Tooltips erklären **NUR PROVA-spezifische Funktionen** (was speichert das System wo, wofür wird es weiterverwendet).

Tooltips erklären **NIEMALS Fachbegriffe** (was ist ein Aktenzeichen, was ist DIN 4108, was ist §407a). Marcel ist 30 Jahre Profi — wir patronisieren ihn nicht.

---

## Empty-States (UX)

Empty-States sind eigene Features, **nicht** Lückenfüller. Pflicht-Struktur:
1. Icon (groß, freundlich, passend)
2. Titel (was fehlt, neutral, nicht beschämend)
3. 1-2 Sätze was passiert nach der Aktion
4. **Primär-Button** (nicht optional!)
5. **Optional zweiter Weg** (Demo-Fall-Link, Video, Hilfe)

Bei neuen Usern: Demo-Fall-Link auf `SCH-DEMO-001` zeigen.

---

## Sprint-Workflow

### Sprint-Start-Ritual
1. Lies das aktuelle Sprint-Dokument vollständig
2. Code-Check: was existiert von den genannten Files?
3. Datenfluss-Check: was läuft heute, was kommt neu?
4. Scope-Fix: keine Erweiterungen über das Sprint-Dokument hinaus

### Pro Commit
- Eine logische Einheit
- Format: `K-1.X.Y: <Kurzbeschreibung>` (z.B. „K-1.0.4: data-store.js Skeleton") oder semantisch (`fix:`, `feat:`, `docs:`)
- Nach jedem Commit: `node --check` für JS-Files
- Wenn `sw.js` betroffen: CACHE_VERSION +1 im selben Commit

### Sprint-Abschluss
- Acceptance-Kriterien aus Sprint-Doc durchgehen
- TAG-BEFUND setzen (Format: `vXXX-<topic>-done`)
- Push zu GitHub
- Liefere Marcel:
  - **Was wurde geändert** (File-Liste)
  - **Warum** (Sprint-Bezug)
  - **Was muss Marcel testen** (klare Klick-Checkliste, max 10 Punkte)
  - **Bekannte Limitierungen**
- Master-Doku aktualisieren (siehe `docs/master/README.md` Update-Protokoll)

---

## Was du als Claude Code NIE tun darfst (CLAUDE.md kondensiert)

- ❌ Pricing ändern (Solo 149 € / Team 279 € sind fix)
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
- ❌ Schema direkt im Supabase-Dashboard SQL Editor in Production ändern
- ❌ GENERATED Columns mit nicht-IMMUTABLE Functions
- ❌ Migrations-Files mit Lücken-Nummern oder ohne Datum
- ❌ Quick-Fix-Pflaster ohne Diagnose (Regel 33)
- ❌ Hardcoded-Test-Defaults ungeprüft in Production schicken (Regel 34)
- ❌ ENV-Vars ohne PROVA-Prefix in Multi-Tenant-Setup (Regel 35)

---

## Wenn Claude Code fertig ist

Liefere immer:
1. **Was wurde geändert** (File-Liste mit Pfad)
2. **Warum** (Sprint-Bezug)
3. **Was muss Marcel testen** (klare Klick-Checkliste, max 10 Punkte)
4. **Bekannte Limitierungen** (was geht noch nicht)
5. **TAG-Empfehlung** (z.B. `v202-jwt-server-verify` nach Option-C grün)
6. **Master-Doku-Update** wenn Architektur/Sprint/Regel betroffen (`docs/master/README.md` Update-Protokoll)

---

*Regeln-Permanent 01.05.2026 abend · Single Source of Truth · Aktualisiert von Claude Code bei jeder neuen Regel-Discovery*
