# MEGA⁷⁶ — Marcel-Manual-Tasks nach Push

**Status:** Code ist gepusht auf `feat/mega74-ein-system` (Branch + nach Squash-Merge auch `main`).
**Diese Liste:** Was Marcel **manuell** machen muss — nicht im Code automatisiert, weil destruktiv oder außerhalb des Repos.

---

## G.1 · Netlify ENV-Variablen löschen

**Wo:** Netlify Dashboard → Site → Site configuration → Environment variables.

**Diese 12 sind nach MEGA76 obsolet:**

- [ ] `AIRTABLE_PAT`
- [ ] `AIRTABLE_TOKEN` (falls separater Eintrag)
- [ ] `AIRTABLE_BASE`
- [ ] `AIRTABLE_BASE_K` (Kontakte-Base falls separat)
- [ ] `AIRTABLE_BASE_S` (Schadensfälle-Base falls separat)
- [ ] `AIRTABLE_TABLE_SV`
- [ ] `AIRTABLE_TABLE_FAELLE`
- [ ] `AIRTABLE_TABLE_RECHNUNGEN`
- [ ] `AIRTABLE_TABLE_TERMINE`
- [ ] `AIRTABLE_TABLE_KONTAKTE`
- [ ] `AIRTABLE_TABLE_BRIEFE`
- [ ] `AIRTABLE_API_VERSION`

**Plus:** Falls weitere `AIRTABLE_*`-ENVs aus älteren Sprints existieren — auch raus.

**Restbestand server-side (nicht hier löschen, kommt in MEGA77):**
Die folgenden Netlify-Functions haben **noch** direkte `api.airtable.com`-Calls und nutzen `process.env.AIRTABLE_PAT`:
- `netlify/functions/ki-statistik.js`
- `netlify/functions/push-notify.js`
- `netlify/functions/team-interest.js`

→ **Nach ENV-Löschung schlagen diese Calls automatisch fehl** (`Bearer undefined` = 401 von Airtable-API). Das ist ok für jetzt — die Functions werden in MEGA77 entfernt oder auf Supabase migriert.

---

## G.2 · Airtable-Base archivieren (NICHT löschen)

1. Airtable.com öffnen
2. Base `appJ7bLlAHZoxENWE` (PROVA-Systems-Base)
3. Per Base-Menü → **Move to Trash** (= 7-Tage-Wiederherstellung möglich)
4. **Erst nach 14 Tagen Stable-Run** endgültig löschen. DSGVO-Aufbewahrung ist via Supabase-Migration erfüllt; das hier ist nur Backup-Sicherheit für ungeplante Recovery-Cases.

---

## G.3 · Make.com Connection deaktivieren

**Connection-ID `5417164` (Airtable-Connection):**
1. Make.com → My Connections → Connection `5417164`
2. **„Deactivate"** (nicht löschen)
3. Grund: einige Scenarios können noch Airtable-Module enthalten — bei Deaktivierung schlagen die fehl, bei Löschung würden sie still scheitern und Marcel weiß nicht warum.

---

## G.4 · Make.com Scenarios — Audit der 10 betroffenen

**Marcel öffnet jedes der 10 Scenarios und prüft Module-für-Module ob ein Airtable-Modul drin ist:**

- [ ] G1 (Scenario-ID 4867125)
- [ ] G3 (4790180)
- [ ] K2 (4920914)
- [ ] L3 (5038113)
- [ ] L8 (5147509)
- [ ] L9 (5147516)
- [ ] L10 (5158552)
- [ ] A5 (5147393)
- [ ] T3 (5147519)
- [ ] F1 (5192002)

**Pro Airtable-Modul gefunden:**
- (a) Wenn relevant (z.B. "neuer Kontakt anlegen") → durch Supabase-HTTP-Modul ersetzen
- (b) Wenn nur Telemetrie/Log → Modul löschen, Scenario neu testen

**Diese Aufgabe ist nicht Sprint-Acceptance** — kann nach MEGA76-Push erledigt werden. Solange die Connection nur deaktiviert ist, laufen die Scenarios weiter; Module fallen erst bei Connection-Reconnect-Attempt aus.

---

## G.5 · sw.js-Pattern für MEGA77 ändern

**Hinweis von CC an Marcel:** Die `CACHE_VERSION`-Kommentare in `sw.js` werden absurd lang (10+ vorherige Sprints inline). Empfehlung ab MEGA77:

- Nur 1-Satz-Versionsnotiz im Kommentar
- Link auf `docs/MEGA<N>-DECISIONS.md` für Details

**In MEGA76 noch unverändertes Pattern** — würde sonst dieses Sprint-Scope-Creep.

---

## G.6 · Smoke-Test nach Push

**Pre-Test:**
- Cache leeren (Hard-Reload Strg+Shift+R)
- InPrivate/Inkognito-Browser
- DevTools-Console öffnen + Network-Tab aktiviert

**8 Pages, je 30s:**

| # | Page | Aktion | Erwartung |
|---|---|---|---|
| 1 | `dashboard.html` | nur laden | 0× airtable in Console, KPIs gefüllt oder "nur Admin"-silent |
| 2 | `archiv.html` | Kanban scrollen, einen Fall anklicken | 0× airtable, Daten aus Supabase |
| 3 | `kontakte.html` | Liste laden, einen Kontakt öffnen | 0× airtable, plz/ort/typ korrekt befüllt (Bug A.4) |
| 4 | `hilfe.html` | Ticket abschicken | 0× airtable, kein 400, Toast OK, Ticket in `support_tickets` (per Supabase-MCP nachschauen) |
| 5 | `einstellungen.html` | Profil-Tab öffnen, Felder lesen | 0× airtable, name/qualifikation aus Supabase |
| 6 | `vor-ort.html` | Wizard Step 1+2+3 mit Abgabefrist | Auftrag in `auftraege` + Frist in `fristen` (NICHT in `termine`) |
| 7 | `gericht-auftrag.html` | Wizard durchklicken bis Submit | 0× airtable, Auftrag in `auftraege` mit typ='gericht' |
| 8 | ein Brief-HTML (z.B. `terminabsage.html`) | Brief generieren | 0× airtable, Eintrag in `dokumente` + `audit_trail` |

**Failure-Trigger:** Bei JEDEM `airtable`-String in Console → STOP, melden, CC re-diagnose.

**Success-Trigger:** 0× airtable in allen 8 Tests → squash-merge `feat/mega74-ein-system` → `main`.
