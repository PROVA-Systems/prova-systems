# MEGA⁸² F.2 — Domain-Split-Audit

**Stand:** 2026-05-16 · Static-File-Audit (kein Live-DOM-Inspect — Browser-Test-Pfad fehlt CC).

## Domain-Architektur

```
prova-systems.de       → LANDING (Marketing/Legal/Public-Forms)
app.prova-systems.de   → APP (SaaS, Login-protected)
admin.prova-systems.de → ADMIN (Founder-Cockpit, Path-Alias bis MEGA83)
```

## Audit-Punkte + Findings

### 1. Cross-Domain-Redirects (netlify.toml)

✅ **186 host-conditionierte Redirects** — alle Sidebar-/Core-App-Pages auf app.prova-systems.de
✅ Doppel-Eintrag für `prova-systems.de` + `www.prova-systems.de` (Netlify-Strict)
✅ `/login` → 200-Rewrite zu `/app-login.html` (URL bleibt `/login`)
✅ Splat-Variant für `/login/*` (next + reason Query-Params)
✅ Legacy `/stellungnahme*` → 301 → `/fachurteil:splat` (alle Hosts)

**Keine kritischen Drifts gefunden.**

### 2. _redirects (host-unabhängig)

✅ Path-Aliases für Landing-Hosts (`/pricing` → `/pricing.html`)
✅ Reihenfolge spezifische Pfade zuerst
✅ Note vom 30.04.2026 (Hotfix gegen redirect-Precedence)

**Keine Drifts gefunden.**

### 3. robots.txt ⚠️ FIX in MEGA82

❌ **Drift gefunden:** `Disallow: /stellungnahme.html` — Page existiert seit MEGA70-1.2.2 nicht mehr (umbenannt zu `fachurteil.html`)
❌ **Fehlen:** `fachurteil.html`, `kurzstellungnahme.html` waren nicht in Disallow-Liste
❌ **Fehlen:** Public-Lead-Pages (`pricing`, `demo`, `kontakt`, `pilot`) waren nicht explizit erlaubt

**MEGA82-Patch:**
- ✅ `Disallow: /stellungnahme.html` → `Disallow: /fachurteil.html`
- ✅ `Disallow: /kurzstellungnahme.html` neu
- ✅ Explizite Allow-Liste für `pricing.html`, `demo.html`, `kontakt.html`, `pilot.html`

### 4. sitemap.xml ⚠️ FIX in MEGA82

❌ **Drift gefunden:** sitemap.xml hatte nur 4 URLs (root, agb, datenschutz, impressum)
❌ **Fehlen:** `pricing` (Conversion-relevant), `demo`, `kontakt`, `avv`, `pilot`

**MEGA82-Patch:**
- ✅ 5 URLs ergänzt (pricing, demo, kontakt, avv, pilot)
- ✅ Priority-Ranking: pricing 0.9 (höchste nach Root) → pilot 0.8 → demo 0.7 → kontakt 0.5 → legal 0.3
- ✅ changefreq weekly für pilot (Lead-Capture), monthly für pricing/demo

### 5. Service-Worker (sw.js) Scope

✅ SW läuft auf App-Subdomain (`app.prova-systems.de`)
✅ APP_SHELL listet ~80 Files (alle App-Pages + Login + Lib-Stack)
✅ Network-First für HTML, Cache-First für Assets, Network-Only für APIs
✅ Whitelist für external hosts: `make.com`, `openai.com`, `pdfmonkey.io`, `stripe.com` (kein Cache)

**Keine Drifts. Aktuell: v3245-mega82-verkauf-ready**

### 6. SSL/CORS

✅ Netlify-Default-SSL (Auto-Renew)
✅ `_shared/cors-helper.js` (Netlify) + Edge-Functions: 5 explizite Origins (prova-systems.de, www., app., admin., netlify.app)
✅ Origin-Match strikt (vs. startsWith — wurde in S6 Phase 1.9 gefixt)

**Keine kritischen Drifts.**

### 7. Cookie-Domain (Cross-Subdomain-Auth)

❌ **NICHT GEPRÜFT** — würde Live-DOM-Inspect + Cookie-Header-Capture benötigen
🟡 **Bekannter Bug:** Marcel berichtet Doppel-Login (Landing → App), siehe F.1 DEFER MEGA83

### 8. Cross-Domain-Links innerhalb HTML

Stichprobe: 15 HTML-Files referenzieren `app.prova-systems.de` oder `admin.prova-systems.de`:
- `public-status.html`, `status.html` — Service-Endpoints
- `onboarding-welcome.html` — Welcome-Link auf App
- `admin-cockpit.html` — Admin-internal
- Email-Templates in `email-templates/` + `docs/templates-goldstandard/` — Outbound-Links

**Keine offensichtlichen Drift-Findings in Stichprobe.**

## Zusammenfassung

| Audit-Punkt | Status | Action |
|---|---|---|
| Cross-Domain-Redirects | ✅ | — |
| _redirects | ✅ | — |
| robots.txt | ⚠️ → ✅ | Drift behoben (stellungnahme→fachurteil, Allow-Liste) |
| sitemap.xml | ⚠️ → ✅ | 5 URLs ergänzt |
| Service-Worker | ✅ | — |
| SSL/CORS | ✅ | — |
| Cookie-Domain | 🟡 DEFER | Browser-Test-Pfad benötigt — F.1 MEGA83 |
| HTML-Cross-Links | ✅ | Stichprobe OK |

## DEFER MEGA83

- **F.1 Login Cross-Domain Cookie-Adapter** — braucht Browser-Test-Umgebung
- **Live-DOM-Inspect** der 3 Subdomains für SSL-Certificate + Header-Verifikation
- **Sitemap-Submit zu Google Search Console** (Marcel-CLI)
