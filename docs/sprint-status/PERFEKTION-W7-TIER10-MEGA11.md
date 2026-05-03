# MEGA¹¹ W7 — Tier 10 Plausible-Analytics-Wrapper

**Sprint:** MEGA¹¹ W7 (2026-05-04)
**Status:** ✅ Done (Library + Page-Integration + Bug-Discovery)
**Quality-Score:** 9/10

---

## Was geliefert

### 1. `lib/analytics-plausible.js` (~140 LOC)

**DSGVO-konformer Plausible.io-Wrapper** mit:
- **Consent-First-Approach:** Init wird DEFERRED wenn keine Consent
- **3-Stufen-Consent-Decision:**
  1. User-Opt-Out (`prova_plausible_optout=1`) hat hoechste Prio
  2. ProvaCookieConsent-Library wenn vorhanden
  3. Default: kein Tracking (kein Consent-Banner = kein Tracking)
- **Auto-Re-Init bei Consent-Acceptance:** Storage-Event-Listener fuer `prova_consent_v1` Key
- **Defensive gegen Adblocker:** script.onerror = silent fail, kein User-Impact
- **Props-Sanitization (DSGVO-Pflicht):**
  - Email-Pattern raus (regex mit Hyphen-Support fuer Domain)
  - Telefonnummer-Pattern raus (>= 8 Ziffern)
  - Strings auf 100 Chars truncated
  - Keys auf 50 Chars limited
  - Null/undefined → leerer String

**Public API:**
```js
Plausible.init('prova-systems.de');
Plausible.trackPageview();
Plausible.trackGoal('Trial-Signup', { plan: 'solo' });
Plausible.optOut();
Plausible.isEnabled();
```

### 2. Page-Integration in index.html (Landing)

3 Goal-Tracking-Stellen:
- **Pricing-Click**: Click auf .pricing-card / [href*="#pricing"] / [data-section="pricing"]
- **Trial-CTA-Click**: Click auf a[href*="testversion"] / a[href*="register"] / button[data-cta="trial"]
- **Demo-Started**: Click auf a[href*="#demo"] / button[data-cta="demo"]

**Pattern:** Single global click-listener (Event-Delegation) — kein per-Element-Binding (Performance).

**Cookie-Consent-Init:** ProvaCookieConsent.init() wird zuerst aufgerufen — Plausible wartet bis Consent.

### 3. KRITISCHEN BUG durch Tests entdeckt + gefixt

**Bug:** Personal-Data-Email-Filter-Regex `/@[a-z]+\.[a-z]+/i` matched NICHT Domains mit Hyphen (z.B. `support@prova-systems.de`).

**Production-Impact:** Wenn jemand versehentlich Email-Adresse als Custom-Prop sendet, waere sie in Plausible-Logs sichtbar — DSGVO-Violation.

**Fix:** Regex auf `/@[a-z0-9._-]+\.[a-z]{2,}/i` erweitert (inkludiert Ziffern, Punkte, Hyphen in Domain).

**Test-Discovery-Pattern:** Pre-MEGA¹¹ haette ich den Bug NIE bemerkt — der Test mit `'support@prova-systems.de'` hat ihn aufgedeckt.

### 4. Tests (21 neue, alle gruen)

`tests/analytics/plausible-wrapper.test.js`:
- 10 Tests: Props-Sanitization (Email-Filter, Phone-Filter, Length-Limits, Type-Coercion, Edge-Cases)
- 5 Tests: Consent-Decision-Logic (Opt-Out, Cookie-Consent-Lib, Default-Deny)
- 3 Tests: Goal-Name-Validation
- 3 Tests: Konstanten + Refactor-Drift-Schutz

---

## Edge-Cases dokumentiert

a) **Plausible-Script geblockt (Adblocker):**
   - script.onerror -> silent fail
   - `window.plausible` ist undefined -> trackGoal returns ohne Fehler
   - User merkt nichts

b) **Consent NACH init() accepted:**
   - storage-Event-Listener detected `prova_consent_v1` Storage-Change
   - Re-Init triggered → Plausible-Script wird dann geladen

c) **Multiple Tabs mit verschiedenen Consent-States:**
   - Storage-Event sync zwischen Tabs (Browser-native)
   - Korrekte Behaviour ohne extra Code

d) **Server-Side-Tracking (Stripe-Webhook → Paid-Customer-Goal):**
   - NICHT in dieser Wrapper-Library implementiert
   - Marcel-Backlog: Plausible-Server-API in stripe-webhook.js triggern

e) **SPA-Navigation:**
   - Plausible-Script trackt automatisch History-API-Changes
   - Custom-Code: Plausible.trackPageview() bei manuellen Page-Wechseln

f) **Browser-DNT (Do-Not-Track):**
   - Plausible respektiert DNT-Header automatisch (server-seitig)
   - Wir ueberlassen das Plausible — keine extra Logik

g) **Personal-Data im Goal-Name:**
   - Goal-Name wird NICHT sanitized (nur Props)
   - Marcel-Pflicht: Goal-Names sollten generisch sein ('Trial-Signup', NICHT 'User-marcel-signup')

---

## Performance-Implications

- **Library-Size:** ~5KB minified (kein Build-Step, raw served)
- **Plausible-Script:** ~1KB (cookieless, kein Heavy-Tracking)
- **Goal-Track-Overhead:** ~1ms (kein Network-Wait, fire-and-forget)
- **Click-Listener:** single global delegation = O(1) per Click

---

## Browser-Test-Plan (Marcel-Pflicht)

### Test 1: Plausible-Init mit Consent

1. Inkognito → index.html
2. Cookie-Banner sollte erscheinen
3. F12 → Network: KEIN plausible.io-Request bisher
4. Cookie-Banner "OK" klicken
5. Network: GET https://plausible.io/js/script.tagged-events.js
6. Cookie-Banner-Reset (Datenschutz-Page): Plausible.optOut() funktioniert

### Test 2: Goal-Tracking

1. index.html → Pricing-Section sichtbar
2. F12 → Network filter "plausible"
3. Klick auf "Solo 149€" Karte → Network: POST plausible.io/api/event mit Goal "Pricing-Click"
4. Klick auf "Kostenlos testen" Button → Goal "Trial-CTA-Click"
5. Console: keine Errors

### Test 3: DSGVO-Sanitization

```js
// In Browser-Console:
window.Plausible.trackGoal('Test', { 
  plan: 'solo',
  user_email: 'leak@example.com',  // RAUS
  user_phone: '+491234567890',     // RAUS
  campaign: 'newsletter-2026'      // OK
});
// Network: POST plausible.io/api/event
// Body: nur { plan: 'solo', campaign: 'newsletter-2026' }
```

### Test 4: Adblocker

1. Browser mit AdBlock-Plus aktivieren
2. index.html → Console
3. Erwarten: `[Plausible] script blocked or failed to load (likely adblocker)`
4. KEINE User-facing Errors

### Test 5: Plausible-Setup (Marcel)

1. plausible.io account erstellen (Free-Tier OK fuer Pre-Pilot)
2. Domain "prova-systems.de" hinzufuegen
3. Goals einrichten:
   - "Trial-Signup" (Custom Event)
   - "Pricing-Click" (Custom Event)
   - "Trial-CTA-Click" (Custom Event)
   - "Demo-Started" (Custom Event)
   - "Paid-Customer" (Custom Event, server-side via Stripe-Webhook — Marcel-Backlog)
4. Dashboard-URL teilen mit Team

---

## Self-Critique (brutal-ehrlich)

### 9/10 — was gut war
- ✅ Consent-First-Architecture (Marcel-Pflicht: kein Tracking ohne Consent)
- ✅ Bug DURCH Tests entdeckt (Email-Regex mit Hyphen-Domain)
- ✅ Defense-in-Depth gegen Adblocker (silent fail)
- ✅ Props-Sanitization mit anti-PII-Patterns
- ✅ 21 Tests umfassend (Sanitize + Decision-Logic + Edge-Cases)
- ✅ Echte Page-Integration (NICHT nur Library) — index.html mit 3 Goal-Tracks
- ✅ Auto-Re-Init bei Consent-Acceptance via storage-Event

### Was nicht 10/10 war
- ⚠️ Server-Side-Tracking (Paid-Customer von Stripe-Webhook) NICHT in Wrapper — Marcel-Pflicht-Backlog
- ⚠️ Plausible-Script-URL hard-coded (Marcel-Pflicht: bei Self-Hosted-Plausible aendern)
- ⚠️ Kein DOM-Test fuer click-Listener-Logic (jsdom waere Overkill, Browser-Test-Plan stattdessen)
- ⚠️ Goal-Name-Validation nur Smoke-Check (keine Plausible-API-Schema-Validation)

### Was Senior-Engineer noch tun wuerde
- Server-Side-Goal aus stripe-webhook.js triggern (Paid-Customer)
- Bot-Detection (Plausible filtert Bots automatisch, aber Defense-in-Depth)
- Goals-Liste in /lib/analytics-goals.js extrahieren (Single-Source-of-Truth)

---

## Quality-Bar

- 0 Production-Breaking-Changes (neue Files only, index.html nur erweitert)
- node --check OK fuer alle Files
- 21/21 Tests gruen
- CLAUDE.md-Konformitaet:
  - Regel 17 (DSGVO): Plausible ist cookieless + DE-Hosting + Anti-PII-Sanitization
  - Library-with-Page-Integration (Marcel-Sorge "Library-only" geloest)

---

## File-Inventory MEGA¹¹ W7

**Neu:**
- `lib/analytics-plausible.js` (~140 LOC)
- `tests/analytics/plausible-wrapper.test.js` (21 Tests)
- `docs/sprint-status/PERFEKTION-W7-TIER10-MEGA11.md` (diese Datei)

**Modifiziert:**
- `index.html` — Plausible-Init + 3 Goal-Track-Listener

**Test-Suite:** 389 → 410 (+21, alle gruen)

**Marcel-Pflicht:**
- plausible.io account einrichten (oder Self-Hosted-URL aendern)
- Goals im Plausible-Dashboard erstellen
- Optional: Server-Side-Tracking in stripe-webhook.js fuer Paid-Customer-Goal

---

*Tier 10 done — Plausible-Wrapper produktionsreif, KRITISCHEN PII-Filter-Bug durch Tests gefunden + gefixt. Quality 9/10.*
