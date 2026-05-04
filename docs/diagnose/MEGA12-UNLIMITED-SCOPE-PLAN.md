# MEGA¹² — Unlimited-Scope Self-Capacity-Assessment + Plan

**Datum:** 2026-05-05
**Vorgaenger-Tag-Empfehlungen:** v213 (MEGA⁸) + v214 (MEGA⁹) + v215 (MEGA¹⁰) + v216 (MEGA¹¹) — alle lokal, kein Push
**Modus:** Unlimited-Scope mit Bug-Hunt-Mindset (wie MEGA¹⁰+¹¹)
**Wichtige Aenderung:** Anthropic-Fallback DARF jetzt implementiert werden (Marcel hat ENV-Var heute Morgen gesetzt)

---

## 1. Brutal-Critique W6-W10 (was Senior-Engineer noch finden wuerde)

### W6 (UptimeRobot-Webhook + Status-Widget) — ich gab 9/10

**Latente Issues nach Re-Read:**

a) **In-Memory-Idempotenz hat Cold-Start-Hole** (bereits in Self-Critique markiert):
   - Lambda-Cold-Start = leerer Cache → Cross-Lambda-Replay-Window ~5min
   - Echte Loesung: Supabase-Tabelle `webhook_dedup`
   - Aber: erfordert Schema-Migration → Marcel-PLANNED-File-Pflicht

b) **Status-Widget-Multi-Instance-Bug:** wenn `mount()` 2× auf verschiedene Container aufgerufen wird, ueberschreibt das letzte das erste — beide pollen aber. Refactor-Backlog.

c) **Health-Endpoint-Caching:** widget pollt alle 60s, aber health.js hat keinen Cache-Header → bei viel Traffic ueberlastet das den health-Endpoint. Marcel-Backlog: `Cache-Control: max-age=30`.

### W7 (Plausible-Wrapper) — ich gab 9/10

**Latente Issues:**

a) **Server-Side-Goal fuer Paid-Customer fehlt** (in Self-Critique markiert):
   - Stripe-Webhook triggert kein Plausible-Event
   - Conversion-Tracking unvollstaendig

b) **PII-Filter ist nicht 100% wasserdicht:**
   - IBAN (DE-Pattern: `DE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}`) wird nicht gefiltert
   - Klarnamen werden nicht gefiltert (kann ich auch nicht statisch erkennen)
   - Akzeptiert: Marcel-Pflicht "Goal-Names sollten generisch sein"

c) **Click-Listener Memory-Leak-Potential:** globaler `document.addEventListener('click')` hat keine `removeEventListener` bei Navigation. Auf SPA-Pages kein Issue (window persistent), aber auf Multi-Page-App OK.

### W8 (DRY-Helper + Form-Validate + WCAG) — ich gab 9/10

**Latente Issues:**

a) **prova-alert nicht in 7 bestehenden Stellen migriert** (in Self-Critique markiert)
b) **WCAG-Audit nur 3 Pages clean** (in Self-Critique markiert)
c) **Skip-Link Inline-Style** sollte zentralisiert werden (Self-Critique markiert)

d) **Form-Validate-Patterns in Register/Reset koennen XSS:**
   - Wenn `errorMsg.required` aus einem Pattern-Object kommt, wird es als `errEl.textContent = msg` gesetzt — **textContent escaped automatisch**, also OK.
   - Trotzdem: Patterns sind hardcoded, kein User-Input
   - Smell: defense-in-depth waere expliziter String-Type-Check

e) **WCAG-Audit-Tool Heuristic falsch-positiv-Risiko:**
   - Buttons mit "OK" oder "JA" werden als Icon-only gewertet
   - Aktuell akzeptiert in Self-Critique

### W9 (KI-Cost-Display) — ich gab 8/10

**Latente Issues:**

a) **Bar-Charts only** (in Self-Critique markiert)
b) **Kein Drill-Down auf einzelne Calls** (in Self-Critique)
c) **Kein Polling bei Modal-Open** — nur initialer Load

d) **Race-Condition wenn ladeKICost() schnell 2× aufgerufen wird:**
   - Beide fetches laufen parallel
   - Nur der spaeter-resolved wird `content.innerHTML` setzen
   - Nicht kritisch (data ist eventually consistent)

e) **fmtTokens wird bei NaN nicht handled:**
   - `if (n == null)` returns '—', aber `if (n >= 1000000)` mit NaN ist `false`
   - NaN >= 1000 ist `false`
   - `String(NaN)` returns `'NaN'`
   - **Bug:** fmtTokens(NaN) returnt `'NaN'` statt `'—'`!
   - Test-Coverage hat das nicht abgedeckt — werde ich in W12 als Bug-Fix mitnehmen

### W10 (PWA-Foundation) — ich gab 8/10

**Latente Issues:**

a) **Echte PWA-Icon-Sets fehlen** (in Self-Critique, Marcel-Asset-Pflicht)
b) **iOS-Splash-Screens fehlen** (Marcel-Asset-Pflicht)
c) **Nur dashboard.html PWA-erweitert** (in Self-Critique)

d) **PWA-Install-Prompt setTimeout-Race:**
   - `setTimeout(show, 5000)` aber `_deferredPrompt` kann inzwischen null sein wenn User in Chrome direkt installiert
   - `show()` checkt `canInstall()` → returns wenn null → OK

e) **Visit-Counter ueberlauft nicht:**
   - parseInt mit (current+1) ohne Cap — bei 9999999+ Visits kein Issue, aber theoretisch
   - Akzeptiert (sehr theoretisch)

---

## 2. Token-Capacity-Estimate

Ich bin SEHR tief in dieser Long-Conversation (MEGA⁸→¹¹ in einer Session). Realistische Schaetzung pro Tier:

- **Tier 5 voll mit Anthropic-Fallback** (Tier 5a): ~25-30k Tokens (Library + Wrapper-Refactor + Tests + akte-Page-Integration mit Badge)
- **Tier 5 Confidence-Badges-UI** (Tier 5c): ~12-15k Tokens (Frontend + 1-2 Page-Integrationen)
- **Tier 1 Mobile-UX subset** (Touch-Audit-Tool + Safe-Area-Helper): ~15-18k
- **Tier 2 Drilldown-Foundation** (Modal + 1 KPI verlinkt): ~12-15k
- **Final-Report**: ~8-10k

### PRIMARY GOAL (sicher schaffbar)

**3 Tiers, alle Quality 9/10:**

**P1: W12 — Tier 5a Anthropic-Fallback voll**
- `lib/ki-anthropic.js` Wrapper (Anthropic Messages API)
- Fallback-Logic in `ki-proxy.js`: bei OpenAI-Outage → Anthropic
- `isOutageError(err)` Detection (5xx, network, timeout)
- Audit-Log "ki.fallback.activated"
- Tests mit Mock-OpenAI-Outage
- **Self-Critique-Bug-Fix:** fmtTokens(NaN) Bug aus W9

**P2: W13 — Tier 5c Confidence-Badges in Frontend**
- `lib/ki-confidence-badge.js` (UI-Component)
- `lib/ki-confidence.js` Frontend-Bridge (Backend existiert seit MEGA⁸ V3)
- Integration in 2 Pages: stellungnahme.html, akte.html (§6 Fachurteil)

**P3: W14 — Tier 1 Mobile-UX subset**
- Touch-48-Audit-Tool (`tools/touch-audit.js` analog wcag-audit)
- `lib/safe-area-helper.css` (env(safe-area-inset-*) durchgaengig)
- Pull-to-Refresh-Library `lib/pull-to-refresh.js` mit Touch-Events
- Page-Integration in archiv.html (Pull-to-Refresh fuer Liste)

### STRETCH GOAL (wenn Tokens reichen, +2 Tiers)

**S1: W15 — Tier 2 Cockpit-Drilldown-Foundation**
- `lib/admin-drilldown.js` (Modal-Component fuer KPI → Detail-View)
- 1 KPI verlinkt in admin-dashboard.html

**S2: W16 — Toast-Migration-Sweep mit prova-alert**
- 7 bestehende Stellen aus MEGA⁹+¹⁰ auf 1-Liner refactor
- Ziel: Bestaetigt dass DRY-Helper funktioniert in Praxis

### ULTIMATE GOAL (sehr ambitioniert, wahrscheinlich nicht)

Tier 5b (KI-History-Frontend), Tier 6 (PDF-Templates), Tier 4 (Airtable-Cleanup).

**Ehrliche Selbst-Bewertung:** PRIMARY 3 + STRETCH 2 = 5 Tiers ist mein realistic Max bei Quality 8-9/10.

---

## 3. Anthropic-Fallback Detail-Plan (W12)

### 3.1 lib/ki-anthropic.js Wrapper

```js
// API-Spec: POST https://api.anthropic.com/v1/messages
// Headers: x-api-key, anthropic-version: '2023-06-01', content-type
// Body: { model, max_tokens, messages: [{role, content}], system? }
// Model-Mapping:
//   gpt-4o      → claude-sonnet-4-6
//   gpt-4o-mini → claude-haiku-4-5
```

Public API:
```js
async function callAnthropic(params, apiKey) → openai-compatible-response
function mapOpenAIModelToAnthropic(model)
function adaptAnthropicResponse(response) // map content[0].text → choices[0].message.content
```

### 3.2 Fallback-Logic in ki-proxy.js

```js
async function callKIWithFallback(params, openaiKey) {
  try {
    return await callOpenAI(params, openaiKey);
  } catch (err) {
    if (!isOutageError(err)) throw err;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw err;
    
    auditFallbackEvent({ original_error: err.message, model: params.model });
    const adapted = mapOpenAIToAnthropic(params);
    return await callAnthropic(adapted, anthropicKey);
  }
}

function isOutageError(err) {
  const msg = String(err?.message || '');
  return /OpenAI 5\d\d|network|timeout|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(msg);
}
```

### 3.3 Audit-Trail-Eintrag

```js
function auditFallbackEvent(meta) {
  // Fire-and-forget Insert in audit_trail
  // function_name: 'ki-proxy', action: 'ki.fallback.activated', payload: meta
}
```

### 3.4 User-UI Badge bei Fallback

`lib/ki-fallback-badge.js`:
- Detect `response.fallback === true` flag
- Render `🛡️ Backup-KI`-Badge im KI-Output-Container
- Tooltip: "OpenAI nicht erreichbar — Anthropic Claude wurde stattdessen genutzt"

### 3.5 Tests

- `tests/ki/anthropic-wrapper.test.js`: Model-Mapping + Response-Adaption + Header-Construction
- `tests/ki/ki-proxy-fallback.test.js`: Mock-OpenAI-500 → Fallback aktiviert → Anthropic-Mock returns

---

## 4. Confidence-Badges Detail-Plan (W13)

Existing: `netlify/functions/lib/ki-confidence.js` (Backend, MEGA⁸ V3) computeConfidence-Engine.

Frontend missing: kein Badge im UI.

### 4.1 lib/ki-confidence-badge.js

```js
ProvaConfidenceBadge.render(container, confidence) {
  // confidence = { level: 'hoch'|'mittel'|'niedrig', score: 0-100, reasons: [] }
  // Renders: <span class="conf-badge conf-{level}" title="...">{level} ({score})</span>
  // Bei 'niedrig': zusaetzlich "SV-Review noetig"-Hint
}

ProvaConfidenceBadge.compute(openaiResult, useCase, expectedMinTokens) {
  // Wrapper um Backend-Logic — Frontend reproduces Math
  // (oder fetches /netlify/functions/ki-confidence wenn server-side)
}
```

### 4.2 Page-Integrationen

- `stellungnahme-logic.js`: nach KI-Antwort → Badge im Output-Container
- `akte-logic.js`: §6 Fachurteil-KI-Hilfe-Modal → Badge

---

## 5. Mobile-UX-Subset Plan (W14)

### 5.1 Touch-48-Audit-Tool

`tools/touch-audit.js` (analog wcag-audit.js):
- Scant CSS fuer button/a/input mit width/height < 48px
- Scant inline `style=""` mit kleineren padding/heights
- Output: pro Page Findings

### 5.2 Safe-Area-Helper-CSS

`lib/safe-area-helper.css`:
- Utility-Classes: `.psa-pt-safe`, `.psa-pb-safe`, `.psa-px-safe`
- Default: `padding-top: max(16px, env(safe-area-inset-top))`
- Loaded in dashboard/akte/archiv

### 5.3 Pull-to-Refresh

`lib/pull-to-refresh.js`:
- Touch-Event-basiert (touchstart, touchmove, touchend)
- iOS-Safari-kompatibel (e.preventDefault wo noetig)
- Spinner-UI mit Accessibility (aria-busy)
- Public API: `ProvaPullToRefresh.bind(scrollable, onRefresh)`

### 5.4 Page-Integration

- archiv.html: `ProvaPullToRefresh.bind('#liste-body', () => ladeFaelle())`

---

## 6. Quality-Bar pro Tier

- Tests mit Bug-Hunt-Mindset (echte Edge-Cases pruefen)
- Library + Page-Integration zusammen
- Refactor-Pass durchgefuehrt
- Self-Critique 8-9/10 (brutal-ehrlich, KEIN 10/10-Self-Polish)

---

## 7. Was ich definitiv NICHT mache

- ❌ PDFMonkey-Pushes
- ❌ Pilot-SV-Einladungen
- ❌ Stripe-Charges
- ❌ DB-Schema-Aenderungen ohne PLANNED-File
- ❌ Push + Tag (Marcel-OK pflicht)
- ❌ Externe Service-Konfiguration

---

## 8. Erwartete Quality-Metrics nach MEGA¹²

- **Tests:** 481 → 540+ (~60 neue)
- **LOC neu:** ~1500-1800
- **Tiers done:** 3 PRIMARY + 2 STRETCH = 5 (analog MEGA¹¹)
- **Production-Bugs gefixt:** mind. 1 (fmtTokens(NaN) aus W9 Self-Critique)
- **Pattern-Copy-Files:** 0

---

*Plan-Stand 2026-05-05. Start: W12 (Anthropic-Fallback voll).*
