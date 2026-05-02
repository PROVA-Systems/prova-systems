# NACHT-PAUSE S6 — auth-token-issue Rate-Limit-Fehlend (CRITICAL)

**Datum:** 02.05.2026 nacht
**Sprint:** S6 Phase 2 Audit 4
**Erstellt von:** Claude Code (autonome Mega-Nacht-Sprint-Session)
**Marcel-Entscheidung erforderlich:** ja, vor Pilot-Launch

---

## Was gefunden

`netlify/functions/auth-token-issue.js` ist ein **Login-Endpoint ohne Rate-Limit**. Brute-Force-Angriff auf User-Passwörter ist möglich.

**Reproduktion:**
```bash
for i in {1..10000}; do
  curl -X POST https://app.prova-systems.de/.netlify/functions/auth-token-issue \
    -d '{"email":"victim@example.com","password":"guess'$i'"}' \
    -H "Content-Type: application/json"
done
```

Keine 429-Antwort, keine Cooldown — würde durchlaufen. Pro Versuch macht die Function:
1. Netlify-Identity-grant_type=password (HTTP-Call zu IDP)
2. Airtable-SV-Lookup (HTTP-Call)
3. HMAC-Token-Sign

→ jedes Versuch ~500ms-1s Latenz, aber ohne Limit.

---

## Wichtige Kontext

`auth-token-issue.js` ist **Tot-Code post-K-1.5 Voll-Supabase-Refactor:**

- Browser-Login geht via `auth-supabase-logic.js` direkt zu Supabase Auth (Endpoint `/.well-known/jwks.json` etc.)
- `auth-token-issue.js` nutzt **Netlify Identity** (in K-1.5 ersetzt) und **Airtable** (im Voll-Cleanup-Sprint deprecated, ENV-Vars Marcel löscht noch)
- Keine modernen Browser-Calls zu dieser Function entdeckt

**Aber:** solange die Function deployed ist + ENV-Vars vorhanden, ist sie callable + brute-force-vulnerable.

---

## Optionen

### Option A — Function löschen (empfohlen, Aufwand 5 Min)

**Pros:**
- Sofortiger Schutz (404 statt 429)
- Konsistent mit Voll-Cleanup-Sprint-Doktrin „Airtable raus, Voll-Supabase echt"
- Reduziert Function-Count weiter (31 → 30)

**Cons:**
- Wenn ein Drittanbieter-Tool oder ein alter Frontend-Build die Function noch aufruft → 404, User bekommt Fehler

**Verifikation vor Lösch:**
```bash
# Marcel checkt Netlify-Function-Logs der letzten 7 Tage:
# - Zeile "[auth-token-issue]" sollte fast nie auftauchen
# - Wenn doch: User-Agent + IP prüfen, evtl. Migration-Hilfe
```

**Action wenn Marcel bestätigt:**
1. `git rm netlify/functions/auth-token-issue.js`
2. Test smoke: Login von app.prova-systems.de funktioniert weiter (sollte, weil moderne Logik nicht über diese Function läuft)
3. Commit: `chore: legacy auth-token-issue removed (post-K-1.5 cleanup)`

### Option B — Rate-Limit ergänzen (falls Function bleibt, Aufwand 30 Min)

**Pros:**
- Function bleibt verfügbar als Notfall-Login-Pfad
- Keine Risiko-Änderung des Login-Flows

**Cons:**
- Wartet weitere Function in einem Tot-Code-Pfad
- Brute-Force-Schutz nur Soft (per-Instance In-Memory-Bucket)

**Implementation:**
```js
// In auth-token-issue.js, vor dem POST-Body-Parse:
const ip = String(event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown');
const RL_BUCKETS = global._authIpBuckets = global._authIpBuckets || new Map();
const now = Date.now();
const WINDOW_MS = 15 * 60 * 1000; // 15 Min
const MAX_ATTEMPTS = 5;
let bucket = RL_BUCKETS.get(ip);
if (!bucket || now - bucket.windowStart > WINDOW_MS) {
  bucket = { count: 0, windowStart: now };
}
if (bucket.count >= MAX_ATTEMPTS) {
  const retryAfter = Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000);
  return j(event, 429, {
    error: 'Zu viele Login-Versuche. Bitte ' + Math.ceil(retryAfter/60) + ' Minuten warten.',
    retryAfter
  });
}
bucket.count++;
RL_BUCKETS.set(ip, bucket);
```

**Audit-Log bei Hit:** ggf. `logAuthFailure('Rate-Limit-Brute-Force', event, { ip })` ergänzen.

### Option C — Function disable bis Marcel-Entscheidung (Aufwand 1 Min)

```js
// Erste Zeile im Handler:
return { statusCode: 410, body: JSON.stringify({ error: 'Endpoint deprecated. Use Supabase Auth direct.' }) };
```

**Pros:**
- Schneller Schutz, reversibel
- Keine Function-Löschung
- Klarer Fehler für eventuelle Caller

**Cons:**
- Halbgare Lösung, keine echte Cleanup-Aktion

---

## Meine Empfehlung

**Option A — Function löschen.**

Begründungen:
1. Konsistent mit Marcel-Direktive „PROVA ist seit K-1.0 bis K-1.5 vollständig auf Supabase migriert"
2. Function-Count weiter reduzieren (Wartungs-Aufwand)
3. Reduces attack surface
4. Login-Flow ist bereits via `auth-supabase-logic.js` etabliert — keine Migration nötig

**Vorab-Verifikation:** Marcel öffnet Netlify-Dashboard → Functions → `auth-token-issue` → Logs der letzten 7 Tage → wenn weniger als 5 Calls (vermutlich 0): löschen.

Falls 5+ Calls: Caller identifizieren (User-Agent, IP), dann entweder Migration-Hilfe oder Option C als Übergang.

---

## Marcel-Action

- [ ] Netlify-Logs prüfen: wie oft wurde `auth-token-issue` in letzten 7 Tagen aufgerufen?
- [ ] Entscheidung A / B / C
- [ ] Anweisen: Claude Code soll umsetzen
- [ ] Bei Option A: nach Lösch-Commit Smoke-Test 15/15 grün?

---

## Was Claude Code in dieser Nacht NICHT gemacht hat

- Kein Code-Fix angewendet
- Function bleibt deployed mit identischem Verhalten
- BACKLOG-Eintrag RL-01 als CRITICAL gesetzt
- `MARCEL-PFLICHT-AKTIONEN.md` ergänzt mit Verweis hierher

---

*NACHT-PAUSE 02.05.2026 nacht · Marcel reviewt morgen früh*
