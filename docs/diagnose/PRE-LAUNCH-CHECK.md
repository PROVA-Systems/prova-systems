# Pre-Launch-Check (MEGA²⁵ Phase 1)

**Stand:** 2026-05-09
**Auditor:** Claude Opus 4.7 (1M context)
**Scope:** Verifikation der 4 Marcel-Pflicht-Items + Smoke-Tests

---

## Marcel-Pflicht-Items Status

### ⚠️ ITEM 1: `npm install pdf-parse` — NICHT VERIFIZIERT
```bash
$ npm list pdf-parse
prova-deploy@ C:\PROVA-Systems\prova-systems\GitHub\prova-systems
`-- (empty)
```

**Status:** **FEHLT in lokalem package.json + node_modules**

**Mögliche Erklärungen:**
1. Marcel hat nur in Netlify installiert (production-only)
2. Marcel hat lokal installiert aber nicht committed
3. pdf-parse wurde noch nicht installiert

**Action Marcel:**
```bash
npm install pdf-parse --save
git add package.json package-lock.json
git commit -m "chore: add pdf-parse dependency for parse-beweisbeschluss"
```

**Risk:** Lambda `parse-beweisbeschluss.js` wird im Production-Deploy versuchen `require('pdf-parse')` — wenn nicht in package.json, schlägt Build fehl. **CRITICAL**.

### ⚠️ ITEM 2: Migration 11 in Supabase — NICHT VERIFIZIERBAR (kein DB-Zugang von hier)

**Local-File-Check:**
```
✅ supabase-migrations/11_auftraege_beweisbeschluss.sql existiert
```

**Action Marcel:**
Im Supabase SQL-Editor verifizieren:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='auftraege' AND column_name LIKE 'beweisbeschluss%';
```

Erwartet: 4 Spalten (extrakt, extrakt_version, uploaded_at, storage_path)

### ⚠️ ITEM 3: Stripe-Coupon FOUNDING-30 — NICHT VERIFIZIERBAR

**Action Marcel:**
Stripe Dashboard → Coupons → "FOUNDING-30" finden, oder:
```bash
stripe coupons retrieve FOUNDING-30  # falls stripe CLI installiert
```

Erwartet: 30% Rabatt (oder feste Reduktion 54€ bei 179€ → 125€), `forever`-Duration

### ⚠️ ITEM 4: 9 ENV-Variablen in Netlify — NICHT VERIFIZIERBAR

**Action Marcel:** Netlify Dashboard → Environment-Variables prüfen:
- ✅ KI_VISION_PROVIDER=anthropic
- ✅ KI_TEXT_PROVIDER=openai
- ✅ KI_FALLBACK_MODEL=gpt-4o-mini
- ✅ ANTHROPIC_API_KEY (gesetzt, Wert nicht prüfbar)
- ✅ IMPERSONATION_NOTIFY=on
- ✅ SMTP_HOST + SMTP_USER + SMTP_PASS + SMTP_FROM

**Verify via Settings-Tab im Admin-Cockpit (post-Lambda):**
Settings-Tab zeigt aktuell "Lambda nicht erreichbar" weil `admin-env-status.js` Lambda noch fehlt. Quick-Win: Lambda implementieren.

---

## Smoke-Test-Ergebnisse (lokal verifiziert)

### ✅ Test-Suite 1763/1763 grün
```
ℹ tests 1763
ℹ suites 364
ℹ pass 1763
ℹ fail 0
ℹ duration_ms 10904.682
```

### ✅ sw.js v285 (aktuelle Version)
```
const CACHE_VERSION = 'prova-v285';   // MEGA²⁴ Tag-Marathon: ...
```

### ✅ Git-Status clean
- Nur `.claude/settings.local.json` modified (gitignore-Kandidat)
- `docs/PROVA-MARCEL-SELBSTHILFE.md` untracked (pre-existing)
- Working tree clean ansonsten

### ✅ Latest Commit
```
123e7d4 release: MEGA²³+²⁴ COMBINED FINAL — sw.js v285 + Final-Report
```

---

## Empfehlung Marcel

**Vor Push + Tag v286-pre-pilot:**

1. **CRITICAL:** `npm install pdf-parse --save` lokal + commit
2. Migration 11 in Supabase verifizieren (siehe SQL oben)
3. Stripe-Coupon FOUNDING-30 verifizieren
4. 9 ENV-Vars in Netlify Dashboard verifizieren
5. Settings-Tab in Admin-Cockpit besuchen — manche zeigen "Lambda nicht erreichbar" (bekannt, Backend pending)

**Wenn alle 4 grün → Pilot-Launch-OK**

---

*Pre-Launch-Check, MEGA²⁵ Phase 1*
