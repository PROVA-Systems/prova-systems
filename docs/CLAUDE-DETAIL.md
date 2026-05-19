# PROVA — Detail-Regeln (Lazy-Load)

> CC liest diese Datei NUR wenn aus `CLAUDE.md` referenziert oder Marcel explizit darum bittet. Sie ist NICHT Teil des automatischen Pre-Reads.

---

## Detaillierte Master-File-Hierarchie (bei Bedarf)

Master-Files für Vision, Architektur, Sprint-Status:
- `PROVA-VISION-MASTER.md` — 4-Flow-Architektur, Tier-Modell, Feature-Vision
- `PROVA-REGELN-PERMANENT.md` — Anti-Patterns, Recherche-Pflicht, §407a-Compliance
- `PROVA-ARCHITEKTUR-MASTER.md` — System-Architektur, Bus-Pattern, Edge-Function-Verträge
- `PROVA-SPRINTS-MASTERPLAN.md` — Sprint-Reihenfolge + Acceptance pro Sprint
- `CLAUDE_KARTOGRAPHIE.md` — Repo-Map, file-by-file Status
- `PROVA-CHAT-TRANSPORT-vAKTUELL.md` — Aktueller Stand (Session-Übergabe)

**Lese-Regel:** Web-Claude liefert pro Sprint die nötigen Files explizit referenziert. CC öffnet nur, was wirklich gebraucht wird.

---

## Repo-Struktur

```
prova-systems/
├── CLAUDE.md                          ← Kern-Regeln (auto-load)
├── docs/CLAUDE-DETAIL.md              ← Diese Datei (lazy-load)
├── PROVA-*.md                         ← Master-Docs (auf Anfrage)
├── supabase-migrations/               ← Versionierte Schema-Files
├── supabase/functions/                ← Edge Functions (Deno/TS)
├── netlify/functions/                 ← Bridge-Functions
├── lib/                               ← Frontend-Lib (supabase-client, data-store, …)
├── public/ + Root *.html              ← Pages
├── docs/                              ← Specs + Audits
└── _archiv/                           ← Quarantäne (nicht ausführen, nicht löschen)
```

---

## Sprint-Workflow

**Sprint-Start:**
1. Sprint-Spec von Web-Claude lesen (1 Seite, Acceptance + Files + Pattern)
2. Code-Check: was existiert von den genannten Files?
3. Scope-Fix: keine Erweiterungen über Sprint-Spec hinaus
4. Bei Mehrdeutigkeit: stoppen + Marcel fragen

**Implementierung:**
- Pro Commit eine logische Einheit
- Commit-Message: `<sprint>: <Kurzbeschreibung>` (z.B. `mega75-A: RLS workspace_id fix in app-logic.js`)
- Nach jedem Commit: `node --check` für JS-Files
- Bei sw.js-relevanter Änderung: CACHE_VERSION +1

**Sprint-Abschluss-Liefer-Format:**
1. **Was geändert** (File-Liste mit Pfad)
2. **Warum** (Sprint-Bezug)
3. **Was Marcel testet** (Klick-Checkliste max 10 Punkte)
4. **Bekannte Limits** (was geht noch nicht)
5. **TAG-Empfehlung** (optional, z.B. `v3231` nach Sprint A grün)

---

## §6 Fachurteil — Vollausbau-Detail (M30-I3)

**Editor-Pattern:**
- Leeres Textfeld dominiert (60% Viewport), Auto-Fokus
- Befunde-Panel rechts (rein faktisch aus §1-§5, KEINE Formulierungen)
- 500-Zeichen-Eigenleistung-Gate als Pflichtschwelle
- 2/3 Qualitäts-Marker erforderlich: Norm-Verweis ODER Konjunktiv-II ODER §-Verweis
- Override mit Modal-Bestätigung (3 Optionen: weitermachen / abbrechen / Override-mit-Begründung)
- Override-Eintrag in `audit_trail` mit user_id, auftrag_id, begründung, zeichen_count
- Copy/Paste erlaubt (NIE `user-select: none`), aber Paste-Events in `audit_trail` geloggt

**KI-Stufen (strikt getrennt, opt-in):**
- **S1 Mechanisch** (Rechtschreibung, Komma, Grammatik) — live erlaubt
- **S2 Strukturell** (Absätze, Überschriften) — auf Klick mit Diff-Anzeige
- **S3 Inhaltlich** (Konjunktiv II, Halluzinations-Check, Fachsprache) — auf Klick mit Begründung

**Vor-Freigabe automatisch (nicht opt-in):**
- Halluzinations-Check (gpt-5.5, vergleicht Output gegen Diktat+Stamm-Daten)
- §407a-Compliance-Check
- KI-Offenlegungs-Hinweis aktiviert

---

## KI-Funktions-Garantie (5 Pflicht-Tests)

Jede KI-Funktion vor Produktiv-Deployment:

1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
2. **Edge-Cases** — 5 Extreme (sehr kurz / sehr lang / ohne Satzzeichen / viel Fachbegriffe / Tippfehler) liefern Ergebnis oder sauberes „nicht anwendbar"
3. **Präzision** — bei 20 korrekten Texten: max 10% Falsch-Positiv-Rate
4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

**Wenn ein Test rot ist → Funktion wird im UI ausgeblendet bis grün.**

---

## Tooltip-Regel (UX)

- Tooltips erklären **NUR PROVA-spezifische Funktionen** (was speichert das System wo, wofür wird's weiterverwendet)
- Tooltips erklären **NIEMALS Fachbegriffe** (Aktenzeichen, DIN 4108, §407a) — Marcel ist 30 Jahre Profi, wir patronisieren niemanden

---

## Empty-States — Pflicht-Struktur

1. Icon (groß, freundlich, passend)
2. Titel (was fehlt, neutral, nicht beschämend)
3. 1-2 Sätze was nach der Aktion passiert
4. **Primär-Button** (Pflicht, nicht optional)
5. Optional zweiter Weg (Demo-Fall-Link, Video, Hilfe)

Bei neuen Usern: Demo-Fall-Link auf `SCH-DEMO-001` zeigen.

---

## DSGVO — Pflicht-Functions

- `dsgvo_user_export()` und `dsgvo_user_loeschen()` als DB-Functions (Phase 4)
- Exposed via Edge Function `dsgvo-handler` — nie umgehen
- **Forced Re-Consent**: bei `rechtsdokumente.aktuell = TRUE` müssen aktive User vor nächstem Login neu zustimmen
- View `v_user_pending_einwilligungen` + Function `record_einwilligung()` nutzen
- AVV-Konformität: alle Speicherorte mit `avv.html` + `versicherungs_partner` synchron

---

## Stripe — Idempotenz & Webhooks

- Stripe-Events haben UNIQUE-Constraint in `stripe_events.stripe_event_id`
- Bei Duplicate: 200 zurück, **nicht** erneut verarbeiten
- Stripe-Trial-Logic: `payment_method_collection: 'always'` setzen sonst keine Kartenverifikation während Trial
- Webhook-Secret: NACH Stripe-Live-Registrierung im Env-Var ersetzen (Placeholder → echtes Secret)

---

## Edge Functions — Konventionen

- Pfad: `/supabase/functions/<name>/index.ts`
- Deno + TypeScript
- CORS-Header in jedem HTTP-Endpoint: `Access-Control-Allow-Origin: https://prova-systems.de` (oder via ENV)
- Audit-Logging bei state-changing Ops: Eintrag in `audit_trail` mit `function_name`, pseudonymisiertem `payload`, `result`
- Lokal testen → `supabase functions deploy <name>`

---

## Migrations — Konventionen

- Naming: `<NN>_<verb>_<topic>.sql` (z.B. `07_add_invoice_attachments.sql`)
- Fortlaufende Nummern, kein Lücken-Springen
- Idempotente DDL: `CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DO $$ BEGIN … EXCEPTION END $$` für ENUMs
- GENERATED Columns nur mit IMMUTABLE Functions (`lower()` OK, `unaccent()` NICHT — ist STABLE)
- `CREATE OR REPLACE VIEW` kann KEINE Spalten umbenennen → DROP VIEW + CREATE neu

---

## Power-Tools (Max-Plan-Edition)

Aktive CC-Plugins:
- **claude-mem** — persistent memory zwischen Sessions
- **claude-hud** — Status-Bar (context% + cost-tracking)
- **context-mode** — 90% Token-Sparsamkeit
- **last30days** — Trend-Recherche (OPENAI_API_KEY pflicht)
- **SDD-Kit** — Spec-Driven-Development
- **security-sweep** — OWASP Auto-Scanner

Custom-Konfig in `.claude/`:
- `settings.json` — Pre-Allowed Permissions + PostToolUse-Hooks (auto-`node --check`, pseudo-Import-Check)
- `commands/`:
  - `/prova-deploy` — Deploy-Workflow (Tests + sw.js Bump + Push)
  - `/prova-status` — Sprint-Status-Übersicht
  - `/prova-test` — komplette Test-Suite
  - `/prova-verify-stripe` — Stripe-Setup-Verifikation
- `agents/prova-rls-auditor.md` — Specialized Subagent für RLS-Audits

**Wann `/context-mode` deaktivieren**: bei Security-Audits, Compliance-Reviews, Threat-Modeling, RLS-Migrations → `/context-mode:ctx-purge` temporär.

**Wann `/effort max` nutzen**: Default ist `high`. `max` für: RLS-Migrations, Threat-Modeling, Architecture-Decisions, Security-Critical-Refactors.

---

## /loop Workflows (Status)

- ✅ Loop 1: Daily Smoke-Test (24h)
- ✅ Loop 2: npm audit Check (6h)
- ⏸ Loop 3: Stripe-Webhook-Health (aktivieren nach Pilot-Start)
- ⏸ Loop 4: Cost-Monitoring (aktivieren nach Pilot-Start)

---

## Bewusst übersprungen

- Zilliz / claude-context (Vector-DB nicht nötig bei Repo-Größe)
- OpenAI Codex Compound (Overkill für Pre-Pilot)
- Worktrees (Marcel arbeitet sequenziell)
- Voice-Input (Marcel tippt)

---

## Compounding Engineering — Wenn CC einen Fehler macht

Pattern:
1. Marcel weist auf Fehler hin
2. CC erfasst Pattern als `## Bei X — beachte Y`-Sektion in `CLAUDE.md` (Kern-Regeln) ODER hier in `CLAUDE-DETAIL.md` (wenn detailliert)
3. Marcel committet als permanent

---

## Veraltet (nicht mehr nutzen)

- Sprint-K-1.0 bis K-1.5 — längst durch
- Alte Pricing-Tiers Starter/Pro/Enterprise — Stripe-Produkt `prod_USPFOII3IfSrqg` archivieren
- Cloudinary-Foto-Upload — wird zu Supabase-Storage migriert
- Netlify Identity — wird zu Supabase Auth migriert
- GPT-4o + GPT-4o-mini — deprecated Feb 2026, ersetzt durch gpt-5.5 + gpt-5.5-instant
- `airtable.js` Proxy + Make.com — werden im laufenden Cleanup-Marathon abgebaut (NICHT mehr „nicht antasten"!)
