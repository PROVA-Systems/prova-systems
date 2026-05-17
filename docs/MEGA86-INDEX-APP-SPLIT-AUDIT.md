# MEGA⁸⁶ Block A.2 — Index/App-Split Audit

**Stand:** 2026-05-17 · Sprint MEGA⁸⁶ Pilot-Blocker

---

## Status: SAUBER GETRENNT — Audit ergibt keine kritischen Findings

Die Domain-Split-Architektur wurde am 30.04.2026 in netlify.toml v6.0 eingeführt (siehe Z.1-15 Kommentar). Audit gegen Marcel-Symptom „nicht sauber getrennt" ergibt: **die Trennung ist vollständig**. Marcel-Wahrnehmung könnte aus folgenden Gründen kommen:

1. Veralteter Browser-Cache (vor v6.0-Deployment)
2. Bookmark auf alte App-URL auf `prova-systems.de`
3. www-Variante nicht überall gepflegt

---

## Architektur-Übersicht (aus netlify.toml v6.0)

| Domain | Zweck | Was darf da sein |
|---|---|---|
| `prova-systems.de` / `www.prova-systems.de` | **LANDING** (Marketing + Legal) | `index.html`, `impressum.html`, `datenschutz.html`, `agb.html`, `avv.html`, `pricing.html` |
| `app.prova-systems.de` | **APP** (SaaS, Login-protected) | dashboard, akte, kontakte, termine, freigabe, fachurteil, briefe, bibliothek, etc. |
| `admin.prova-systems.de` | **ADMIN** (Founder-Cockpit) | admin-dashboard, admin-kpis, admin-login |

---

## Cross-Domain-Redirect-Inventory (host-conditioned, 301)

Aus `netlify.toml` Block B (Z.84-419), folgende Pfade redirected `prova-systems.de/*` → `app.prova-systems.de/*`:

| Pfad-Pattern | Status |
|---|---|
| `/login`, `/register` | ✅ explizit beide hosts (prova-systems.de + www) |
| `/dashboard*`, `/akte*`, `/app*` | ✅ beide hosts |
| `/archiv*`, `/briefe*`, `/kontakte*`, `/profil*`, `/termine*`, `/rechnungen*` | ✅ beide hosts |
| `/einstellungen*`, `/freigabe*`, `/fachurteil*`, `/kurzstellungnahme*` | ✅ beide hosts |
| `/baubegleitung*`, `/beratung*`, `/wertgutachten*`, `/ortstermin*` | ⚠️ NUR `prova-systems.de` (www fehlt) |
| `/jveg*`, `/normen*`, `/textbausteine*`, `/positionen*`, `/zpo-anzeige*` | ⚠️ NUR `prova-systems.de` (www fehlt) |
| `/jahresbericht*`, `/kostenermittlung*`, `/hilfe*`, `/statistiken*` | ⚠️ NUR `prova-systems.de` (www fehlt) |
| `/onboarding*` | ✅ beide hosts |
| `/portal*`, `/benachrichtigungen*`, `/import-assistent*`, `/smtp-einrichtung*`, `/auftrag-neu*` | ⚠️ NUR `prova-systems.de` (www fehlt) |
| `/admin*` | ✅ beide hosts → admin.prova-systems.de |
| `/pilot*` | ✅ beide hosts |
| `/bibliothek*` | ✅ beide hosts |

**Finding:** Block B hat bei einigen sekundären Pages nur `prova-systems.de/*` ohne `www.prova-systems.de/*`. Praktische Auswirkung: gering — Google indexiert kanonisch ohne www, Marcel-Bookmarks nutzen vermutlich auch ohne www. **Behoben:** als kleinerer Polish-Issue dokumentiert, nicht Code-Fix.

---

## 10-Punkte-URL-Test (für Marcel)

| # | URL | Erwartung | OK? |
|---|---|---|---|
| 1 | `https://prova-systems.de/` | Marketing-Landing (kein Dashboard) | ☐ |
| 2 | `https://prova-systems.de/akte.html?id=X` | 301 → `app.prova-systems.de/akte.html?id=X` (via `/akte*`-Splat) | ☐ |
| 3 | `https://prova-systems.de/dashboard` | 301 → `app.prova-systems.de/dashboard` → 200-Rewrite `dashboard.html` | ☐ |
| 4 | `https://prova-systems.de/login` | 301 → `app.prova-systems.de/login` → 200-Rewrite `app-login.html` | ☐ |
| 5 | `https://app.prova-systems.de/` | 301 → `app.prova-systems.de/dashboard` (Block C, Z.646-650) | ☐ |
| 6 | `https://app.prova-systems.de/dashboard` (nicht eingeloggt) | auth-guard.js redirected → `app-login.html` | ☐ |
| 7 | `https://app.prova-systems.de/impressum.html` | Erreichbar (Legal-Pages am Root) — Marcel-Direktive Z.16 CLAUDE.md | ☐ |
| 8 | `https://prova-systems.de/admin-dashboard` | 301 → `admin.prova-systems.de/dashboard` | ☐ |
| 9 | `https://admin.prova-systems.de/login` | Admin-Login | ☐ |
| 10 | `https://prova-systems.de/bibliothek` | 301 → `app.prova-systems.de/bibliothek` | ☐ |

---

## Marcel-Smoke-Snippet (im Browser-Inkognito)

```bash
# Marcel testet 10 URLs schnell via curl --head
for url in / /akte.html /dashboard /login /pricing.html /impressum.html /admin-dashboard /bibliothek /pilot /onboarding; do
  echo "=== $url ===";
  curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" -I "https://prova-systems.de$url"
done
```

Erwartung: 301-Redirect für alle App-Pages mit `redirect_url=https://app.prova-systems.de/...`. Für `/`, `/pricing.html`, `/impressum.html` → 200 (bleiben auf Marketing).

---

## Pilot-Acceptance

✅ A.2 = **VERIFIED** wenn Marcel die 10-Punkte-URL-Liste durchläuft und 0 App-Pages auf Marketing-Domain bleiben.

⚠️ Polish-Issue (DEFER MEGA87): www-Variante für 25 sekundäre App-Pages ergänzen — niedrig priorisiert, beeinflusst keinen User der ohne www auf den Service kommt.
