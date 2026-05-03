# Power-Setup MAX — Final-Report

**Datum:** 03.05.2026 mittag
**Sprint:** Power-Setup MAX (Marcel Max-Plan-Edition)
**Wall-Clock-Time:** ~25 Min (CC-Teil — Marcel-Plugin-Installs separat)

---

## 🎯 Was passiert ist

### Was Claude Code (autonom) erledigt hat

#### `.claude/`-Konfig (geshared via Repo)
- ✅ `.claude/settings.json` — Pre-Allowed-Permissions (allow/ask/deny) + PostToolUse-Hooks (auto-`node --check` + pseudo-Import-Check) + Stop-Beep
- ✅ `.claude/commands/prova-deploy.md` — Deploy-Workflow
- ✅ `.claude/commands/prova-status.md` — Sprint-Status-Übersicht
- ✅ `.claude/commands/prova-test.md` — Komplette Test-Suite
- ✅ `.claude/commands/prova-verify-stripe.md` — Stripe-Verifikation
- ✅ `.claude/agents/prova-rls-auditor.md` — Specialized RLS-Subagent

#### Repo-Anpassungen
- ✅ `.gitignore` — `.claude/` als Ganzes nicht mehr ignoriert; nur `settings.local.json` + Cache/Session-Dirs
- ✅ `CLAUDE.md` v3.1 — Power-Tools-Sektion + Compounding-Engineering-Lessons ergänzt (existierende v3.0 bleibt erhalten)
- ✅ `docs/strategie/CC-LOOPS-WORKFLOW.md` — 4 Loops dokumentiert mit Marcel-Decision-Slots

### Was Marcel selbst machen muss (Slash-Commands in seiner CLI)

❌ Diese Befehle kann ich nicht ausführen — Marcel führt sie in seiner Claude-Code-CLI:

#### Welle 1 — GRATIS Plug-and-Play
```bash
# claude-mem (Persistent Memory)
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem

# claude-hud (Status-Bar)
/plugin marketplace add jarrodwatts/claude-hud
/plugin install claude-hud
/claude-hud:setup
# → CC neu starten
```

#### Welle 2 — Workflow-Booster
```bash
# context-mode
/plugin marketplace add scottconverse/context-mode
/plugin install context-mode
# → CC neu starten
/context-mode:ctx-doctor

# last30days (braucht OPENAI_API_KEY)
# Erst .env-File anlegen:
mkdir -p $HOME/.config/last30days
echo "OPENAI_API_KEY=<dein-key>" > $HOME/.config/last30days/.env
chmod 600 $HOME/.config/last30days/.env
# Dann Plugin:
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days@last30days-skill
# Test:
/last30days Bausachverständige KI Software 2026

# SDD-Kit
/plugin marketplace add NeoLabHQ/context-engineering-kit
/plugin install sdd@NeoLabHQ/context-engineering-kit

# security-sweep
/plugin marketplace add ComposioHQ/awesome-claude-plugins
/plugin install security-sweep@composiohq-awesome-claude-plugins
```

#### Welle 4 — /loop Aktivierung (Marcel-Decision pflicht)

Empfehlung: Loop 1 + 2 sofort aktivieren.

```bash
# Loop 1: Daily Smoke-Test
/loop 24h "Run scripts/smoke-test-cutover.sh. Wenn nicht 15/15 grün: GitHub-Issue erstellen mit Titel 'Daily Smoke-Test failed' und vollem Output."

# Loop 2: npm audit (alle 6h)
/loop 6h "Run 'npm audit --audit-level=high'. Wenn neue HIGH/CRITICAL Vulnerabilities: GitHub-Issue mit Details."

# Loop 3 + 4: NACH Pilot-Start (siehe docs/strategie/CC-LOOPS-WORKFLOW.md)
```

#### Verifikation
```bash
/plugin list           # alle 6 Plugins active?
/permissions           # allow/ask/deny korrekt geladen?
/prova-status          # custom slash-command funktioniert?
> Was weisst du ueber PROVA Systems?  # claude-mem aktiv?
```

---

## 🚫 Bewusst übersprungen (Marcel-Direktive)

| Tool | Begründung |
|---|---|
| **Zilliz / claude-context** | Repo-Größe rechtfertigt Vector-DB nicht |
| **Compound Engineering (OpenAI Codex)** | Extra-Cost, Overkill für Pre-Pilot |
| **Worktrees** | Marcel arbeitet sequenziell |
| **Voice-Input** | Marcel tippt gerne |

---

## 📋 11 Tools — Status-Übersicht

| # | Tool | Wer-installiert | Status |
|---|---|---|---|
| 1 | claude-mem | Marcel | ⏳ Slash-Command |
| 2 | claude-hud | Marcel | ⏳ Slash-Command |
| 3 | context-mode | Marcel | ⏳ Slash-Command |
| 4 | last30days | Marcel | ⏳ Slash-Command + OPENAI-Key |
| 5 | SDD-Kit | Marcel | ⏳ Slash-Command |
| 6 | security-sweep | Marcel | ⏳ Slash-Command |
| 7 | Pre-Allowed Permissions | CC | ✅ `.claude/settings.json` |
| 8 | CLAUDE.md im Repo | CC | ✅ v3.1 erweitert |
| 9 | Custom Slash-Commands (4) | CC | ✅ `.claude/commands/` |
| 10 | Custom Subagent | CC | ✅ `.claude/agents/prova-rls-auditor.md` |
| 11 | Hooks (PostToolUse + Stop) | CC | ✅ in settings.json |

---

## 🔁 Quick-Reference: welcher Befehl wofür

### Custom Slash-Commands (in `.claude/commands/`)
- `/prova-deploy` — Deploy-Workflow (Tests + sw.js Bump + Push)
- `/prova-status` — Sprint-Status auf einen Blick
- `/prova-test` — alle 4 Test-Suiten laufen lassen
- `/prova-verify-stripe` — Stripe-Setup verifizieren

### Custom Subagent (via `Agent`-Tool aufrufen)
- `prova-rls-auditor` — RLS-Policy-Audit gegen Supabase

### npm scripts (in `package.json`, von früheren Sprints)
- `npm run verify-stripe` — ENV + API + Webhook-Endpoint + Coupon
- `npm run test-webhook` — Mock-Event signiert senden
- `npm run test-checkouts` — 7 Test-Checkout-URLs
- `npm run stripe-status` — Live-Webhook-Health
- `npm run stripe-replay` — Failed-Event Re-Delivery
- `npm run test:stripe` — Stripe Unit-Tests (27 Tests)
- `npm run test:multitenant` — Multi-Tenant-Isolation (33 Tests)

### Standard CC-Slash-Commands (Marcel kann nutzen)
- `/effort high` (default) / `/effort max` (security-critical)
- `/context-mode:ctx-doctor` — context-status checken
- `/context-mode:ctx-purge` — context-mode AUS bei Audits
- `/loops` — aktive Loops anzeigen
- `/loops stop <id>` — Loop stoppen
- `/plugin list` — installierte Plugins

---

## 🔒 Welche Hooks aktiv

In `.claude/settings.json`:

### PostToolUse (nach jedem Write/Edit)
1. **node --check** auf alle JS-Files — auto-Syntax-Check
2. **prova-pseudo-Import-Check** auf KI-Functions (`netlify/functions/ki-*`) — Warnung wenn Pseudonymisierung-Import fehlt

### Stop (nach Sprint-Ende)
- **PowerShell-Beep** (800Hz, 300ms) — weniger störend als Popup

→ Marcel kann via `.claude/settings.local.json` (gitignored) lokal überschreiben falls Beep zu nervig.

---

## 🛡️ Welche Permissions vorab erlaubt

### `allow` (kein Prompt — direkt ausführen)
- alle `npm run *` und `npm test:*`
- alle Read-Only git-Befehle (`status`, `log`, `diff`, `branch`, `show`)
- `git add`, `git commit`, `git tag`, `git fetch`, `git pull`
- `node --check *`, `node scripts/*`, `node --test tests/*`
- `supabase functions deploy/list`, `supabase migration list`, `supabase db diff`
- `netlify status/env:list/functions:list`
- Edit auf `/docs/**`, `/scripts/**`, `/tests/**`, `/netlify/functions/**`, `/supabase/functions/**`, `/src/**`, `/.claude/**`, `/email-templates/**`
- Read auf alles

### `ask` (Marcel-Bestätigung pflicht)
- `rm:*` (alle rm-Befehle)
- `git push:*`, `git reset:*`
- `supabase db push`, `supabase functions invoke *`
- Edit auf `/supabase/migrations/**`, `/CLAUDE.md`, `/package.json`, `/netlify.toml`, `/sw.js`

### `deny` (NIEMALS — auch nicht mit Bestätigung)
- `rm -rf:*`
- `supabase db reset`
- `git push --force:*`
- `git reset --hard:*`
- `npm publish`

---

## 🚨 Marcel-Pflicht-Aktionen (ab JETZT)

### TOP 6 (priorisiert)

1. **Plugin-Installs:** Welle 1 + 2 (6 Plugins) — siehe Befehle oben (~15 Min)
2. **OPENAI_API_KEY** für last30days bereitstellen + `.env` anlegen (~3 Min)
3. **CC neu starten** nach claude-hud-Setup + context-mode-Install
4. **`/loop 1` + `/loop 2`** aktivieren (Daily Smoke-Test + npm audit) — ~2 Min
5. **Verifikation:** `/plugin list` + `/permissions` + `/prova-status` (~5 Min)
6. **Optional:** `/effort high` als Default setzen

**Total Marcel-Aufwand:** ~30 Min.

### Marcel-Decisions noch offen

- Beep oder Popup für Stop-Hook? — Default ist Beep, Marcel kann in `.claude/settings.local.json` überschreiben
- Loop 3 + 4 nach Pilot-Start aktivieren — Reminder in Marcel-Pflicht-Aktionen

---

## 📊 Was Marcel jetzt hat

### Workflow-Beschleuniger
- **Pre-Allowed Permissions** — keine Confirmation für 25+ Standard-Operationen
- **PostToolUse-Hooks** — auto-Syntax-Check, kein manuelles `node --check` mehr
- **Custom Slash-Commands** — `/prova-deploy` statt 7 Manual-Steps
- **Stop-Beep** — Audio-Feedback wenn Sprint fertig

### Sicherheit + Qualität
- **Pseudo-Import-Hook** — Warnung wenn neue KI-Function ohne Pseudonymisierung
- **`ask`-Liste** — kritische Operations brauchen Bestätigung
- **`deny`-Liste** — destruktive Befehle blockiert

### Spezielle Subagents
- **prova-rls-auditor** — Read-Only RLS-Audits ohne Risiko

### Pre-Pilot-Monitoring (nach Marcel-Aktivierung)
- **Loop 1** — daily Smoke-Test
- **Loop 2** — 6h npm audit
- **Loop 3 + 4** nach Pilot — Webhook + Cost

---

## 🧠 Wachstums-Notizen

### Was gut war
1. **Klare Trennung CC-Scope vs Marcel-Scope:** Slash-Commands kann ich nicht selbst absetzen — sauber dokumentiert was wer macht
2. **Compounding-Engineering-Sektion in CLAUDE.md:** lernende Doku — bei wiederkehrenden Fehlern ergänzen
3. **Settings.json-Schema:** `$schema`-Referenz hilft Marcel bei späteren Edits (autocomplete)

### Lessons
1. **`.claude/`-gitignore:** vorher als ganzes ignoriert — geänderte Pattern erlaubt jetzt Sharing aber schützt Cache/Session-State
2. **Hook-Pattern `$CLAUDE_FILE_PATHS`:** stabiler als `$file_path` (CC liefert Mehrfach-Files in dieser Var)
3. **Custom-Subagent-Pattern:** color + tools + Constraints klar definieren — Marcel sieht im UI welcher Agent für was

---

*Power-Setup MAX done 03.05.2026 mittag · Marcel-Plugin-Installs nächster Schritt*
