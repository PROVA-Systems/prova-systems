# PROVA /loop Workflows (Claude Code Max-Plan)

**Stand:** 03.05.2026 (MEGA-SKALIERUNG M5)
**Status:** Loop 1 + Loop 2 = **READY** (Activation-Pflicht durch Marcel in eigener CC-Session, siehe unten)
**Zielgruppe:** Marcel (Loop-Aktivierung) + zukünftiges Team
**Voraussetzung:** Claude Max 20€/Monat (`/loop` ist Max-Plan-Feature)

---

## ⚡ Marcel-Activation (M5 — sofort 2 Min)

`/loop`-Tasks laufen in der CC-Session in der sie aktiviert wurden. Damit sie dauerhaft fire (auch wenn CC-Window geschlossen wird), nutze entweder:

- **`/loop`** in einer dauerhaft offenen CC-Session (Marcel-Workstation), oder
- **`/schedule`** für true-Cron auf Anthropic-Backend (empfohlen wenn Marcel CC oft schliesst)

**Sofort aktivieren (Copy-Paste in deine CC-CLI):**

```
/loop 24h "Run scripts/smoke-test-cutover.sh from PROVA-repo. If not 15/15 green, create GitHub issue with title 'Daily Smoke-Test failed [date]' and full output. Otherwise log success briefly."
```

```
/loop 6h "Run 'npm audit --audit-level=high' in PROVA-repo. If new HIGH or CRITICAL vulnerabilities found, create GitHub issue with details and recommended fix command. Otherwise log only."
```

Verifikation:
```
/loops
```
→ sollte beide als `active` listen.

---

---

## Was sind /loops?

Recurring-Tasks die Claude Code in regelmäßigen Abständen ausführt. Pre-Pilot-Phase nutzt das für **proaktive Alerts** statt Marcel reaktiv reagieren muss.

---

## Empfohlene Loops für PROVA-Pre-Pilot

### Loop 1: Daily Smoke-Test (✅ READY zum aktivieren — siehe Marcel-Activation oben)

**Cadence:** alle 24h
**Wert:** Marcel weiß JEDEN Morgen ob das System läuft

```bash
/loop 24h "Run scripts/smoke-test-cutover.sh. Wenn nicht 15/15 grün: GitHub-Issue erstellen mit Titel 'Daily Smoke-Test failed' und vollem Output. Sonst nur kurze Erfolgs-Notiz im Audit-Log."
```

**Was passiert wenn rot:**
- GitHub-Issue mit Tag `auto-monitoring` + Sprint-Status-File-Verweis
- Marcel wird per GitHub-Email benachrichtigt
- Reaktion innerhalb 4h Pflicht (Pre-Pilot)

---

### Loop 2: npm audit (✅ READY zum aktivieren — siehe Marcel-Activation oben)

**Cadence:** alle 6h
**Wert:** Security-Updates ohne dass Marcel dran denken muss

```bash
/loop 6h "Run 'npm audit --audit-level=high'. Wenn neue HIGH oder CRITICAL Vulnerabilities seit letztem Check: GitHub-Issue mit Details + betroffenen Packages + Fix-Vorschlag. Sonst nur Log."
```

**Was passiert wenn rot:**
- GitHub-Issue mit Tag `security-vuln`
- Issue-Body: CVE-Liste + `npm audit fix`-Vorschlag oder Major-Bump-Empfehlung

---

### Loop 3: Stripe-Webhook-Health (⏸ EMPFOHLEN nach Pilot-Start)

**Cadence:** alle 6h
**Wert:** Pilot-Phase — Garant dass Zahlungen ankommen
**Voraussetzung:** mindestens 1 Pilot-SV registriert

```bash
/loop 6h "Run 'npm run stripe-status'. Wenn > 0 Failed-Events in den letzten 24h: GitHub-Issue + Vorschlag 'npm run stripe-replay' für die failed events. Wenn alles grün: nur Log."
```

**Was passiert wenn rot:**
- GitHub-Issue mit Tag `stripe-webhook-failed`
- Marcel-Action: `npm run stripe-replay --all`
- Bei wiederholtem Fail: Marcel investigiert Root-Cause

---

### Loop 4: KI-Cost-Monitoring (⏸ EMPFOHLEN nach Pilot-Start)

**Cadence:** alle 24h + wöchentlich Montag-Summary
**Wert:** Cost-Awareness während Pilot — verhindert Überraschungen

```bash
/loop 24h "Query Supabase ki_protokoll für OpenAI-Cost in letzten 24h. Wenn > 5€ in einem Tag: GitHub-Issue mit Top-5 User nach Cost. Jeden Montag: zusätzliche Wochen-Summary mit Trend."
```

**Was passiert wenn rot:**
- GitHub-Issue mit Tag `ki-cost-spike`
- Body: `workspace_id` + KI-Calls-Anzahl + Token-Aggregat
- Marcel-Action: User direkt kontaktieren oder Tagesquota-Limit erwägen

---

## Marcel-Decision: Welche Loops jetzt aktivieren?

Marcel macht Häkchen, dann führe Marcel die Befehle in seiner Claude-Code-CLI aus:

- [ ] **Loop 1** (Daily Smoke-Test) — Empfehlung: **JA** sofort
- [ ] **Loop 2** (npm audit) — Empfehlung: **JA** sofort
- [ ] **Loop 3** (Stripe-Webhook-Health) — Empfehlung: **NACH** erstem Pilot-Signup
- [ ] **Loop 4** (KI-Cost-Monitoring) — Empfehlung: **NACH** erstem Pilot

---

## Loop-Management-Befehle

### Aktive Loops anzeigen
```bash
/loops
```

### Loop stoppen
```bash
/loops stop <loop-id>
```

### Loop pausieren temporär (z.B. bei Refactor-Sprint)
```bash
/loops pause <loop-id>
```

### Loop wieder aktivieren
```bash
/loops resume <loop-id>
```

---

## Loop-Lessons (zukünftig hier ergänzen)

Wenn ein Loop unerwartet feuert oder Noise erzeugt → hier dokumentieren:

- **Bei Smoke-Test-False-Positives** wegen Netlify-Cache: Loop 1 von 24h auf 12h reduzieren? — TBD nach 2 Wochen Beobachtung
- **Bei npm-audit-Spam** durch transitive Dev-Deps: severity-Filter erhöhen oder ignore-Liste

---

## Erweiterung: Loop 5+ (Backlog)

Mögliche zukünftige Loops nach Pilot-Erfolg:

### Loop 5: Pilot-Activity-Tracking (Tag 30+)
```bash
/loop 168h "Aggregiere Pilot-SV-Activity (Anzahl Akten, KI-Calls, Logins) der letzten Woche. Marcel-Wochenrapport per GitHub-Issue."
```

### Loop 6: Sentry-Error-Trends (nach Sentry-Setup)
```bash
/loop 24h "Top 5 Errors aus Sentry der letzten 24h. Bei neuen Error-Patterns: GitHub-Issue."
```

### Loop 7: Founding-Coupon-Status (während Pilot-Akquise)
```bash
/loop 24h "Coupon FOUNDING-99 times_redeemed via Stripe-API. Bei 8/10: Marcel-Reminder dass nur 2 Plätze frei. Bei 10/10: pilot.html sold-out."
```

---

## Notifications-Setup (Stop-Hook)

Marcel ist Windows-User. `.claude/settings.json` hat `Stop`-Hook konfiguriert:

```json
{
  "hooks": {
    "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "powershell -NoProfile -Command \"[console]::beep(800, 300)\"" }] }]
  }
}
```

→ Beep nach jedem Sprint-Ende. Weniger störend als Popup.

**Wenn Marcel doch Popup will:**
```bash
# In .claude/settings.json den Stop-Hook ersetzen mit:
powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('CC fertig', 'PROVA')"
```

---

## Pre-Loop-Aktivierung-Checkliste (Marcel-Pflicht)

Vor `/loop`-Aktivierung:
- [ ] GitHub-Repo-Berechtigungen: Loop kann Issues erstellen (CC braucht repo-write-Access)
- [ ] OPENAI_API_KEY in `.env.local` falls Loop GPT für Reports braucht
- [ ] Supabase-Service-Role-Key falls Loop DB queryt (Loops 3+4)
- [ ] Disk-Space-Check (Loops loggen ins `~/Documents/Last30Days/`-Pattern oder ähnliches)

---

## Cost-Awareness

`/loop` selbst ist kostenlos (Max-Plan-Feature). Aber jeder Loop-Run **konsumiert Tokens**:
- Loop 1 (Smoke-Test): ~200 Tokens / Run × 365 Runs/Jahr = 73k/Jahr (negligible)
- Loop 2 (npm audit): ~150 Tokens / Run × 1.460 Runs/Jahr = 220k/Jahr (negligible)
- Loop 3+4: 500-1000 Tokens / Run wegen DB-Queries = 1.5-4M Tokens/Jahr (~0.50-1€/Jahr)

**Total: < 5€/Jahr Token-Cost** für alle 4 Loops. Akzeptabel.

---

*CC-Loops-Workflow 03.05.2026 · Marcel-Decisions pending*
