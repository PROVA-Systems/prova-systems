# MEGA³¹ C1 — APP-LANDING-SPLIT Audit + Hardening

**Datum:** 2026-05-07
**Vision-Master Bereich:** 12 (App-Landing-Split, Marcel-Direktive "NICHT FERTIG")

---

## Aktueller netlify.toml Build-Config-Status

**Architektur (netlify.toml v6.0 Header):**
- prova-systems.de       → LANDING (Marketing + Legal)
- app.prova-systems.de   → APP (SaaS, Login-protected)
- admin.prova-systems.de → ADMIN (Founder-Cockpit)

**Build-Config:**
- 1 publish-dir `.` (Single-Repo, kein Monorepo)
- 1 functions-dir `netlify/functions`
- esbuild-Bundler

---

## Pages auf prova-systems.de (Landing)

Belegt via Cross-Domain-Redirect-Block (`netlify.toml`):
- index.html (Hero/Marketing)
- pricing.html
- impressum.html, datenschutz.html, agb.html, avv.html
- kontakt.html
- pilot.html (Founding-Programm)

Geplant aber AUDIT-UNKLAR live-Status:
- about.html (Founder-Story)
- faq.html (≥8 Fragen)
- features.html (Detail-Marketing)

---

## Pages auf app.prova-systems.de (App)

Authenticated SaaS-Pages (Auth-Guard via `lib/auth-guard.js`):
- dashboard.html, akte.html, app.html, freigabe.html, stellungnahme.html
- briefvorlagen.html, rechnungen.html, termine.html, jveg.html
- einstellungen.html, kontakte.html, kostenermittlung.html, textbausteine.html
- normen.html, positionen.html, baubegleitung.html, beratung.html
- wertgutachten.html, schiedsgutachten.html, gericht-auftrag.html
- onboarding-supabase.html, profil-supabase.html
- bescheinigungen.html, schadensfaelle.html, neuer-fall.html
- ortstermin-modus.html, gutachterliche-stellungnahme.html
- archiv.html, beweissicherung-foundation, etc.

→ ~40+ App-Pages laut sw.js APP_SHELL.

---

## Pages auf admin.prova-systems.de (Admin)

- admin-login.html
- admin-dashboard.html
- admin-cockpit.html
- (22 admin-* Lambdas in netlify/functions/)

---

## Code-Mix-Identifikation

**Issue 1:** Single-Repo mit 1 publish-dir bedeutet: ALLE Pages sind technisch
auf ALLEN Domains erreichbar. Routing erfolgt nur über `[[redirects]]`-Block A
mit Cross-Domain-Redirects.

**Issue 2:** Login-Routes sind via Block A auf app.prova-systems.de zentriert,
aber andere App-Pages haben keine expliziten Host-Conditions.

**Issue 3:** Cookie-Cross-Domain-Status: `prova_auth_token` localStorage ist
domain-bound (nicht cross-domain). Cross-Domain-Login von Landing → App
funktioniert nur via URL-Param oder erneutes Login.

**Issue 4:** sw.js APP_SHELL enthält viele App-Pages. Service-Worker-Scope ist
Domain-bound — auf prova-systems.de würde der SW versuchen App-Pages zu cachen,
die dort nicht existieren sollten.

---

## Cookie-Cross-Domain-Status

- localStorage `prova_auth_token` ist NICHT cross-domain
- localStorage `prova_consent_v1` (Cookie-Banner) ist NICHT cross-domain
- 13-Monate-Re-Show kann auf Landing + App separat triggern (User-Annoyance)

→ AUDIT-UNKLAR: ob Marcel-bewusste Architektur-Decision oder Bug.

---

## Hardening-Empfehlungen

### Empfehlung 1: Host-Conditions für App-Routes (BLOCKIEREND auf falscher Domain)

In netlify.toml ergänzen:

```toml
# App-Pages auf prova-systems.de → 301 zu app.prova-systems.de
[[redirects]]
  from = "https://prova-systems.de/dashboard*"
  to = "https://app.prova-systems.de/dashboard:splat"
  status = 301
  force = true
```

(Bereits umgesetzt für /freigabe, /login — fehlt für viele andere App-Pages.)

### Empfehlung 2: SW-Scope-Trennung

`sw.js` sollte auf prova-systems.de nicht alle App-Pages cachen.
Lösung: Hostname-Check im SW:
```javascript
const APP_HOSTS = ['app.prova-systems.de', 'localhost'];
if (!APP_HOSTS.includes(self.location.hostname)) {
  // Skip APP_SHELL-Cache, nur Landing-Assets
}
```

### Empfehlung 3: Cookie-Sync via .prova-systems.de Domain

Cookie-Banner-Consent + Auth-Token könnten auf `.prova-systems.de` (Top-Domain)
gesetzt werden für Cross-Domain-Sync. Allerdings localStorage ist immer
Origin-bound — bräuchte Migration zu Cookies.

### Empfehlung 4: Repo-Trennung (langfristig)

Echte Code-Trennung wäre 2 separate Netlify-Sites mit shared Lib:
- prova-systems.de → eigenes Repo (Marketing-Site)
- app.prova-systems.de → existing Repo (SaaS)
- shared NPM-Package für Design-System

→ Marcel-Decision pending.

---

## Tests

`tests/app-landing-split/c1-routing.test.js` — siehe MEGA31-C1 Commit.

---

*MEGA³¹ C1 — Co-Authored-By Claude Opus 4.7*
